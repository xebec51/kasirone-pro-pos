import { TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrencyIDR } from "@/lib/pos/money";

type TopProduct = {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
};

export function TopProductsList({ items }: { items: TopProduct[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Belum ada penjualan"
        description="Produk terlaris akan muncul setelah ada transaksi 7 hari terakhir."
      />
    );
  }

  return (
    <ol className="divide-y divide-border">
      {items.map((item, index) => (
        <li key={item.productId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-medium text-foreground">{item.quantitySold} terjual</p>
            <p className="text-xs text-muted-foreground">{formatCurrencyIDR(item.revenue)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
