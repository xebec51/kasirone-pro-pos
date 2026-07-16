import { requireAnyRole } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";

export default async function TransactionsPage() {
  await requireAnyRole(["OWNER", "MANAGER", "CASHIER"]);

  return (
    <div className="space-y-6">
      <PageHeader title="Transaksi" description="Riwayat transaksi penjualan." />
      <EmptyState
        icon={Receipt}
        title="Riwayat transaksi akan segera hadir"
        description="Halaman ini akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
