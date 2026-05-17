import { cn } from "@/lib/cn";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 mb-6", className)}
      {...props}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        {back && <div className="mb-1">{back}</div>}
        <h1 className="text-2xl font-medium text-ink leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-ink-soft">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-0.5">{actions}</div>
      )}
    </div>
  );
}
