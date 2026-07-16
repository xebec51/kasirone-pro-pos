import { redirect } from "next/navigation";
import { requireStoreMember } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardIndexPage() {
  const ctx = await requireStoreMember();

  if (ctx.member.role === "CASHIER") redirect("/dashboard/pos");
  if (ctx.member.role === "INVENTORY_STAFF") redirect("/dashboard/stock");

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Ringkasan operasional ${ctx.store.name}.`} />
      <EmptyState
        icon={LayoutDashboard}
        title="Dashboard akan segera hadir"
        description="Ringkasan penjualan, shift aktif, stok menipis, dan performa kasir akan ditambahkan pada fase berikutnya."
      />
    </div>
  );
}
