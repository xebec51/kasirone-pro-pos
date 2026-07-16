import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger";
  hint?: string;
};

const TONE_ICON_CLASSES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "bg-primary-soft text-primary-soft-foreground",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatTile({ label, value, icon: Icon, tone = "default", hint }: StatTileProps) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE_ICON_CLASSES[tone])}>
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
