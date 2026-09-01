"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Check, CornerDownRight, X,
  Home, Car, ShoppingCart, Heart, Smartphone, Music,
  PiggyBank, Landmark, Package, Wallet, AlertTriangle, Shuffle,
} from "lucide-react";
import { animate } from "animejs";
import { useStaggerEntrance } from "@/hooks/useStaggerEntrance";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import type { BaseItem } from "@/store/baseFinanciere";
import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { usePreferencesStore } from "@/store/preferences";
import { useSoldeEffectif } from "@/hooks/useSoldeEffectif";
import {
  useTimelineStore, getEffectiveStatut, STATUT_CYCLE, type ItemStatut,
} from "@/store/timeline";
import { useTransactionsStore } from "@/store/transactions";
import type { Transaction } from "@/store/transactions";
import { useEngagementsStore, getMensualitesEngagements } from "@/store/engagements";
import { useBudgetStore, getMoisOrEmpty } from "@/store/budget";
import type { BudgetMois } from "@/store/budget";
import { computeBudgetMetrics, buildVariableDailySpend, RYTHME_COLOR, RYTHME_LABEL } from "@/lib/budget";
import { calculateRunway } from "@/lib/runway";
import { projectDailyBalance } from "@/lib/projection";
import {
  getRowsForMonth, getPendingOverdueAmount, formatMonth, prevMonth, nextMonth, type TimelineRow,
} from "@/lib/timeline";
import { EmptyState } from "@/components/ui/EmptyState";

// ── Types ──────────────────────────────────────────────────────────────────
interface EnrichedRow extends TimelineRow {
  txAmount: number | null;
  txDate:   string | null;
  ecart:    number | null;
}

interface TooltipState {
  rect:   DOMRect;
  row:    EnrichedRow;
  statut: ItemStatut;
}

// ── Layout constants ───────────────────────────────────────────────────────
const W_LABEL  = 148;
const MIN_WCOL = 8;
const GRAPH_H  = 300;
const GRAPH_PY = 28;
const GRAPH_PB = 32;
const PLOT_H   = GRAPH_H - GRAPH_PY - GRAPH_PB;

// ── Palette (CSS vars — resolved at render time) ────────────────────────────
const VAR_CATS = new Set(["alimentation", "loisirs", "autre"]);

const CALENDAR_GROUPS: {
  key: string; label: string; colorVar: string;
  filter: (r: EnrichedRow) => boolean;
}[] = [
  { key: "revenus",     label: "Revenus",     colorVar: "var(--cal-revenus)",
    filter: (r) => r.direction === "revenu" },
  { key: "fixes",       label: "Fixes",       colorVar: "var(--cal-fixes)",
    filter: (r) => r.direction === "depense" && r.categorie !== "epargne" && !VAR_CATS.has(r.categorie) && r.categorie !== "engagement" },
  { key: "variables",   label: "Variables",   colorVar: "var(--cal-variables)",
    filter: (r) => r.direction === "depense" && VAR_CATS.has(r.categorie) },
  { key: "epargne",     label: "Épargne",     colorVar: "var(--cal-epargne)",
    filter: (r) => r.direction === "depense" && r.categorie === "epargne" },
  { key: "engagements", label: "Engagements", colorVar: "var(--cal-engagements)",
    filter: (r) => r.categorie === "engagement" },
  { key: "budgetVariable", label: "Variable estimée", colorVar: "var(--cal-variables)",
    filter: (r) => r.categorie === "estimation" },
];

const CAT_ICON: Record<string, React.ReactNode> = {
  revenu: <Wallet size={10} />, logement: <Home size={10} />,
  transport: <Car size={10} />, alimentation: <ShoppingCart size={10} />,
  sante: <Heart size={10} />, abonnements: <Smartphone size={10} />,
  loisirs: <Music size={10} />, epargne: <PiggyBank size={10} />,
  "impôts": <Landmark size={10} />, autre: <Package size={10} />,
  engagement: <AlertTriangle size={10} />, estimation: <Shuffle size={10} />,
};

// All semantic colors via CSS vars — theme-aware
const CAT_COLOR: Record<string, string> = {
  revenu: "var(--cal-revenus)", logement: "var(--cal-fixes)",
  transport: "var(--cal-variables)", alimentation: "var(--calm)",
  sante: "var(--critique)", abonnements: "var(--cal-epargne)",
  loisirs: "var(--accent)", epargne: "var(--cal-epargne)",
  "impôts": "var(--cal-engagements)", autre: "var(--muted)",
  engagement: "var(--cal-engagements)", estimation: "var(--cal-variables)",
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

// Applies opacity to any color string — supports both hex and CSS var()
function alpha(c: string, a: number): string {
  if (c.startsWith("var(") || c.startsWith("rgb"))
    return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
  return c + Math.round(a * 255).toString(16).padStart(2, "0");
}

function dateToAbsDay(dateStr: string, baseYear: number, baseMonth: number): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const base   = new Date(baseYear, baseMonth, 1);
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

// Splits a polyline into closed area shapes on either side of a horizontal
// y=zeroY line, each shape following the curve on its own side and closing
// flat against zeroY. Used so the "negative" fill only ever appears under
// the segments of the curve that are actually below zero — never bleeding
// into days where the balance is still positive but under the comfort seuil.
function splitAreaByZero(
  pts: [number, number][],
  zeroY: number
): { posPath: string; negPath: string } {
  if (pts.length < 2) return { posPath: "", negPath: "" };

  const posRuns: [number, number][][] = [];
  const negRuns: [number, number][][] = [];
  let current: [number, number][] = [pts[0]];
  let side: "pos" | "neg" = pts[0][1] <= zeroY ? "pos" : "neg";

  function flush() {
    if (current.length > 1) (side === "pos" ? posRuns : negRuns).push(current);
  }

  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const nextSide: "pos" | "neg" = y1 <= zeroY ? "pos" : "neg";

    if (nextSide === side) {
      current.push(pts[i]);
    } else {
      const t  = (zeroY - y0) / (y1 - y0);
      const xi = x0 + (x1 - x0) * t;
      current.push([xi, zeroY]);
      flush();
      current = [[xi, zeroY], pts[i]];
      side = nextSide;
    }
  }
  flush();

  function runToPath(run: [number, number][]): string {
    if (run.length < 2) return "";
    const lastX  = run[run.length - 1][0];
    const firstX = run[0][0];
    return `${smoothPath(run)} L ${lastX.toFixed(1)},${zeroY.toFixed(1)} L ${firstX.toFixed(1)},${zeroY.toFixed(1)} Z`;
  }

  return {
    posPath: posRuns.map(runToPath).join(" "),
    negPath: negRuns.map(runToPath).join(" "),
  };
}

function niceStep(min: number, max: number): number {
  const range = Math.max(max - min, 1);
  const mag   = Math.pow(10, Math.floor(Math.log10(range)));
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
  const isRevenu  = row.direction === "revenu";
  const color     = isRevenu ? "var(--calm)" : (CAT_COLOR[row.categorie] ?? "var(--muted)");
  const viewH     = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewW     = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const showBelow = rect.top < viewH * 0.55;
  const left      = Math.min(Math.max(rect.left + rect.width / 2, 110), viewW - 110);
  const top       = showBelow ? rect.bottom + 8 : rect.top - 8;

  return (
    <div style={{
      position: "fixed", left, top,
      transform: showBelow ? "translateX(-50%)" : "translateX(-50%) translateY(-100%)",
      zIndex: 9999, pointerEvents: "none",
      minWidth: 190, maxWidth: 240,
      background: "var(--surface-overlay)",
      border: `1px solid ${alpha(color, 0.19)}`,
      borderRadius: 12,
      padding: "10px 12px",
      boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 20px ${alpha(color, 0.08)}`,
    }}>
      <div style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        ...(showBelow
          ? { top: -5, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: `5px solid ${alpha(color, 0.19)}` }
          : { bottom: -5, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${alpha(color, 0.19)}` }),
        width: 0, height: 0,
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8 }}>
        <span style={{ color, flexShrink: 0, marginTop: 1 }}>{CAT_ICON[row.categorie] ?? <Package size={12} />}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "white", wordBreak: "break-word", margin: 0 }}>{row.label}</p>
          <p style={{ fontSize: 9.5, color: "rgba(255,255,255,0.38)", margin: "2px 0 0" }}>
            {row.categorie} · {FREQ_LABEL[row.frequence] ?? row.frequence}
            {row.billingDay != null ? ` · j.${row.billingDay}` : ""}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>Prévu</span>
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            color: isRevenu ? "var(--calm)" : "var(--ink)" }}>
            {isRevenu ? "+" : "−"}{fmt(row.montant)}
          </span>
        </div>
        {row.txAmount !== null && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>Réel</span>
            <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,0.75)" }}>
              {isRevenu ? "+" : "−"}{fmt(row.txAmount)}
            </span>
          </div>
        )}
        {row.ecart !== null && Math.abs(row.ecart) > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)" }}>Écart</span>
            <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums",
              color: row.ecart >= 0 ? "var(--calm)" : "var(--critique)" }}>
              {row.ecart > 0 ? "+" : ""}{fmt(row.ecart)}
            </span>
          </div>
        )}
      </div>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 9.5, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
        background: statut === "paye"    ? "var(--calm-soft)"
                  : statut === "reporte" ? "var(--attention-soft)"
                  : statut === "annule"  ? "var(--border)"
                  : "var(--border)",
        color: statut === "paye"    ? "var(--calm)"
             : statut === "reporte" ? "var(--attention)"
             : statut === "annule"  ? "var(--ink-ghost)"
             : "var(--ink-soft)",
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
  const color     = row.direction === "revenu" ? "var(--calm)" : (CAT_COLOR[row.categorie] ?? "var(--muted)");
  const isRevenu  = row.direction === "revenu";
  const isPaye    = statut === "paye";
  const isReporte = statut === "reporte";
  const isAnnule  = statut === "annule";
  const showLabel  = wCol >= 52;
  const showAmount = wCol >= 22;
  const showIcon   = wCol >= 16;

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
          background: isPaye ? alpha(color, 0.38) : alpha(color, 0.16),
          border: `1px ${isReporte ? "dashed" : "solid"} ${alpha(color, 0.33)}`,
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
        border: `1px ${isReporte ? "dashed" : "solid"} ${isPaye ? alpha(color, 0.33) : alpha(color, 0.16)}`,
        background: isPaye ? alpha(color, 0.09) : alpha(color, 0.05),
        boxShadow: isPaye ? `0 0 10px ${alpha(color, 0.13)}, inset 0 1px 0 ${alpha(color, 0.08)}` : "none",
        opacity: isAnnule ? 0.35 : 1,
        transition: "box-shadow 0.15s, background 0.15s",
      }}>
        {showIcon && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }}>
            <span style={{ color, opacity: 0.75, lineHeight: 1 }}>{CAT_ICON[row.categorie] ?? <Package size={10} />}</span>
            {isPaye    && <Check size={7}           style={{ color: "var(--calm)",      flexShrink: 0 }} />}
            {isReporte && <CornerDownRight size={7} style={{ color: "var(--attention)", flexShrink: 0 }} />}
            {isAnnule  && <X size={7}              style={{ color: "var(--ink-ghost)", flexShrink: 0 }} />}
          </div>
        )}
        {showLabel && (
          <p style={{ fontSize: 8, color: "var(--ink-ghost)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1, maxWidth: wCol - 10 }}>
            {row.label}
          </p>
        )}
        {showAmount && (
          <p style={{ fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums",
            color: isRevenu ? "var(--calm)" : "var(--ink)",
            textDecoration: isAnnule ? "line-through" : "none" }}>
            {isRevenu ? "+" : "−"}{fmtK(row.txAmount ?? row.montant)}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Projection (shared between the real curve and the variable-scenario overlay) ──

/**
 * Runs the same 3-branch month projection (current / past / chained future)
 * used for the Timeline's real numbers. `variable`, when passed, folds
 * estimated Budget-envelope spend into the result — used only to build the
 * dotted "avec dépenses variables" overlay curve, never the real one, so
 * toggling it can never change Runway / Point bas / Net etc.
 */
function computeMonthProjection(p: {
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
  soldeEffectif: number;
  pendingOverdue: number;
  activeItems: BaseItem[];
  projectionDays: number;
  projStartDate: Date;
  year: number;
  month: number;
  statuts: Record<string, ItemStatut>;
  paid: Record<string, boolean>;
  now: Date;
  variable: { budgetMois: BudgetMois[]; transactions: Transaction[] } | null;
}) {
  const {
    isCurrentMonth, isFutureMonth, soldeEffectif, pendingOverdue, activeItems,
    projectionDays, projStartDate, year, month, statuts, paid, now, variable,
  } = p;

  function varDaily(start: Date, days: number): number[] | undefined {
    if (!variable || days <= 0) return undefined;
    return buildVariableDailySpend(variable.budgetMois, variable.transactions, start, days, now);
  }

  if (isCurrentMonth) {
    return projectDailyBalance(
      soldeEffectif - pendingOverdue, activeItems, projectionDays, now, statuts, paid,
      varDaily(now, projectionDays)
    );
  }

  if (!isFutureMonth) {
    // Past month: relative view — start from 0, show the cash-flow shape only
    // (variable spend is real history here, not a projection — not modeled)
    return projectDailyBalance(0, activeItems, projectionDays, projStartDate, statuts, paid);
  }

  // Future month: chain-project from today to the start of the selected month
  const msToTarget = new Date(year, month, 1).getTime() - now.getTime();
  const daysToTarget = Math.ceil(msToTarget / 86400000);
  const chain = daysToTarget > 0
    ? projectDailyBalance(
        soldeEffectif - pendingOverdue, activeItems, daysToTarget, now, statuts, paid,
        varDaily(now, daysToTarget)
      )
    : null;
  const startBalance = chain?.[chain.length - 1]?.solde ?? (soldeEffectif - pendingOverdue);
  return projectDailyBalance(
    startBalance, activeItems, projectionDays, projStartDate, statuts, paid,
    varDaily(projStartDate, projectionDays)
  );
}

// ── HeroGraph ──────────────────────────────────────────────────────────────
function HeroGraph({
  projection, projectionVariable, totalDays, todayDay, totalWidth, confortThreshold,
  hoverDay, onHoverDay, wCol, startDate, showTodayLine = true,
}: {
  projection:         { solde: number }[];
  /** Optional independent "with variable spend" scenario — purely visual,
   *  never affects rawMin/rawMax-derived KPIs, just widens the Y scale so
   *  both curves fit. */
  projectionVariable?: { solde: number }[] | null;
  totalDays:        number;
  todayDay:         number;
  totalWidth:       number;
  confortThreshold: number;
  hoverDay:         number | null;
  onHoverDay:       (d: number | null) => void;
  wCol:             number;
  startDate:        Date;
  showTodayLine?:   boolean;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const toX = (day: number) => W_LABEL + (day - 1) * wCol + wCol / 2;

  const soldes    = projection.map((p) => p.solde);
  const soldesVar = projectionVariable ? projectionVariable.map((p) => p.solde) : [];
  const allVals   = [...soldes, ...soldesVar, confortThreshold, 0];
  const rawMin  = Math.min(...allVals) - 80;
  const rawMax  = Math.max(...allVals) + 80;
  const range   = Math.max(rawMax - rawMin, 1);
  const toY     = (v: number) => GRAPH_PY + PLOT_H - ((v - rawMin) / range) * PLOT_H;

  const step     = niceStep(rawMin, rawMax);
  const gridVals: number[] = [];
  for (let v = Math.ceil(rawMin / step) * step; v <= rawMax; v += step) gridVals.push(v);

  const projPts: [number, number][] = projection.map((p, i) => [toX(todayDay + i), toY(p.solde)]);
  const projPath = smoothPath(projPts);

  const varPts: [number, number][] = projectionVariable
    ? projectionVariable.map((p, i) => [toX(todayDay + i), toY(p.solde)])
    : [];
  const varPath = varPts.length > 0 ? smoothPath(varPts) : "";

  const bottomY  = GRAPH_PY + PLOT_H;
  const zeroY    = Math.max(GRAPH_PY - 1, Math.min(bottomY + 1, toY(0)));
  const zeroFrac = Math.max(0, Math.min(1, (zeroY - GRAPH_PY) / PLOT_H));
  const hasNegative    = soldes.some((s) => s < 0);
  const hasNegativeVar = soldesVar.some((s) => s < 0);

  // Fills follow the curve's actual sign at each point in time — never a
  // flat band — so blue/red only ever cover the days that are truly
  // positive/negative, regardless of where the comfort seuil sits.
  const { posPath: areaPosPath, negPath: areaNegPath } = splitAreaByZero(projPts, zeroY);
  // Variable overlay only ever gets a fill below zero — its own red, so the
  // two "negative" zones (real vs. hypothetical) never read as one signal.
  const { negPath: areaVarNegPath } = varPts.length > 0 ? splitAreaByZero(varPts, zeroY) : { negPath: "" };

  // Point bas — once the variable scenario exists it's always ≤ the real
  // curve at every day (only ever adds spend), so it's always the true worst
  // case: the animated marker follows it instead of the real curve, so it
  // never sits on a point that isn't actually the lowest one drawn.
  const pbSoldes = soldesVar.length > 0 ? soldesVar : soldes;
  const pbPts    = soldesVar.length > 0 ? varPts : projPts;
  const minSolde = Math.min(...pbSoldes);
  const minIdx   = pbSoldes.indexOf(minSolde);
  const pbX      = pbPts[minIdx]?.[0];
  const pbY      = pbPts[minIdx]?.[1];
  const pbActualDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + minIdx);
  const pbDateLabel  = pbActualDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const pbFromVariable = soldesVar.length > 0;
  const pbColor    = pbFromVariable ? "var(--graph-variable-neg)" : "var(--graph-point-bas)";
  const pbHaloUrl  = pbFromVariable ? "url(#tl-pb-halo-var-v4)" : "url(#tl-pb-halo-v4)";

  const todayX   = toX(todayDay);
  const confortY = toY(confortThreshold);

  // Hover value follows the same curve as everything else on the graph: once
  // the variable scenario is shown, it's what's checked, not the real one.
  const hoverSource = projectionVariable ?? projection;
  const hoverIdx     = hoverDay !== null ? hoverDay - todayDay : -1;
  const hoverSolde   = hoverIdx >= 0 && hoverIdx < hoverSource.length ? hoverSource[hoverIdx].solde : null;
  const hoverActualDate = hoverIdx >= 0
    ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + hoverIdx)
    : null;
  const hoverDateLabel = hoverActualDate
    ? hoverActualDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    : "";
  const hoverX       = hoverDay !== null ? toX(hoverDay) : null;

  const pbAnnotX = pbX !== undefined ? Math.min(pbX + 8, totalWidth - 132) : 0;
  const pbAnnotY = pbY !== undefined ? Math.max(pbY - 54, GRAPH_PY + 4) : GRAPH_PY;

  // Animated curve draw on mount / data change
  useEffect(() => {
    const path = pathRef.current;
    if (!path || !projPath) return;
    const len = path.getTotalLength();
    if (len === 0) return;
    path.style.strokeDasharray  = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    path.style.transition       = "none";
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        path.style.transition       = "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)";
        path.style.strokeDashoffset = "0";
      });
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, [projPath]);

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
        {/* Stroke: blue above zero, red below — tight blend right at the crossing */}
        <linearGradient id="tl-line-v4" x1="0" y1={GRAPH_PY} x2="0" y2={bottomY} gradientUnits="userSpaceOnUse">
          <stop offset="0%"                                                   stopColor="var(--graph-line)" />
          <stop offset={`${Math.max(0, zeroFrac * 100 - 2).toFixed(1)}%`}     stopColor="var(--graph-line)" />
          <stop offset={`${Math.min(100, zeroFrac * 100 + 2).toFixed(1)}%`}   stopColor="var(--graph-point-bas)" />
          <stop offset="100%"                                                 stopColor="var(--graph-point-bas)" />
        </linearGradient>
        <linearGradient id="tl-area-pos-v4" x1="0" y1={GRAPH_PY} x2="0" y2={bottomY} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="var(--graph-area-pos-top)" />
          <stop offset="100%" stopColor="var(--graph-area-pos-bottom)" />
        </linearGradient>
        <linearGradient id="tl-area-neg-v4" x1="0" y1={GRAPH_PY} x2="0" y2={bottomY} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="var(--graph-area-neg-top)" />
          <stop offset="100%" stopColor="var(--graph-area-neg-bottom)" />
        </linearGradient>
        {/* Variable overlay stroke: same orange as its dots above zero, but its
            own distinct red below — never the same red as the real curve. */}
        <linearGradient id="tl-var-line-v4" x1="0" y1={GRAPH_PY} x2="0" y2={bottomY} gradientUnits="userSpaceOnUse">
          <stop offset="0%"                                                   stopColor="var(--cal-variables)" />
          <stop offset={`${Math.max(0, zeroFrac * 100 - 2).toFixed(1)}%`}     stopColor="var(--cal-variables)" />
          <stop offset={`${Math.min(100, zeroFrac * 100 + 2).toFixed(1)}%`}   stopColor="var(--graph-variable-neg)" />
          <stop offset="100%"                                                 stopColor="var(--graph-variable-neg)" />
        </linearGradient>
        <radialGradient id="tl-pb-halo-v4" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="var(--graph-point-bas)" stopOpacity={0.45} />
          <stop offset="100%" stopColor="var(--graph-point-bas)" stopOpacity={0}    />
        </radialGradient>
        <radialGradient id="tl-pb-halo-var-v4" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="var(--graph-variable-neg)" stopOpacity={0.45} />
          <stop offset="100%" stopColor="var(--graph-variable-neg)" stopOpacity={0}    />
        </radialGradient>
        <filter id="tl-glow-v4" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="tl-today-glow" x="-60%" y="-5%" width="220%" height="110%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Y grid */}
      {gridVals.map((v) => {
        const y = toY(v);
        if (y < GRAPH_PY - 2 || y > bottomY + 2) return null;
        return (
          <g key={v}>
            <line x1={W_LABEL} y1={y} x2={totalWidth} y2={y} stroke="var(--graph-grid)" strokeWidth={1} />
            <text x={W_LABEL - 6} y={y + 3.5} textAnchor="end" fontSize={8.5} fill="var(--ink-ghost)">
              {fmtK(v)}
            </text>
          </g>
        );
      })}

      {/* Comfort threshold */}
      {confortY >= GRAPH_PY && confortY <= bottomY && (
        <g>
          <line x1={W_LABEL} y1={confortY} x2={totalWidth} y2={confortY}
            stroke="var(--graph-confort-line)" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="6 4" />
          <text x={W_LABEL - 6} y={confortY - 3} textAnchor="end" fontSize={7.5} fill="var(--graph-confort-line)" fillOpacity={0.5}>seuil</text>
        </g>
      )}

      {/* Past zone shade */}
      <rect x={W_LABEL} y={GRAPH_PY} width={Math.max(0, todayX - W_LABEL)} height={PLOT_H}
        fill="rgba(255,255,255,0.010)" />

      {/* Area fills — blue only where the balance is actually positive that day,
          red only where it's actually negative. No flat "below seuil" wash. */}
      {areaPosPath && <path d={areaPosPath} fill="url(#tl-area-pos-v4)" />}
      {areaNegPath && <path d={areaNegPath} fill="url(#tl-area-neg-v4)" />}

      {/* Variable overlay's own below-zero zone — a different red than the
          real curve's, so the two "negative" signals never look like one. */}
      {areaVarNegPath && <path d={areaVarNegPath} fill={alpha("var(--graph-variable-neg)", 0.22)} />}

      {/* Zero line */}
      {hasNegative && zeroY >= GRAPH_PY && zeroY <= bottomY && (
        <g>
          <line x1={W_LABEL} y1={zeroY} x2={totalWidth} y2={zeroY}
            stroke="var(--graph-point-bas)" strokeOpacity={0.50} strokeWidth={1} />
          <text x={W_LABEL - 6} y={zeroY + 3.5} textAnchor="end"
            fontSize={8} fill="var(--graph-point-bas)" fillOpacity={0.6} fontWeight="600">0</text>
        </g>
      )}

      {/* Animated projection curve */}
      {projPath && (
        <path
          ref={pathRef}
          d={projPath}
          fill="none"
          stroke={hasNegative ? "url(#tl-line-v4)" : "var(--graph-line)"}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#tl-glow-v4)"
        />
      )}

      {/* Variable-scenario overlay — independent dotted curve, purely informational.
          Never replaces the real line above; only ever drawn alongside it. */}
      {varPath && (
        <path
          d={varPath}
          fill="none"
          stroke={hasNegativeVar ? "url(#tl-var-line-v4)" : "var(--cal-variables)"}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 4.5"
          opacity={0.85}
        />
      )}

      {/* Today line */}
      {showTodayLine && <>
        <line x1={todayX} y1={GRAPH_PY - 4} x2={todayX} y2={bottomY + 2}
          stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} filter="url(#tl-today-glow)" />
        <text x={todayX} y={GRAPH_PY - 9} textAnchor="middle" fontSize={7}
          fill="rgba(255,255,255,0.32)" letterSpacing={0.8}>AUJOURD'HUI</text>
        <circle cx={todayX} cy={bottomY + 2} r={3.5} fill="var(--graph-today-dot)"
          style={{ transformBox: "fill-box" as React.CSSProperties["transformBox"],
                   transformOrigin: "center",
                   animation: "today-pulse 2s ease-in-out infinite" }} />
      </>}

      {/* Point bas — red for the real curve, the variable-overlay red once
          the worst point actually comes from the "avec variable" scenario. */}
      {pbX !== undefined && pbY !== undefined && (
        <g>
          <circle cx={pbX} cy={pbY} r={10} fill="none" stroke={pbColor} strokeWidth={1.2}
            style={{ transformBox: "fill-box" as React.CSSProperties["transformBox"],
                     transformOrigin: "center",
                     animation: "pb-pulse-ring 1.8s ease-out infinite" }} />
          <circle cx={pbX} cy={pbY} r={10} fill="none" stroke={pbColor} strokeWidth={0.8}
            style={{ transformBox: "fill-box" as React.CSSProperties["transformBox"],
                     transformOrigin: "center",
                     animation: "pb-pulse-ring 1.8s ease-out 0.6s infinite" }} />
          <circle cx={pbX} cy={pbY} r={24} fill={pbHaloUrl} />
          <circle cx={pbX} cy={pbY} r={5}  fill={pbColor} />
          <circle cx={pbX} cy={pbY} r={2}  fill="white"   />
          <g transform={`translate(${pbAnnotX},${pbAnnotY})`}>
            <rect x={0} y={0} width={128} height={46} rx={8}
              fill="var(--surface-elevated)" stroke={pbColor} strokeOpacity={0.32} strokeWidth={1} />
            <line x1={1} y1={1} x2={127} y2={1} stroke={pbColor} strokeOpacity={0.20} strokeWidth={0.5} />
            <text x={9} y={15} fontSize={7.5} fill={pbColor} fontWeight="700" letterSpacing="0.08em">POINT BAS</text>
            <text x={9} y={31} fontSize={12}  fill="var(--ink)"   fontWeight="700" fontFamily="monospace">{fmt(minSolde)}</text>
            <text x={9} y={41} fontSize={8}   fill="var(--ink-ghost)">{pbDateLabel}</text>
          </g>
        </g>
      )}

      {/* Hover crosshair */}
      {hoverX !== null && (
        <g>
          <line x1={hoverX} y1={GRAPH_PY} x2={hoverX} y2={bottomY}
            stroke="rgba(255,255,255,0.14)" strokeWidth={1} strokeDasharray="4 3" />
          {hoverSolde !== null && (
            <g transform={`translate(${Math.min(hoverX + 7, totalWidth - 128)},${GRAPH_PY + 8})`}>
              <rect x={0} y={0} width={120} height={40} rx={6}
                fill="rgba(6,6,18,0.92)"
                stroke={projectionVariable ? alpha("var(--cal-variables)", 0.45) : "rgba(255,255,255,0.10)"}
                strokeWidth={1} />
              <text x={9} y={18} fontSize={7.5} fill="rgba(255,255,255,0.4)" letterSpacing={0.4}
                style={{ textTransform: "capitalize" }}>{hoverDateLabel}</text>
              <text x={9} y={32} fontSize={12} fill="white" fontWeight="700"
                style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(hoverSolde)}</text>
            </g>
          )}
        </g>
      )}

      {/* Day tick labels */}
      {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
        const x       = toX(d);
        const isToday = d === todayDay;
        const interval = wCol < 36 ? 10 : 5;
        const show = isToday || d === 1 || d % interval === 0 || d === totalDays;
        if (!show) return null;
        return (
          <g key={d}>
            {isToday && <circle cx={x} cy={bottomY + 15} r={9} fill="var(--graph-today)" />}
            <text x={x} y={bottomY + 19} textAnchor="middle" fontSize={8}
              fill={isToday ? "var(--ink)" : "var(--ink-ghost)"}>{d}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── InsightsBar ────────────────────────────────────────────────────────────
function InsightsBar({
  projection, confortThreshold, soldeFin, runwayDays, withVariable = false,
}: {
  projection:       { solde: number }[];
  confortThreshold: number;
  soldeFin:         number | null;
  runwayDays:       number | null;
  /** True when `projection` is the variable-inclusive curve — appends a note
   *  to the negative-balance signal so it's clear which scenario it's about. */
  withVariable?:    boolean;
}) {
  const insights = useMemo(() => {
    const list: { icon: string; text: string; color: string }[] = [];
    if (projection.length === 0) return list;
    const daysBelow = projection.filter((p) => p.solde < confortThreshold).length;
    if (daysBelow > 0)
      list.push({ icon: "⚠", text: `${daysBelow}j sous le seuil`, color: "var(--attention)" });
    if (projection.some((p) => p.solde < 0))
      list.push({
        icon: "✕",
        text: withVariable ? "Solde négatif prévu avec dépenses variables" : "Solde négatif prévu",
        color: "var(--critique)",
      });
    else if (soldeFin !== null && soldeFin > confortThreshold * 1.5)
      list.push({ icon: "✓", text: "Trajectoire saine", color: "var(--calm)" });
    if (runwayDays !== null && runwayDays > 90)
      list.push({ icon: "◈", text: `Runway ${runwayDays}j`, color: "var(--accent)" });
    return list.slice(0, 3);
  }, [projection, confortThreshold, soldeFin, runwayDays, withVariable]);

  if (insights.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "5px 16px", flexShrink: 0,
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      background: "rgba(255,255,255,0.008)",
    }}>
      <span style={{ fontSize: 7, fontFamily: "monospace", textTransform: "uppercase",
        letterSpacing: "0.12em", color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>IA</span>
      <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />
      {insights.map((ins, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {i > 0 && <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.07)" }} />}
          <span style={{ fontSize: 9, color: ins.color }}>{ins.icon}</span>
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.42)" }}>{ins.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPIBand ────────────────────────────────────────────────────────────────
function KPIBand({
  items,
}: {
  items: { label: string; value: string; sub?: string; color?: string; dominant?: boolean }[];
}) {
  return (
    <div style={{
      display: "flex", flexShrink: 0,
      gap: 8, padding: "10px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {items.map((kpi, i) => (
        <div key={i} style={{
          flex: kpi.dominant ? "2 1 0" : "1 1 0",
          minWidth: 0,
          position: "relative",
          overflow: "hidden",
          background: "rgba(255,255,255,0.025)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderLeft: `2px solid ${kpi.color ?? "rgba(255,255,255,0.15)"}`,
          borderRadius: 10,
          padding: "9px 12px",
        }}>
          <div style={{
            position: "absolute", top: -18, right: -18,
            width: 54, height: 54, borderRadius: "50%",
            background: kpi.color ?? "transparent",
            filter: "blur(20px)", opacity: 0.09,
            pointerEvents: "none",
          }} />
          <p style={{ fontSize: 7.5, fontFamily: "monospace", textTransform: "uppercase",
            letterSpacing: "0.12em", color: "rgba(255,255,255,0.24)", marginBottom: 4 }}>
            {kpi.label}
          </p>
          <p style={{
            fontSize: kpi.dominant ? 16 : 14, fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: kpi.color ?? "white",
            textShadow: kpi.color ? `0 0 14px ${alpha(kpi.color, 0.31)}` : undefined,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {kpi.value}
          </p>
          {kpi.sub && (
            <p style={{ fontSize: 7.5, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>{kpi.sub}</p>
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
  groups:          { key: string; label: string; colorVar: string; rows: EnrichedRow[] }[];
  totalDays:       number;
  todayDay:        number;
  statuts:         Record<string, ItemStatut>;
  paid:            Record<string, boolean>;
  onCycle:         (key: string) => void;
  wCol:            number;
  onTooltip:       (tip: TooltipState | null) => void;
  monthBoundaries: { absDay: number; label: string }[];
}) {
  const staggerRef    = useStaggerEntrance<HTMLDivElement>({ startDelay: 40, duration: 380, y: 8 });
  const days          = Array.from({ length: totalDays }, (_, i) => i + 1);
  const visibleGroups = groups.filter((g) => g.rows.length > 0);
  const boundarySet   = new Map(monthBoundaries.map((b) => [b.absDay, b.label]));

  return (
    <div ref={staggerRef}>
      {visibleGroups.map((group) => {
        const isRevenu   = group.key === "revenus";
        const groupTotal = group.rows.reduce((s, r) => s + (r.txAmount ?? r.montant), 0);
        // Ponctuel items always carry a real billingDay (derived from their
        // dateDebut — required on creation), so they position on the grid
        // like any other dated item instead of hiding in the sidebar list,
        // where a specific one-off date read as "maybe not accounted for".
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

              {/* Sticky left label */}
              <div style={{
                width: W_LABEL, flexShrink: 0,
                position: "sticky", left: 0, zIndex: 10,
                background: "var(--surface, #04040c)",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                display: "flex", flexDirection: "column", justifyContent: "flex-start",
                padding: "8px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: group.colorVar,
                    flexShrink: 0, boxShadow: `0 0 6px ${group.colorVar}` }} />
                  <p style={{ fontSize: 8, fontFamily: "monospace", textTransform: "uppercase",
                    letterSpacing: "0.09em", color: group.colorVar }}>
                    {group.label}
                  </p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  color: isRevenu ? "var(--calm)" : "var(--ink)",
                  textShadow: isRevenu ? "0 0 12px var(--calm-glow)" : undefined,
                  marginBottom: withoutDay.length > 0 ? 5 : 0 }}>
                  {isRevenu ? "+" : "−"}{fmt(groupTotal)}
                </p>
                {withoutDay.map((row) => {
                  const st = getEffectiveStatut(row.key, statuts, paid);
                  const stColor =
                    st === "paye"    ? "var(--calm)" :
                    st === "reporte" ? "var(--attention)" :
                    st === "annule"  ? "var(--ink-ghost)" :
                                       "var(--ink-soft)";
                  return (
                    <button
                      key={row.key}
                      onClick={() => onCycle(row.key)}
                      onMouseEnter={(e) => onTooltip({ rect: e.currentTarget.getBoundingClientRect(), row, statut: st })}
                      onMouseLeave={() => onTooltip(null)}
                      style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2,
                        background: "none", border: "none", padding: "2px 0",
                        cursor: "pointer", textAlign: "left", width: "100%" }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: stColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 9, color: "rgba(255,255,255,0.5)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                        color: isRevenu ? "var(--calm)" : "var(--ink-soft)", flexShrink: 0 }}>
                        {fmtK(row.txAmount ?? row.montant)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day cells */}
              <div style={{ display: "flex", flexShrink: 0 }}>
                {days.map((day) => {
                  const dayRows  = byDay.get(day) ?? [];
                  const isToday  = day === todayDay;
                  const boundary = boundarySet.get(day);
                  return (
                    <div key={day} style={{
                      width: wCol, flexShrink: 0, minHeight: rowMinH,
                      display: "flex", flexDirection: "column", gap: 3,
                      padding: "4px 2px",
                      background: isToday ? "var(--graph-today)" : "transparent",
                      borderLeft: boundary
                        ? "1px solid rgba(255,255,255,0.10)"
                        : "1px solid rgba(255,255,255,0.02)",
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
  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth());
  const [horizon,    setHorizon]    = useState<30 | 60 | 90>(30);
  const [hoverDay,   setHoverDay]   = useState<number | null>(null);
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null);
  const [containerW, setContainerW] = useState(0);
  const containerRef  = useRef<HTMLDivElement>(null);
  const calendarRef   = useRef<HTMLDivElement>(null);
  const prevMonthKey  = useRef(`${year}-${month}`);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.offsetWidth));
    ro.observe(el);
    setContainerW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Month slide transition
  useEffect(() => {
    const key = `${year}-${month}`;
    if (key === prevMonthKey.current) return;
    const [py, pm] = prevMonthKey.current.split("-").map(Number);
    const dir = year * 12 + month > py * 12 + pm ? 1 : -1;
    prevMonthKey.current = key;
    const el = calendarRef.current;
    if (!el) return;
    animate(el, { opacity: [0, 1], translateX: [dir * 20, 0], duration: 260, ease: "outQuart" });
  }, [year, month]);

  const { items }                      = useBaseFinanciereStore();
  const { paid, statuts, cycleStatut } = useTimelineStore();
  const { engagements, addEngagement } = useEngagementsStore();
  const transactions                   = useTransactionsStore((s) => s.transactions);
  const comptes                        = useComptesStore((s) => s.comptes);
  const { confortThreshold, includeVariableInTimeline, setIncludeVariableInTimeline } = usePreferencesStore();

  // soldeRunway calculé séparément (en plus du hook) : le sous-libellé du KPI
  // "Solde du jour" doit savoir si la valeur vient des comptes ou du repli
  // legacy — une distinction dont les 4 autres vues n'ont pas besoin.
  const soldeRunway    = getSoldeRunway(comptes);
  const soldeEffectif  = useSoldeEffectif();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const isFutureMonth  = year * 12 + month > now.getFullYear() * 12 + now.getMonth();

  // ── Budget signal (current month only) ────────────────────────────────────
  const { mois: budgetMois } = useBudgetStore();
  const budgetSignal = useMemo(() => {
    if (!isCurrentMonth) return null;
    const mois = getMoisOrEmpty(budgetMois, year, month);
    if (mois.envelopes.length === 0) return null;
    const activeItems = items.filter(i => !i.archived);
    const metrics = computeBudgetMetrics(mois, transactions, activeItems, engagements, year, month);
    const alerting = metrics.envelopes.filter(e => e.rythme === "critique" || e.rythme === "attention");
    return alerting.length > 0 ? alerting.slice(0, 4) : null;
  }, [budgetMois, isCurrentMonth, year, month, transactions, items, engagements]);
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const todayDay       = isCurrentMonth ? now.getDate() : 1;
  const numMonths      = horizon / 30;

  const totalDays = useMemo(() => {
    let days = 0, y = year, m = month;
    for (let i = 0; i < numMonths; i++) {
      days += new Date(y, m + 1, 0).getDate();
      const nxt = nextMonth(y, m);
      y = nxt.year; m = nxt.month;
    }
    return days;
  }, [numMonths, year, month]);

  const wCol       = containerW > 0
    ? Math.max(MIN_WCOL, Math.floor((containerW - W_LABEL) / totalDays))
    : 40;
  const totalWidth = W_LABEL + wCol * totalDays;

  const monthBoundaries = useMemo((): { absDay: number; label: string }[] => {
    if (!isCurrentMonth || numMonths <= 1) return [];
    const boundaries: { absDay: number; label: string }[] = [];
    let offset = daysInMonth, y = year, m = month;
    for (let i = 1; i < numMonths; i++) {
      const { year: ny, month: nm } = nextMonth(y, m);
      boundaries.push({ absDay: offset + 1, label: cap(formatMonth(ny, nm)) });
      offset += new Date(ny, nm + 1, 0).getDate();
      y = ny; m = nm;
    }
    return boundaries;
  }, [isCurrentMonth, numMonths, daysInMonth, year, month]);

  const rows = useMemo(() => getRowsForMonth(items, year, month), [items, year, month]);

  const enriched = useMemo((): EnrichedRow[] => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return rows.map((row) => {
      const tx       = transactions.find((t) => t.reconciledItemId === row.itemId && t.date.startsWith(monthStr));
      const txAmount = tx?.montant ?? null;
      const ecart    = txAmount !== null ? row.montant - txAmount : null;
      return { ...row, txAmount, txDate: tx?.date ?? null, ecart };
    });
  }, [rows, transactions, year, month]);

  const extraEnriched = useMemo((): EnrichedRow[] => {
    if (!isCurrentMonth || totalDays <= daysInMonth) return [];
    const extra: EnrichedRow[] = [];
    let offset = daysInMonth, y = year, m = month;
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

  const engagementRows = useMemo((): EnrichedRow[] => {
    const rows: EnrichedRow[] = [];
    for (const e of engagements) {
      if (e.solde) continue;
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

  // Estimated variable spend (Budget envelopes) for the navigated month — same
  // "restant + dépassement projeté" logic as the balance projection below, so
  // the total shown here always matches what actually moves the curve.
  const isNavPastMonth = year * 12 + month < now.getFullYear() * 12 + now.getMonth();
  const navMonthVariableTotal = useMemo(() => {
    if (!includeVariableInTimeline || isNavPastMonth) return 0;
    const start = isCurrentMonth ? now : new Date(year, month, 1);
    const span  = isCurrentMonth ? daysInMonth - todayDay + 1 : daysInMonth;
    const arr   = buildVariableDailySpend(budgetMois, transactions, start, span, now);
    return Math.round(arr.reduce((s, v) => s + v, 0));
  }, [includeVariableInTimeline, isNavPastMonth, isCurrentMonth, year, month, daysInMonth, todayDay, budgetMois, transactions]);

  const variableEstimateRows = useMemo((): EnrichedRow[] => {
    if (navMonthVariableTotal <= 0) return [];
    return [{
      key: `budgetvar-${year}-${month}`, itemId: "budget-variable", label: "Dépenses variables (estimation)",
      direction: "depense", categorie: "estimation", frequence: "mensuel",
      billingDay: undefined, montant: navMonthVariableTotal,
      txAmount: null, txDate: null, ecart: null,
    }];
  }, [navMonthVariableTotal, year, month]);

  const calendarGroups = useMemo(
    () => CALENDAR_GROUPS.map((g) => ({
      ...g,
      rows: g.key === "engagements"
        ? engagementRows
        : g.key === "budgetVariable"
        ? variableEstimateRows
        : [...enriched, ...extraEnriched].filter(g.filter),
    })),
    [enriched, extraEnriched, engagementRows, variableEstimateRows]
  );

  const allDisplayedRows  = useMemo(() => [...enriched, ...extraEnriched], [enriched, extraEnriched]);
  const totalRevenus      = allDisplayedRows.filter((r) => r.direction === "revenu").reduce((s, r) => s + r.montant, 0);
  const totalDepenses     = allDisplayedRows.filter((r) => r.direction === "depense" && r.categorie !== "engagement").reduce((s, r) => s + r.montant, 0);
  const net               = totalRevenus - totalDepenses;
  const payeCount         = enriched.filter((r) => getEffectiveStatut(r.key, statuts, paid) === "paye").length;
  const reconciledCount   = enriched.filter((r) => r.txAmount !== null).length;

  const horizonEndLabel = useMemo(() => {
    let y = year, m = month;
    for (let i = 1; i < numMonths; i++) { const nxt = nextMonth(y, m); y = nxt.year; m = nxt.month; }
    return cap(formatMonth(y, m));
  }, [year, month, numMonths]);

  const projectionDays = useMemo(() => {
    if (!isCurrentMonth) return daysInMonth;
    let days = daysInMonth - todayDay + 1;
    let y = year, m = month;
    for (let i = 1; i < numMonths; i++) {
      const nxt = nextMonth(y, m);
      days += new Date(nxt.year, nxt.month + 1, 0).getDate();
      y = nxt.year; m = nxt.month;
    }
    return days;
  }, [isCurrentMonth, numMonths, year, month, daysInMonth, todayDay]);

  const activeItems = useMemo(() => items.filter((i) => !i.archived), [items]);

  // Past billing days not yet confirmed — deduct from starting balance so they appear in the curve
  const pendingOverdue = useMemo(
    () => getPendingOverdueAmount(activeItems, statuts, paid),
    [activeItems, statuts, paid]
  );

  const projStartDate = useMemo(
    () => isCurrentMonth ? now : new Date(year, month, 1),
    [isCurrentMonth, year, month]
  );

  // The real trajectory — always fixed/known items only. Never touched by the
  // "Variable" toggle, so Runway / Point bas / Net / Solde prévu stay exact.
  const projection = useMemo(() => {
    if (soldeEffectif === null) return [];
    return computeMonthProjection({
      isCurrentMonth, isFutureMonth, soldeEffectif, pendingOverdue, activeItems,
      projectionDays, projStartDate, year, month, statuts, paid, now, variable: null,
    });
  }, [
    isCurrentMonth, isFutureMonth, soldeEffectif, pendingOverdue, activeItems,
    projectionDays, projStartDate, year, month, statuts, paid,
  ]);

  // Independent "what if" scenario — same real starting point, but with
  // estimated variable spend folded in. Purely a second curve on the graph;
  // never feeds any KPI, so it can't distort the real numbers.
  const projectionWithVariable = useMemo(() => {
    if (!includeVariableInTimeline || soldeEffectif === null) return null;
    return computeMonthProjection({
      isCurrentMonth, isFutureMonth, soldeEffectif, pendingOverdue, activeItems,
      projectionDays, projStartDate, year, month, statuts, paid, now,
      variable: { budgetMois, transactions },
    });
  }, [
    includeVariableInTimeline, isCurrentMonth, isFutureMonth, soldeEffectif, pendingOverdue,
    activeItems, projectionDays, projStartDate, year, month, statuts, paid, budgetMois, transactions,
  ]);

  // Once the variable scenario is on, it's always ≤ the real curve at every
  // day (it only ever adds spend) — so it's always the true worst case, and
  // Point bas / the graph's animated marker follow it instead of the real
  // curve, to stay consistent with what's visually the lowest dip on screen.
  const pointBasSource = projectionWithVariable ?? projection;
  const pointBas = pointBasSource.length > 0 ? Math.min(...pointBasSource.map((p) => p.solde)) : null;
  const soldeFin = projection[projection.length - 1]?.solde ?? null;
  const mensualitesEngagements = getMensualitesEngagements(engagements, new Date(year, month, 1));
  const runwayDays = soldeEffectif !== null
    ? calculateRunway(
        soldeEffectif - pendingOverdue,
        totalRevenus / numMonths,
        totalDepenses / numMonths + mensualitesEngagements
      ).jours
    : null;

  const prev       = prevMonth(year, month);
  const next       = nextMonth(year, month);
  const monthLabel = cap(formatMonth(year, month));

  function goToPrev() { const p = prevMonth(year, month); setYear(p.year); setMonth(p.month); }
  function goToNext() { const n = nextMonth(year, month); setYear(n.year); setMonth(n.month); }

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

  const kpis: { label: string; value: string; sub?: string; color?: string; dominant?: boolean }[] = [
    {
      label: "Solde du jour",
      value: soldeEffectif !== null ? fmt(soldeEffectif - pendingOverdue) : "—",
      sub: soldeEffectif !== null
        ? pendingOverdue > 0
          ? `${fmt(soldeEffectif)} − ${fmt(pendingOverdue)} en attente`
          : soldeRunway !== null ? "solde réel des comptes" : "solde saisi (accueil)"
        : "aucun compte / solde",
      color: "#60a5fa",
    },
    {
      label: "Runway", value: runwayDays !== null ? `${runwayDays} j` : "—",
      sub: "au rythme actuel", dominant: true,
      color: runwayDays !== null
        ? runwayDays > 60 ? "var(--calm)" : runwayDays > 30 ? "var(--attention)" : "var(--critique)"
        : undefined,
    },
    {
      label: "Solde prévu", value: soldeFin !== null ? fmt(soldeFin) : "—",
      sub: `fin ${horizonEndLabel}`,
      color: soldeFin !== null ? (soldeFin >= 0 ? "var(--calm)" : "var(--critique)") : undefined,
    },
    {
      label: "Point bas", value: pointBas !== null ? fmt(pointBas) : "—",
      sub: projectionWithVariable ? "avec variable" : undefined,
      color: pointBas !== null && pointBas < 0 ? "var(--critique)" : "var(--attention)",
    },
    { label: "Revenus",  value: fmt(totalRevenus),  sub: numMonths > 1 ? `sur ${numMonths} mois` : undefined, color: "var(--calm)" },
    { label: "Dépenses", value: fmt(totalDepenses), sub: numMonths > 1 ? `sur ${numMonths} mois` : undefined, color: "var(--critique)" },
    { label: "Net",      value: (net >= 0 ? "+" : "") + fmt(net), color: net >= 0 ? "var(--calm)" : "var(--critique)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
      background: "var(--surface)", color: "var(--ink)" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

        <button onClick={goToPrev}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.72)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.32)")}
          style={{ display: "flex", alignItems: "center", gap: 5,
            fontSize: 13, color: "rgba(255,255,255,0.32)", background: "none", border: "none",
            cursor: "pointer", transition: "color 0.15s" }}>
          <ChevronLeft size={14} />
          {cap(formatMonth(prev.year, prev.month))}
        </button>

        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
            {monthLabel}
          </h1>
          {enriched.length > 0 && (
            <p style={{ fontSize: 9.5, color: "var(--ink-ghost)", margin: "2px 0 0" }}>
              {payeCount}/{enriched.length} confirmés · {reconciledCount} réconciliés
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setIncludeVariableInTimeline(!includeVariableInTimeline)}
            title="Inclure une estimation des dépenses variables (enveloppes Budget, lissée sur les jours restants) dans le calcul de la Timeline"
            style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 10, fontWeight: includeVariableInTimeline ? 700 : 400,
              padding: "5px 10px", borderRadius: 8, cursor: "pointer",
              background: includeVariableInTimeline ? alpha("var(--cal-variables)", 0.14) : "rgba(255,255,255,0.05)",
              color: includeVariableInTimeline ? "var(--cal-variables)" : "var(--ink-ghost)",
              border: `1px solid ${includeVariableInTimeline ? alpha("var(--cal-variables)", 0.4) : "rgba(255,255,255,0.07)"}`,
              boxShadow: includeVariableInTimeline ? `0 0 12px ${alpha("var(--cal-variables)", 0.28)}` : "none",
              transition: "all 0.15s",
            }}
          >
            <Shuffle size={11} />
            Variable
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 1,
            background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 2,
            border: "1px solid rgba(255,255,255,0.07)" }}>
            {([30, 60, 90] as const).map((h) => (
              <button key={h} onClick={() => setHorizon(h)} style={{
                fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "none",
                cursor: "pointer", transition: "all 0.15s",
                background: horizon === h ? "var(--accent-soft)" : "transparent",
                color:      horizon === h ? "var(--accent)" : "var(--ink-ghost)",
                fontWeight: horizon === h ? 700 : 400,
                boxShadow:  horizon === h ? "0 0 12px var(--accent-glow)" : "none",
              }}>
                {h}j
              </button>
            ))}
          </div>
          <button onClick={goToNext}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.72)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.32)")}
            style={{ display: "flex", alignItems: "center", gap: 5,
              fontSize: 13, color: "rgba(255,255,255,0.32)", background: "none", border: "none",
              cursor: "pointer", transition: "color 0.15s" }}>
            {cap(formatMonth(next.year, next.month))}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Budget signal banner */}
      {budgetSignal && (
        <div style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
          padding: "5px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(255,255,255,0.008)",
          overflowX: "auto",
        }}>
          <span style={{ fontSize: 7, fontFamily: "monospace", textTransform: "uppercase",
            letterSpacing: "0.12em", color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>
            Budget
          </span>
          <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />
          {budgetSignal.map((env, i) => (
            <div key={env.envelope.id} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {i > 0 && <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.07)" }} />}
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: env.envelope.couleur ?? RYTHME_COLOR[env.rythme], flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.55)" }}>{env.envelope.label}</span>
              <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: RYTHME_COLOR[env.rythme] }}>
                {Math.round(env.pctConsomme)}%
              </span>
              <span style={{ fontSize: 8.5, color: RYTHME_COLOR[env.rythme], opacity: 0.75 }}>
                {RYTHME_LABEL[env.rythme]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* KPI band */}
      <KPIBand items={kpis} />

      {/* Content */}
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <EmptyState
              title="Aucun poste ce mois"
              description="Ajoutez des postes dans la Base Financière pour les voir ici."
            />
          </div>
        ) : containerW === 0 ? null : (
          <div ref={calendarRef} style={{ width: totalWidth }}>

            {/* Hero graph */}
            {projection.length > 0 && soldeEffectif !== null && (
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(255,255,255,0.005)" }}>

                {/* Legend */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "6px 16px", flexShrink: 0,
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "rgba(255,255,255,0.4)" }}>
                    <svg width={14} height={3}><line x1={0} y1={1.5} x2={14} y2={1.5} stroke="var(--graph-line)" strokeWidth={2} strokeLinecap="round" /></svg>
                    Solde réel / prévu
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "rgba(255,255,255,0.4)" }}>
                    <svg width={14} height={3}><line x1={0} y1={1.5} x2={14} y2={1.5} stroke="var(--graph-confort-line)" strokeWidth={1.5} strokeDasharray="3 2.5" strokeOpacity={0.6} /></svg>
                    Seuil de sécurité
                  </span>
                  {includeVariableInTimeline && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "var(--cal-variables)" }}
                      title="Solde réel + dépenses variables estimées, réparties sur le reste du mois. N'affecte aucun autre chiffre de la Timeline.">
                      <svg width={14} height={3}><line x1={0} y1={1.5} x2={14} y2={1.5} stroke="var(--cal-variables)" strokeWidth={2} strokeDasharray="1 4.5" strokeLinecap="round" /></svg>
                      Avec dépenses variables
                    </span>
                  )}
                </div>

                <HeroGraph
                  projection={projection}
                  projectionVariable={projectionWithVariable}
                  totalDays={totalDays}
                  todayDay={todayDay}
                  totalWidth={totalWidth}
                  confortThreshold={confortThreshold}
                  hoverDay={hoverDay}
                  onHoverDay={setHoverDay}
                  wCol={wCol}
                  startDate={projStartDate}
                  showTodayLine={isCurrentMonth}
                />
              </div>
            )}

            {/* Insights bar — same worst-case curve as Point bas, so the signals
                ("Xj sous le seuil", "solde négatif prévu") stay consistent with
                what's actually the lowest line drawn on the graph. */}
            {projection.length > 0 && (
              <InsightsBar
                projection={pointBasSource}
                confortThreshold={confortThreshold}
                soldeFin={soldeFin}
                runwayDays={runwayDays}
                withVariable={projectionWithVariable !== null}
              />
            )}

            {/* Calendar */}
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

      {tooltip && <TooltipPopup tip={tooltip} />}
    </div>
  );
}
