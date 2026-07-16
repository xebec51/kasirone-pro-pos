import { requireSaleAccess } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSaleAccess(id);

  return (
    <div className="space-y-6">
      <PageHeader title="Detail Transaksi" description="Rincian transaksi dan struk." />
      <EmptyState
        icon={Receipt}
        title="Detail transaksi akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
