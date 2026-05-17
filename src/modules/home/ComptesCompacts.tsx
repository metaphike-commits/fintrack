"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { COMPTE_TYPE_LABEL } from "@/store/comptes";
import type { Compte } from "@/store/comptes";

interface ComptesCompactsProps {
  comptes: Compte[];
  soldeTotal: number;
}

function formatEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function ComptesCompacts({ comptes, soldeTotal }: ComptesCompactsProps) {
  if (comptes.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-ghost">Comptes</p>
        <Link
          href="/base-financiere"
          className="flex items-center gap-1 text-xs text-ink-ghost hover:text-ink transition-colors"
        >
          Gérer <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-1.5">
        {comptes.map((c) => (
          <div key={c.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-ghost bg-surface-overlay rounded px-1.5 py-0.5">
                {COMPTE_TYPE_LABEL[c.type]}
              </span>
              <span className="text-sm text-ink">{c.label}</span>
            </div>
            <span className={`text-sm tabular-nums font-medium ${c.solde < 0 ? "text-critique" : "text-ink"}`}>
              {formatEur(c.solde)}
            </span>
          </div>
        ))}
      </div>

      {comptes.length > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-ink-ghost">Total disponible</span>
          <span className="text-sm font-semibold tabular-nums text-ink">{formatEur(soldeTotal)}</span>
        </div>
      )}
    </div>
  );
}
