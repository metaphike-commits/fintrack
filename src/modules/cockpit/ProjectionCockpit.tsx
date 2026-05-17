"use client";

import { useMemo } from "react";
import type { DayProjection } from "@/lib/projection";

// ── SVG constants ─────────────────────────────────────────────
const VW = 760;
const VH = 200;
const PL = 54; // left padding (Y labels)
const PR = 16;
const PT = 14;
const PB = 34;
const PW = VW - PL - PR;
const PH = VH - PT - PB;

function fmt(n: number) {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k€`;
  return `${Math.round(n)}€`;
}

interface ProjectionCockpitProps {
  projections: DayProjection[];
  confortThreshold: number;
  scenarioProjections?: DayProjection[];
  scenarioColor?: string;
}

export function ProjectionCockpit({
  projections,
  confortThreshold,
  scenarioProjections,
  scenarioColor = "#14b8a6",
}: ProjectionCockpitProps) {
  const { projPts, scenPts, minY, maxY, pointBasIdx, yOf, xOf, monthLines, yTicks } =
    useMemo(() => {
      if (projections.length === 0) return null as never;

      const allSoldes = projections.map((d) => d.solde);
      if (scenarioProjections) allSoldes.push(...scenarioProjections.map((d) => d.solde));
      allSoldes.push(confortThreshold);

      const rawMin = Math.min(...allSoldes);
      const rawMax = Math.max(...allSoldes);
      const pad = (rawMax - rawMin) * 0.12 || 200;
      const minY = rawMin - pad;
      const maxY = rawMax + pad;
      const rangeY = maxY - minY || 1;
      const n = projections.length;

      const xOf = (i: number) => PL + (i / (n - 1)) * PW;
      const yOf = (s: number) => PT + PH - ((s - minY) / rangeY) * PH;

      const projPts = projections.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.solde).toFixed(1)}`).join(" ");
      const scenPts = scenarioProjections
        ? scenarioProjections.map((d, i) => `${xOf(i).toFixed(1)},${yOf(d.solde).toFixed(1)}`).join(" ")
        : "";

      let pointBasIdx = 0;
      for (let i = 1; i < projections.length; i++) {
        if (projections[i].solde < projections[pointBasIdx].solde) pointBasIdx = i;
      }

      // Month boundary lines (every 30 days)
      const monthLines: { x: number; label: string }[] = [];
      for (let d = 30; d < n; d += 30) {
        const date = projections[d]?.date;
        if (!date) continue;
        monthLines.push({
          x: xOf(d),
          label: date.toLocaleDateString("fr-FR", { month: "short" }),
        });
      }

      // Y-axis ticks (4 labels)
      const yTicks = [0, 1, 2, 3].map((i) => {
        const val = minY + (rangeY / 3) * i;
        return { y: yOf(val), label: fmt(val) };
      });

      return { projPts, scenPts, minY, maxY, pointBasIdx, yOf, xOf, monthLines, yTicks };
    }, [projections, scenarioProjections, confortThreshold]);

  if (projections.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-5 flex items-center justify-center h-[200px]">
        <p className="text-xs text-ink-ghost">Aucune donnée de projection</p>
      </div>
    );
  }

  const pointBas = projections[pointBasIdx];
  const pointBasX = xOf(pointBasIdx);
  const pointBasY = yOf(pointBas.solde);
  const confortY = yOf(confortThreshold);

  const today = projections[0]?.date;
  const todayLabel = today?.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-xs font-mono uppercase tracking-widest text-ink-ghost">
          Projection 90 jours
        </p>
        <div className="flex items-center gap-4">
          <LegendDot color="var(--accent)" label="Projection" />
          {scenarioProjections && <LegendDot color={scenarioColor} dashed label="Scénario actif" />}
          <LegendDot color="var(--critique)" dashed label="Point bas" />
          <LegendDot color="var(--attention)" dashed label="Confort" />
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full"
        style={{ height: VH }}
        preserveAspectRatio="none"
      >
        {/* Grid + month boundaries */}
        {monthLines.map((m) => (
          <g key={m.x}>
            <line
              x1={m.x} y1={PT}
              x2={m.x} y2={PT + PH}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={m.x}
              y={VH - 6}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize={10}
              fontFamily="monospace"
            >
              {m.label}
            </text>
          </g>
        ))}

        {/* Today line */}
        <line
          x1={PL} y1={PT}
          x2={PL} y2={PT + PH}
          stroke="var(--border-strong)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <text x={PL + 4} y={PT + 10} fill="var(--muted)" fontSize={9} fontFamily="monospace">
          {todayLabel}
        </text>

        {/* Y axis ticks */}
        {yTicks.map((t) => (
          <g key={t.y}>
            <line
              x1={PL - 4} y1={t.y}
              x2={PL} y2={t.y}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={PL - 6}
              y={t.y + 4}
              textAnchor="end"
              fill="var(--muted)"
              fontSize={9}
              fontFamily="monospace"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Confort threshold line */}
        {confortY >= PT && confortY <= PT + PH && (
          <line
            x1={PL} y1={confortY}
            x2={VW - PR} y2={confortY}
            stroke="var(--attention)"
            strokeWidth={1}
            strokeDasharray="4 5"
            opacity={0.6}
          />
        )}

        {/* Point bas horizontal */}
        <line
          x1={PL} y1={pointBasY}
          x2={VW - PR} y2={pointBasY}
          stroke="var(--critique)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />

        {/* Point bas vertical + label */}
        <line
          x1={pointBasX} y1={PT}
          x2={pointBasX} y2={pointBasY}
          stroke="var(--critique)"
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.4}
        />
        <circle cx={pointBasX} cy={pointBasY} r={4} fill="var(--critique)" opacity={0.9} />
        <text
          x={Math.min(pointBasX + 5, VW - PR - 50)}
          y={pointBasY - 6}
          fill="var(--critique)"
          fontSize={9}
          fontFamily="monospace"
          opacity={0.85}
        >
          {fmt(pointBas.solde)}
        </text>

        {/* Scénario line */}
        {scenPts && (
          <polyline
            points={scenPts}
            fill="none"
            stroke={scenarioColor}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        )}

        {/* Projection area fill */}
        <defs>
          <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {projPts && (
          <polygon
            points={`${PL},${PT + PH} ${projPts} ${xOf(projections.length - 1)},${PT + PH}`}
            fill="url(#projGrad)"
          />
        )}

        {/* Projection line */}
        <polyline
          points={projPts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Starting dot */}
        <circle cx={PL} cy={yOf(projections[0].solde)} r={3} fill="var(--accent)" />
      </svg>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width={16} height={8} viewBox="0 0 16 8">
        <line
          x1={0} y1={4} x2={16} y2={4}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashed ? "4 3" : undefined}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] text-ink-ghost font-mono">{label}</span>
    </div>
  );
}
