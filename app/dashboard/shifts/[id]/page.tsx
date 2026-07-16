import { requireShiftAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Clock } from "lucide-react";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireShiftAccess(id);

  return (
    <div className="space-y-6">
      <PageHeader title="Detail Shift" description="Rincian shift dan transaksi terkait." />
      <EmptyState
        icon={Clock}
        title="Detail shift akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
