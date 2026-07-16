import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrencyIDR } from "@/lib/pos/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/pos/labels";

type PaymentSummaryItem = { method: string; total: number };

export function PaymentMethodList({ items }: { items: PaymentSummaryItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Belum ada pembayaran"
        description="Ringkasan metode pembayaran hari ini akan muncul di sini."
      />
    );
  }

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const share = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
        return (
          <li key={item.method} className="py-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">
                {PAYMENT_METHOD_LABELS[item.method] ?? item.method}
              </span>
              <span className="text-foreground">{formatCurrencyIDR(item.total)}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
