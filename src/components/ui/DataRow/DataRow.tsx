import { cn } from "@/lib/cn";

export interface DataRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  subtle?: boolean;
}

export function DataRow({
  label,
  value,
  badge,
  action,
  subtle = false,
  className,
  ...props
}: DataRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2.5 px-1",
        "border-b border-border last:border-b-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            "text-sm truncate",
            subtle ? "text-ink-soft" : "text-ink"
          )}
        >
          {label}
        </span>
        {badge}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            subtle ? "text-ink-ghost" : "text-ink"
          )}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
}
