import { addDays } from "date-fns";
import { Receipt } from "lucide-react";
import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionsTable, type TransactionRow } from "@/components/transactions/transactions-table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

const SALE_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const PAGE_SIZE = 20;
const STATUSES = new Set(["HELD", "COMPLETED", "VOIDED", "PARTIALLY_REFUNDED", "REFUNDED"]);
const PAYMENT_STATUSES = new Set(["PAID", "PARTIALLY_PAID", "UNPAID", "REFUNDED"]);

function parseDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; paymentStatus?: string; cashierId?: string; from?: string; to?: string; page?: string }> }) {
  const ctx = await requireAnyRole(SALE_ROLES);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() || undefined;
  const status = params.status && STATUSES.has(params.status) ? params.status : undefined;
  const paymentStatus = params.paymentStatus && PAYMENT_STATUSES.has(params.paymentStatus) ? params.paymentStatus : undefined;
  const cashierId = ctx.member.role === UserRole.CASHIER ? ctx.user.id : params.cashierId || undefined;
  const from = parseDate(params.from);
  const to = parseDate(params.to);
  const where: Prisma.SaleWhereInput = { storeId: ctx.store.id, ...(cashierId ? { cashierId } : {}), ...(status ? { status: status as Prisma.SaleWhereInput["status"] } : {}), ...(paymentStatus ? { paymentStatus: paymentStatus as Prisma.SaleWhereInput["paymentStatus"] } : {}) };
  if (q) where.OR = [{ saleNumber: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }];
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: addDays(to, 1) } : {}) };

  const [totalItems, sales, cashiers] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({ where, select: { id: true, saleNumber: true, status: true, paymentStatus: true, total: true, paidAmount: true, unpaidAmount: true, createdAt: true, completedAt: true, customer: { select: { name: true } }, cashier: { select: { name: true } }, payments: { select: { method: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ctx.member.role === UserRole.CASHIER ? Promise.resolve([]) : prisma.storeMember.findMany({ where: { storeId: ctx.store.id, isActive: true, role: { in: SALE_ROLES } }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  const rows: TransactionRow[] = sales.map((sale) => ({ id: sale.id, saleNumber: sale.saleNumber, status: sale.status, paymentStatus: sale.paymentStatus, total: toNumber(sale.total), paidAmount: toNumber(sale.paidAmount), unpaidAmount: toNumber(sale.unpaidAmount), createdAt: (sale.completedAt ?? sale.createdAt).toISOString(), customerName: sale.customer?.name ?? null, cashierName: sale.cashier.name, itemCount: sale._count.items, paymentMethods: [...new Set(sale.payments.map((payment) => payment.method))] }));
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  function buildHref(targetPage: number) { const sp = new URLSearchParams(); for (const [key, value] of Object.entries({ q, status, paymentStatus, cashierId: ctx.member.role === UserRole.CASHIER ? undefined : cashierId, from: params.from, to: params.to })) if (value) sp.set(key, value); sp.set("page", String(targetPage)); return `/dashboard/transactions?${sp.toString()}`; }

  return <div className="space-y-6"><PageHeader title="Transaksi" description="Riwayat penjualan, status pembayaran, dan struk." /><TransactionFilters cashiers={cashiers.map((member) => member.user)} showCashier={ctx.member.role !== UserRole.CASHIER} />{rows.length === 0 ? <EmptyState icon={Receipt} title="Tidak ada transaksi" description="Belum ada transaksi yang sesuai dengan filter." /> : <div className="space-y-3"><TransactionsTable data={rows} /><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} buildHref={buildHref} /></div>}</div>;
}
