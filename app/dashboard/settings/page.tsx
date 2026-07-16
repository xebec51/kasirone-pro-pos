import { requireOwner } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  await requireOwner();

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" description="Profil toko, pajak, dan preferensi struk." />
      <EmptyState
        icon={Settings}
        title="Pengaturan toko akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
