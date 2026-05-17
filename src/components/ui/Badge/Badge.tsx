import { cn } from "@/lib/cn";

export type BadgeVariant = "calm" | "attention" | "critique" | "neutral" | "info";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const VARIANTS: Record<BadgeVariant, string> = {
  calm: "bg-calm-soft text-calm",
  attention: "bg-attention-soft text-attention",
  critique: "bg-critique-soft text-critique",
  neutral: "bg-surface-overlay text-ink-soft",
  info: "bg-accent-soft text-accent",
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  calm: "bg-calm",
  attention: "bg-attention",
  critique: "bg-critique",
  neutral: "bg-ink-ghost",
  info: "bg-accent",
};

const SIZES: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-xs gap-1",
  md: "px-2 py-0.5 text-sm gap-1.5",
};

export function Badge({
  variant = "neutral",
  size = "sm",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-sm whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("rounded-full shrink-0", DOT_COLORS[variant], size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")}
        />
      )}
      {children}
    </span>
  );
}
