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
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
  "disabled:pointer-events-none disabled:opacity-40 " +
  "transition-all duration-200 active:scale-[0.97]";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:   "text-white rounded-xl",
  secondary: "text-ink rounded-xl",
  ghost:     "text-ink-soft hover:text-ink rounded-xl",
  danger:    "text-white rounded-xl",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-7 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
    boxShadow: "0 0 20px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.15)",
  },
  secondary: {
    background:
      "linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, " +
      "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)) border-box",
    border: "1px solid transparent",
  },
  ghost: {
    background: "transparent",
  },
  danger: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    boxShadow: "0 0 18px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", loading = false,
      leftIcon, rightIcon, className, style, children, disabled, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        style={{ ...VARIANT_STYLES[variant], ...style }}
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
