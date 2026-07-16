import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { UserRole } from "@/app/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/session";
import type { DashboardRole } from "@/lib/dashboard/nav";

export type AuthContext = {
  user: { id: string; name: string; email: string };
  store: { id: string; name: string; slug: string; currency: string };
  member: { id: string; role: UserRole; isActive: boolean };
};

/**
 * Canonical authorization primitive. Always re-reads User.status and
 * StoreMember.isActive from the database — the JWT session only proves
 * *who* is asking, never *what* they're currently allowed to do, so every
 * privileged read/write must go through this (or a helper built on it)
 * rather than trusting session.user fields.
 */
export async function requireStoreMember(): Promise<AuthContext> {
  const sessionUser = await requireCurrentUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, status: true },
  });
  if (!user || user.status !== "ACTIVE") {
    redirect("/unauthorized");
  }

  const member = await prisma.storeMember.findFirst({
    where: { userId: user.id, isActive: true },
    select: {
      id: true,
      role: true,
      isActive: true,
      store: { select: { id: true, name: true, slug: true, currency: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!member) {
    redirect("/unauthorized");
  }

  return {
    user: { id: user.id, name: user.name, email: user.email },
    store: {
      id: member.store.id,
      name: member.store.name,
      slug: member.store.slug,
      currency: member.store.currency,
    },
    member: { id: member.id, role: member.role, isActive: member.isActive },
  };
}

export async function requireRole(role: UserRole): Promise<AuthContext> {
  const ctx = await requireStoreMember();
  if (ctx.member.role !== role) {
    redirect("/unauthorized");
  }
  return ctx;
}

export async function requireAnyRole(roles: UserRole[]): Promise<AuthContext> {
  const ctx = await requireStoreMember();
  if (!roles.includes(ctx.member.role)) {
    redirect("/unauthorized");
  }
  return ctx;
}

export async function requireOwner(): Promise<AuthContext> {
  return requireRole(UserRole.OWNER);
}

export async function requireManagerOrOwner(): Promise<AuthContext> {
  return requireAnyRole([UserRole.OWNER, UserRole.MANAGER]);
}

export async function requireProductAccess(): Promise<AuthContext> {
  return requireAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY_STAFF]);
}

export async function requireSaleAccess(saleId: string) {
  const ctx = await requireAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER]);
  const sale = await prisma.sale.findFirst({ where: { id: saleId, storeId: ctx.store.id }, select: { id: true, cashierId: true } });
  if (!sale) notFound();
  if (ctx.member.role === UserRole.CASHIER && sale.cashierId !== ctx.user.id) {
    redirect("/unauthorized");
  }
  return { ctx, sale };
}

export async function requireShiftAccess(shiftId: string) {
  const ctx = await requireAnyRole([UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER]);
  const shift = await prisma.shift.findFirst({ where: { id: shiftId, storeId: ctx.store.id }, select: { id: true, cashierId: true } });
  if (!shift) notFound();
  if (ctx.member.role === UserRole.CASHIER && shift.cashierId !== ctx.user.id) {
    redirect("/unauthorized");
  }
  return { ctx, shift };
}

const ROUTE_ROLE_MAP: { prefix: string; roles: DashboardRole[] }[] = [
  { prefix: "/dashboard/pos", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { prefix: "/dashboard/products", roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
  { prefix: "/dashboard/categories", roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
  { prefix: "/dashboard/stock", roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
  { prefix: "/dashboard/restocks", roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
  { prefix: "/dashboard/suppliers", roles: ["OWNER", "MANAGER", "INVENTORY_STAFF"] },
  { prefix: "/dashboard/customers", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { prefix: "/dashboard/transactions", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { prefix: "/dashboard/shifts", roles: ["OWNER", "MANAGER", "CASHIER"] },
  { prefix: "/dashboard/reports", roles: ["OWNER", "MANAGER"] },
  { prefix: "/dashboard/users", roles: ["OWNER", "MANAGER"] },
  { prefix: "/dashboard/settings", roles: ["OWNER"] },
  { prefix: "/dashboard/developer", roles: ["OWNER", "MANAGER", "CASHIER", "INVENTORY_STAFF"] },
];

/** Pure path-based check used for nav rendering/UX only — never a substitute for the requireX() guards above. */
export function canAccessDashboardPath(role: DashboardRole, pathname: string): boolean {
  const match = ROUTE_ROLE_MAP.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return match ? match.roles.includes(role) : true;
}
