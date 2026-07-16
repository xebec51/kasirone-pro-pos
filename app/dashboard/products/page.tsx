import { Package } from "lucide-react";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { Prisma } from "@/app/generated/prisma/client";
import { toNumber } from "@/lib/pos/money";
import { calculateLowStockStatus } from "@/lib/pos/stock-level";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductsTable, type ProductRow } from "@/components/products/products-table";

const PAGE_SIZE = 20;
const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);

const PRODUCT_SELECT = {
  id: true,
  name: true,
  sku: true,
  sellingPrice: true,
  stock: true,
  minStock: true,
  unit: true,
  status: true,
  category: { select: { name: true } },
} satisfies Prisma.ProductSelect;

function toRow(p: Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>): ProductRow {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    categoryName: p.category?.name ?? null,
    sellingPrice: toNumber(p.sellingPrice),
    stock: toNumber(p.stock),
    minStock: toNumber(p.minStock),
    unit: p.unit,
    status: p.status,
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string; status?: string; lowStock?: string; page?: string }>;
}) {
  const ctx = await requireProductAccess();
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() || undefined;
  const categoryId = params.categoryId || undefined;
  const status = params.status && VALID_STATUSES.has(params.status) ? params.status : undefined;
  const lowStockOnly = params.lowStock === "low";

  const categories = await prisma.category.findMany({
    where: { storeId: ctx.store.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const where: Prisma.ProductWhereInput = { storeId: ctx.store.id };
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status as Prisma.ProductWhereInput["status"];
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
    ];
  }

  let rows: ProductRow[];
  let totalItems: number;

  if (lowStockOnly) {
    const all = await prisma.product.findMany({ where, select: PRODUCT_SELECT, take: 500 });
    const filtered = all
      .map(toRow)
      .filter((p) => calculateLowStockStatus(p.stock, p.minStock) !== "NORMAL")
      .sort((a, b) => a.stock - b.stock);
    totalItems = filtered.length;
    rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const [count, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { name: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    totalItems = count;
    rows = products.map(toRow);
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categoryId) sp.set("categoryId", categoryId);
    if (status) sp.set("status", status);
    if (lowStockOnly) sp.set("lowStock", "low");
    sp.set("page", String(targetPage));
    return `/dashboard/products?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk"
        description="Kelola katalog produk toko."
        actions={<ProductFormDialog categories={categories} />}
      />
      <ProductFilters categories={categories} />
      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Tidak ada produk"
          description="Coba ubah filter pencarian atau tambahkan produk baru."
        />
      ) : (
        <div className="space-y-3">
          <ProductsTable data={rows} />
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} buildHref={buildHref} />
        </div>
      )}
    </div>
  );
}
