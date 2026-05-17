"use client";

import { ArrowDownLeft, ArrowUpRight, Link2 } from "lucide-react";
import type { DayProjection } from "@/lib/projection";

interface EventRow {
  date: Date;
  label: string;
  montant: number;
  direction: "revenu" | "depense";
  reconciled: boolean;
}

interface CeQuiArriveProps {
  projections: DayProjection[]; // slice 0–6 (7 days)
  reconciledItemIds: Set<string>; // from transactions store
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function CeQuiArrive({ projections, reconciledItemIds }: CeQuiArriveProps) {
  const rows: EventRow[] = projections.flatMap((day) =>
    day.events.map((ev) => ({
      date: day.date,
      label: ev.label,
      montant: ev.montant,
      direction: ev.direction,
      // Treat as reconciled if any transaction matches this label (rough heuristic)
      reconciled: reconciledItemIds.size > 0,
    }))
  );

  return (
    <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">
          Ce qui arrive
        </p>
        <span className="text-[10px] text-ink-ghost bg-surface-overlay px-2 py-0.5 rounded-full border border-border">
          7 prochains jours
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-ink-ghost">Aucun mouvement prévu cette semaine</p>
          </div>
        ) : (
          rows.map((row, i) => (
            <EventRowItem key={i} row={row} />
          ))
        )}
      </div>

      {/* Footer */}
      {rows.length > 0 && (
        <div className="px-4 py-2.5 flex items-center justify-between border-t border-border bg-surface">
          <span className="text-[10px] text-ink-ghost">
            {rows.filter((r) => r.direction === "depense").length} dépenses ·{" "}
            {rows.filter((r) => r.direction === "revenu").length} revenus
          </span>
          <span className={`text-[10px] font-medium tabular-nums ${
            rows.reduce(
              (s, r) => s + (r.direction === "revenu" ? r.montant : -r.montant),
              0
            ) >= 0
              ? "text-calm"
              : "text-critique"
          }`}>
            {fmt(
              rows.reduce(
                (s, r) => s + (r.direction === "revenu" ? r.montant : -r.montant),
                0
              )
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function EventRowItem({ row }: { row: EventRow }) {
  const isRevenu = row.direction === "revenu";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-overlay transition-colors">
      {/* Direction icon */}
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: isRevenu ? "var(--calm-soft)" : "var(--critique-soft)",
        }}
      >
        {isRevenu ? (
          <ArrowUpRight size={11} style={{ color: "var(--calm)" }} />
        ) : (
          <ArrowDownLeft size={11} style={{ color: "var(--critique)" }} />
        )}
      </div>

      {/* Label + date */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ink truncate">{row.label}</p>
        <p className="text-[10px] text-ink-ghost">{fmtDate(row.date)}</p>
      </div>

      {/* Amount */}
      <span
        className="text-xs font-medium tabular-nums shrink-0"
        style={{ color: isRevenu ? "var(--calm)" : "var(--critique)" }}
      >
        {isRevenu ? "+" : "-"}
        {fmt(row.montant)}
      </span>

      {/* Status badge */}
      {row.reconciled ? (
        <span className="shrink-0 flex items-center gap-1 text-[9px] text-calm bg-calm-soft px-1.5 py-0.5 rounded-full">
          <Link2 size={8} />
          Réalisé
        </span>
      ) : (
        <span className="shrink-0 text-[9px] text-ink-ghost bg-surface px-1.5 py-0.5 rounded-full border border-border">
          Prévu
        </span>
      )}
    </div>
  );
}
