import { cn } from "@/lib/cn";

export interface SectionTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  count?: number;
  action?: React.ReactNode;
}

export function SectionTitle({ title, count, action, className, ...props }: SectionTitleProps) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 mb-3", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs text-ink-ghost tabular-nums">{count}</span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
