import { Menu } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MobileTopBarProps {
  title: string;
  onMenuOpen: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function MobileTopBar({ title, onMenuOpen, actions, className }: MobileTopBarProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 px-4 h-12 bg-surface-elevated border-b border-border shrink-0",
        className
      )}
    >
      <button
        onClick={onMenuOpen}
        className="p-1.5 -ml-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-surface-overlay transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu size={18} />
      </button>
      <span className="text-sm font-medium text-ink flex-1 truncate">{title}</span>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </header>
  );
}
