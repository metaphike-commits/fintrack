"use client";

import { useMemo, useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Star, AlertTriangle,
  Info, Calendar, Upload, Trash2, Sparkles, ArrowUpRight,
  ArrowDownRight, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useTransactionsStore } from "@/store/transactions";
import {
  getTendanceFull, getTopCategories, detectAnomalies,
  getDepensesCompressibles, getPeriode,
  getDayOfWeekStats, getScoreComportemental,
  getTopBeneficiaires, getEvolutionCategories, getSankeyData,
  computeInsights, getCashflowMensuelMoyen, getBurnRateGlissant,
  type MoisStatFull, type Insight,
} from "@/lib/analyse";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStaggerEntrance } from "@/hooks/useStaggerEntrance";
import { Button } from "@/components/ui/Button";
import { BudgetVsReel } from "./BudgetVsReel";
import { TransactionsTable } from "./TransactionsTable";
import { cn } from "@/lib/cn";

// ── Design tokens ──────────────────────────────────────────────
const GB  = "1px solid rgba(255,255,255,0.07)";
const GBF = "1px solid rgba(255,255,255,0.10)";

const CAT_COLOR_MAP: Record<string, string> = {
  salaire: "#22c55e", freelance: "#10b981", remboursement: "#06b6d4",
  allocation: "#84cc16", loyer: "#6366f1", logement: "#6366f1",
  électricité: "#f59e0b", eau: "#38bdf8", internet: "#8b5cf6",
  transport: "#f59e0b", stationnement: "#fb923c", carburant: "#f97316",
  alimentation: "#10b981", restauration: "#f97316", santé: "#ec4899",
  loisirs: "#06b6d4", vêtements: "#a78bfa",
  abonnements: "#8b5cf6", assurance: "#64748b", épargne: "#22c55e",
  crédit: "#ef4444", impôts: "#ef4444", amende: "#ef4444",
  autre: "#94a3b8", revenu: "#22c55e",
};
const CAT_COLORS_FALLBACK = [
  "#6366f1","#f59e0b","#10b981","#ef4444",
  "#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899","#38bdf8",
];
function catColor(cat: string, idx = 0) {
  return CAT_COLOR_MAP[cat] ?? CAT_COLORS_FALLBACK[idx % CAT_COLORS_FALLBACK.length];
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ── Sparkline ──────────────────────────────────────────────────
function Sparkline({ data, color, filled }: { data: number[]; color: string; filled?: boolean }) {
  const W = 72, H = 28;
  if (data.length < 2) return <div style={{ width: W, height: H }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 4 - ((v - min) / rng) * (H - 8);
    return [x, y] as [number, number];
  });
  const polyPts = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const fillPath = `M ${pts[0][0]},${H} ${pts.map(([x, y]) => `L ${x},${y}`).join(" ")} L ${pts[pts.length - 1][0]},${H} Z`;
  return (
    <svg width={W} height={H} className="shrink-0">
      {filled && (
        <path d={fillPath} fill={color} opacity={0.12} />
      )}
      <polyline
        points={polyPts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2} fill={color} />
    </svg>
  );
}

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({
  label, value, sparkData, color, delta, deltaLabel,
}: {
  label: string;
  value: string;
  sparkData: number[];
  color: string;
  delta?: number;
  deltaLabel?: string;
}) {
  const isPos = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <p className="text-[9px] font-mono uppercase tracking-widest text-ink-ghost">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-lg font-bold tabular-nums leading-none" style={{ color }}>{value}</p>
        <Sparkline data={sparkData} color={color} filled />
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1">
          {isPos
            ? <ArrowUpRight size={10} style={{ color: "#22c55e" }} />
            : <ArrowDownRight size={10} style={{ color: "#ef4444" }} />}
          <span className="text-[9px] font-mono" style={{ color: isPos ? "#22c55e" : "#ef4444" }}>
            {fmtPct(delta)}
          </span>
          {deltaLabel && <span className="text-[9px] text-ink-ghost">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ── Recharts tooltip ───────────────────────────────────────────
interface TPayload { name: string; value: number; color: string }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2.5 text-xs shadow-2xl" style={{ border: GBF, background: "rgba(12,12,16,0.95)" }}>
      <p className="text-ink-ghost mb-2 font-mono text-[10px]">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-ink-ghost capitalize">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-ink pl-4">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Evolution chart ────────────────────────────────────────────
type ViewMode = "mois" | "trimestre" | "annee";

function groupByQuarter(data: MoisStatFull[]) {
  const map = new Map<string, { revenus: number; depenses: number; net: number }>();
  for (const m of data) {
    const [year, month] = m.key.split("-").map(Number);
    const q = Math.ceil(month / 3);
    const key = `${year} Q${q}`;
    const e = map.get(key) ?? { revenus: 0, depenses: 0, net: 0 };
    e.revenus += m.revenus; e.depenses += m.depenses; e.net += m.net;
    map.set(key, e);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ name: key, ...v }));
}

function groupByYear(data: MoisStatFull[]) {
  const map = new Map<string, { revenus: number; depenses: number; net: number }>();
  for (const m of data) {
    const year = m.key.slice(0, 4);
    const e = map.get(year) ?? { revenus: 0, depenses: 0, net: 0 };
    e.revenus += m.revenus; e.depenses += m.depenses; e.net += m.net;
    map.set(year, e);
  }
  return [...map.entries()].sort().map(([year, v]) => ({ name: year, ...v }));
}

function EvolutionChart({ tendance }: { tendance: MoisStatFull[] }) {
  const [mode, setMode] = useState<ViewMode>("mois");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useMemo(() => {
    if (mode === "trimestre") return groupByQuarter(tendance);
    if (mode === "annee") return groupByYear(tendance);
    return tendance.map((m) => ({ name: m.moisLabel, revenus: m.revenus, depenses: m.depenses, net: m.net }));
  }, [tendance, mode]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Évolution financière</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[9px] text-ink-ghost">
            <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] rounded-full inline-block" style={{ background: "#22c55e" }} />Revenus</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] rounded-full inline-block" style={{ background: "#ef4444" }} />Dépenses</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] rounded-full inline-block opacity-70" style={{ background: "#6366f1" }} />Épargne nette</span>
          </div>
          <div className="flex items-center p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: GB }}>
            {(["mois", "trimestre", "annee"] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn("text-[9px] px-2.5 py-1 rounded-md capitalize transition-colors",
                  mode === m ? "bg-accent text-white" : "text-ink-ghost hover:text-ink"
                )}
              >
                {m === "mois" ? "Mois" : m === "trimestre" ? "Trim." : "Année"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height: 220 }}>
        {!mounted ? <div style={{ height: 220 }} /> : <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--ink-ghost)", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "var(--ink-ghost)", fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={36} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenus" name="Revenus" stroke="#22c55e" strokeWidth={2} fill="url(#gradRev)" dot={false} activeDot={{ r: 4, fill: "#22c55e" }} />
            <Area type="monotone" dataKey="depenses" name="Dépenses" stroke="#ef4444" strokeWidth={2} fill="url(#gradDep)" dot={false} activeDot={{ r: 4, fill: "#ef4444" }} />
            <Area type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={1.5} fill="url(#gradNet)" dot={false} strokeDasharray="4 2" activeDot={{ r: 3, fill: "#6366f1" }} />
          </AreaChart>
        </ResponsiveContainer>}
      </div>
    </div>
  );
}

// ── Insights panel ─────────────────────────────────────────────
const INSIGHT_ICON: Record<Insight["icon"], React.ReactNode> = {
  "trending-up":   <TrendingUp size={11} />,
  "trending-down": <TrendingDown size={11} />,
  "star":          <Star size={11} />,
  "alert":         <AlertTriangle size={11} />,
  "info":          <Info size={11} />,
  "calendar":      <Calendar size={11} />,
};
const INSIGHT_COLOR: Record<Insight["type"], string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral:  "#6366f1",
  alert:    "#f59e0b",
};

function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: GB }}>
        <Sparkles size={11} className="text-accent" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Insights clés</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {insights.length === 0 && (
          <p className="text-xs text-ink-ghost px-4 py-6 text-center">Importez des données pour voir les insights.</p>
        )}
        {insights.map((ins) => {
          const color = INSIGHT_COLOR[ins.type];
          return (
            <div key={ins.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors" style={{ borderBottom: GB }}>
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0 rounded-md p-1" style={{ background: color + "18", color }}>
                  {INSIGHT_ICON[ins.icon]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink leading-snug">{ins.title}</p>
                  <p className="text-[10px] text-ink-ghost leading-relaxed mt-0.5">{ins.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Donut premium ──────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function donutArc(cx: number, cy: number, or_: number, ir: number, start: number, end: number) {
  if (end - start >= 359.9) end = start + 359.9;
  const os = polarToCartesian(cx, cy, or_, start);
  const oe = polarToCartesian(cx, cy, or_, end);
  const is_ = polarToCartesian(cx, cy, ir, start);
  const ie = polarToCartesian(cx, cy, ir, end);
  const lg = end - start > 180 ? 1 : 0;
  return `M ${os.x.toFixed(1)} ${os.y.toFixed(1)} A ${or_} ${or_} 0 ${lg} 1 ${oe.x.toFixed(1)} ${oe.y.toFixed(1)} L ${ie.x.toFixed(1)} ${ie.y.toFixed(1)} A ${ir} ${ir} 0 ${lg} 0 ${is_.x.toFixed(1)} ${is_.y.toFixed(1)} Z`;
}

function DonutPremium({ categories, total }: { categories: { categorie: string; total: number; count: number }[]; total: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const SIZE = 120, CX = SIZE / 2, CY = SIZE / 2, OR = 52, IR = 34, GAP = 1.5;
  const segs = useMemo(() => {
    let angle = 0;
    return categories.slice(0, 8).map((cat, i) => {
      const sweep = total > 0 ? (cat.total / total) * (360 - GAP * Math.min(8, categories.length)) : 0;
      const seg = { start: angle, end: angle + sweep, color: catColor(cat.categorie, i), ...cat };
      angle += sweep + GAP;
      return seg;
    });
  }, [categories, total]);
  const active = hovered !== null ? segs[hovered] : null;
  return (
    <div className="rounded-xl p-4" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Répartition des dépenses</p>
      <div className="flex gap-4 items-start">
        <div className="relative shrink-0">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
            {segs.map((s, i) => (
              <path
                key={i}
                d={donutArc(CX, CY, hovered === i ? OR + 3 : OR, IR, s.start, s.end)}
                fill={s.color}
                opacity={hovered === null || hovered === i ? 0.9 : 0.4}
                style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
            {active ? (
              <>
                <text x={CX} y={CY - 6} textAnchor="middle" fontSize={9} fill="var(--ink-ghost)" fontFamily="monospace" className="capitalize">{active.categorie.slice(0, 8)}</text>
                <text x={CX} y={CY + 6} textAnchor="middle" fontSize={11} fontWeight="700" fill={active.color}>{((active.total / total) * 100).toFixed(0)}%</text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 4} textAnchor="middle" fontSize={8} fill="var(--ink-ghost)" fontFamily="monospace">Total</text>
                <text x={CX} y={CY + 8} textAnchor="middle" fontSize={10} fontWeight="700" fill="var(--ink)">{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : fmt(total)}</text>
              </>
            )}
          </svg>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {segs.map((s, i) => (
            <div key={i} className="flex items-center gap-2 cursor-default" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[10px] text-ink capitalize truncate flex-1">{s.categorie}</span>
              <span className="text-[9px] text-ink-ghost tabular-nums shrink-0">{((s.total / total) * 100).toFixed(0)}%</span>
              <span className="text-[10px] font-mono text-ink-soft tabular-nums shrink-0 w-14 text-right">{s.total >= 1000 ? `${(s.total / 1000).toFixed(1)}k` : fmt(s.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cat evolution ──────────────────────────────────────────────
function CatEvolutionPanel({ data }: { data: ReturnType<typeof getEvolutionCategories> }) {
  return (
    <div className="rounded-xl p-4" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Top catégories · évolution</p>
      {data.length === 0 ? (
        <p className="text-[10px] text-ink-ghost">Pas assez de données mensuelles.</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((c, i) => {
            const color = catColor(c.categorie, i);
            const isUp = c.delta > 0;
            return (
              <div key={c.categorie}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] text-ink capitalize">{c.categorie}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isUp ? <ArrowUpRight size={9} style={{ color: "#ef4444" }} /> : <ArrowDownRight size={9} style={{ color: "#22c55e" }} />}
                    <span className="text-[9px] font-mono" style={{ color: isUp ? "#ef4444" : "#22c55e" }}>
                      {fmtPct(c.delta)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.current / Math.max(...data.map(x => x.current), 1) * 100)}%`, background: color, opacity: 0.75 }} />
                  </div>
                  <span className="text-[9px] text-ink-ghost tabular-nums shrink-0">{fmt(c.current)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Flux Sankey ────────────────────────────────────────────────
const SOURCE_COLORS = ["#22c55e","#10b981","#06b6d4","#84cc16","#8b5cf6"];
const SINK_COLORS   = ["#6366f1","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#94a3b8"];

function FluxSankey({ data }: { data: ReturnType<typeof getSankeyData> }) {
  const W = 580, H = 200;
  const LX = 130, LW = 14, RX = 440, RW = 14;
  const MID = (LX + LW + RX) / 2;
  if (data.totalRevenus === 0) return null;

  const depRatio = Math.min(data.totalDepenses / data.totalRevenus, 1);
  const savRatio = 1 - depRatio;

  let leftY = 0;
  const sources = data.sources.map((s, i) => {
    const h = Math.max(2, (s.amount / data.totalRevenus) * H);
    const node = { ...s, y: leftY, h, color: SOURCE_COLORS[i % SOURCE_COLORS.length] };
    leftY += h;
    return node;
  });

  let rightY = 0;
  const sinks = data.sinks.map((s, i) => {
    const h = Math.max(2, (s.amount / data.totalRevenus) * H);
    const node = { ...s, y: rightY, h, color: SINK_COLORS[i % SINK_COLORS.length] };
    rightY += h;
    return node;
  });

  const depH = depRatio * H;
  const savH = savRatio * H;

  function ribbon(x1: number, yt1: number, yb1: number, x2: number, yt2: number, yb2: number, color: string, op = 0.12) {
    const cx = (x1 + x2) / 2;
    const path = `M ${x1} ${yt1} C ${cx} ${yt1}, ${cx} ${yt2}, ${x2} ${yt2} L ${x2} ${yb2} C ${cx} ${yb2}, ${cx} ${yb1}, ${x1} ${yb1} Z`;
    return <path key={`${yt1}-${yt2}`} d={path} fill={color} opacity={op} />;
  }

  return (
    <div className="rounded-xl p-4" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Flux financiers</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Revenue side ribbons */}
        {sources.map((s) => ribbon(LX + LW, s.y, s.y + s.h, MID, 0, depH, s.color, 0.10))}

        {/* Dep/Sav ribbons from center to right */}
        {ribbon(MID, 0, depH, RX, 0, depH, "#ef4444", 0.08)}
        {savH > 2 && ribbon(MID, depH, H, RX, depH, H, "#22c55e", 0.10)}

        {/* Left bars */}
        {sources.map((s) => (
          <rect key={s.label} x={LX} y={s.y} width={LW} height={s.h} fill={s.color} opacity={0.85} rx={2} />
        ))}

        {/* Right bars */}
        {sinks.map((s) => (
          <rect key={s.categorie} x={RX} y={s.y} width={RW} height={s.h} fill={s.color} opacity={0.85} rx={2} />
        ))}
        {savH > 3 && <rect x={RX} y={depH} width={RW} height={savH} fill="#22c55e" opacity={0.75} rx={2} />}

        {/* Source labels */}
        {sources.map((s) => (
          <text key={s.label} x={LX - 4} y={s.y + s.h / 2 + 3} textAnchor="end" fontSize={7.5} fill="var(--ink-ghost)" fontFamily="monospace">{s.label.slice(0, 14)}</text>
        ))}

        {/* Sink labels */}
        {sinks.map((s) => (
          <text key={s.categorie} x={RX + RW + 4} y={s.y + s.h / 2 + 3} fontSize={7.5} fill="var(--ink-ghost)" fontFamily="monospace" className="capitalize">{s.categorie.slice(0, 12)}</text>
        ))}
        {savH > 4 && (
          <text x={RX + RW + 4} y={depH + savH / 2 + 3} fontSize={7.5} fill="#22c55e" fontFamily="monospace" opacity={0.9}>Épargne</text>
        )}

        {/* Center labels */}
        <text x={MID} y={H / 2 - 12} textAnchor="middle" fontSize={7} fill="var(--ink-ghost)" fontFamily="monospace">REVENUS</text>
        <text x={MID} y={H / 2 + 1} textAnchor="middle" fontSize={11} fontWeight="700" fill="#22c55e">{data.totalRevenus >= 1000 ? `${(data.totalRevenus / 1000).toFixed(0)}k€` : fmt(data.totalRevenus)}</text>
        <text x={MID} y={H / 2 + 14} textAnchor="middle" fontSize={7} fill="var(--ink-ghost)" fontFamily="monospace">DÉPENSES {data.totalDepenses >= 1000 ? `${(data.totalDepenses / 1000).toFixed(0)}k€` : fmt(data.totalDepenses)}</text>
      </svg>
    </div>
  );
}

// ── Day-of-week premium ────────────────────────────────────────
function DowPremium({ data }: { data: ReturnType<typeof getDayOfWeekStats> }) {
  const MAX_H = 80;
  const max = Math.max(...data.map((d) => d.total), 1);
  const maxDay = data.reduce((a, b) => b.total > a.total ? b : a, data[0]);
  const LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const ordered = [1,2,3,4,5,6,0].map((i) => data.find((d) => d.day === i) ?? { day: i, label: LABELS[i], total: 0, count: 0 });
  return (
    <div className="rounded-xl p-4 h-full" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Dépenses par jour</p>
        {maxDay.total > 0 && (
          <span className="text-[9px] text-attention font-mono">pic · {maxDay.label}</span>
        )}
      </div>
      <div className="flex items-end gap-1.5" style={{ height: MAX_H + 20 }}>
        {ordered.map((d) => {
          const isWeekend = d.day === 0 || d.day === 6;
          const isMax = d.day === maxDay.day;
          const barH = max > 0 ? Math.max(3, (d.total / max) * MAX_H) : 3;
          const color = isMax ? "#f59e0b" : isWeekend ? "#6366f1" : "#6366f188";
          return (
            <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
              {d.total > 0 && (
                <span className="text-[7px] text-ink-ghost tabular-nums font-mono">
                  {d.total >= 1000 ? `${(d.total / 1000).toFixed(0)}k` : Math.round(d.total)}
                </span>
              )}
              <div className="w-full rounded-t-sm" style={{ height: barH, background: color, opacity: 0.85, transition: "height 0.4s" }} />
              <span className="text-[8px] font-mono" style={{ color: isWeekend ? "#6366f1" : "var(--ink-ghost)" }}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top bénéficiaires ──────────────────────────────────────────
function TopBeneficiaires({ data }: { data: ReturnType<typeof getTopBeneficiaires> }) {
  const max = data[0]?.total ?? 1;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: GB }}>
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Top bénéficiaires</p>
        <span className="text-[9px] text-ink-ghost">{data.length} marchands</span>
      </div>
      {data.map((b, i) => (
        <div key={b.label} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.025] transition-colors" style={{ borderBottom: i < data.length - 1 ? GB : undefined }}>
          <span className="text-[10px] text-ink-ghost w-4 tabular-nums font-mono shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-ink truncate">{b.label}</p>
              <p className="text-xs font-mono tabular-nums text-ink shrink-0 ml-2">{fmt(b.total)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${(b.total / max) * 100}%`, background: catColor(b.categorie, i) }} />
              </div>
              <span className="text-[8px] text-ink-ghost capitalize shrink-0">{b.count}× · {b.categorie}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Anomalies premium ──────────────────────────────────────────
function AnomaliesPremium({ data }: { data: ReturnType<typeof detectAnomalies> }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: GB }}>
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Transactions inhabituelles</p>
        {data.length > 0 && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: "#f59e0b20", color: "#f59e0b" }}>{data.length} détectées</span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-calm">Aucune anomalie</p>
          <p className="text-[10px] text-ink-ghost mt-0.5">Comportement régulier</p>
        </div>
      ) : (
        data.map(({ transaction: t, ratio, mean }, i) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.025] transition-colors" style={{ borderBottom: i < data.length - 1 ? GB : undefined }}>
            <div className="shrink-0 p-1.5 rounded-md" style={{ background: "#f59e0b18" }}>
              <AlertTriangle size={10} style={{ color: "#f59e0b" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-ink truncate font-medium">{t.label}</p>
              <p className="text-[9px] text-ink-ghost font-mono">
                {new Date(t.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · moy. {fmt(mean)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono font-semibold" style={{ color: "#ef4444" }}>{fmt(t.montant)}</p>
              <p className="text-[9px] font-mono" style={{ color: "#f59e0b" }}>×{ratio.toFixed(1)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Recommandations ────────────────────────────────────────────
interface Reco {
  title: string;
  desc: string;
  impact: string;
  color: string;
  icon: React.ReactNode;
}

function Recommandations({ recos }: { recos: Reco[] }) {
  if (recos.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: GB }}>
        <Sparkles size={11} className="text-accent" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Recommandations personnalisées</p>
      </div>
      <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
        {recos.map((r, i) => (
          <div
            key={i}
            className="p-4 flex flex-col gap-2"
            style={{ borderRight: i < recos.length - 1 ? GB : undefined }}
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md shrink-0" style={{ background: r.color + "18", color: r.color }}>{r.icon}</div>
              <p className="text-xs font-semibold text-ink leading-snug">{r.title}</p>
            </div>
            <p className="text-[10px] text-ink-ghost leading-relaxed flex-1">{r.desc}</p>
            <p className="text-[10px] font-semibold" style={{ color: r.color }}>{r.impact}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────
type AnalyseTab     = "dashboard" | "transactions";
type PeriodPreset   = "1m" | "3m" | "6m" | "ytd" | "all";

const PERIOD_LABELS: { key: PeriodPreset; label: string }[] = [
  { key: "1m",  label: "1 mois"  },
  { key: "3m",  label: "3 mois"  },
  { key: "6m",  label: "6 mois"  },
  { key: "ytd", label: "Année"   },
  { key: "all", label: "Tout"    },
];

export function AnalyseView() {
  const { transactions, clearAll } = useTransactionsStore();
  const [tab, setTab]               = useState<AnalyseTab>("dashboard");
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("all");
  const [variablesOnly, setVariablesOnly] = useState(false);

  const kpiRowRef = useStaggerEntrance<HTMLDivElement>({ duration: 480 });

  const periodStart = useMemo(() => {
    const now = new Date();
    if (periodPreset === "1m")  return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    if (periodPreset === "3m")  return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    if (periodPreset === "6m")  return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    if (periodPreset === "ytd") return new Date(now.getFullYear(), 0, 1);
    return null;
  }, [periodPreset]);

  // Exclude internal transfers, apply period filter and variables-only toggle
  const analyticsTxs = useMemo(() => {
    let txs = transactions.filter((t) => !t.excludedFromAnalytics);
    if (periodStart) txs = txs.filter((t) => new Date(t.date) >= periodStart);
    if (variablesOnly) txs = txs.filter((t) => !t.reconciledItemId);
    return txs;
  }, [transactions, periodStart, variablesOnly]);

  const tendance     = useMemo(() => getTendanceFull(analyticsTxs), [analyticsTxs]);
  const topCat       = useMemo(() => getTopCategories(analyticsTxs), [analyticsTxs]);
  const anomalies    = useMemo(() => detectAnomalies(analyticsTxs, 6), [analyticsTxs]);
  const compressibles = useMemo(() => getDepensesCompressibles(analyticsTxs), [analyticsTxs]);
  const periode      = useMemo(() => getPeriode(analyticsTxs), [analyticsTxs]);
  const dowStats     = useMemo(() => getDayOfWeekStats(analyticsTxs), [analyticsTxs]);
  const sankeyData   = useMemo(() => getSankeyData(analyticsTxs), [analyticsTxs]);
  const topBenef     = useMemo(() => getTopBeneficiaires(analyticsTxs, 5), [analyticsTxs]);
  const catEvol      = useMemo(() => getEvolutionCategories(analyticsTxs), [analyticsTxs]);
  const insights     = useMemo(() => computeInsights(analyticsTxs), [analyticsTxs]);
  const cashflowMoyen = useMemo(() => getCashflowMensuelMoyen(analyticsTxs), [analyticsTxs]);
  const burnRate     = useMemo(() => getBurnRateGlissant(analyticsTxs), [analyticsTxs]);
  const score        = useMemo(() => getScoreComportemental(analyticsTxs,
    analyticsTxs.filter(t => t.direction === "revenu").reduce((s,t) => s + t.montant, 0),
    analyticsTxs.filter(t => t.direction === "depense").reduce((s,t) => s + t.montant, 0)
  ), [analyticsTxs]);

  const totalRevenu  = useMemo(() => analyticsTxs.filter(t => t.direction === "revenu").reduce((s,t) => s + t.montant, 0), [analyticsTxs]);
  const totalDepense = useMemo(() => analyticsTxs.filter(t => t.direction === "depense").reduce((s,t) => s + t.montant, 0), [analyticsTxs]);
  const net          = totalRevenu - totalDepense;
  const tauxEpargne  = totalRevenu > 0 ? (net / totalRevenu) * 100 : 0;

  // Sparkline data (monthly)
  const sparkMonths  = tendance.slice(-12);
  const revSpark     = sparkMonths.map(m => m.revenus);
  const depSpark     = sparkMonths.map(m => m.depenses);
  const netSpark     = sparkMonths.map(m => m.net);
  const tauxSpark    = sparkMonths.map(m => m.revenus > 0 ? (m.net / m.revenus) * 100 : 0);

  // Delta M vs M-1
  const lastM  = tendance.length >= 1 ? tendance[tendance.length - 1] : null;
  const prevM  = tendance.length >= 2 ? tendance[tendance.length - 2] : null;
  const deltaRev = lastM && prevM && prevM.revenus > 0 ? ((lastM.revenus - prevM.revenus) / prevM.revenus) * 100 : undefined;
  const deltaDep = lastM && prevM && prevM.depenses > 0 ? ((lastM.depenses - prevM.depenses) / prevM.depenses) * 100 : undefined;
  const deltaNet = lastM && prevM && Math.abs(prevM.net) > 0 ? ((lastM.net - prevM.net) / Math.abs(prevM.net)) * 100 : undefined;

  // Recommandations
  const recos = useMemo<Reco[]>(() => {
    const r: Reco[] = [];
    const aboTotal = analyticsTxs.filter(t => t.direction === "depense" && t.categorie === "abonnements").reduce((s,t) => s + t.montant, 0);
    if (aboTotal > 0) r.push({
      title: "Réduire les abonnements",
      desc: `Vous avez ${fmt(aboTotal)} en abonnements sur la période. Identifiez les services peu utilisés.`,
      impact: `Économie potentielle : jusqu'à ${fmt(aboTotal * 0.3)} / an`,
      color: "#8b5cf6",
      icon: <Minus size={11} />,
    });
    if (tauxEpargne < 10 && totalRevenu > 0) r.push({
      title: "Augmenter le taux d'épargne",
      desc: `Votre taux d'épargne est de ${tauxEpargne.toFixed(1)}%. L'objectif recommandé est 10-20%.`,
      impact: `+5% → ${fmt(totalRevenu * 0.05)} d'économies supplémentaires`,
      color: "#22c55e",
      icon: <TrendingUp size={11} />,
    });
    if (burnRate) r.push({
      title: "Lisser les dépenses variables",
      desc: `Votre burn rate moyen est ${fmt(burnRate.burnRate)}/mois sur ${burnRate.moisCount} mois.`,
      impact: `Réduire de 10% → ${fmt(burnRate.burnRate * 0.1 * 12)} / an`,
      color: "#f59e0b",
      icon: <Calendar size={11} />,
    });
    if (compressibles.length > 0) r.push({
      title: "Optimiser les récurrentes",
      desc: `${compressibles.length} dépenses récurrentes identifiées pour un total de ${fmt(compressibles.reduce((s,c) => s + c.total, 0))}.`,
      impact: `Négocier -15% → ${fmt(compressibles.reduce((s,c) => s + c.total, 0) * 0.15)} récupérés`,
      color: "#06b6d4",
      icon: <ChevronRight size={11} />,
    });
    return r.slice(0, 4);
  }, [analyticsTxs, tauxEpargne, totalRevenu, burnRate, compressibles]);

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          title="Aucune transaction importée"
          description="Importez un relevé bancaire PDF ou CSV pour activer l'analyse financière."
          action={
            <Link href="/import">
              <Button size="sm" leftIcon={<Upload size={13} />}>Importer un relevé</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6" style={{ height: 56, borderBottom: GB }}>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Analyse</p>
            {periode && (
              <p className="text-[10px] text-ink-ghost font-mono">
                {periode.start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })} →{" "}
                {periode.end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })} · {transactions.length} transactions
              </p>
            )}
          </div>
          <div className="px-2 py-0.5 rounded-full text-[9px] font-mono" style={{ background: "#6366f118", color: "#6366f1" }}>
            Score {score.score}/100 · {score.label}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: GB }}>
            {(["dashboard", "transactions"] as AnalyseTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "text-xs px-3 py-1 rounded-md transition-colors",
                  tab === t ? "bg-accent text-white" : "text-ink-ghost hover:text-ink"
                )}
              >
                {t === "dashboard" ? "Vue d'ensemble" : "Transactions"}
              </button>
            ))}
          </div>
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-ink-ghost hover:text-critique hover:bg-white/5 transition-colors"
          >
            <Trash2 size={12} />Effacer
          </button>
        </div>
      </div>

      {/* Period controls — dashboard only */}
      {tab === "dashboard" && (
        <div className="shrink-0 flex items-center gap-3 px-6 py-2" style={{ borderBottom: GB }}>
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: GB }}>
            {PERIOD_LABELS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodPreset(p.key)}
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-md transition-colors",
                  periodPreset === p.key ? "bg-accent text-white" : "text-ink-ghost hover:text-ink"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setVariablesOnly((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md border transition-colors",
              variablesOnly
                ? "bg-accent/10 border-accent/30 text-accent"
                : "border-border text-ink-ghost hover:text-ink"
            )}
          >
            Variables seulement
          </button>
          {(periodPreset !== "all" || variablesOnly) && (
            <span className="text-[9px] text-ink-ghost font-mono ml-auto">
              {analyticsTxs.length} transaction{analyticsTxs.length !== 1 ? "s" : ""} sélectionnée{analyticsTxs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Transactions table */}
      {tab === "transactions" && (
        <div className="flex-1 overflow-y-auto p-5">
          <TransactionsTable />
        </div>
      )}

      {/* Dashboard content */}
      {tab === "dashboard" && <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* KPI Row */}
        <div ref={kpiRowRef} className="grid grid-cols-6 gap-3">
          <KpiCard label="Revenus totaux"      value={fmt(totalRevenu)}  sparkData={revSpark}  color="#22c55e"  delta={deltaRev}  deltaLabel="vs M-1" />
          <KpiCard label="Dépenses totales"    value={fmt(totalDepense)} sparkData={depSpark}  color="#ef4444"  delta={deltaDep !== undefined ? -deltaDep : undefined} deltaLabel="vs M-1" />
          <KpiCard label="Épargne nette"        value={fmt(net)}          sparkData={netSpark}  color={net >= 0 ? "#22c55e" : "#ef4444"} delta={deltaNet} deltaLabel="vs M-1" />
          <KpiCard label="Taux d'épargne"      value={`${tauxEpargne.toFixed(1)}%`} sparkData={tauxSpark} color="#6366f1" />
          <KpiCard label="Cashflow moy. / mois" value={fmt(cashflowMoyen)} sparkData={netSpark} color={cashflowMoyen >= 0 ? "#06b6d4" : "#ef4444"} />
          <KpiCard label="Transactions"        value={String(transactions.length)} sparkData={sparkMonths.map(m => m.revenus + m.depenses)} color="#94a3b8" />
        </div>

        {/* Evolution + Insights */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>
          <EvolutionChart tendance={tendance} />
          <InsightsPanel insights={insights} />
        </div>

        {/* Donut | Cat Evolution | Budget vs Reel */}
        <div className="grid grid-cols-3 gap-4">
          <DonutPremium categories={topCat} total={totalDepense} />
          <CatEvolutionPanel data={catEvol} />
          <BudgetVsReel />
        </div>

        {/* Sankey | DOW */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "58% 1fr" }}>
          <FluxSankey data={sankeyData} />
          <DowPremium data={dowStats} />
        </div>

        {/* Top beneficiaires | Anomalies */}
        <div className="grid grid-cols-2 gap-4">
          <TopBeneficiaires data={topBenef} />
          <AnomaliesPremium data={anomalies} />
        </div>

        {/* Recommandations */}
        <Recommandations recos={recos} />

      </div>}

    </div>
  );
}
