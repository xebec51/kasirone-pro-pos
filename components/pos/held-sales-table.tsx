"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { CancelHeldSaleButton } from "@/components/pos/cancel-held-sale-button";
import { formatCurrencyIDR } from "@/lib/pos/currency";

export type HeldSaleRow = { id: string; saleNumber: string; createdAt: string; total: number; customerName: string | null; cashierName: string; itemCount: number };
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const columns: ColumnDef<HeldSaleRow>[] = [
  { accessorKey: "saleNumber", header: "No. Transaksi", cell: ({ row }) => <span className="font-medium">{row.original.saleNumber}</span> },
  { accessorKey: "createdAt", header: "Ditahan", cell: ({ row }) => DATE_FORMAT.format(new Date(row.original.createdAt)) },
  { accessorKey: "cashierName", header: "Operator" },
  { accessorKey: "customerName", header: "Pelanggan", cell: ({ row }) => row.original.customerName || "Umum" },
  { accessorKey: "itemCount", header: "Item" },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrencyIDR(row.original.total) },
  { id: "actions", header: "Aksi", cell: ({ row }) => <div className="flex justify-end gap-2"><Button size="sm" render={<Link href={`/dashboard/pos?held=${row.original.id}`} />}>Lanjutkan</Button><CancelHeldSaleButton id={row.original.id} saleNumber={row.original.saleNumber} /></div> },
];
export function HeldSalesTable({ data }: { data: HeldSaleRow[] }) { return <DataTable columns={columns} data={data} />; }
