import { requireProductAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Package } from "lucide-react";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProductAccess();
  await params;

  return (
    <div className="space-y-6">
      <PageHeader title="Detail Produk" description="Informasi dan riwayat produk." />
      <EmptyState
        icon={Package}
        title="Detail produk akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
