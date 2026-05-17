import { cn } from "@/lib/cn";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function Divider({ label, className, ...props }: DividerProps) {
  if (label) {
    return (
      <div
        className={cn("flex items-center gap-3 my-4", className)}
        role="separator"
        {...props}
      >
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-ink-ghost shrink-0">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <hr
      className={cn("border-none h-px bg-border my-4", className)}
      {...(props as React.HTMLAttributes<HTMLHRElement>)}
    />
  );
}
