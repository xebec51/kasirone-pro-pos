import { requireAnyRole } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Clock } from "lucide-react";

export default async function ShiftsPage() {
  await requireAnyRole(["OWNER", "MANAGER", "CASHIER"]);

  return (
    <div className="space-y-6">
      <PageHeader title="Shift Kasir" description="Buka, tutup, dan pantau shift kasir." />
      <EmptyState
        icon={Clock}
        title="Manajemen shift akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
