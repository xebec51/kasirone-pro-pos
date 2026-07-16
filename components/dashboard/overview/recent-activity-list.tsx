import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ACTIVITY_ACTION_LABELS } from "@/lib/pos/labels";

type ActivityItem = {
  id: string;
  action: string;
  module: string;
  description: string;
  createdAt: Date;
  userName: string;
};

export function RecentActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Belum ada aktivitas"
        description="Aktivitas toko akan tercatat di sini."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="py-2.5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {item.userName} &middot; {ACTIVITY_ACTION_LABELS[item.action] ?? item.action}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(item.createdAt, { addSuffix: true, locale: idLocale })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
