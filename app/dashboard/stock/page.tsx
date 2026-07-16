import { addDays } from "date-fns";
import { Boxes } from "lucide-react";
import { Prisma } from "@/app/generated/prisma/client";
import { StockAdjustmentDialog } from "@/components/stock/stock-adjustment-dialog";
import { StockFilters } from "@/components/stock/stock-filters";
import { StockMovementsTable, type StockMovementRow } from "@/components/stock/stock-movements-table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { calculateLowStockStatus } from "@/lib/pos/stock-level";
import { toNumber } from "@/lib/pos/money";

const PAGE_SIZE = 25;
const TYPES = new Set(["SALE", "RESTOCK", "MANUAL_ADJUSTMENT", "VOID", "REFUND", "STOCK_OPNAME", "DAMAGED", "EXPIRED"]);
function parseDate(value?: string) { if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined; const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? undefined : date; }

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string; productId?: string; type?: string; lowStock?: string; from?: string; to?: string; page?: string }> }) {
  const ctx = await requireProductAccess(); const params = await searchParams; const page = Math.max(1, Number(params.page) || 1); const q = params.q?.trim() || undefined; const type = params.type && TYPES.has(params.type) ? params.type : undefined; const from = parseDate(params.from); const to = parseDate(params.to);
  const products = await prisma.product.findMany({ where: { storeId: ctx.store.id }, select: { id: true, name: true, sku: true, stock: true, minStock: true, unit: true }, orderBy: { name: "asc" }, take: 1000 });
  const productOptions = products.map((product) => ({ id: product.id, name: product.name, sku: product.sku, stock: toNumber(product.stock), unit: product.unit }));
  const lowStockProducts = products.map((product) => ({ id: product.id, name: product.name, stock: toNumber(product.stock), minStock: toNumber(product.minStock), unit: product.unit })).filter((product) => calculateLowStockStatus(product.stock, product.minStock) !== "NORMAL").sort((a, b) => a.stock - b.stock);
  const selectedProductId = params.productId || undefined;
  const lowStockIds = lowStockProducts.map((product) => product.id);
  const where: Prisma.StockMovementWhereInput = { storeId: ctx.store.id, ...(selectedProductId ? { productId: selectedProductId } : params.lowStock === "low" ? { productId: { in: lowStockIds } } : {}), ...(type ? { type: type as Prisma.StockMovementWhereInput["type"] } : {}) };
  if (q) where.OR = [{ product: { name: { contains: q, mode: "insensitive" } } }, { product: { sku: { contains: q, mode: "insensitive" } } }, { reason: { contains: q, mode: "insensitive" } }];
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lt: addDays(to, 1) } : {}) };
  const [totalItems, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({ where, select: { id: true, type: true, quantityChange: true, stockBefore: true, stockAfter: true, referenceType: true, referenceId: true, reason: true, createdAt: true, product: { select: { id: true, name: true, sku: true, unit: true } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const rows: StockMovementRow[] = movements.map((movement) => ({ id: movement.id, type: movement.type, quantityChange: toNumber(movement.quantityChange), stockBefore: toNumber(movement.stockBefore), stockAfter: toNumber(movement.stockAfter), referenceType: movement.referenceType, referenceId: movement.referenceId, reason: movement.reason, createdAt: movement.createdAt.toISOString(), productId: movement.product.id, productName: movement.product.name, sku: movement.product.sku, unit: movement.product.unit, createdByName: movement.createdBy?.name ?? null }));
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  function buildHref(targetPage: number) { const sp = new URLSearchParams(); for (const [key, value] of Object.entries({ q, productId: selectedProductId, type, lowStock: params.lowStock, from: params.from, to: params.to })) if (value) sp.set(key, value); sp.set("page", String(targetPage)); return `/dashboard/stock?${sp.toString()}`; }
  return <div className="space-y-6"><PageHeader title="Kartu Stok" description="Ledger pergerakan stok dan penyesuaian manual." actions={<StockAdjustmentDialog products={productOptions} />} />{lowStockProducts.length > 0 ? <section className="rounded-lg border border-warning/30 bg-warning/5 p-4"><h2 className="font-semibold">{lowStockProducts.length} produk perlu perhatian</h2><div className="mt-3 flex flex-wrap gap-2">{lowStockProducts.slice(0, 8).map((product) => <span key={product.id} className="rounded-full border bg-card px-3 py-1 text-xs">{product.name}: {product.stock} {product.unit}</span>)}</div></section> : null}<StockFilters products={productOptions.map(({ id, name, sku }) => ({ id, name, sku }))} />{rows.length === 0 ? <EmptyState icon={Boxes} title="Tidak ada pergerakan stok" description="Belum ada ledger yang sesuai dengan filter." /> : <div className="space-y-3"><StockMovementsTable data={rows} /><DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} buildHref={buildHref} /></div>}</div>;
}
