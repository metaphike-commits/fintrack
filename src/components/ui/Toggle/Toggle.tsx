"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export function Toggle({ label, description, className, id, ...props }: ToggleProps) {
  const generatedId = useId();
  const toggleId = id ?? generatedId;

  return (
    <label
      htmlFor={toggleId}
      className={cn(
        "flex items-start gap-3 cursor-pointer group",
        props.disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          id={toggleId}
          className="peer sr-only"
          {...props}
        />
        {/* Track */}
        <div
          className={cn(
            "w-8 h-4.5 rounded-full border border-border bg-surface-overlay",
            "transition-colors duration-150",
            "peer-checked:bg-accent peer-checked:border-accent",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-surface",
            "group-hover:border-border-strong peer-checked:group-hover:bg-accent-hover"
          )}
          style={{ width: "32px", height: "18px" }}
        />
        {/* Thumb */}
        <div
          className={cn(
            "absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-ink-ghost shadow-sm",
            "transition-all duration-150",
            "peer-checked:translate-x-[14px] peer-checked:bg-white"
          )}
        />
      </div>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && <span className="text-sm text-ink leading-tight">{label}</span>}
          {description && <span className="text-xs text-ink-ghost">{description}</span>}
        </div>
      )}
    </label>
  );
}
