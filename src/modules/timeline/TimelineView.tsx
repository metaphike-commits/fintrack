"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Check, CornerDownRight, X,
  Home, Car, ShoppingCart, Heart, Smartphone, Music,
  PiggyBank, Landmark, Package, Wallet, AlertTriangle,
} from "lucide-react";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { useCompteStore } from "@/store/compte";
import { usePreferencesStore } from "@/store/preferences";
import {
  useTimelineStore, getEffectiveStatut, STATUT_CYCLE, type ItemStatut,
} from "@/store/timeline";
import { useTransactionsStore } from "@/store/transactions";
import { useEngagementsStore } from "@/store/engagements";
import { projectDailyBalance } from "@/lib/projection";
import {
  getRowsForMonth, formatMonth, prevMonth, nextMonth, type TimelineRow,
} from "@/lib/timeline";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ──────────────────────────────────────────────────────────────────
interface EnrichedRow extends TimelineRow {
  txAmount: number | null;
  txDate:   string | null;
  ecart:    number | null;
}

interface TooltipState {
  rect: DOMRect;
  row:  EnrichedRow;
  statut: ItemStatut;
}

// ── Static layout ──────────────────────────────────────────────────────────
const W_LABEL  = 148; // sticky left label column (px ≡ SVG units)
const MIN_WCOL = 8;   // absolute minimum day-column width (allows 90j to fit viewport)
const GRAPH_H  = 210;
const GRAPH_PY = 24;
const GRAPH_PB = 26;
const PLOT_H   = GRAPH_H - GRAPH_PY - GRAPH_PB;

// ── Calendar groups ────────────────────────────────────────────────────────
const VAR_CATS = new Set(["alimentation", "loisirs", "autre"]);

const CALENDAR_GROUPS: {
  key: string; label: string; color: string;
  filter: (r: EnrichedRow) => boolean;
}[] = [
  { key: "revenus",     label: "Revenus",        color: "#22c55e",
    filter: (r) => r.direction === "revenu" },
  { key: "fixes",       label: "Fixes",          color: "#6366f1",
    filter: (r) => r.direction === "depense" && r.categorie !== "epargne" && !VAR_CATS.has(r.categorie) && r.categorie !== "engagement" },
  { key: "variables",   label: "Variables",      color: "#f59e0b",
    filter: (r) => r.direction === "depense" && VAR_CATS.has(r.categorie) },
  { key: "epargne",     label: "Épargne",        color: "#a855f7",
    filter: (r) => r.direction === "depense" && r.categorie === "epargne" },
  { key: "engagements", label: "Engagements",    color: "#ef4444",
    filter: (r) => r.categorie === "engagement" },
];

const CAT_ICON: Record<string, React.ReactNode> = {
  revenu: <Wallet size={10} />, logement: <Home size={10} />,
  transport: <Car size={10} />, alimentation: <ShoppingCart size={10} />,
  sante: <Heart size={10} />, abonnements: <Smartphone size={10} />,
  loisirs: <Music size={10} />, epargne: <PiggyBank size={10} />,
  "impôts": <Landmark size={10} />, autre: <Package size={10} />,
  engagement: <AlertTriangle size={10} />,
};

const CAT_COLOR: Record<string, string> = {
  revenu: "#22c55e", logement: "#6366f1", transport: "#f59e0b",
  alimentation: "#10b981", sante: "#ec4899", abonnements: "#8b5cf6",
  loisirs: "#06b6d4", epargne: "#22c55e", "impôts": "#ef4444", autre: "#94a3b8",
  engagement: "#ef4444",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function fmtK(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(n));
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Absolute day: day 1 = first day of baseMonth. Returns <1 if before, >totalDays if after.
function dateToAbsDay(dateStr: string, baseYear: number, baseMonth: number): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base = new Date(baseYear, baseMonth, 1);
  const target = new Date(y, m - 1, d);
  return Math.floor((target.getTime() - base.getTime()) / 86400000) + 1;
}

function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = ((x0 + x1) / 2).toFixed(1);
    d += ` C ${cpx},${y0.toFixed(1)} ${cpx},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

function niceStep(min: number, max: number): number {
  const range = Math.max(max - min, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(range)));
  for (const s of [1, 2, 5, 10]) {
    if (range / (s * mag) <= 5) return s * mag;
  }
  return mag * 10;
}

// ── Tooltip ────────────────────────────────────────────────────────────────
const FREQ_LABEL: Record<string, string> = {
  mensuel: "Mensuel", hebdomadaire: "Hebdo",
  trimestriel: "Trim.", annuel: "Annuel", ponctuel: "Ponctuel",
};

const STATUT_LABEL: Record<ItemStatut, string> = {
  prevu: "Prévu", paye: "Payé ✓", reporte: "Reporté", annule: "Annulé",
};

function TooltipPopup({ tip }: { tip: TooltipState }) {
  const { rect, row, statut } = tip;
  const isRevenu = row.direction === "revenu";
  const color    = isRevenu ? "#22c55e" : (CAT_COLOR[row.categorie] ?? "#94a3b8");

  // Positioning: above or below depending on screen position
  const viewH    = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewW    = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const showBelow = rect.top < viewH * 0.55;
  const rawLeft  = rect.left + rect.width / 2;
  const left     = Math.min(Math.max(rawLeft, 110), viewW - 110);

  const top = showBelow
    ? rect.bottom + 8
    : rect.top - 8;

  return (
    <div style={{
      position: "fixed",
      left,
      top,
      transform: showBelow ? "translateX(-50%)" : "translateX(-50%) translateY(-100%)",
      zIndex: 9999,
      pointerEvents: "none",
      minWidth: 190,
      maxWidth: 240,
      background: "rgba(10,10,18,0.97)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 12px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)",
    }}>
      {/* Arrow */}
      <div style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        ...(showBelow
          ? { top: -5, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "5px solid rgba(255,255,255,0.1)" }
          : { bottom: -5, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(255,255,255,0.1)" }),
        width: 0, height: 0,
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
        <span style={{ color, flexShrink: 0, marginTop: 1 }}>{CAT_ICON[row.categorie] ?? <Package size={12} />}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "white", wordBreak: "break-word", margin: 0 }}>
            {row.label}
          </p>
          <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.38)", margin: "2px 0 0" }}>
            {row.categorie} · {FREQ_LABEL[row.frequence] ?? row.frequence}
            {row.billingDay != null ? ` · j.${row.billingDay}` : ""}
          </p>
        </div>
      </div>

      {/* Amounts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>Prévu</span>
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            color: isRevenu ? "#4ade80" : "rgba(255,255,255,0.9)" }}>
            {isRevenu ? "+" : "−"}{fmt(row.montant)}
          </span>
        </div>
        {row.txAmount !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>Réel</span>
            <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: "rgba(255,255,255,0.75)" }}>
              {isRevenu ? "+" : "−"}{fmt(row.txAmount)}
            </span>
          </div>
        )}
        {row.ecart !== null && Math.abs(row.ecart) > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>Écart</span>
            <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: row.ecart >= 0 ? "#22c55e" : "#ef4444" }}>
              {row.ecart > 0 ? "+" : ""}{fmt(row.ecart)}
            </span>
          </div>
        )}
      </div>

      {/* Statut badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 9.5, fontWeight: 600,
        padding: "3px 8px", borderRadius: 20,
        background: statut === "paye"    ? "rgba(34,197,94,0.15)"
                  : statut === "reporte" ? "rgba(245,158,11,0.15)"
                  : statut === "annule"  ? "rgba(255,255,255,0.07)"
                  : "rgba(255,255,255,0.05)",
        color: statut === "paye"    ? "#4ade80"
             : statut === "reporte" ? "#fbbf24"
             : statut === "annule"  ? "rgba(255,255,255,0.3)"
             : "rgba(255,255,255,0.45)",
      }}>
        {STATUT_LABEL[statut]}
      </div>
    </div>
  );
}

// ── EventCard ──────────────────────────────────────────────────────────────
function EventCard({ row, statut, onCycle, wCol, onTooltip }: {
  row: EnrichedRow; statut: ItemStatut; onCycle: () => void; wCol: number;
  onTooltip: (tip: TooltipState | null) => void;
}) {
  const color     = row.direction === "revenu" ? "#22c55e" : (CAT_COLOR[row.categorie] ?? "#94a3b8");
  const isRevenu  = row.direction === "revenu";
  const isPaye    = statut === "paye";
  const isReporte = statut === "reporte";
  const isAnnule  = statut === "annule";
  const showLabel  = wCol >= 52;
  const showAmount = wCol >= 22;
  const showIcon   = wCol >= 16;

  // Ultra-narrow: just a colored tick mark
  if (wCol < 16) {
    return (
      <button
        onClick={onCycle}
        onMouseEnter={(e) => onTooltip({ rect: e.currentTarget.getBoundingClientRect(), row, statut })}
        onMouseLeave={() => onTooltip(null)}
        style={{ width: "100%", background: "none", border: "none", padding: "1px 0", cursor: "pointer" }}
      >
        <div style={{
          height: 24, borderRadius: 3,
          background: isPaye ? color + "60" : color + "28",
          border: `1px ${isReporte ? "dashed" : "solid"} ${color}55`,
          opacity: isAnnule ? 0.3 : 1,
        }} />
      </button>
    );
  }

  return (
    <button
      onClick={onCycle}
      onMouseEnter={(e) => onTooltip({ rect: e.currentTarget.getBoundingClientRect(), row, statut })}
      onMouseLeave={() => onTooltip(null)}
      style={{ width: "100%", textAlign: "left" }}
    >
      <div style={{
        borderRadius: 6,
        padding: wCol >= 44 ? "4px 5px" : "3px 4px",
        border: `1px ${isReporte ? "dashed" : "solid"} ${isPaye ? color + "55" : color + "28"}`,
        background: color + "10",
        boxShadow: isPaye ? `0 0 8px ${color}18` : "none",
        opacity: isAnnule ? 0.35 : 1,
        transition: "filter 0.15s",
      }}>
        {showIcon && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }}>
            <span style={{ color, opacity: 0.75, lineHeight: 1 }}>{CAT_ICON[row.categorie] ?? <Package size={10} />}</span>
            {isPaye    && <Check size={7}           style={{ color: "#22c55e", flexShrink: 0 }} />}
            {isReporte && <CornerDownRight size={7} style={{ color: "#f59e0b", flexShrink: 0 }} />}
            {isAnnule  && <X size={7}              style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
          </div>
        )}
        {showLabel && (
          <p style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1, maxWidth: wCol - 10 }}>
            {row.label}
          </p>
        )}
        {showAmount && (
          <p style={{ fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            color: isRevenu ? "#4ade80" : "rgba(255,255,255,0.88)",
            textDecoration: isAnnule ? "line-through" : "none" }}>
            {isRevenu ? "+" : "−"}{fmtK(row.txAmount ?? row.montant)}
          </p>
        )}
      </div>
    </button>
  );
}

// ── HeroGraph ──────────────────────────────────────────────────────────────
function HeroGraph({
  projection, totalDays, todayDay, totalWidth, confortThreshold,
  hoverDay, onHoverDay, wCol,
}: {
  projection:       { solde: number }[];
  totalDays:        number;
  todayDay:         number;
  totalWidth:       number;
  confortThreshold: number;
  hoverDay:         number | null;
  onHoverDay:       (d: number | null) => void;
  wCol:             number;
}) {
  const toX = (day: number) => W_LABEL + (day - 1) * wCol + wCol / 2;

  const soldes  = projection.map((p) => p.solde);
  const allVals = [...soldes, confortThreshold, 0];
  const rawMin  = Math.min(...allVals) - 80;
  const rawMax  = Math.max(...allVals) + 80;
  const range   = Math.max(rawMax - rawMin, 1);
  const toY     = (v: number) => GRAPH_PY + PLOT_H - ((v - rawMin) / range) * PLOT_H;

  const step     = niceStep(rawMin, rawMax);
  const gridVals: number[] = [];
  for (let v = Math.ceil(rawMin / step) * step; v <= rawMax; v += step) gridVals.push(v);

  const projPts: [number, number][] = projection.map((p, i) => [toX(todayDay + i), toY(p.solde)]);
  const projPath = smoothPath(projPts);

  const bottomY = GRAPH_PY + PLOT_H;
  const firstX  = projPts[0]?.[0] ?? toX(todayDay);
  const lastX   = projPts[projPts.length - 1]?.[0] ?? firstX;
  const areaPath = projPts.length > 1
    ? `${projPath} L ${lastX.toFixed(1)},${bottomY} L ${firstX.toFixed(1)},${bottomY} Z`
    : "";

  // Zero crossing — used for split color at the 0€ line
  const zeroY      = Math.max(GRAPH_PY - 1, Math.min(bottomY + 1, toY(0)));
  const zeroFrac   = Math.max(0, Math.min(1, (zeroY - GRAPH_PY) / PLOT_H));
  const hasNegative = soldes.some((s) => s < 0);

  const minSolde = Math.min(...soldes);
  const minIdx   = soldes.indexOf(minSolde);
  const pbX      = projPts[minIdx]?.[0];
  const pbY      = projPts[minIdx]?.[1];
  const pbDay    = todayDay + minIdx;

  const todayX   = toX(todayDay);
  const confortY = toY(confortThreshold);

  const hoverIdx   = hoverDay !== null ? hoverDay - todayDay : -1;
  const hoverSolde = hoverIdx >= 0 && hoverIdx < projection.length ? projection[hoverIdx].solde : null;
  const hoverX     = hoverDay !== null ? toX(hoverDay) : null;

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX  = ((e.clientX - rect.left) / rect.width) * totalWidth;
    if (svgX >= W_LABEL) {
      const d = Math.floor((svgX - W_LABEL) / wCol) + 1;
      onHoverDay(d >= 1 && d <= totalDays ? d : null);
    } else {
      onHoverDay(null);
    }
  }

  const pbAnnotX = pbX !== undefined ? Math.min(pbX + 8, totalWidth - 122) : 0;
  const pbAnnotY = pbY !== undefined ? Math.max(pbY - 44, GRAPH_PY + 4) : GRAPH_PY;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${GRAPH_H}`}
      width={totalWidth}
      height={GRAPH_H}
      onMouseMove={onMouseMove}
      onMouseLeave={() => onHoverDay(null)}
      style={{ cursor: "crosshair", display: "block", flexShrink: 0 }}
    >
      <defs>
        {/* Positive zone fill — indigo, clipped above zero line */}
        <linearGradient id="tl-area-pos" x1="0" y1={GRAPH_PY} x2="0" y2={bottomY} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.04} />
        </linearGradient>
        {/* Negative zone fill — red, clipped below zero line */}
        <linearGradient id="tl-area-neg" x1="0" y1={GRAPH_PY} x2="0" y2={bottomY} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.04} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.32} />
        </linearGradient>
        {/* Line stroke — indigo above zero, red below zero */}
        <linearGradient id="tl-line" x1="0" y1={GRAPH_PY} x2="0" y2={bottomY} gradientUnits="userSpaceOnUse">
          <stop offset={`${(zeroFrac * 100).toFixed(1)}%`} stopColor="#818cf8" />
          <stop offset={`${(zeroFrac * 100).toFixed(1)}%`} stopColor="#ef4444" />
        </linearGradient>
        {/* Clip above zero (positive zone) */}
        <clipPath id="tl-clip-pos">
          <rect x={0} y={GRAPH_PY - 2} width={totalWidth + 4} height={Math.max(0, zeroY - GRAPH_PY + 2)} />
        </clipPath>
        {/* Clip below zero (negative zone) */}
        <clipPath id="tl-clip-neg">
          <rect x={0} y={zeroY} width={totalWidth + 4} height={Math.max(0, bottomY - zeroY + 2)} />
        </clipPath>
        <radialGradient id="tl-pb-halo">
          <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0}   />
        </radialGradient>
        <filter id="tl-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Y grid */}
      {gridVals.map((v) => {
        const y = toY(v);
        if (y < GRAPH_PY - 2 || y > bottomY + 2) return null;
        return (
          <g key={v}>
            <line x1={W_LABEL} y1={y} x2={totalWidth} y2={y}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={W_LABEL - 6} y={y + 3.5} textAnchor="end"
              fontSize={8.5} fill="rgba(255,255,255,0.2)">
              {fmtK(v)}
            </text>
          </g>
        );
      })}

      {/* Confort threshold */}
      {confortY >= GRAPH_PY && confortY <= bottomY && (
        <line x1={W_LABEL} y1={confortY} x2={totalWidth} y2={confortY}
          stroke="#f59e0b" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="6 4" />
      )}

      {/* Past shading */}
      <rect x={W_LABEL} y={GRAPH_PY}
        width={Math.max(0, todayX - W_LABEL)} height={PLOT_H}
        fill="rgba(255,255,255,0.012)" />

      {/* Critical zone */}
      {confortY < bottomY && (
        <rect x={W_LABEL} y={confortY} width={totalWidth - W_LABEL}
          height={bottomY - confortY} fill="rgba(239,68,68,0.04)" />
      )}

      {/* Area fills — positive zone (indigo) clipped above zero, negative (red) clipped below */}
      {areaPath && <path d={areaPath} fill="url(#tl-area-pos)" clipPath="url(#tl-clip-pos)" />}
      {areaPath && hasNegative && <path d={areaPath} fill="url(#tl-area-neg)" clipPath="url(#tl-clip-neg)" />}

      {/* Zero line — solid red when balance crosses into negative */}
      {hasNegative && zeroY >= GRAPH_PY && zeroY <= bottomY && (
        <g>
          <line x1={W_LABEL} y1={zeroY} x2={totalWidth} y2={zeroY}
            stroke="#ef4444" strokeOpacity={0.45} strokeWidth={1} />
          <text x={W_LABEL - 6} y={zeroY + 3.5} textAnchor="end"
            fontSize={8} fill="#ef4444" fillOpacity={0.6} fontWeight="600">
            0
          </text>
        </g>
      )}

      {/* Curve — gradient stroke: indigo above zero, red below */}
      {projPath && (
        <path d={projPath} fill="none"
          stroke={hasNegative ? "url(#tl-line)" : "#6366f1"}
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          filter="url(#tl-glow)" />
      )}

      {/* Today line */}
      <line x1={todayX} y1={GRAPH_PY - 3} x2={todayX} y2={bottomY + 2}
        stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
      <text x={todayX} y={GRAPH_PY - 7} textAnchor="middle"
        fontSize={7} fill="rgba(255,255,255,0.28)" letterSpacing={0.7}>
        AUJOURD'HUI
      </text>

      {/* Point bas */}
      {pbX !== undefined && pbY !== undefined && (
        <g>
          <circle cx={pbX} cy={pbY} r={20} fill="url(#tl-pb-halo)" />
          <circle cx={pbX} cy={pbY} r={5}  fill="#ef4444" />
          <circle cx={pbX} cy={pbY} r={2}  fill="white"   />
          <g transform={`translate(${pbAnnotX},${pbAnnotY})`}>
            <rect x={0} y={0} width={114} height={34} rx={5}
              fill="rgba(12,0,0,0.82)" stroke="rgba(239,68,68,0.38)" strokeWidth={1} />
            <text x={8} y={13} fontSize={8} fill="#ef4444" fontWeight="600">Point bas</text>
            <text x={8} y={26} fontSize={10} fill="white"   fontWeight="700">
              {fmt(minSolde)} · j.{pbDay}
            </text>
          </g>
        </g>
      )}

      {/* Hover crosshair */}
      {hoverX !== null && (
        <g>
          <line x1={hoverX} y1={GRAPH_PY} x2={hoverX} y2={bottomY}
            stroke="rgba(255,255,255,0.16)" strokeWidth={1} strokeDasharray="4 3" />
          {hoverSolde !== null && (
            <g transform={`translate(${Math.min(hoverX + 7, totalWidth - 110)},${GRAPH_PY + 7})`}>
              <rect x={0} y={0} width={102} height={26} rx={5}
                fill="rgba(8,8,16,0.9)" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
              <text x={8} y={18} fontSize={10.5} fill="white" fontWeight="700">{fmt(hoverSolde)}</text>
            </g>
          )}
        </g>
      )}

      {/* Day tick labels */}
      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
        const x       = toX(d);
        const isToday = d === todayDay;
        // Show fewer labels when columns are narrow
        const interval = wCol < 36 ? 10 : wCol < 50 ? 5 : 5;
        const show = isToday || d === 1 || d % interval === 0 || d === totalDays;
        if (!show) return null;
        return (
          <g key={d}>
            {isToday && <circle cx={x} cy={bottomY + 13} r={8} fill="rgba(99,102,241,0.5)" />}
            <text x={x} y={bottomY + 17} textAnchor="middle" fontSize={8}
              fill={isToday ? "white" : "rgba(255,255,255,0.26)"}>
              {d}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── KPIStrip ───────────────────────────────────────────────────────────────
function KPIStrip({
  items,
}: {
  items: { label: string; value: string; sub?: string; color?: string }[];
}) {
  return (
    <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      {items.map((kpi, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 0, padding: "10px 16px",
          borderRight: i < items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}>
          <p style={{ fontSize: 8, fontFamily: "monospace", textTransform: "uppercase",
            letterSpacing: "0.11em", color: "rgba(255,255,255,0.26)", marginBottom: 3 }}>
            {kpi.label}
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            color: kpi.color ?? "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {kpi.value}
          </p>
          {kpi.sub && (
            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>{kpi.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── HorizontalCalendar ─────────────────────────────────────────────────────
function HorizontalCalendar({
  groups, totalDays, todayDay, statuts, paid, onCycle, wCol, onTooltip, monthBoundaries,
}: {
  groups:           { key: string; label: string; color: string; rows: EnrichedRow[] }[];
  totalDays:        number;
  todayDay:         number;
  statuts:          Record<string, ItemStatut>;
  paid:             Record<string, boolean>;
  onCycle:          (key: string) => void;
  wCol:             number;
  onTooltip:        (tip: TooltipState | null) => void;
  monthBoundaries:  { absDay: number; label: string }[];
}) {
  const days          = Array.from({ length: totalDays }, (_, i) => i + 1);
  const visibleGroups = groups.filter((g) => g.rows.length > 0);
  const boundarySet   = new Map(monthBoundaries.map((b) => [b.absDay, b.label]));

  return (
    <div>
      {visibleGroups.map((group) => {
        const isRevenu = group.key === "revenus";
        const groupTotal = group.rows.reduce((s, r) => s + (r.txAmount ?? r.montant), 0);

        // Items with a specific day go in the grid; items without float in the left panel
        const withDay    = group.rows.filter((r) => r.billingDay != null);
        const withoutDay = group.rows.filter((r) => r.billingDay == null);

        const byDay = new Map<number, EnrichedRow[]>();
        for (const row of withDay) {
          const day = row.billingDay!;
          if (!byDay.has(day)) byDay.set(day, []);
          byDay.get(day)!.push(row);
        }
        const maxStack = byDay.size > 0 ? Math.max(...Array.from(byDay.values()).map((v) => v.length)) : 0;
        const cardH    = wCol >= 52 ? 58 : 46;
        const leftH    = 36 + withoutDay.length * 20;
        const dayColH  = Math.max(56, maxStack * cardH + 8);
        const rowMinH  = Math.max(leftH, dayColH);

        return (
          <div key={group.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", minHeight: rowMinH }}>

              {/* Sticky left label + undated items */}
              <div style={{
                width: W_LABEL, flexShrink: 0,
                position: "sticky", left: 0, zIndex: 10,
                background: "var(--bg, #0a0a0f)",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                display: "flex", flexDirection: "column", justifyContent: "flex-start",
                padding: "8px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                  <p style={{ fontSize: 8, fontFamily: "monospace", textTransform: "uppercase",
                    letterSpacing: "0.09em", color: group.color }}>
                    {group.label}
                  </p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  color: isRevenu ? "#4ade80" : "rgba(255,255,255,0.88)",
                  marginBottom: withoutDay.length > 0 ? 5 : 0 }}>
                  {isRevenu ? "+" : "−"}{fmt(groupTotal)}
                </p>
                {withoutDay.map((row) => {
                  const st = getEffectiveStatut(row.key, statuts, paid);
                  const stColor =
                    st === "paye"    ? "#22c55e" :
                    st === "reporte" ? "#f59e0b" :
                    st === "annule"  ? "rgba(255,255,255,0.2)" :
                                       "rgba(255,255,255,0.35)";
                  return (
                    <button
                      key={row.key}
                      onClick={() => onCycle(row.key)}
                      onMouseEnter={(e) => onTooltip({ rect: e.currentTarget.getBoundingClientRect(), row, statut: st })}
                      onMouseLeave={() => onTooltip(null)}
                      style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2,
                        background: "none", border: "none", padding: "2px 0", cursor: "pointer",
                        textAlign: "left", width: "100%" }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: stColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 9, color: "rgba(255,255,255,0.5)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                        color: isRevenu ? "#4ade80" : "rgba(255,255,255,0.6)", flexShrink: 0 }}>
                        {fmtK(row.txAmount ?? row.montant)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day cells */}
              <div style={{ display: "flex", flexShrink: 0 }}>
                {days.map((day) => {
                  const dayRows   = byDay.get(day) ?? [];
                  const isToday   = day === todayDay;
                  const boundary  = boundarySet.get(day);
                  return (
                    <div key={day} style={{
                      width: wCol, flexShrink: 0, minHeight: rowMinH,
                      display: "flex", flexDirection: "column", gap: 3,
                      padding: "4px 2px",
                      background: isToday ? "rgba(99,102,241,0.04)" : "transparent",
                      borderLeft: boundary ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.02)",
                      position: "relative",
                    }}>
                      {boundary && (
                        <span style={{
                          position: "absolute", top: 2, left: 3,
                          fontSize: 7, fontFamily: "monospace", textTransform: "uppercase",
                          letterSpacing: "0.08em", color: "rgba(255,255,255,0.22)",
                          whiteSpace: "nowrap", pointerEvents: "none",
                        }}>
                          {boundary}
                        </span>
                      )}
                      {dayRows.map((row) => (
                        <EventCard
                          key={row.key}
                          row={row}
                          statut={getEffectiveStatut(row.key, statuts, paid)}
                          onCycle={() => onCycle(row.key)}
                          wCol={wCol}
                          onTooltip={onTooltip}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────
export function TimelineView() {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth());
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);
  const [hoverDay,   setHoverDay]   = useState<number | null>(null);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);
  const [containerW, setContainerW] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width for responsive column sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.offsetWidth));
    ro.observe(el);
    setContainerW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const { items }                      = useBaseFinanciereStore();
  const { paid, statuts, cycleStatut } = useTimelineStore();
  const { engagements, addEngagement } = useEngagementsStore();
  const transactions                   = useTransactionsStore((s) => s.transactions);
  const comptes                        = useComptesStore((s) => s.comptes);
  const { soldeCourant }               = useCompteStore();
  const { confortThreshold }           = usePreferencesStore();

  const soldeRunway    = getSoldeRunway(comptes);
  const soldeEffectif  = soldeRunway ?? soldeCourant;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const todayDay  = isCurrentMonth ? now.getDate() : 1;
  const numMonths = horizon / 30; // 1 = current month only, 2 = +1, 3 = +2

  // Total calendar days: sum of days in each displayed month
  const totalDays = useMemo(() => {
    let days = 0;
    let y = year, m = month;
    for (let i = 0; i < numMonths; i++) {
      days += new Date(y, m + 1, 0).getDate();
      const nxt = nextMonth(y, m);
      y = nxt.year; m = nxt.month;
    }
    return days;
  }, [numMonths, year, month]);

  // Responsive column width — fills container, never below MIN_WCOL
  const wCol       = containerW > 0
    ? Math.max(MIN_WCOL, Math.floor((containerW - W_LABEL) / totalDays))
    : 40;
  const totalWidth = W_LABEL + wCol * totalDays;

  // Month boundary markers for the extended calendar
  const monthBoundaries = useMemo((): { absDay: number; label: string }[] => {
    if (!isCurrentMonth || numMonths <= 1) return [];
    const boundaries: { absDay: number; label: string }[] = [];
    let offset = daysInMonth;
    let y = year, m = month;
    for (let i = 1; i < numMonths; i++) {
      const { year: ny, month: nm } = nextMonth(y, m);
      boundaries.push({ absDay: offset + 1, label: cap(formatMonth(ny, nm)) });
      offset += new Date(ny, nm + 1, 0).getDate();
      y = ny; m = nm;
    }
    return boundaries;
  }, [isCurrentMonth, numMonths, daysInMonth, year, month]);

  const rows = useMemo(
    () => getRowsForMonth(items, year, month),
    [items, year, month]
  );

  const enriched = useMemo((): EnrichedRow[] => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return rows.map((row) => {
      const tx       = transactions.find((t) => t.reconciledItemId === row.itemId && t.date.startsWith(monthStr));
      const txAmount = tx?.montant ?? null;
      const ecart    = txAmount !== null ? row.montant - txAmount : null;
      return { ...row, txAmount, txDate: tx?.date ?? null, ecart };
    });
  }, [rows, transactions, year, month]);

  // Extra rows for months beyond the current one (60j/90j horizons)
  const extraEnriched = useMemo((): EnrichedRow[] => {
    if (!isCurrentMonth || totalDays <= daysInMonth) return [];
    const extra: EnrichedRow[] = [];
    let offset = daysInMonth;
    let y = year, m = month;
    while (offset < totalDays) {
      const { year: ny, month: nm } = nextMonth(y, m);
      for (const row of getRowsForMonth(items, ny, nm)) {
        extra.push({
          ...row,
          billingDay: row.billingDay != null ? offset + row.billingDay : undefined,
          txAmount: null, txDate: null, ecart: null,
        });
      }
      offset += new Date(ny, nm + 1, 0).getDate();
      y = ny; m = nm;
    }
    return extra;
  }, [isCurrentMonth, totalDays, daysInMonth, year, month, items]);

  // Engagements as calendar events — due dates placed at their absolute day
  const engagementRows = useMemo((): EnrichedRow[] => {
    const rows: EnrichedRow[] = [];
    for (const e of engagements) {
      if (e.solde) continue;
      // One-time / comptant engagement with a due date in the horizon
      if (e.dateEcheance && e.etalementMode !== "mensuel") {
        const absDay = dateToAbsDay(e.dateEcheance, year, month);
        if (absDay >= 1 && absDay <= totalDays) {
          rows.push({
            key: `eng-${e.id}`, itemId: e.id, label: e.label,
            direction: "depense", categorie: "engagement", frequence: "ponctuel",
            billingDay: absDay, montant: e.montantRestant,
            txAmount: null, txDate: null, ecart: null,
          });
        }
      }
      // Monthly engagement (not frozen) — no specific day → shows in left panel
      if (e.etalementMode === "mensuel" && !e.gele && e.mensualite) {
        rows.push({
          key: `eng-${e.id}`, itemId: e.id, label: e.label,
          direction: "depense", categorie: "engagement", frequence: "mensuel",
          billingDay: undefined, montant: e.mensualite,
          txAmount: null, txDate: null, ecart: null,
        });
      }
    }
    return rows;
  }, [engagements, year, month, totalDays]);

  const calendarGroups = useMemo(
    () => CALENDAR_GROUPS.map((g) => ({
      ...g,
      rows: g.key === "engagements"
        ? engagementRows
        : [...enriched, ...extraEnriched].filter(g.filter),
    })),
    [enriched, extraEnriched, engagementRows]
  );

  // KPIs use all displayed rows (current + extra months)
  const allDisplayedRows = useMemo(() => [...enriched, ...extraEnriched], [enriched, extraEnriched]);
  const totalRevenus  = allDisplayedRows.filter((r) => r.direction === "revenu").reduce((s, r) => s + r.montant, 0);
  const totalDepenses = allDisplayedRows.filter((r) => r.direction === "depense" && r.categorie !== "engagement").reduce((s, r) => s + r.montant, 0);
  const net           = totalRevenus - totalDepenses;
  const payeCount       = enriched.filter((r) => getEffectiveStatut(r.key, statuts, paid) === "paye").length;
  const reconciledCount = enriched.filter((r) => r.txAmount !== null).length;

  // Last month label for "Solde prévu" KPI
  const horizonEndLabel = useMemo(() => {
    let y = year, m = month;
    for (let i = 1; i < numMonths; i++) { const nxt = nextMonth(y, m); y = nxt.year; m = nxt.month; }
    return cap(formatMonth(y, m));
  }, [year, month, numMonths]);

  // Projection covers from today to end of the last displayed month
  const projectionDays = useMemo(() => {
    const base = isCurrentMonth ? daysInMonth - todayDay + 1 : daysInMonth - todayDay + 1;
    let days = base;
    let y = year, m = month;
    for (let i = 1; i < (isCurrentMonth ? numMonths : 1); i++) {
      const nxt = nextMonth(y, m);
      days += new Date(nxt.year, nxt.month + 1, 0).getDate();
      y = nxt.year; m = nxt.month;
    }
    return days;
  }, [isCurrentMonth, numMonths, year, month, daysInMonth, todayDay]);

  const projection = useMemo(() => {
    if (soldeEffectif === null) return [];
    return projectDailyBalance(soldeEffectif, items.filter((i) => !i.archived), projectionDays);
  }, [soldeEffectif, items, projectionDays]);

  const pointBas   = projection.length > 0 ? Math.min(...projection.map((p) => p.solde)) : null;
  const soldeFin   = projection[projection.length - 1]?.solde ?? null;
  const avgMonthlyDepenses = totalDepenses / numMonths;
  const runwayDays = soldeEffectif !== null && avgMonthlyDepenses > 0
    ? Math.floor(soldeEffectif / (avgMonthlyDepenses / 30))
    : null;

  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);
  function goToPrev() { const p = prevMonth(year, month); setYear(p.year); setMonth(p.month); }
  function goToNext() { const n = nextMonth(year, month); setYear(n.year); setMonth(n.month); }
  const monthLabel = cap(formatMonth(year, month));

  function handleCycle(key: string) {
    const current    = statuts[key] ?? (paid[key] ? "paye" : "prevu");
    const idx        = STATUT_CYCLE.indexOf(current);
    const nextStatut = STATUT_CYCLE[(idx + 1) % STATUT_CYCLE.length];
    cycleStatut(key);
    if (nextStatut === "reporte") {
      const row = enriched.find((r) => r.key === key);
      if (row && row.direction === "depense" && row.montant > 0) {
        const alreadyExists = engagements.some((e) => e.notes === `auto:timeline:${key}`);
        if (!alreadyExists) {
          addEngagement({
            label: row.label, type: "arriere_charge",
            montantTotal: row.montant, montantRestant: row.montant,
            etalementMode: "comptant", notes: `auto:timeline:${key}`,
          });
        }
      }
    }
  }

  const kpis: { label: string; value: string; sub?: string; color?: string }[] = [
    {
      label: "Solde prévu", value: soldeFin !== null ? fmt(soldeFin) : "—",
      sub: `fin ${horizonEndLabel}`,
      color: soldeFin !== null ? (soldeFin >= 0 ? "#22c55e" : "#ef4444") : undefined,
    },
    {
      label: "Point bas", value: pointBas !== null ? fmt(pointBas) : "—",
      color: pointBas !== null && pointBas < 0 ? "#ef4444" : "#f59e0b",
    },
    {
      label: "Runway", value: runwayDays !== null ? `${runwayDays} j` : "—",
      sub: "au rythme actuel",
      color: runwayDays !== null ? runwayDays > 60 ? "#22c55e" : runwayDays > 30 ? "#f59e0b" : "#ef4444" : undefined,
    },
    { label: "Revenus",  value: fmt(totalRevenus),  sub: numMonths > 1 ? `sur ${numMonths} mois` : undefined, color: "#22c55e" },
    { label: "Dépenses", value: fmt(totalDepenses), sub: numMonths > 1 ? `sur ${numMonths} mois` : undefined, color: "#ef4444" },
    { label: "Net",      value: (net >= 0 ? "+" : "") + fmt(net),         color: net >= 0 ? "#22c55e" : "#ef4444" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
      background: "var(--bg)", color: "white" }}>

      {/* ── Header ───────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

        <button onClick={goToPrev} style={{ display: "flex", alignItems: "center", gap: 5,
          fontSize: 13, color: "rgba(255,255,255,0.32)", background: "none", border: "none",
          cursor: "pointer" }}>
          <ChevronLeft size={14} />
          {cap(formatMonth(prev.year, prev.month))}
        </button>

        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white", margin: 0 }}>
            {monthLabel}
          </h1>
          {enriched.length > 0 && (
            <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.26)", margin: "2px 0 0" }}>
              {payeCount}/{enriched.length} confirmés · {reconciledCount} réconciliés
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 1,
            background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 2 }}>
            {([30, 60, 90] as const).map((h) => (
              <button key={h} onClick={() => setHorizon(h)} style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "none",
                cursor: "pointer", transition: "all 0.15s",
                background: horizon === h ? "rgba(255,255,255,0.12)" : "transparent",
                color:      horizon === h ? "white" : "rgba(255,255,255,0.3)",
                fontWeight: horizon === h ? 600 : 400,
              }}>
                {h}j
              </button>
            ))}
          </div>
          <button onClick={goToNext} style={{ display: "flex", alignItems: "center", gap: 5,
            fontSize: 13, color: "rgba(255,255,255,0.32)", background: "none", border: "none",
            cursor: "pointer" }}>
            {cap(formatMonth(next.year, next.month))}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────── */}
      <KPIStrip items={kpis} />

      {/* ── Content — vertically scrollable only ──────── */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        {rows.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <EmptyState
              title="Aucun poste ce mois"
              description="Ajoutez des postes dans la Base Financière pour les voir ici."
            />
          </div>
        ) : containerW === 0 ? null : (
          <div style={{ width: totalWidth }}>

            {/* Hero graph */}
            {isCurrentMonth && projection.length > 0 && soldeEffectif !== null && (
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(255,255,255,0.008)" }}>
                <HeroGraph
                  projection={projection}
                  totalDays={totalDays}
                  todayDay={todayDay}
                  totalWidth={totalWidth}
                  confortThreshold={confortThreshold}
                  hoverDay={hoverDay}
                  onHoverDay={setHoverDay}
                  wCol={wCol}
                />
              </div>
            )}

            {/* Horizontal calendar */}
            <HorizontalCalendar
              groups={calendarGroups}
              totalDays={totalDays}
              todayDay={todayDay}
              statuts={statuts}
              paid={paid}
              onCycle={handleCycle}
              wCol={wCol}
              onTooltip={setTooltip}
              monthBoundaries={monthBoundaries}
            />
          </div>
        )}
      </div>

      {/* Tooltip portal */}
      {tooltip && <TooltipPopup tip={tooltip} />}
    </div>
  );
}
