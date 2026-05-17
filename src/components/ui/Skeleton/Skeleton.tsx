import { cn } from "@/lib/cn";

export type SkeletonVariant = "line" | "card" | "stat";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string;
  height?: string;
}

const BASE = "animate-pulse rounded-sm bg-surface-overlay";

export function Skeleton({
  variant = "line",
  width,
  height,
  className,
  style,
  ...props
}: SkeletonProps) {
  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-surface-elevated p-5 space-y-3",
          className
        )}
        {...props}
      >
        <div className={cn(BASE, "h-3.5 w-2/5")} />
        <div className={cn(BASE, "h-8 w-3/5")} />
        <div className={cn(BASE, "h-3 w-1/3")} />
      </div>
    );
  }

  if (variant === "stat") {
    return (
      <div className={cn("flex flex-col gap-2", className)} {...props}>
        <div className={cn(BASE, "h-3 w-20")} />
        <div className={cn(BASE, "h-8 w-28")} />
        <div className={cn(BASE, "h-3 w-14")} />
      </div>
    );
  }

  return (
    <div
      className={cn(BASE, "h-4", className)}
      style={{ width: width ?? "100%", height, ...style }}
      {...props}
    />
  );
}
