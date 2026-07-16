"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, SALE_STATUS_LABELS } from "@/lib/pos/labels";

export type TransactionRow = { id: string; saleNumber: string; status: string; paymentStatus: string; total: number; paidAmount: number; unpaidAmount: number; createdAt: string; customerName: string | null; cashierName: string; itemCount: number; paymentMethods: string[] };
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const columns: ColumnDef<TransactionRow>[] = [
  { accessorKey: "saleNumber", header: "No. Transaksi", cell: ({ row }) => <Link href={`/dashboard/transactions/${row.original.id}`} className="font-medium text-foreground hover:underline">{row.original.saleNumber}</Link> },
  { accessorKey: "createdAt", header: "Waktu", cell: ({ row }) => DATE_FORMAT.format(new Date(row.original.createdAt)) },
  { accessorKey: "customerName", header: "Pelanggan", cell: ({ row }) => row.original.customerName || "Umum" },
  { accessorKey: "cashierName", header: "Operator" },
  { accessorKey: "paymentMethods", header: "Metode", cell: ({ row }) => row.original.paymentMethods.map((method) => PAYMENT_METHOD_LABELS[method] ?? method).join(", ") || "-" },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={SALE_STATUS_LABELS[row.original.status] ?? row.original.status} tone={row.original.status === "COMPLETED" ? "success" : row.original.status === "VOIDED" || row.original.status === "REFUNDED" ? "danger" : "warning"} /> },
  { accessorKey: "paymentStatus", header: "Pembayaran", cell: ({ row }) => <StatusBadge label={PAYMENT_STATUS_LABELS[row.original.paymentStatus] ?? row.original.paymentStatus} tone={row.original.paymentStatus === "PAID" ? "success" : row.original.paymentStatus === "UNPAID" ? "danger" : "warning"} /> },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatCurrencyIDR(row.original.total) },
];
export function TransactionsTable({ data }: { data: TransactionRow[] }) { return <DataTable columns={columns} data={data} />; }
