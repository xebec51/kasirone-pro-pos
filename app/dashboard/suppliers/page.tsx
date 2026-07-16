import { Truck } from "lucide-react";
import { Prisma } from "@/app/generated/prisma/client";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { PageHeader } from "@/components/shared/page-header";
import { SupplierFilters } from "@/components/suppliers/supplier-filters";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SuppliersTable, type SupplierRow } from "@/components/suppliers/suppliers-table";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 20;

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const ctx = await requireProductAccess();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() || undefined;
  const status = params.status === "active" || params.status === "inactive" ? params.status : undefined;
  const where: Prisma.SupplierWhereInput = { storeId: ctx.store.id };
  if (status) where.isActive = status === "active";
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [totalItems, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        isActive: true,
        _count: { select: { restockOrders: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const rows: SupplierRow[] = suppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    contactName: supplier.contactName,
    phone: supplier.phone,
    email: supplier.email,
    isActive: supplier.isActive,
    restockCount: supplier._count.restockOrders,
  }));
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(targetPage));
    return `/dashboard/suppliers?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Supplier" description="Kelola pemasok dan lihat riwayat restock." actions={<SupplierFormDialog />} />
      <SupplierFilters />
      {rows.length === 0 ? (
        <EmptyState icon={Truck} title="Tidak ada supplier" description="Coba ubah filter atau tambahkan supplier baru." />
      ) : (
        <div className="space-y-3">
          <SuppliersTable data={rows} />
          <DataTablePagination page={page} totalPages={totalPages} totalItems={totalItems} buildHref={buildHref} />
        </div>
      )}
    </div>
  );
}
