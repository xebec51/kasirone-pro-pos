import { requireAnyRole } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PauseCircle } from "lucide-react";

export default async function HeldSalesPage() {
  await requireAnyRole(["OWNER", "MANAGER", "CASHIER"]);

  return (
    <div className="space-y-6">
      <PageHeader title="Transaksi Ditahan" description="Keranjang yang ditahan untuk dilanjutkan nanti." />
      <EmptyState
        icon={PauseCircle}
        title="Daftar transaksi ditahan akan segera hadir"
        description="Fitur menahan dan melanjutkan transaksi akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
