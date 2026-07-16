"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrencyIDR } from "@/lib/pos/currency";

export type CustomerRow = { id: string; name: string; phone: string | null; email: string | null; status: string; currentDebt: number; creditLimit: number | null };

const columns: ColumnDef<CustomerRow>[] = [
  { accessorKey: "name", header: "Pelanggan", cell: ({ row }) => <Link href={`/dashboard/customers/${row.original.id}`} className="font-medium text-foreground hover:underline">{row.original.name}</Link> },
  { accessorKey: "phone", header: "Telepon", cell: ({ row }) => row.original.phone || "-" },
  { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "-" },
  { accessorKey: "currentDebt", header: "Utang", cell: ({ row }) => <span className={row.original.currentDebt > 0 ? "font-medium text-destructive" : undefined}>{formatCurrencyIDR(row.original.currentDebt)}</span> },
  { accessorKey: "creditLimit", header: "Limit Kredit", cell: ({ row }) => row.original.creditLimit === null ? "Tanpa batas" : formatCurrencyIDR(row.original.creditLimit) },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status === "ACTIVE" ? "Aktif" : row.original.status === "BLOCKED" ? "Diblokir" : "Tidak Aktif"} tone={row.original.status === "ACTIVE" ? "success" : row.original.status === "BLOCKED" ? "danger" : "neutral"} /> },
];

export function CustomersTable({ data }: { data: CustomerRow[] }) { return <DataTable columns={columns} data={data} />; }
