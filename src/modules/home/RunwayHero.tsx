"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { RunwayResult } from "@/lib/runway";

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  critique: { bg: "bg-critique-soft", text: "text-critique", ring: "ring-critique" },
  attention: { bg: "bg-attention-soft", text: "text-attention", ring: "ring-attention" },
  calm: { bg: "bg-calm-soft", text: "text-calm", ring: "ring-calm" },
  stable: { bg: "bg-accent-soft", text: "text-accent", ring: "ring-accent" },
};

const CONFORT_TEXT: Record<string, string> = {
  critique: "text-critique",
  attention: "text-attention",
  calm: "text-calm",
  stable: "text-calm",
};

interface RunwayHeroProps {
  runway: RunwayResult;
  soldeCourant: number | null;
  onSoldeSet: (n: number) => void;
  hasComptes?: boolean;
  soldeTotal?: number | null;
  runwayConfort?: RunwayResult;
  confortThreshold?: number;
  onConfortThresholdChange?: (n: number) => void;
}

export function RunwayHero({
  runway, soldeCourant, onSoldeSet, hasComptes, soldeTotal,
  runwayConfort, confortThreshold, onConfortThresholdChange,
}: RunwayHeroProps) {
  const [editing, setEditing] = useState(soldeCourant === null && !hasComptes);
  const [input, setInput] = useState(soldeCourant !== null ? String(soldeCourant) : "");
  const styles = STATUS_STYLES[runway.status];

  function handleConfirm() {
    const n = parseFloat(input);
    if (!isNaN(n) && n >= 0) { onSoldeSet(n); setEditing(false); }
  }

  return (
    <div className={cn("rounded-xl p-6 md:p-8 space-y-4 transition-colors", styles.bg)}>
      {/* Runway number */}
      <div className="space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-current opacity-60">
          Runway
        </p>
        <div className="flex items-end gap-4">
          <span className={cn("text-6xl md:text-7xl font-semibold leading-none tabular-nums", styles.text)}>
            {runway.label}
          </span>
          {runway.jours !== null && (
            <span className="text-lg text-current opacity-50 mb-1">
              {runway.jours >= 365
                ? `${runway.jours} jours`
                : runway.jours >= 30
                ? `${Math.floor(runway.jours / 30)} mois ${runway.jours % 30}j`
                : ""}
            </span>
          )}
        </div>
        <p className="text-sm opacity-60">{runway.sublabel}</p>
      </div>

      {/* Runway confort */}
      {runwayConfort && (
        <div className="flex items-center gap-3 pt-1 border-t border-current/10">
          <div className="flex-1">
            <p className="text-xs opacity-50 uppercase tracking-wider font-mono">Confort</p>
            <p className={cn("text-2xl font-semibold tabular-nums leading-tight", CONFORT_TEXT[runwayConfort.status])}>
              {runwayConfort.label}
            </p>
            <p className="text-xs opacity-50">{runwayConfort.sublabel}</p>
          </div>
          {onConfortThresholdChange && confortThreshold !== undefined && (
            <div className="text-right">
              <p className="text-xs opacity-40">Seuil</p>
              <button
                onClick={() => {
                  const v = prompt("Seuil de confort (€)", String(confortThreshold));
                  if (v) { const n = parseFloat(v); if (!isNaN(n) && n >= 0) onConfortThresholdChange(n); }
                }}
                className="text-sm opacity-60 hover:opacity-90 underline underline-offset-2 transition-opacity tabular-nums"
              >
                {confortThreshold.toLocaleString("fr-FR")} €
              </button>
            </div>
          )}
        </div>
      )}

      {/* Solde display */}
      {hasComptes ? (
        <p className="text-xs opacity-60">
          Solde total disponible : {soldeTotal != null ? soldeTotal.toLocaleString("fr-FR") : "—"} €{" · "}
          <Link href="/base-financiere" className="underline underline-offset-2 hover:opacity-80 transition-opacity">
            gérer les comptes
          </Link>
        </p>
      ) : editing ? (
        <div className="flex gap-2 items-end pt-1">
          <Input
            label="Solde actuel du compte (€)"
            type="number"
            placeholder="Ex. : 2 500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            className="w-48 bg-white/40 border-current/20"
          />
          <Button size="sm" onClick={handleConfirm}>Confirmer</Button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs opacity-50 hover:opacity-80 transition-opacity underline underline-offset-2"
        >
          Solde actuel : {Number(soldeCourant).toLocaleString("fr-FR")} € · modifier
        </button>
      )}
    </div>
  );
}
