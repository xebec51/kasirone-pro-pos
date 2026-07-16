import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";

type LowStockItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  unit: string;
  level: "OUT_OF_STOCK" | "LOW";
};

export function LowStockList({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={PackageX}
        title="Semua stok aman"
        description="Tidak ada produk yang mendekati batas minimum stok."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{item.name}</p>
            <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {item.stock} / {item.minStock} {item.unit}
            </span>
            <StatusBadge
              label={item.level === "OUT_OF_STOCK" ? "Habis" : "Menipis"}
              tone={item.level === "OUT_OF_STOCK" ? "danger" : "warning"}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
