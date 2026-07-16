import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary-soft text-primary-soft-foreground border-primary/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
  className?: string;
};

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
