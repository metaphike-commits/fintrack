"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GaugeCircle } from "./GaugeCircle";
import {
  runwayToGaugeValue,
  runwayColor,
  type FragiliteResult,
} from "@/lib/tensionScore";
import type { RunwayResult } from "@/lib/runway";
import { useStaggerEntrance } from "@/hooks/useStaggerEntrance";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

interface CockpitKPIsProps {
  runway: RunwayResult;
  fragilite: FragiliteResult;
  momentum: number | null;
  soldeEffectif: number | null;
  monthlyNet: number;
}

export function CockpitKPIs({
  runway,
  fragilite,
  momentum,
  soldeEffectif,
  monthlyNet,
}: CockpitKPIsProps) {
  const gridRef = useStaggerEntrance<HTMLDivElement>({ duration: 500, y: 18 });

  return (
    <div ref={gridRef} className="grid grid-cols-3 gap-4">
      {/* ── Runway ───────────────────────────────────────────── */}
      <KPICard label="RUNWAY">
        <GaugeCircle
          value={runwayToGaugeValue(runway.jours)}
          color={runwayColor(runway.jours)}
          size={92}
          strokeWidth={9}
        >
          <span
            className="text-base font-bold tabular-nums leading-none"
            style={{ color: runwayColor(runway.jours) }}
          >
            {runway.label}
          </span>
        </GaugeCircle>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink leading-snug">
            {soldeEffectif !== null ? fmt(soldeEffectif) : "—"}
          </p>
          <p className="text-xs text-ink-soft mt-1 leading-snug">{runway.sublabel}</p>
        </div>
      </KPICard>

      {/* ── Score Fragilité ───────────────────────────────────── */}
      <KPICard label="FRAGILITÉ">
        <GaugeCircle value={fragilite.score} color={fragilite.color} size={92} strokeWidth={9}>
          <span
            className="text-base font-bold tabular-nums leading-none"
            style={{ color: fragilite.color }}
          >
            {fragilite.score}
          </span>
          <span className="text-[9px] text-ink-ghost leading-none mt-0.5">/ 100</span>
        </GaugeCircle>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink leading-snug">{fragilite.label}</p>
          <p className="text-xs text-ink-soft mt-1 leading-snug">
            {fragilite.level === "faible"
              ? "Situation confortable"
              : fragilite.level === "modéré"
              ? "Quelques points de vigilance"
              : fragilite.level === "élevé"
              ? "Situation tendue à surveiller"
              : "Action immédiate recommandée"}
          </p>
          {(fragilite.details.decouvert > 0 || fragilite.details.arrieres > 0) && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {fragilite.details.decouvert > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-overlay text-ink-ghost">
                  découvert +{fragilite.details.decouvert}
                </span>
              )}
              {fragilite.details.arrieres > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-overlay text-ink-ghost">
                  arriérés +{fragilite.details.arrieres}
                </span>
              )}
            </div>
          )}
        </div>
      </KPICard>

      {/* ── Momentum ─────────────────────────────────────────── */}
      <KPICard label="MOMENTUM">
        <div className="w-[92px] h-[92px] flex flex-col items-center justify-center shrink-0 gap-1">
          <MomentumArrow momentum={momentum} />
          <span className="text-lg font-bold tabular-nums leading-none text-ink">
            {momentum === null
              ? "—"
              : `${momentum >= 0 ? "+" : ""}${momentum}j`}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink leading-snug">
            {momentumLabel(momentum)}
          </p>
          <p className="text-xs text-ink-soft mt-1 leading-snug">
            {momentum === null
              ? "Solde non renseigné"
              : Math.abs(momentum) === 0
              ? "Équilibre exact ce mois"
              : `${Math.abs(momentum)} j de runway ${momentum >= 0 ? "gagnés" : "perdus"}/mois`}
          </p>
          <p className="text-xs text-ink-ghost mt-1">
            Net mensuel :{" "}
            <span className={monthlyNet >= 0 ? "text-calm" : "text-critique"}>
              {monthlyNet >= 0 ? "+" : ""}
              {fmt(monthlyNet)}
            </span>
          </p>
        </div>
      </KPICard>
    </div>
  );
}

function KPICard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4 flex flex-col gap-3">
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">{label}</p>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}

function MomentumArrow({ momentum }: { momentum: number | null }) {
  if (momentum === null) return <Minus size={30} className="text-ink-ghost" />;
  if (momentum === 0) return <Minus size={30} className="text-ink-soft" />;
  if (momentum > 0) return <TrendingUp size={30} className="text-calm" />;
  return <TrendingDown size={30} className="text-critique" />;
}

function momentumLabel(momentum: number | null): string {
  if (momentum === null) return "—";
  if (momentum > 10) return "Forte amélioration";
  if (momentum > 3) return "En amélioration";
  if (momentum >= 0) return "Stable";
  if (momentum > -5) return "Légère dégradation";
  return "En dégradation";
}
