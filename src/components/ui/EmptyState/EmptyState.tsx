import { cn } from "@/lib/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function DefaultIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="6" y="10" width="28" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16h28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 24h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 28h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 px-6 text-center",
        className
      )}
      {...props}
    >
      <div className="text-ink-ghost">{icon ?? <DefaultIcon />}</div>
      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && (
          <p className="text-xs text-ink-ghost leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
