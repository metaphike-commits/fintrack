import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, className, id, ...props }, ref) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    const describedBy =
      [error ? errorId : null, hint && !error ? hintId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium text-ink-soft uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          rows={3}
          className={cn(
            "w-full px-3 py-2 rounded-md border bg-surface-elevated text-sm text-ink placeholder:text-ink-ghost resize-y",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent",
            "disabled:opacity-40 disabled:pointer-events-none",
            error
              ? "border-critique focus-visible:ring-critique focus-visible:border-critique"
              : "border-border hover:border-border-strong",
            className
          )}
          {...props}
        />
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
  }
);
