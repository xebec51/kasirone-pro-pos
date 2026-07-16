import { requireProductAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tags } from "lucide-react";

export default async function CategoriesPage() {
  await requireProductAccess();

  return (
    <div className="space-y-6">
      <PageHeader title="Kategori" description="Kelompokkan produk berdasarkan kategori." />
      <EmptyState
        icon={Tags}
        title="Manajemen kategori akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
