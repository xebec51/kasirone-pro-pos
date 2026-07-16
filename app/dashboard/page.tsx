import { redirect } from "next/navigation";
import { DollarSign, Receipt, Clock, PackageX } from "lucide-react";
import { requireStoreMember } from "@/lib/auth/rbac";
import {
  getSalesToday,
  getOpenShifts,
  getLowStockProducts,
  getTopProducts,
  getPaymentMethodSummaryToday,
  getCashierPerformanceToday,
  getRecentActivity,
  getCustomersWithDebtCount,
} from "@/lib/dashboard/queries";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/dashboard/overview/stat-tile";
import { SectionCard } from "@/components/dashboard/overview/section-card";
import { TopProductsList } from "@/components/dashboard/overview/top-products-list";
import { PaymentMethodList } from "@/components/dashboard/overview/payment-method-list";
import { LowStockList } from "@/components/dashboard/overview/low-stock-list";
import { CashierPerformanceList } from "@/components/dashboard/overview/cashier-performance-list";
import { RecentActivityList } from "@/components/dashboard/overview/recent-activity-list";
import { OpenShiftsList } from "@/components/dashboard/overview/open-shifts-list";
import { formatCurrencyIDR } from "@/lib/pos/money";

export default async function DashboardIndexPage() {
  const ctx = await requireStoreMember();

  if (ctx.member.role === "CASHIER") redirect("/dashboard/pos");
  if (ctx.member.role === "INVENTORY_STAFF") redirect("/dashboard/stock");

  const [
    salesToday,
    openShifts,
    lowStock,
    topProducts,
    paymentSummary,
    cashierPerformance,
    recentActivity,
    debtCustomerCount,
  ] = await Promise.all([
    getSalesToday(ctx.store.id),
    getOpenShifts(ctx.store.id),
    getLowStockProducts(ctx.store.id),
    getTopProducts(ctx.store.id),
    getPaymentMethodSummaryToday(ctx.store.id),
    getCashierPerformanceToday(ctx.store.id),
    getRecentActivity(ctx.store.id),
    getCustomersWithDebtCount(ctx.store.id),
  ]);

  const alerts: string[] = [];
  if (lowStock.totalCount > 0) {
    alerts.push(
      `${lowStock.totalCount} produk stok menipis${lowStock.outOfStockCount > 0 ? ` (${lowStock.outOfStockCount} habis)` : ""}.`,
    );
  }
  if (debtCustomerCount > 0) {
    alerts.push(`${debtCustomerCount} pelanggan memiliki utang belum lunas.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Ringkasan operasional ${ctx.store.name}.`} />

      {alerts.length > 0 ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Perlu perhatian</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
            {alerts.map((alert) => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile icon={DollarSign} label="Penjualan Hari Ini" value={formatCurrencyIDR(salesToday.total)} />
        <StatTile icon={Receipt} label="Transaksi Hari Ini" value={String(salesToday.count)} />
        <StatTile icon={Clock} label="Shift Aktif" value={String(openShifts.length)} />
        <StatTile
          icon={PackageX}
          label="Stok Menipis"
          value={String(lowStock.totalCount)}
          tone={lowStock.totalCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Produk Terlaris (7 Hari Terakhir)">
          <TopProductsList items={topProducts} />
        </SectionCard>
        <SectionCard title="Metode Pembayaran Hari Ini">
          <PaymentMethodList items={paymentSummary} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Stok Menipis" viewAllHref="/dashboard/stock">
          <LowStockList items={lowStock.items} />
        </SectionCard>
        <SectionCard title="Performa Kasir Hari Ini">
          <CashierPerformanceList items={cashierPerformance} />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Shift Aktif" viewAllHref="/dashboard/shifts">
          <OpenShiftsList items={openShifts} />
        </SectionCard>
        <SectionCard title="Aktivitas Terbaru">
          <RecentActivityList items={recentActivity} />
        </SectionCard>
      </div>
    </div>
  );
}
