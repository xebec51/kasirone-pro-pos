"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";

export type StockMovementRow = { id: string; type: string; quantityChange: number; stockBefore: number; stockAfter: number; referenceType: string | null; referenceId: string | null; reason: string | null; createdAt: string; productId: string; productName: string; sku: string; unit: string; createdByName: string | null };
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const columns: ColumnDef<StockMovementRow>[] = [
  { accessorKey: "createdAt", header: "Waktu", cell: ({ row }) => DATE_FORMAT.format(new Date(row.original.createdAt)) },
  { accessorKey: "productName", header: "Produk", cell: ({ row }) => <Link href={`/dashboard/products/${row.original.productId}`} className="font-medium hover:underline">{row.original.productName}<span className="ml-2 text-xs font-normal text-muted-foreground">{row.original.sku}</span></Link> },
  { accessorKey: "type", header: "Jenis", cell: ({ row }) => <StatusBadge label={row.original.type.replaceAll("_", " ")} tone={row.original.quantityChange > 0 ? "success" : "warning"} /> },
  { accessorKey: "quantityChange", header: "Perubahan", cell: ({ row }) => <span className={row.original.quantityChange > 0 ? "font-medium text-success" : "font-medium text-destructive"}>{row.original.quantityChange > 0 ? "+" : ""}{row.original.quantityChange} {row.original.unit}</span> },
  { id: "stock", header: "Sebelum → Sesudah", cell: ({ row }) => `${row.original.stockBefore} → ${row.original.stockAfter} ${row.original.unit}` },
  { accessorKey: "reason", header: "Alasan", cell: ({ row }) => row.original.reason || "-" },
  { accessorKey: "createdByName", header: "Petugas", cell: ({ row }) => row.original.createdByName || "Sistem" },
];
export function StockMovementsTable({ data }: { data: StockMovementRow[] }) { return <DataTable columns={columns} data={data} />; }
