import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevated = false, className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-surface-elevated",
        elevated && "shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

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

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("px-5 py-3", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 px-5 pt-3 pb-5 border-t border-border mt-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
