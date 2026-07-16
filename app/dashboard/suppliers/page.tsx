import { requireProductAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Truck } from "lucide-react";

export default async function SuppliersPage() {
  await requireProductAccess();

  return (
    <div className="space-y-6">
      <PageHeader title="Supplier" description="Kelola data pemasok barang." />
      <EmptyState
        icon={Truck}
        title="Manajemen supplier akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
