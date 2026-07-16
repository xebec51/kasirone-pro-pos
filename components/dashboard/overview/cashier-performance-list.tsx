import { Users } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrencyIDR } from "@/lib/pos/money";

type CashierPerformanceItem = { cashierId: string; name: string; total: number; count: number };

export function CashierPerformanceList({ items }: { items: CashierPerformanceItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Belum ada transaksi"
        description="Performa kasir hari ini akan muncul setelah ada transaksi selesai."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.cashierId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div>
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.count} transaksi</p>
          </div>
          <p className="font-medium text-foreground">{formatCurrencyIDR(item.total)}</p>
        </li>
      ))}
    </ul>
  );
}
