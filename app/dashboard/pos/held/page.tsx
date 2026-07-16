import { PauseCircle } from "lucide-react";
import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { HeldSalesTable, type HeldSaleRow } from "@/components/pos/held-sales-table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

const POS_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const PAGE_SIZE = 20;

export default async function HeldSalesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await requireAnyRole(POS_ROLES);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const where: Prisma.SaleWhereInput = { storeId: ctx.store.id, status: "HELD", ...(ctx.member.role === UserRole.CASHIER ? { cashierId: ctx.user.id } : {}) };
  const [totalItems, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({ where, select: { id: true, saleNumber: true, createdAt: true, total: true, customer: { select: { name: true } }, cashier: { select: { name: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const rows: HeldSaleRow[] = sales.map((sale) => ({ id: sale.id, saleNumber: sale.saleNumber, createdAt: sale.createdAt.toISOString(), total: toNumber(sale.total), customerName: sale.customer?.name ?? null, cashierName: sale.cashier.name, itemCount: sale._count.items }));
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const buildHref = (targetPage: number) => `/dashboard/pos/held?page=${targetPage}`;
  return <div className="space-y-6"><PageHeader title="Transaksi Ditahan" description="Lanjutkan atau batalkan keranjang yang belum memengaruhi stok." />{rows.length === 0 ? <EmptyState icon={PauseCircle} title="Tidak ada transaksi ditahan" description="Keranjang yang ditahan dari halaman POS akan tampil di sini." /> : <div className="space-y-3"><HeldSalesTable data={rows} /><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} buildHref={buildHref} /></div>}</div>;
}
