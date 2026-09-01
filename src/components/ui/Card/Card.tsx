import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  glass?: boolean;
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevated = false, glass = false, hoverable = false, className, children, ...props },
  ref
) {
  if (glass) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl relative overflow-hidden",
          hoverable && "card-hover",
          elevated && "shadow-lg",
          className
        )}
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        {...props}
      >
        {/* Inner top highlight */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
          }}
        />
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl relative transition-all duration-200",
        hoverable && "card-hover",
        elevated && "shadow-lg",
        className
      )}
      style={{
        background:
          "linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, " +
          "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04), rgba(139,92,246,0.08)) border-box",
        border: "1px solid transparent",
      }}
      {...props}
    >
      {children}
    </div>
  );
});

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn("px-5 py-3", className)} {...props}>
        {children}
      </div>
    );
  }
);

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 px-5 pt-3 pb-5 mt-1",
          className
        )}
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
