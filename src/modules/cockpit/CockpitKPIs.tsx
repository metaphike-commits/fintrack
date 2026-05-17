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
  const gridRef = useStaggerEntrance<HTMLDivElement>({ duration: 520, y: 22 });

  return (
    <div ref={gridRef} className="grid grid-cols-3 gap-4">
      {/* ── Runway ───────────────────────────────────────────── */}
      <KPICard label="RUNWAY" accentColor={runwayColor(runway.jours)}>
        <GaugeCircle
          value={runwayToGaugeValue(runway.jours)}
          color={runwayColor(runway.jours)}
          size={96}
          strokeWidth={8}
        >
          <span
            className="text-base font-bold tabular-nums leading-none"
            style={{
              color: runwayColor(runway.jours),
              textShadow: `0 0 16px ${runwayColor(runway.jours)}80`,
            }}
          >
            {runway.label}
          </span>
        </GaugeCircle>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug tabular-nums">
            {soldeEffectif !== null ? fmt(soldeEffectif) : "—"}
          </p>
          <p className="text-xs text-ink-soft mt-1.5 leading-snug">{runway.sublabel}</p>
        </div>
      </KPICard>

      {/* ── Score Fragilité ───────────────────────────────────── */}
      <KPICard label="FRAGILITÉ" accentColor={fragilite.color}>
        <GaugeCircle value={fragilite.score} color={fragilite.color} size={96} strokeWidth={8}>
          <span
            className="text-base font-bold tabular-nums leading-none"
            style={{
              color: fragilite.color,
              textShadow: `0 0 16px ${fragilite.color}80`,
            }}
          >
            {fragilite.score}
          </span>
          <span className="text-[9px] text-ink-ghost leading-none mt-0.5">/ 100</span>
        </GaugeCircle>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug">{fragilite.label}</p>
          <p className="text-xs text-ink-soft mt-1.5 leading-snug">
            {fragilite.level === "faible"
              ? "Situation confortable"
              : fragilite.level === "modéré"
              ? "Points de vigilance"
              : fragilite.level === "élevé"
              ? "Situation tendue"
              : "Action immédiate"}
          </p>
          {(fragilite.details.decouvert > 0 || fragilite.details.arrieres > 0) && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {fragilite.details.decouvert > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-border text-ink-ghost">
                  découvert +{fragilite.details.decouvert}
                </span>
              )}
              {fragilite.details.arrieres > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-border text-ink-ghost">
                  arriérés +{fragilite.details.arrieres}
                </span>
              )}
            </div>
          )}
        </div>
      </KPICard>

      {/* ── Momentum ─────────────────────────────────────────── */}
      <KPICard
        label="MOMENTUM"
        accentColor={
          momentum === null ? "rgba(255,255,255,0.2)"
          : momentum >= 0 ? "#10b981"
          : "#ef4444"
        }
      >
        <div className="w-[96px] h-[96px] flex flex-col items-center justify-center shrink-0 gap-1">
          <MomentumArrow momentum={momentum} />
          <span
            className="text-xl font-bold tabular-nums leading-none"
            style={{
              color:
                momentum === null ? "var(--ink-soft)"
                : momentum >= 0 ? "var(--calm)"
                : "var(--critique)",
              textShadow:
                momentum === null ? undefined
                : momentum >= 0
                ? "0 0 16px rgba(16,185,129,0.5)"
                : "0 0 16px rgba(239,68,68,0.5)",
            }}
          >
            {momentum === null ? "—" : `${momentum >= 0 ? "+" : ""}${momentum}j`}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug">
            {momentumLabel(momentum)}
          </p>
          <p className="text-xs text-ink-soft mt-1.5 leading-snug">
            {momentum === null
              ? "Solde non renseigné"
              : Math.abs(momentum) === 0
              ? "Équilibre exact ce mois"
              : `${Math.abs(momentum)} j de runway ${momentum >= 0 ? "gagnés" : "perdus"}/mois`}
          </p>
          <p className="text-xs text-ink-ghost mt-1">
            Net :{" "}
            <span
              className="font-mono font-semibold"
              style={{
                color: monthlyNet >= 0 ? "var(--calm)" : "var(--critique)",
              }}
            >
              {monthlyNet >= 0 ? "+" : ""}{fmt(monthlyNet)}
            </span>
          </p>
        </div>
      </KPICard>
    </div>
  );
}

function KPICard({
  label,
  accentColor,
  children,
}: {
  label: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden card-hover"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Top gradient accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}90, transparent)`,
        }}
      />

      {/* Corner ambient glow */}
      <div
        className="absolute -top-12 -left-12 w-36 h-36 rounded-full pointer-events-none"
        style={{
          background: accentColor,
          filter: "blur(50px)",
          opacity: 0.10,
        }}
      />

      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-ghost relative z-10">
        {label}
      </p>
      <div className="flex items-center gap-4 relative z-10">{children}</div>
    </div>
  );
}

function MomentumArrow({ momentum }: { momentum: number | null }) {
  if (momentum === null) return <Minus size={28} className="text-ink-ghost" />;
  if (momentum === 0) return <Minus size={28} className="text-ink-soft" />;
  if (momentum > 0)
    return (
      <TrendingUp
        size={28}
        style={{ color: "var(--calm)", filter: "drop-shadow(0 0 8px rgba(16,185,129,0.5))" }}
      />
    );
  return (
    <TrendingDown
      size={28}
      style={{ color: "var(--critique)", filter: "drop-shadow(0 0 8px rgba(239,68,68,0.5))" }}
    />
  );
}

function momentumLabel(momentum: number | null): string {
  if (momentum === null) return "—";
  if (momentum > 10) return "Forte amélioration";
  if (momentum > 3) return "En amélioration";
  if (momentum >= 0) return "Stable";
  if (momentum > -5) return "Légère dégradation";
  return "En dégradation";
}
