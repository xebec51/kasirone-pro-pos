import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";
import { calculateLowStockStatus } from "@/lib/pos/stock-level";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProductEditForm } from "@/components/products/product-edit-form";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireProductAccess();
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findFirst({ where: { id, storeId: ctx.store.id } }),
    prisma.category.findMany({ where: { storeId: ctx.store.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  const stock = toNumber(product.stock);
  const minStock = toNumber(product.minStock);
  const level = calculateLowStockStatus(stock, minStock);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku}`}
        actions={
          <Link
            href="/dashboard/stock"
            className="text-sm font-medium text-primary hover:underline"
          >
            Lihat kartu stok
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">Stok saat ini</p>
          <p className="text-lg font-semibold text-foreground">
            {stock} {product.unit}
          </p>
        </div>
        {level !== "NORMAL" ? (
          <StatusBadge label={level === "OUT_OF_STOCK" ? "Stok Habis" : "Stok Menipis"} tone={level === "OUT_OF_STOCK" ? "danger" : "warning"} />
        ) : (
          <StatusBadge label="Stok Aman" tone="success" />
        )}
        <p className="ml-auto text-xs text-muted-foreground">
          Stok hanya dapat diubah melalui restock atau penyesuaian stok.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <ProductEditForm
          categories={categories}
          product={{
            id: product.id,
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            costPrice: toNumber(product.costPrice),
            sellingPrice: toNumber(product.sellingPrice),
            minStock,
            unit: product.unit,
            status: product.status,
            imageUrl: product.imageUrl,
          }}
        />
      </div>
    </div>
  );
}
