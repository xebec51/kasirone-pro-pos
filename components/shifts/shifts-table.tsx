"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrencyIDR } from "@/lib/pos/currency";

export type ShiftRow = { id: string; cashierName: string; status: string; openedAt: string; closedAt: string | null; openingCash: number; expectedCash: number | null; actualCash: number | null; cashDifference: number | null; saleCount: number };
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const columns: ColumnDef<ShiftRow>[] = [
  { accessorKey: "cashierName", header: "Operator", cell: ({ row }) => <Link href={`/dashboard/shifts/${row.original.id}`} className="font-medium text-foreground hover:underline">{row.original.cashierName}</Link> },
  { accessorKey: "openedAt", header: "Dibuka", cell: ({ row }) => DATE_FORMAT.format(new Date(row.original.openedAt)) },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status === "OPEN" ? "Terbuka" : "Ditutup"} tone={row.original.status === "OPEN" ? "success" : "neutral"} /> },
  { accessorKey: "saleCount", header: "Transaksi" },
  { accessorKey: "openingCash", header: "Modal Awal", cell: ({ row }) => formatCurrencyIDR(row.original.openingCash) },
  { accessorKey: "cashDifference", header: "Selisih", cell: ({ row }) => row.original.cashDifference === null ? "-" : <span className={row.original.cashDifference !== 0 ? "font-medium text-destructive" : undefined}>{formatCurrencyIDR(row.original.cashDifference)}</span> },
];
export function ShiftsTable({ data }: { data: ShiftRow[] }) { return <DataTable columns={columns} data={data} />; }
