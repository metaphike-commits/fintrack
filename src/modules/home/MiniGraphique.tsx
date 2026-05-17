"use client";

import { useMemo } from "react";
import type { DayProjection } from "@/lib/projection";

interface MiniGraphiqueProps {
  projections: DayProjection[];
  confortThreshold?: number;
}

const VW = 480;
const VH = 88;
const PAD_X = 2;
const PAD_Y = 6;

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function MiniGraphique({ projections, confortThreshold }: MiniGraphiqueProps) {
  const derived = useMemo(() => {
    if (projections.length < 2) return null;

    const soldes = projections.map((p) => p.solde);
    const values = confortThreshold !== undefined
      ? [...soldes, confortThreshold, 0]
      : [...soldes, 0];
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = Math.max(rawMax - rawMin, 1);
    const n = projections.length;

    const toX = (i: number) => PAD_X + (i / (n - 1)) * (VW - 2 * PAD_X);
    const toY = (v: number) => VH - PAD_Y - ((v - rawMin) / range) * (VH - 2 * PAD_Y);

    const polylinePoints = projections.map((p, i) => `${toX(i)},${toY(p.solde)}`).join(" ");

    const areaPath =
      `M${toX(0)},${toY(rawMin)} ` +
      projections.map((p, i) => `L${toX(i)},${toY(p.solde)}`).join(" ") +
      ` L${toX(n - 1)},${toY(rawMin)} Z`;

    const minIdx = soldes.indexOf(Math.min(...soldes));

    return {
      toX,
      toY,
      polylinePoints,
      areaPath,
      rawMin,
      rawMax,
      minIdx,
      zeroY: rawMin < 0 ? toY(0) : null,
      confortY: confortThreshold !== undefined ? toY(confortThreshold) : null,
      pointBasX: toX(minIdx),
      pointBasY: toY(soldes[minIdx]),
      pointBasSolde: soldes[minIdx],
      pointBasDate: projections[minIdx].date,
    };
  }, [projections, confortThreshold]);

  if (!derived) return null;

  const {
    polylinePoints, areaPath, zeroY, confortY,
    pointBasX, pointBasY, pointBasSolde, pointBasDate,
    toX, toY,
  } = derived;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full"
        style={{ height: VH }}
        aria-hidden="true"
      >
        {/* Area fill */}
        <path
          d={areaPath}
          fill="var(--accent)"
          fillOpacity={0.08}
        />

        {/* Zero line */}
        {zeroY !== null && (
          <line
            x1={PAD_X} y1={zeroY} x2={VW - PAD_X} y2={zeroY}
            stroke="var(--critique)" strokeOpacity={0.35} strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Comfort threshold */}
        {confortY !== null && (
          <line
            x1={PAD_X} y1={confortY} x2={VW - PAD_X} y2={confortY}
            stroke="var(--attention)" strokeOpacity={0.45} strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Projection line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Today dot */}
        <circle
          cx={toX(0)}
          cy={toY(projections[0].solde)}
          r={3}
          fill="var(--accent)"
        />

        {/* Point bas dot */}
        <circle
          cx={pointBasX}
          cy={pointBasY}
          r={3.5}
          fill="var(--critique)"
        />
      </svg>

      {/* Point bas label */}
      <div className="flex justify-between items-center mt-1 px-0.5">
        <span className="text-xs text-ink-ghost">Aujourd'hui</span>
        <span className="text-xs text-critique">
          Point bas : {pointBasSolde.toLocaleString("fr-FR")} € · {fmtDate(pointBasDate)}
        </span>
      </div>
    </div>
  );
}
