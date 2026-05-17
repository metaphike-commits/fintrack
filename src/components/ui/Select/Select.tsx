import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, groups, placeholder, className, id, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

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
          htmlFor={selectId}
          className="text-xs font-medium text-ink-soft uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            "w-full h-9 pl-3 pr-8 rounded-md border bg-surface-elevated text-sm text-ink appearance-none",
            "transition-colors duration-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent",
            "disabled:opacity-40 disabled:pointer-events-none",
            error
              ? "border-critique focus-visible:ring-critique focus-visible:border-critique"
              : "border-border hover:border-border-strong",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {groups
            ? groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))
            : options?.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-ghost pointer-events-none"
        />
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
