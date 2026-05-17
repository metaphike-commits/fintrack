"use client";

import { useMemo } from "react";
import type { DayProjection } from "@/lib/projection";

interface TimelineCourbeProps {
  projections: DayProjection[];
  daysInMonth: number;
  todayDayOfMonth: number;
  confortThreshold: number;
  scenarioProjections?: DayProjection[];
  scenarioColor?: string;
}

const VW = 480;
const VH = 96;
const PX = 4;
const PY = 10;
const PLOT_W = VW - 2 * PX;
const PLOT_H = VH - PY - 14; // 14px reserved for day labels

function fmtK(v: number) {
  const abs = Math.abs(v);
  return abs >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}

export function TimelineCourbe({
  projections, daysInMonth, todayDayOfMonth, confortThreshold,
  scenarioProjections, scenarioColor,
}: TimelineCourbeProps) {
  const derived = useMemo(() => {
    if (projections.length === 0 || daysInMonth < 2) return null;

    const soldes = projections.map((p) => p.solde);
    const scenSoldes = scenarioProjections?.map((p) => p.solde) ?? [];
    const allVals = [...soldes, ...scenSoldes, confortThreshold, 0];
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const range = Math.max(rawMax - rawMin, 1);

    const toX = (day: number) =>
      PX + ((day - 1) / (daysInMonth - 1)) * PLOT_W;
    const toY = (v: number) =>
      PY + PLOT_H - ((v - rawMin) / range) * PLOT_H;

    const todayX = toX(todayDayOfMonth);
    const bottomY = PY + PLOT_H;
    const confortY = toY(confortThreshold);
    const zeroY = rawMin < 0 ? toY(0) : null;

    // Projection polyline — index i → day (todayDayOfMonth + i)
    const polylinePoints = projections
      .map((p, i) => `${toX(todayDayOfMonth + i)},${toY(p.solde)}`)
      .join(" ");

    // Area under projection line
    const lastX = toX(Math.min(todayDayOfMonth + projections.length - 1, daysInMonth));
    const areaPath =
      projections.length > 1
        ? `M${todayX},${bottomY} ` +
          projections.map((p, i) => `L${toX(todayDayOfMonth + i)},${toY(p.solde)}`).join(" ") +
          ` L${lastX},${bottomY} Z`
        : "";

    // Point bas
    const minIdx = soldes.indexOf(Math.min(...soldes));
    const pointBasX = toX(todayDayOfMonth + minIdx);
    const pointBasY = toY(soldes[minIdx]);
    const pointBasSolde = soldes[minIdx];
    const pointBasDay = todayDayOfMonth + minIdx;

    // Day tick labels: 1, mid, last
    const midDay = Math.round(daysInMonth / 2);
    const dayLabels = [...new Set([1, midDay, daysInMonth])];

    const scPoints = scenarioProjections
      ?.map((p, i) => `${toX(todayDayOfMonth + i)},${toY(p.solde)}`)
      .join(" ");

    return {
      toX, toY,
      todayX, bottomY, confortY, zeroY,
      polylinePoints, areaPath,
      pointBasX, pointBasY, pointBasSolde, pointBasDay,
      dayLabels, rawMin, scPoints,
    };
  }, [projections, daysInMonth, todayDayOfMonth, confortThreshold, scenarioProjections]);

  if (!derived) return null;

  const {
    toX, todayX, bottomY, confortY, zeroY,
    polylinePoints, areaPath,
    pointBasX, pointBasY, pointBasSolde, pointBasDay,
    dayLabels, scPoints,
  } = derived;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full text-ink"
        style={{ height: VH }}
        aria-hidden="true"
      >
        {/* Past days — subtle background */}
        <rect
          x={PX} y={PY}
          width={Math.max(0, todayX - PX)}
          height={PLOT_H}
          fill="currentColor"
          fillOpacity={0.03}
        />

        {/* Fragile zone below comfort threshold */}
        <rect
          x={PX} y={confortY}
          width={PLOT_W}
          height={Math.max(0, bottomY - confortY)}
          fill="var(--critique)"
          fillOpacity={0.055}
        />

        {/* Zero line */}
        {zeroY !== null && (
          <line
            x1={PX} y1={zeroY} x2={VW - PX} y2={zeroY}
            stroke="var(--critique)" strokeOpacity={0.35} strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Confort threshold line */}
        <line
          x1={PX} y1={confortY} x2={VW - PX} y2={confortY}
          stroke="var(--attention)" strokeOpacity={0.55} strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Today vertical line */}
        <line
          x1={todayX} y1={PY - 2} x2={todayX} y2={bottomY + 2}
          stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.5}
        />

        {/* Projection area fill */}
        {areaPath && (
          <path d={areaPath} fill="var(--accent)" fillOpacity={0.07} />
        )}

        {/* Projection polyline */}
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Scenario overlay polyline */}
        {scPoints && (
          <polyline
            points={scPoints}
            fill="none"
            stroke={scenarioColor ?? "var(--attention)"}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Point bas dot */}
        <circle cx={pointBasX} cy={pointBasY} r={3.5} fill="var(--critique)" />

        {/* Day tick labels */}
        {dayLabels.map((d) => (
          <text
            key={d}
            x={toX(d)} y={VH - 1}
            textAnchor="middle" fontSize={8}
            fill="currentColor" fillOpacity={0.3}
          >
            {d}
          </text>
        ))}

        {/* "Aujourd'hui" label */}
        <text
          x={todayX} y={PY - 1}
          textAnchor="middle" fontSize={7.5}
          fill="currentColor" fillOpacity={0.35}
        >
          Auj.
        </text>
      </svg>

      {/* Point bas summary */}
      <div className="flex justify-end mt-0.5 px-0.5">
        <span className="text-xs text-critique">
          Point bas : {pointBasSolde.toLocaleString("fr-FR")} € · j. {pointBasDay}
        </span>
      </div>
    </div>
  );
}
