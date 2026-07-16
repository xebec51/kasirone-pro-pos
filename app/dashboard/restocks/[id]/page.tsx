import { requireProductAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PackagePlus } from "lucide-react";

export default async function RestockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProductAccess();
  await params;

  return (
    <div className="space-y-6">
      <PageHeader title="Detail Restock" description="Rincian order restock dan status penerimaan." />
      <EmptyState
        icon={PackagePlus}
        title="Detail restock akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
