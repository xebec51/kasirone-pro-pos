"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrencyIDR } from "@/lib/pos/currency";
import { RESTOCK_STATUS_LABELS } from "@/lib/pos/labels";

export type RestockRow = { id: string; orderNumber: string; status: string; orderDate: string; receivedDate: string | null; totalCost: number; supplierName: string | null; createdByName: string; itemCount: number };
const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const columns: ColumnDef<RestockRow>[] = [{ accessorKey: "orderNumber", header: "No. Pesanan", cell: ({ row }) => <Link href={`/dashboard/restocks/${row.original.id}`} className="font-medium hover:underline">{row.original.orderNumber}</Link> }, { accessorKey: "orderDate", header: "Tanggal", cell: ({ row }) => DATE_FORMAT.format(new Date(row.original.orderDate)) }, { accessorKey: "supplierName", header: "Supplier", cell: ({ row }) => row.original.supplierName || "-" }, { accessorKey: "itemCount", header: "Item" }, { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={RESTOCK_STATUS_LABELS[row.original.status] ?? row.original.status} tone={row.original.status === "RECEIVED" ? "success" : row.original.status === "CANCELLED" ? "danger" : "info"} /> }, { accessorKey: "totalCost", header: "Total", cell: ({ row }) => formatCurrencyIDR(row.original.totalCost) }, { accessorKey: "createdByName", header: "Dibuat oleh" }];
export function RestocksTable({ data }: { data: RestockRow[] }) { return <DataTable columns={columns} data={data} />; }
