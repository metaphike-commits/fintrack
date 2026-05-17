import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type SpinnerSize = "xs" | "sm" | "md" | "lg";

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
}

const SIZES: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
};

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Chargement…"
      className={cn("inline-flex text-ink-ghost", className)}
      {...props}
    >
      <Loader2 size={SIZES[size]} className="animate-spin" />
    </span>
  );
}
