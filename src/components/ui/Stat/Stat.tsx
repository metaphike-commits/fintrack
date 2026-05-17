import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export type StatTrend = "up" | "down" | "neutral";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string;
  delta?: string;
  trend?: StatTrend;
  caption?: string;
  loading?: boolean;
}

const TREND_STYLES: Record<StatTrend, string> = {
  up: "text-calm",
  down: "text-critique",
  neutral: "text-ink-ghost",
};

const TREND_ICONS: Record<StatTrend, React.FC<{ size: number }>> = {
  up: ({ size }) => <TrendingUp size={size} />,
  down: ({ size }) => <TrendingDown size={size} />,
  neutral: ({ size }) => <Minus size={size} />,
};

export function Stat({
  label,
  value,
  delta,
  trend = "neutral",
  caption,
  loading = false,
  className,
  ...props
}: StatProps) {
  const TrendIcon = TREND_ICONS[trend];

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        <div className="h-3.5 w-24 rounded-sm bg-surface-overlay animate-pulse" />
        <div className="h-8 w-32 rounded-sm bg-surface-overlay animate-pulse" />
        <div className="h-3 w-16 rounded-sm bg-surface-overlay animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <p className="text-xs text-ink-ghost uppercase tracking-wider font-medium">
        {label}
      </p>
      <p className="text-3xl font-medium text-ink leading-none">{value}</p>
      <div className="flex items-center gap-3 mt-0.5">
        {delta && (
          <span className={cn("flex items-center gap-1 text-xs font-medium", TREND_STYLES[trend])}>
            <TrendIcon size={12} />
            {delta}
          </span>
        )}
        {caption && (
          <span className="text-xs text-ink-ghost">{caption}</span>
        )}
      </div>
    </div>
  );
}
