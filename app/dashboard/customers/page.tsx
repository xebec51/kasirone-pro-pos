import { requireAnyRole } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";

export default async function CustomersPage() {
  await requireAnyRole(["OWNER", "MANAGER", "CASHIER"]);

  return (
    <div className="space-y-6">
      <PageHeader title="Pelanggan" description="Kelola data pelanggan dan utang." />
      <EmptyState
        icon={Users}
        title="Manajemen pelanggan akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
