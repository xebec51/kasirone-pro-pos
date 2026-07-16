import { requireManagerOrOwner } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";

export default async function ReportsPage() {
  await requireManagerOrOwner();

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Ringkasan penjualan, laba, dan stok." />
      <EmptyState
        icon={BarChart3}
        title="Laporan akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
