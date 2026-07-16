import { requireAnyRole } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyRole(["OWNER", "MANAGER", "CASHIER"]);
  await params;

  return (
    <div className="space-y-6">
      <PageHeader title="Detail Pelanggan" description="Riwayat transaksi dan utang pelanggan." />
      <EmptyState
        icon={Users}
        title="Detail pelanggan akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
