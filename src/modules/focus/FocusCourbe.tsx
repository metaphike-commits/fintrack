"use client";

import { useMemo } from "react";
import type { DayProjection } from "@/lib/projection";

interface FocusCourbeProps {
  ghostSoldes: number[];
  projections: DayProjection[];
  scenarioProjections?: DayProjection[];
  scenarioColor?: string;
  confortThreshold: number;
}

const VW = 720;
const VH = 260;
const PL = 48;
const PR = 12;
const PT = 16;
const PB = 24;
const PLOT_W = VW - PL - PR;
const PLOT_H = VH - PT - PB;

function fmtK(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

export function FocusCourbe({
  ghostSoldes,
  projections,
  scenarioProjections,
  scenarioColor,
  confortThreshold,
}: FocusCourbeProps) {
  const derived = useMemo(() => {
    const GHOST = ghostSoldes.length;
    const PROJ = projections.length;
    const TOTAL = GHOST + PROJ;
    if (TOTAL < 2) return null;

    const allSoldes = [
      ...ghostSoldes,
      ...projections.map((p) => p.solde),
      ...(scenarioProjections?.map((p) => p.solde) ?? []),
    ];
    const allVals = [...allSoldes, confortThreshold, 0];
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const range = Math.max(rawMax - rawMin, 1);

    const toX = (i: number) => PL + (i / (TOTAL - 1)) * PLOT_W;
    const toY = (v: number) => PT + PLOT_H - ((v - rawMin) / range) * PLOT_H;

    const bottomY = PT + PLOT_H;
    const todayX = toX(GHOST);
    const confortY = toY(confortThreshold);
    const zeroY = rawMin < 0 ? toY(0) : null;

    // Ghost path (dashed)
    const ghostPoints = ghostSoldes
      .map((s, i) => `${toX(i)},${toY(s)}`)
      .join(" ");

    // Projection polyline
    const projPoints = projections
      .map((p, i) => `${toX(GHOST + i)},${toY(p.solde)}`)
      .join(" ");

    // Projection area
    const projAreaPath =
      projections.length > 1
        ? `M${toX(GHOST)},${bottomY} ` +
          projections.map((p, i) => `L${toX(GHOST + i)},${toY(p.solde)}`).join(" ") +
          ` L${toX(GHOST + projections.length - 1)},${bottomY} Z`
        : "";

    // Scenario overlay polyline
    const scPoints = scenarioProjections
      ?.map((p, i) => `${toX(GHOST + i)},${toY(p.solde)}`)
      .join(" ");

    // Point bas (lowest in projection only)
    const projSoldes = projections.map((p) => p.solde);
    const minProjIdx = projSoldes.indexOf(Math.min(...projSoldes));
    const pointBasX = toX(GHOST + minProjIdx);
    const pointBasY = toY(projSoldes[minProjIdx]);
    const pointBasSolde = projSoldes[minProjIdx];
    const pointBasDate = projections[minProjIdx].date;

    // Month boundary labels
    const today = projections[0]?.date ?? new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - GHOST);

    const monthLabels: { x: number; label: string }[] = [];
    for (let i = 0; i < TOTAL; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      if (d.getDate() === 1) {
        monthLabels.push({
          x: toX(i),
          label: d.toLocaleDateString("fr-FR", { month: "short" }),
        });
      }
    }

    // Y-ticks: 4 values
    const step = (rawMax - rawMin) / 3;
    const yTicks = [0, 1, 2, 3].map((n) => rawMin + n * step);

    return {
      toX, toY, todayX, bottomY, confortY, zeroY,
      ghostPoints, projPoints, projAreaPath, scPoints,
      pointBasX, pointBasY, pointBasSolde, pointBasDate,
      monthLabels, yTicks,
    };
  }, [ghostSoldes, projections, scenarioProjections, confortThreshold]);

  if (!derived) return null;

  const {
    toX, toY, todayX, bottomY, confortY, zeroY,
    ghostPoints, projPoints, projAreaPath, scPoints,
    pointBasX, pointBasY, pointBasSolde, pointBasDate,
    monthLabels, yTicks,
  } = derived;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full text-ink"
      style={{ height: VH }}
      aria-hidden="true"
    >
      {/* Critical zone below comfort threshold */}
      <rect
        x={PL} y={confortY}
        width={PLOT_W} height={Math.max(0, bottomY - confortY)}
        fill="var(--critique)" fillOpacity={0.06}
      />

      {/* Zero line */}
      {zeroY !== null && (
        <line
          x1={PL} y1={zeroY} x2={VW - PR} y2={zeroY}
          stroke="var(--critique)" strokeOpacity={0.4} strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {/* Confort threshold line */}
      <line
        x1={PL} y1={confortY} x2={VW - PR} y2={confortY}
        stroke="var(--attention)" strokeOpacity={0.5} strokeWidth={1}
        strokeDasharray="4 3"
      />

      {/* Projection area fill */}
      {projAreaPath && (
        <path d={projAreaPath} fill="var(--accent)" fillOpacity={0.06} />
      )}

      {/* Ghost path — faded dashed */}
      {ghostPoints && (
        <polyline
          points={ghostPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeOpacity={0.2}
          strokeDasharray="5 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Projection polyline */}
      {projPoints && (
        <polyline
          points={projPoints}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Scenario overlay */}
      {scPoints && (
        <polyline
          points={scPoints}
          fill="none"
          stroke={scenarioColor ?? "var(--attention)"}
          strokeWidth={2}
          strokeDasharray="6 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Today vertical line */}
      <line
        x1={todayX} y1={PT - 4} x2={todayX} y2={bottomY + 4}
        stroke="currentColor" strokeOpacity={0.22} strokeWidth={1.5}
      />
      <text
        x={todayX} y={PT - 5}
        textAnchor="middle" fontSize={8}
        fill="currentColor" fillOpacity={0.4}
      >
        Auj.
      </text>

      {/* Point bas dot */}
      <circle cx={pointBasX} cy={pointBasY} r={4} fill="var(--critique)" />

      {/* Point bas label */}
      <text
        x={pointBasX} y={Math.max(pointBasY - 6, PT + 8)}
        textAnchor="middle" fontSize={7.5}
        fill="var(--critique)" fillOpacity={0.85}
      >
        {fmtK(pointBasSolde)}
      </text>

      {/* Y-axis ticks */}
      {yTicks.map((v, idx) => (
        <g key={idx}>
          <line
            x1={PL - 4} y1={toY(v)} x2={VW - PR} y2={toY(v)}
            stroke="currentColor" strokeOpacity={0.05} strokeWidth={1}
          />
          <text
            x={PL - 6} y={toY(v) + 3.5}
            textAnchor="end" fontSize={8}
            fill="currentColor" fillOpacity={0.3}
          >
            {fmtK(v)}
          </text>
        </g>
      ))}

      {/* Month labels */}
      {monthLabels.map(({ x, label }, idx) => (
        <g key={idx}>
          <line
            x1={x} y1={PT} x2={x} y2={bottomY}
            stroke="currentColor" strokeOpacity={0.06} strokeWidth={1}
          />
          <text
            x={x} y={VH - 4}
            textAnchor="middle" fontSize={8}
            fill="currentColor" fillOpacity={0.35}
          >
            {label}
          </text>
        </g>
      ))}

      {/* Point bas date hint below chart area */}
      {/* (rendered outside SVG in the parent) */}
    </svg>
  );
}
