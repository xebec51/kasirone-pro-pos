import { PackagePlus } from "lucide-react";
import { Prisma } from "@/app/generated/prisma/client";
import { RestockCreateDialog } from "@/components/restocks/restock-create-dialog";
import { RestockFilters } from "@/components/restocks/restock-filters";
import { RestocksTable, type RestockRow } from "@/components/restocks/restocks-table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

const PAGE_SIZE = 20; const STATUSES = new Set(["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]);
export default async function RestocksPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; supplierId?: string; page?: string }> }) {
  const ctx = await requireProductAccess(); const params = await searchParams; const page = Math.max(1, Number(params.page) || 1); const q = params.q?.trim() || undefined; const status = params.status && STATUSES.has(params.status) ? params.status : undefined; const supplierId = params.supplierId || undefined;
  const where: Prisma.RestockOrderWhereInput = { storeId: ctx.store.id, ...(status ? { status: status as Prisma.RestockOrderWhereInput["status"] } : {}), ...(supplierId ? { supplierId } : {}) }; if (q) where.OR = [{ orderNumber: { contains: q, mode: "insensitive" } }, { supplier: { name: { contains: q, mode: "insensitive" } } }];
  const [totalItems, orders, suppliers] = await Promise.all([
    prisma.restockOrder.count({ where }),
    prisma.restockOrder.findMany({ where, select: { id: true, orderNumber: true, status: true, orderDate: true, receivedDate: true, totalCost: true, supplier: { select: { name: true } }, createdBy: { select: { name: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.supplier.findMany({ where: { storeId: ctx.store.id }, select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const rows: RestockRow[] = orders.map((order) => ({ id: order.id, orderNumber: order.orderNumber, status: order.status, orderDate: order.orderDate.toISOString(), receivedDate: order.receivedDate?.toISOString() ?? null, totalCost: toNumber(order.totalCost), supplierName: order.supplier?.name ?? null, createdByName: order.createdBy.name, itemCount: order._count.items })); const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  function buildHref(targetPage: number) { const sp = new URLSearchParams(); if (q) sp.set("q", q); if (status) sp.set("status", status); if (supplierId) sp.set("supplierId", supplierId); sp.set("page", String(targetPage)); return `/dashboard/restocks?${sp.toString()}`; }
  return <div className="space-y-6"><PageHeader title="Restock" description="Kelola pesanan dan penerimaan stok dari supplier." actions={<RestockCreateDialog suppliers={suppliers.filter((supplier) => supplier.isActive).map(({ id, name }) => ({ id, name }))} />} /><RestockFilters suppliers={suppliers.map(({ id, name }) => ({ id, name }))} />{rows.length === 0 ? <EmptyState icon={PackagePlus} title="Tidak ada restock" description="Buat draf restock pertama atau ubah filter." /> : <div className="space-y-3"><RestocksTable data={rows} /><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} buildHref={buildHref} /></div>}</div>;
}
