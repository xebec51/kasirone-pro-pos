import { requireProductAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Package } from "lucide-react";

export default async function ProductsPage() {
  await requireProductAccess();

  return (
    <div className="space-y-6">
      <PageHeader title="Produk" description="Kelola katalog produk toko." />
      <EmptyState
        icon={Package}
        title="Manajemen produk akan segera hadir"
        description="Daftar, pencarian, dan form produk akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
