import { Clock } from "lucide-react";
import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { OpenShiftDialog } from "@/components/shifts/shift-actions";
import { ShiftFilters } from "@/components/shifts/shift-filters";
import { ShiftsTable, type ShiftRow } from "@/components/shifts/shifts-table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

const SHIFT_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const PAGE_SIZE = 20;

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ status?: string; cashierId?: string; page?: string }> }) {
  const ctx = await requireAnyRole(SHIFT_ROLES);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status === "OPEN" || params.status === "CLOSED" ? params.status : undefined;
  const requestedCashierId = ctx.member.role === UserRole.CASHIER ? ctx.user.id : params.cashierId || undefined;
  const where: Prisma.ShiftWhereInput = { storeId: ctx.store.id, ...(status ? { status } : {}), ...(requestedCashierId ? { cashierId: requestedCashierId } : {}) };

  const [totalItems, shifts, activeShift, cashiers] = await Promise.all([
    prisma.shift.count({ where }),
    prisma.shift.findMany({ where, select: { id: true, status: true, openedAt: true, closedAt: true, openingCash: true, expectedCash: true, actualCash: true, cashDifference: true, cashier: { select: { name: true } }, _count: { select: { sales: true } } }, orderBy: { openedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.shift.findFirst({ where: { storeId: ctx.store.id, cashierId: ctx.user.id, status: "OPEN" }, select: { id: true, openedAt: true } }),
    ctx.member.role === UserRole.CASHIER ? Promise.resolve([]) : prisma.storeMember.findMany({ where: { storeId: ctx.store.id, isActive: true, role: { in: SHIFT_ROLES } }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  const rows: ShiftRow[] = shifts.map((shift) => ({ id: shift.id, cashierName: shift.cashier.name, status: shift.status, openedAt: shift.openedAt.toISOString(), closedAt: shift.closedAt?.toISOString() ?? null, openingCash: toNumber(shift.openingCash), expectedCash: shift.expectedCash === null ? null : toNumber(shift.expectedCash), actualCash: shift.actualCash === null ? null : toNumber(shift.actualCash), cashDifference: shift.cashDifference === null ? null : toNumber(shift.cashDifference), saleCount: shift._count.sales }));
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  function buildHref(targetPage: number) { const sp = new URLSearchParams(); if (status) sp.set("status", status); if (requestedCashierId && ctx.member.role !== UserRole.CASHIER) sp.set("cashierId", requestedCashierId); sp.set("page", String(targetPage)); return `/dashboard/shifts?${sp.toString()}`; }

  return <div className="space-y-6">
    <PageHeader title="Shift Kasir" description="Buka, tutup, dan rekonsiliasi kas per operator." actions={<OpenShiftDialog activeShift={activeShift ? { id: activeShift.id, openedAt: activeShift.openedAt.toISOString() } : null} />} />
    <ShiftFilters cashiers={cashiers.map((member) => member.user)} showCashier={ctx.member.role !== UserRole.CASHIER} />
    {rows.length === 0 ? <EmptyState icon={Clock} title="Tidak ada shift" description="Belum ada shift yang sesuai dengan filter." /> : <div className="space-y-3"><ShiftsTable data={rows} /><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} buildHref={buildHref} /></div>}
  </div>;
}
