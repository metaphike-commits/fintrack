"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import type { BaseItem } from "@/store/baseFinanciere";
import { useComptesStore } from "@/store/comptes";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

interface Props {
  items: BaseItem[];
}

export function ProchainVirement({ items }: Props) {
  const comptes = useComptesStore((s) => s.comptes);

  const next = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMs = today.setHours(0, 0, 0, 0);

    const withDays = items
      .filter((i) => i.billingDay != null)
      .map((i) => {
        const day = i.billingDay!;
        let daysUntil: number;
        if (day >= todayDay) {
          daysUntil = day - todayDay;
        } else {
          const nextMonth = new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            day
          );
          daysUntil = Math.ceil((nextMonth.getTime() - todayMs) / 86400000);
        }
        return { item: i, daysUntil };
      });

    if (withDays.length === 0) return null;
    return withDays.sort((a, b) => a.daysUntil - b.daysUntil)[0];
  }, [items]);

  if (!next) return null;

  const { item, daysUntil } = next;
  const isRevenu = item.direction === "revenu";
  const compte = item.compteId ? comptes.find((c) => c.id === item.compteId) : null;

  const whenLabel =
    daysUntil === 0
      ? "Aujourd'hui"
      : daysUntil === 1
      ? "Demain"
      : `Dans ${daysUntil} j`;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">
        Prochain virement
      </p>
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isRevenu
              ? "color-mix(in srgb, var(--calm) 15%, transparent)"
              : "color-mix(in srgb, var(--attention) 15%, transparent)",
          }}
        >
          <Calendar
            size={16}
            style={{ color: isRevenu ? "var(--calm)" : "var(--attention)" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{item.label}</p>
          <p
            className="text-base font-bold tabular-nums leading-tight mt-0.5"
            style={{ color: isRevenu ? "var(--calm)" : "var(--critique)" }}
          >
            {isRevenu ? "+" : "-"}
            {fmt(item.montant)}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-xs text-ink-soft">{whenLabel}</span>
            {compte && (
              <>
                <span className="text-ink-ghost text-xs">·</span>
                <span className="text-xs text-ink-ghost truncate">{compte.label}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
