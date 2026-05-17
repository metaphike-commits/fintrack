"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const ICONS: Record<ToastVariant, React.FC<{ size: number; className?: string }>> = {
  success: ({ size, className }) => <CheckCircle2 size={size} className={className} />,
  error: ({ size, className }) => <XCircle size={size} className={className} />,
  warning: ({ size, className }) => <AlertTriangle size={size} className={className} />,
  info: ({ size, className }) => <Info size={size} className={className} />,
};

const VARIANT_STYLES: Record<ToastVariant, { root: string; icon: string }> = {
  success: { root: "border-calm-soft", icon: "text-calm" },
  error: { root: "border-critique-soft", icon: "text-critique" },
  warning: { root: "border-attention-soft", icon: "text-attention" },
  info: { root: "border-accent-soft", icon: "text-accent" },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const styles = VARIANT_STYLES[item.variant];
  const Icon = ICONS[item.variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 w-80 rounded-lg border bg-surface-elevated px-4 py-3 shadow-lg",
        styles.root
      )}
      role="alert"
    >
      <Icon size={16} className={cn("mt-0.5 shrink-0", styles.icon)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink">{item.title}</p>
        {item.description && (
          <p className="text-xs text-ink-soft mt-0.5">{item.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 text-ink-ghost hover:text-ink transition-colors -mt-0.5 -mr-1"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...opts, id }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
