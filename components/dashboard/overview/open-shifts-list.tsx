import { format } from "date-fns";
import { Clock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrencyIDR } from "@/lib/pos/money";

type OpenShiftItem = { id: string; cashierName: string; openedAt: Date; openingCash: number };

export function OpenShiftsList({ items }: { items: OpenShiftItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Tidak ada shift aktif"
        description="Belum ada kasir yang membuka shift saat ini."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div>
            <p className="font-medium text-foreground">{item.cashierName}</p>
            <p className="text-xs text-muted-foreground">Dibuka {format(item.openedAt, "HH:mm")}</p>
          </div>
          <p className="text-xs text-muted-foreground">Modal {formatCurrencyIDR(item.openingCash)}</p>
        </li>
      ))}
    </ul>
  );
}
