"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { calculateLowStockStatus } from "@/lib/pos/stock-level";
import { PRODUCT_STATUS_LABELS } from "@/lib/pos/labels";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  categoryName: string | null;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  status: string;
};

const columns: ColumnDef<ProductRow>[] = [
  {
    accessorKey: "name",
    header: "Produk",
    cell: ({ row }) => (
      <Link href={`/dashboard/products/${row.original.id}`} className="font-medium text-foreground hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "sku", header: "SKU" },
  {
    accessorKey: "categoryName",
    header: "Kategori",
    cell: ({ row }) => row.original.categoryName ?? "-",
  },
  {
    accessorKey: "sellingPrice",
    header: "Harga Jual",
    cell: ({ row }) => formatCurrencyIDR(row.original.sellingPrice),
  },
  {
    accessorKey: "stock",
    header: "Stok",
    cell: ({ row }) => {
      const level = calculateLowStockStatus(row.original.stock, row.original.minStock);
      return (
        <div className="flex items-center gap-2">
          <span>
            {row.original.stock} {row.original.unit}
          </span>
          {level !== "NORMAL" ? (
            <StatusBadge
              label={level === "OUT_OF_STOCK" ? "Habis" : "Menipis"}
              tone={level === "OUT_OF_STOCK" ? "danger" : "warning"}
            />
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const tone: StatusTone = row.original.status === "ACTIVE" ? "success" : "neutral";
      return <StatusBadge label={PRODUCT_STATUS_LABELS[row.original.status] ?? row.original.status} tone={tone} />;
    },
  },
];

export function ProductsTable({ data }: { data: ProductRow[] }) {
  return <DataTable columns={columns} data={data} />;
}
