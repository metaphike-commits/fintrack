"use client";

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

interface ProjectionChartProps {
  series: ChartSeries[];
  labels: string[];
  soldeCourant: number;
}

const VW = 560;
const VH = 180;
const PT = 16;
const PR = 20;
const PB = 28;
const PL = 58;
const PLOT_W = VW - PL - PR;
const PLOT_H = VH - PT - PB;

function niceStep(range: number): number {
  if (range === 0) return 500;
  const rough = range / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  return [1, 2, 2.5, 5, 10].map((f) => f * mag).find((c) => c >= rough) ?? mag * 10;
}

function fmtK(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(Math.abs(v) % 1000 === 0 ? 0 : 1)}k`;
  return String(v);
}

export function ProjectionChart({ series, labels, soldeCourant }: ProjectionChartProps) {
  const all = [soldeCourant, 0, ...series.flatMap((s) => s.values)];
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const step = niceStep(rawMax - rawMin);
  const yMin = Math.floor(rawMin / step) * step;
  const yMax = Math.ceil(rawMax / step) * step;
  const yRange = yMax - yMin || 1;
  const pts = labels.length;

  function toX(i: number) {
    return PL + (i / pts) * PLOT_W;
  }
  function toY(v: number) {
    return PT + PLOT_H - ((v - yMin) / yRange) * PLOT_H;
  }
  function buildPath(values: number[]) {
    return [soldeCourant, ...values]
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`)
      .join(" ");
  }

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + step * 0.01; v += step) {
    yTicks.push(Math.round(v));
  }

  const zeroY = toY(0);
  const showZero = zeroY > PT && zeroY < VH - PB;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full text-ink" aria-hidden>
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PL} y1={toY(v)} x2={VW - PR} y2={toY(v)}
            stroke="currentColor" strokeOpacity={0.07} strokeWidth={1}
          />
          <text
            x={PL - 6} y={toY(v)}
            textAnchor="end" dominantBaseline="middle"
            fontSize={8.5} fill="currentColor" fillOpacity={0.35}
          >
            {fmtK(v)}
          </text>
        </g>
      ))}

      {showZero && (
        <line
          x1={PL} y1={zeroY} x2={VW - PR} y2={zeroY}
          stroke="currentColor" strokeOpacity={0.25} strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}

      {labels.map((l, i) => (
        <text
          key={i}
          x={toX(i + 1)} y={VH - PB + 13}
          textAnchor="middle" fontSize={8.5}
          fill="currentColor" fillOpacity={0.35}
        >
          {l}
        </text>
      ))}

      {series.map((s) => {
        const lastVal = s.values[s.values.length - 1];
        return (
          <g key={s.id}>
            <path
              d={buildPath(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.dashed ? 1.5 : 2}
              strokeDasharray={s.dashed ? "6 3" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={toX(pts)} cy={toY(lastVal)} r={3} fill={s.color} />
          </g>
        );
      })}
    </svg>
  );
}
