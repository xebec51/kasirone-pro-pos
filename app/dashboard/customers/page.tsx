import { Users } from "lucide-react";
import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { CustomersTable, type CustomerRow } from "@/components/customers/customers-table";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

const PAGE_SIZE = 20;
const CUSTOMER_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "BLOCKED"]);

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const ctx = await requireAnyRole(CUSTOMER_ROLES);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim() || undefined;
  const status = params.status && VALID_STATUSES.has(params.status) ? params.status : undefined;

  const where: Prisma.CustomerWhereInput = { storeId: ctx.store.id };
  if (status) where.status = status as Prisma.CustomerWhereInput["status"];
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [totalItems, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        currentDebt: true,
        creditLimit: true,
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const rows: CustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    status: customer.status,
    currentDebt: toNumber(customer.currentDebt),
    creditLimit: customer.creditLimit === null ? null : toNumber(customer.creditLimit),
  }));
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(targetPage));
    return `/dashboard/customers?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pelanggan"
        description="Kelola data pelanggan, batas kredit, dan pantau utang berjalan."
        actions={<CustomerFormDialog />}
      />
      <CustomerFilters />
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tidak ada pelanggan"
          description="Coba ubah filter pencarian atau tambahkan pelanggan baru."
        />
      ) : (
        <div className="space-y-3">
          <CustomersTable data={rows} />
          <DataTablePagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            buildHref={buildHref}
          />
        </div>
      )}
    </div>
  );
}
