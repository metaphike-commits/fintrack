"use client";

import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useTransactionsStore } from "@/store/transactions";
import { toMensuel } from "@/lib/projection";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

interface CatRow {
  categorie: string;
  prevu: number;
  reel: number;
  derive: number; // (reel - prevu) / prevu * 100, null if prevu=0
}

export function BudgetVsReel({ year, month }: { year?: number; month?: number } = {}) {
  const items = useBaseFinanciereStore((s) => s.items);
  const transactions = useTransactionsStore((s) => s.transactions);

  const now = new Date();
  const currentMonth = month ?? now.getMonth();
  const currentYear = year ?? now.getFullYear();

  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const rows = useMemo<CatRow[]>(() => {
    // Prévu : base financière dépenses actives, par catégorie (mensuel normalisé)
    // Items with a date range are only counted when the target month overlaps that range.
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd   = new Date(currentYear, currentMonth + 1, 0);
    const prevu = new Map<string, number>();
    for (const item of items) {
      if (item.archived || item.direction !== "depense") continue;
      if (item.dateFin   && new Date(item.dateFin)   < monthStart) continue;
      if (item.dateDebut && new Date(item.dateDebut) > monthEnd)   continue;
      const cat = item.categorie || "autre";
      prevu.set(cat, (prevu.get(cat) ?? 0) + toMensuel(item));
    }

    // Réel : transactions dépenses du mois courant, par catégorie (hors transferts internes)
    const reel = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.direction !== "depense" || tx.excludedFromAnalytics) continue;
      const d = new Date(tx.date);
      if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) continue;
      const cat = tx.categorie || "autre";
      reel.set(cat, (reel.get(cat) ?? 0) + tx.montant);
    }

    // Merge all categories
    const allCats = new Set([...prevu.keys(), ...reel.keys()]);
    const result: CatRow[] = [];

    for (const cat of allCats) {
      const p = prevu.get(cat) ?? 0;
      const r = reel.get(cat) ?? 0;
      const derive = p > 0 ? ((r - p) / p) * 100 : r > 0 ? 100 : 0;
      result.push({ categorie: cat, prevu: p, reel: r, derive });
    }

    // Sort: biggest overshoot first, then alphabetical
    return result.sort((a, b) => b.derive - a.derive || a.categorie.localeCompare(b.categorie));
  }, [items, transactions, currentMonth, currentYear]);

  const alerts = useMemo(
    () => rows.filter((r) => r.derive > 20 && r.reel > 0),
    [rows]
  );

  const totalPrevu = rows.reduce((s, r) => s + r.prevu, 0);
  const totalReel = rows.reduce((s, r) => s + r.reel, 0);
  const totalDerive = totalPrevu > 0 ? ((totalReel - totalPrevu) / totalPrevu) * 100 : 0;

  if (rows.length === 0) return null;

  function deriveColor(d: number): string {
    if (d <= 0) return "var(--calm)";
    if (d <= 20) return "var(--attention)";
    return "var(--critique)";
  }

  function deriveLabel(d: number): string {
    const sign = d >= 0 ? "+" : "";
    return `${sign}${d.toFixed(0)}%`;
  }

  const maxReel = Math.max(...rows.map((r) => Math.max(r.prevu, r.reel)), 1);

  return (
    <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">
          Budget vs Réel · {monthLabel}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-ink-ghost">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm border border-border inline-block" />
            Prévu
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block opacity-70" />
            Réel
          </span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="px-4 py-2.5 bg-critique/5 border-b border-border flex flex-wrap gap-2">
          {alerts.map((r) => (
            <div
              key={r.categorie}
              className="flex items-center gap-1.5 text-[10px] text-critique"
            >
              <AlertTriangle size={10} />
              <span className="capitalize">{r.categorie}</span>
              <span className="font-mono">+{r.derive.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.categorie} className="px-4 py-2.5 hover:bg-surface-overlay transition-colors">
            <div className="flex items-center gap-3">
              {/* Catégorie */}
              <span className="text-xs text-ink capitalize w-28 shrink-0 truncate">
                {row.categorie}
              </span>

              {/* Double bar */}
              <div className="flex-1 min-w-0 space-y-1">
                {/* Prévu bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full border border-border/60"
                      style={{
                        width: `${(row.prevu / maxReel) * 100}%`,
                        background: "transparent",
                        borderColor: "var(--ink-ghost)",
                        borderWidth: 1,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-ink-ghost tabular-nums w-16 text-right shrink-0">
                    {fmt(row.prevu)}
                  </span>
                </div>
                {/* Réel bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full opacity-80"
                      style={{
                        width: `${(row.reel / maxReel) * 100}%`,
                        background: deriveColor(row.derive),
                      }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums w-16 text-right shrink-0" style={{ color: deriveColor(row.derive) }}>
                    {fmt(row.reel)}
                  </span>
                </div>
              </div>

              {/* Dérive badge */}
              <div
                className="shrink-0 w-14 text-right text-xs font-mono tabular-nums font-semibold"
                style={{ color: deriveColor(row.derive) }}
              >
                {row.reel === 0 && row.prevu > 0
                  ? "—"
                  : deriveLabel(row.derive)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-overlay">
        <div className="flex items-center gap-2 text-xs font-medium text-ink">
          {totalDerive <= 0 ? (
            <TrendingDown size={12} className="text-calm" />
          ) : (
            <TrendingUp size={12} style={{ color: deriveColor(totalDerive) }} />
          )}
          Total ce mois
        </div>
        <div className="flex items-center gap-4 text-xs tabular-nums">
          <span className="text-ink-ghost">Prévu {fmt(totalPrevu)}</span>
          <span className="font-semibold text-ink">Réel {fmt(totalReel)}</span>
          <span
            className="font-mono font-semibold"
            style={{ color: deriveColor(totalDerive) }}
          >
            {deriveLabel(totalDerive)}
          </span>
        </div>
      </div>
    </div>
  );
}
