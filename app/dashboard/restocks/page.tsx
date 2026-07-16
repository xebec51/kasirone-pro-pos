import { requireProductAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PackagePlus } from "lucide-react";

export default async function RestocksPage() {
  await requireProductAccess();

  return (
    <div className="space-y-6">
      <PageHeader title="Restock" description="Kelola order dan penerimaan stok dari supplier." />
      <EmptyState
        icon={PackagePlus}
        title="Manajemen restock akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
