import { requireProductAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Boxes } from "lucide-react";

export default async function StockPage() {
  await requireProductAccess();

  return (
    <div className="space-y-6">
      <PageHeader title="Kartu Stok" description="Riwayat pergerakan stok dan penyesuaian manual." />
      <EmptyState
        icon={Boxes}
        title="Kartu stok akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
