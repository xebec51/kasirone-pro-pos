"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";

export type SupplierRow = { id: string; name: string; contactName: string | null; phone: string | null; email: string | null; isActive: boolean; restockCount: number };
const columns: ColumnDef<SupplierRow>[] = [
  { accessorKey: "name", header: "Supplier", cell: ({ row }) => <Link href={`/dashboard/suppliers/${row.original.id}`} className="font-medium text-foreground hover:underline">{row.original.name}</Link> },
  { accessorKey: "contactName", header: "Kontak", cell: ({ row }) => row.original.contactName || "-" },
  { accessorKey: "phone", header: "Telepon", cell: ({ row }) => row.original.phone || "-" },
  { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "-" },
  { accessorKey: "restockCount", header: "Pesanan Restock" },
  { accessorKey: "isActive", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.isActive ? "Aktif" : "Tidak Aktif"} tone={row.original.isActive ? "success" : "neutral"} /> },
];
export function SuppliersTable({ data }: { data: SupplierRow[] }) { return <DataTable columns={columns} data={data} />; }
