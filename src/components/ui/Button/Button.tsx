"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover rounded-md shadow-sm active:scale-[0.98]",
  secondary:
    "bg-surface-elevated text-ink border border-border hover:border-border-strong rounded-md shadow-sm active:scale-[0.98]",
  ghost:
    "text-ink-soft hover:bg-surface-elevated hover:text-ink rounded-md active:scale-[0.98]",
  danger:
    "bg-critique text-white hover:opacity-90 rounded-md shadow-sm active:scale-[0.98]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={size === "sm" ? 12 : size === "lg" ? 18 : 14} />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
