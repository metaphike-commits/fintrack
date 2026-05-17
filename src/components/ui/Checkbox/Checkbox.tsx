"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "flex items-start gap-2.5 cursor-pointer group",
        props.disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          id={checkboxId}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            "w-4 h-4 rounded-sm border border-border bg-surface-elevated",
            "transition-colors duration-100",
            "peer-checked:bg-accent peer-checked:border-accent",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-surface",
            "group-hover:border-border-strong peer-checked:group-hover:bg-accent-hover"
          )}
        />
        <Check
          size={10}
          strokeWidth={3}
          className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
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
