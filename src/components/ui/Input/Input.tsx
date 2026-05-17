import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftAddon, rightAddon, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const describedBy = [
    error ? errorId : null,
    hint && !error ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-ink-soft uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftAddon && (
          <span className="absolute left-3 text-ink-ghost pointer-events-none flex items-center">
            {leftAddon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "w-full h-9 rounded-md border bg-surface-elevated text-sm text-ink placeholder:text-ink-ghost",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent",
            "disabled:opacity-40 disabled:pointer-events-none",
            error
              ? "border-critique focus-visible:ring-critique focus-visible:border-critique"
              : "border-border hover:border-border-strong",
            leftAddon ? "pl-9" : "pl-3",
            rightAddon ? "pr-9" : "pr-3",
            className
          )}
          {...props}
        />
        {rightAddon && (
          <span className="absolute right-3 text-ink-ghost pointer-events-none flex items-center">
            {rightAddon}
          </span>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-critique">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-ghost">
          {hint}
        </p>
      )}
    </div>
  );
});
