import { cn } from "@/lib/utils";

export type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  variant?: "default" | "mono" | "inverse";
};

/**
 * Custom KasirOne mark: a receipt tearing away from a cashier counter,
 * with the receipt's bold left edge and the counter's base reading as
 * the numeral "1" — the "One" in KasirOne.
 */
export function KasironeLogo({
  className,
  showWordmark = true,
  variant = "default",
}: LogoProps) {
  const markBg =
    variant === "inverse"
      ? "fill-white/15"
      : variant === "mono"
        ? "fill-transparent"
        : "fill-primary";

  const markFg =
    variant === "inverse"
      ? "fill-white"
      : variant === "mono"
        ? "fill-current"
        : "fill-primary-foreground";

  const accentFill =
    variant === "default" ? "fill-brand-accent" : "fill-transparent";

  const wordmarkClass =
    variant === "inverse"
      ? "text-white"
      : variant === "mono"
        ? "text-current"
        : "text-foreground";

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label="KasirOne Pro logo"
    >
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        className="shrink-0"
        aria-hidden="true"
      >
        <title>KasirOne Pro</title>
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="8"
          className={markBg}
          stroke={variant === "mono" ? "currentColor" : "none"}
          strokeWidth={variant === "mono" ? 1.5 : 0}
        />
        {/* counter base — the serif foot of the "1" */}
        <rect x="9" y="23" width="14" height="3" rx="1.2" className={markFg} />
        {/* receipt body with a torn zigzag top edge */}
        <path
          d="M13 8.5 L14.6 7 L16.2 8.5 L17.8 7 L19.4 8.5 L21 7 V22 H13 Z"
          className={markFg}
        />
        {/* printed lines on the receipt, left one bold/tall like the "1" flag */}
        <rect x="14.6" y="10.5" width="1.8" height="8" rx="0.6" className={accentFill || markBg} />
        <rect x="17.2" y="12" width="2.4" height="1.4" rx="0.5" className={variant === "default" ? "fill-primary" : markBg} />
        <rect x="17.2" y="15" width="2.4" height="1.4" rx="0.5" className={variant === "default" ? "fill-primary" : markBg} />
        <rect x="17.2" y="18" width="2.4" height="1.4" rx="0.5" className={variant === "default" ? "fill-primary" : markBg} />
      </svg>
      {showWordmark ? (
        <span className={cn("flex items-baseline gap-1 font-semibold leading-none tracking-tight", wordmarkClass)}>
          <span className="text-base">KasirOne</span>
          <span
            className={cn(
              "rounded-sm px-1 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide",
              variant === "inverse"
                ? "bg-white/15 text-white"
                : "bg-primary-soft text-primary-soft-foreground",
            )}
          >
            Pro
          </span>
        </span>
      ) : null}
    </span>
  );
}
