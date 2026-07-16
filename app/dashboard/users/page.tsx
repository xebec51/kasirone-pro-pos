import { requireManagerOrOwner } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { UserCog } from "lucide-react";

export default async function UsersPage() {
  await requireManagerOrOwner();

  return (
    <div className="space-y-6">
      <PageHeader title="Pengguna" description="Kelola anggota toko dan peran akses." />
      <EmptyState
        icon={UserCog}
        title="Manajemen pengguna akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
