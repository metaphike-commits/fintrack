"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, TrendingUp, TrendingDown, Plus, Bell, Wallet, AlertTriangle } from "lucide-react";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useOnboardingStore } from "@/store/onboarding";
import { useComptesStore } from "@/store/comptes";
import { useTransactionsStore } from "@/store/transactions";
import { usePreferencesStore } from "@/store/preferences";
import { useScenariosStore } from "@/store/scenarios";
import { calculateRunway } from "@/lib/runway";
import { useSoldeEffectif } from "@/hooks/useSoldeEffectif";
import { projectDailyBalance, getPointBas, toMensuel } from "@/lib/projection";
import { parseLocalDate } from "@/lib/dateUtils";
import { computeFragiliteScore, computeMomentum } from "@/lib/tensionScore";
import { useFintrackNotifications } from "@/hooks/useFintrackNotifications";
import { getPendingOverdueAmount } from "@/lib/timeline";
import { useTimelineStore } from "@/store/timeline";
import { useEngagementsStore, getMensualitesEngagements, getTotalEngagements } from "@/store/engagements";
import { buildAlertes, type Alerte } from "./AlertesActives";
import { useBudgetStore, getMoisOrEmpty } from "@/store/budget";
import { computeBudgetMetrics } from "@/lib/budget";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CockpitCalmeView } from "./CockpitCalmeView";
import type { DayProjection } from "@/lib/projection";
import type { ScenarioItem } from "@/store/scenarios";
import { animate } from "animejs";

// ── Constants ─────────────────────────────────────────────────────────────────
const GB = "1px solid rgba(255,255,255,0.07)";

// ── Curve accent ──────────────────────────────────────────────────────────────
const CURVE_A = "#818cf8"; // start (indigo)
const CURVE_B = "#a78bfa"; // mid   (violet)

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function fmtK(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k€`;
  return `${Math.round(n)}€`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Health ────────────────────────────────────────────────────────────────────
type HealthLevel = "faible" | "modéré" | "élevé" | "critique";
const HEALTH_COLOR: Record<HealthLevel, string> = {
  faible:   "#22c55e",
  modéré:   "#f59e0b",
  élevé:    "#f97316",
  critique: "#ef4444",
};
const HEALTH_LABEL: Record<HealthLevel, string> = {
  faible:   "Sain",
  modéré:   "Vigilance",
  élevé:    "Tendu",
  critique: "Critique",
};

// ── Glass tile ────────────────────────────────────────────────────────────────
function GlassTile({
  area,
  accent,
  accentPos = "top-left",
  children,
}: {
  area: string;
  accent?: string;
  accentPos?: "top-left" | "top-right" | "top-center";
  children: React.ReactNode;
}) {
  const glowLeft  = accentPos === "top-right" ? "auto" : "-56px";
  const glowRight = accentPos === "top-right" ? "-56px" : "auto";
  const lineLeft  = accentPos === "top-left"  ? "0%"   : accentPos === "top-right" ? "35%"  : "20%";
  const lineRight = accentPos === "top-right" ? "0%"   : accentPos === "top-left"  ? "50%"  : "20%";
  return (
    <div style={{
      gridArea: area,
      borderRadius: 14,
      background: "rgba(255,255,255,0.028)",
      border: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      {accent && (
        <>
          <div style={{
            position: "absolute", top: 0, zIndex: 1, height: 1,
            left: lineLeft, right: lineRight, pointerEvents: "none",
            background: `linear-gradient(90deg, transparent, ${accent}70, transparent)`,
          }} />
          <div style={{
            position: "absolute", top: "-56px", left: glowLeft, right: glowRight,
            width: 150, height: 150, borderRadius: "50%",
            background: accent, filter: "blur(55px)", opacity: 0.09, pointerEvents: "none",
          }} />
        </>
      )}
      {children}
    </div>
  );
}

// ── Tile label row ────────────────────────────────────────────────────────────
function TileLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px 8px", flexShrink: 0,
      borderBottom: "1px solid rgba(255,255,255,0.045)",
    }}>
      <span style={{
        fontSize: 9, fontFamily: "monospace", textTransform: "uppercase",
        letterSpacing: "0.16em", color: "rgba(255,255,255,0.25)",
      }}>
        {children}
      </span>
      {right}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function TileDivider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.045)", flexShrink: 0 }} />;
}

// ── Catmull-Rom → cubic bezier ────────────────────────────────────────────────
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// ── Legend line ───────────────────────────────────────────────────────────────
function LegendLine({ color, label, dashed, dot }: { color: string; label: string; dashed?: boolean; dot?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {dot ? (
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      ) : (
        <svg width={14} height={6} style={{ flexShrink: 0 }}>
          <line x1={0} y1={3} x2={14} y2={3} stroke={color} strokeWidth={1.5}
            strokeDasharray={dashed ? "3 2" : undefined} strokeLinecap="round" />
        </svg>
      )}
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{label}</span>
    </div>
  );
}

// ── Contextual hover narrative ─────────────────────────────────────────────────
function getHoverContext(idx: number, projections: DayProjection[]): string | null {
  const d = projections[idx];
  if (!d || d.events.length === 0) return null;
  const net      = d.events.reduce((s, e) => s + (e.direction === "revenu" ? e.montant : -e.montant), 0);
  const depenses = d.events.filter(e => e.direction === "depense");
  const revenus  = d.events.filter(e => e.direction === "revenu");
  if (net < -150) {
    const labels    = depenses.slice(0, 2).map(e => e.label.slice(0, 13)).join(" + ");
    const noRevNext = projections.slice(idx + 1, idx + 8).filter(
      p => p.events.every(e => e.direction !== "revenu")
    ).length;
    return noRevNext >= 4
      ? `Chute : ${labels} · ${noRevNext}j sans rev.`
      : `Charges : ${labels}`;
  }
  if (net > 150) {
    const labels = revenus.slice(0, 2).map(e => e.label.slice(0, 14)).join(" + ");
    return `Entrée : ${labels}`;
  }
  return null;
}

// ── Projection chart ──────────────────────────────────────────────────────────
function CockpitChart({
  projections,
  scenarioProjections,
  scenarioColor = "#14b8a6",
  confortThreshold,
}: {
  projections: DayProjection[];
  scenarioProjections?: DayProjection[];
  scenarioColor?: string;
  confortThreshold: number;
}) {
  const svgRef    = useRef<SVGSVGElement>(null);
  const curveRef  = useRef<SVGPathElement>(null);
  const sCurveRef = useRef<SVGPathElement>(null);
  const pbRingRef = useRef<SVGCircleElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const VW = 900, VH = 300, PL = 44, PR = 12, PT = 14, PB = 26;
  const PW = VW - PL - PR, PH = VH - PT - PB;

  const C = useMemo(() => {
    if (!projections.length) return null;
    const n    = projections.length;
    const allS = projections.map(d => d.solde);
    if (scenarioProjections) allS.push(...scenarioProjections.map(d => d.solde));
    allS.push(confortThreshold, 0);
    const rawMin = Math.min(...allS), rawMax = Math.max(...allS);
    const pad    = (rawMax - rawMin) * 0.14 || 300;
    const minY   = rawMin - pad, maxY = rawMax + pad, rangeY = maxY - minY || 1;
    const xOf    = (i: number) => PL + (i / Math.max(1, n - 1)) * PW;
    const yOf    = (s: number) => PT + PH - ((s - minY) / rangeY) * PH;
    const pts: [number, number][]      = projections.map((d, i) => [xOf(i), yOf(d.solde)]);
    const sPts: [number, number][] | null = scenarioProjections
      ? scenarioProjections.map((d, i) => [xOf(i), yOf(d.solde)])
      : null;

    let pbIdx = 0;
    for (let i = 1; i < n; i++) if (projections[i].solde < projections[pbIdx].solde) pbIdx = i;

    const monthLines: { x: number; label: string }[] = [];
    for (let d = 30; d < n; d += 30) {
      const date = projections[d]?.date;
      if (date) monthLines.push({ x: xOf(d), label: date.toLocaleDateString("fr-FR", { month: "short" }) });
    }
    const step   = rangeY / 3;
    const yTicks = [0, 1, 2, 3].map(i => ({ y: yOf(minY + step * i), label: fmtK(minY + step * i) }));

    const confortY   = yOf(confortThreshold);
    const zeroY      = yOf(0);
    const confortPct = Math.max(0, Math.min(100, ((confortY - PT) / PH) * 100));
    const zeroPct    = Math.max(0, Math.min(100, ((zeroY    - PT) / PH) * 100));

    const majorEvents: { idx: number; x: number; y: number; net: number }[] = [];
    for (let i = 0; i < n; i++) {
      const net = projections[i].events.reduce(
        (s, e) => s + (e.direction === "revenu" ? e.montant : -e.montant), 0
      );
      if (Math.abs(net) >= 200) majorEvents.push({ idx: i, x: xOf(i), y: yOf(projections[i].solde), net });
    }

    const curve  = smoothPath(pts);
    const sCurve = sPts ? smoothPath(sPts) : null;
    const area   = `${curve} L${xOf(n - 1).toFixed(1)},${(PT + PH).toFixed(1)} L${PL.toFixed(1)},${(PT + PH).toFixed(1)} Z`;

    return { n, xOf, yOf, pbIdx, monthLines, yTicks, confortY, zeroY, confortPct, zeroPct, majorEvents, curve, sCurve, area };
  }, [projections, scenarioProjections, confortThreshold]);

  // Progressive main curve draw
  useEffect(() => {
    if (!curveRef.current || !C?.curve) return;
    const el     = curveRef.current;
    const length = el.getTotalLength();
    el.style.strokeDasharray  = `${length}`;
    el.style.strokeDashoffset = `${length}`;
    const anim = animate(el, { strokeDashoffset: 0, duration: 1800, ease: "inOutCubic", delay: 150 });
    return () => { anim.pause(); };
  }, [C?.curve]);

  // Scenario line draw (re-fires on scenario change)
  useEffect(() => {
    if (!sCurveRef.current || !C?.sCurve) return;
    const el     = sCurveRef.current;
    const length = el.getTotalLength();
    el.style.strokeDasharray  = `${length}`;
    el.style.strokeDashoffset = `${length}`;
    const anim = animate(el, { strokeDashoffset: 0, duration: 1200, ease: "outCubic", delay: 400 });
    return () => { anim.pause(); };
  }, [C?.sCurve]);

  // Point bas breathing ring
  useEffect(() => {
    if (!pbRingRef.current) return;
    const anim = animate(pbRingRef.current, {
      r:        [4, 13, 4],
      opacity:  [0.65, 0, 0.65],
      loop:     true,
      ease:     "inOutSine",
      duration: 2600,
    });
    return () => { anim.pause(); };
  }, []);

  if (!C || !projections.length) return null;

  const pb     = projections[C.pbIdx];
  const pbX    = C.xOf(C.pbIdx);
  const pbY    = C.yOf(pb.solde);
  const startY = C.yOf(projections[0].solde);
  const today0 = projections[0].date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!C) return;
    const r     = svgRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width - PL / VW) / (PW / VW)));
    setHoverIdx(Math.round(ratio * (C.n - 1)));
  }

  const hI     = hoverIdx;
  const hD     = hI !== null ? projections[hI] : null;
  const hX     = hI !== null ? C.xOf(hI) : null;
  const hY     = hI !== null ? C.yOf(projections[hI].solde) : null;
  const hEvs   = hD?.events ?? [];
  const hSolde = hD?.solde ?? 0;
  const hColor = hSolde < 0 ? "#ef4444" : hSolde < confortThreshold ? "#f59e0b" : CURVE_A;
  const hCtx   = hI !== null ? getHoverContext(hI, projections) : null;

  const evRows = Math.min(hEvs.length, 3);
  const tipH   = Math.max(40, 38 + (hCtx ? 15 : 0) + evRows * 13);
  const tipW   = 172;
  const tipX   = hX !== null ? (hX > VW - tipW - 20 ? hX - tipW - 6 : hX + 8) : 0;
  const tipY   = Math.max(PT + 2, Math.min((hY ?? 0) - tipH / 2, PT + PH - tipH));

  const pbBW = 68, pbBH = 28;
  const pbBX = Math.min(Math.max(PL, pbX - pbBW / 2), VW - PR - pbBW);
  const pbBY = Math.max(PT + 2, pbY - pbBH - 14);

  const showNegZone  = C.zeroY < PT + PH;
  const showDangZone = C.confortY < C.zeroY && C.confortY > PT && C.confortY < PT + PH;

  return (
    <div style={{ flex: 1, position: "relative", minHeight: 0, overflow: "hidden" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair", display: "block" }}
        preserveAspectRatio="none"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          {/* Vertical tension gradient: indigo → amber at confort → red at zero */}
          <linearGradient id="tension-grad" gradientUnits="userSpaceOnUse" x1={0} y1={PT} x2={0} y2={PT + PH}>
            <stop offset="0%"                  stopColor={CURVE_A} />
            <stop offset={`${C.confortPct}%`}  stopColor="#f59e0b" />
            <stop offset={`${C.zeroPct}%`}     stopColor="#ef4444" />
            <stop offset="100%"                stopColor="#ef4444" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="ck-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={CURVE_A} stopOpacity={0.22} />
            <stop offset="60%"  stopColor={CURVE_B} stopOpacity={0.05} />
            <stop offset="100%" stopColor={CURVE_B} stopOpacity={0.0}  />
          </linearGradient>
          <filter id="line-glow" x="-4%" y="-40%" width="108%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="red-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="ck-clip">
            <rect x={PL} y={PT} width={PW} height={PH} />
          </clipPath>
        </defs>

        {/* Background: negative zone (below 0) */}
        {showNegZone && (
          <rect x={PL} y={Math.max(PT, C.zeroY)} width={PW}
            height={(PT + PH) - Math.max(PT, C.zeroY)}
            fill="rgba(239,68,68,0.06)" clipPath="url(#ck-clip)" />
        )}
        {/* Background: danger zone (between confort and 0) */}
        {showDangZone && (
          <rect x={PL} y={C.confortY} width={PW}
            height={Math.max(0, C.zeroY - C.confortY)}
            fill="rgba(245,158,11,0.04)" clipPath="url(#ck-clip)" />
        )}

        {/* Horizontal grid */}
        {C.yTicks.map(t => (
          <g key={t.y}>
            <line x1={PL} y1={t.y} x2={VW - PR} y2={t.y} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
            <text x={PL - 5} y={t.y + 3.5} textAnchor="end" fill="rgba(255,255,255,0.18)" fontSize={9} fontFamily="monospace">{t.label}</text>
          </g>
        ))}

        {/* Month dividers */}
        {C.monthLines.map(m => (
          <g key={m.x}>
            <line x1={m.x} y1={PT} x2={m.x} y2={PT + PH} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            <text x={m.x} y={VH - 5} textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize={9} fontFamily="monospace">{m.label}</text>
          </g>
        ))}

        {/* Zero line */}
        {C.zeroY > PT && C.zeroY < PT + PH && (
          <line x1={PL} y1={C.zeroY} x2={VW - PR} y2={C.zeroY}
            stroke="rgba(239,68,68,0.45)" strokeWidth={1} strokeDasharray="3 5" />
        )}

        {/* Confort threshold */}
        {C.confortY >= PT && C.confortY <= PT + PH && confortThreshold > 0 && (
          <>
            <line x1={PL} y1={C.confortY} x2={VW - PR} y2={C.confortY}
              stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 5" opacity={0.38} />
            <text x={PL + 5} y={C.confortY - 4} fill="#f59e0b" fontSize={8.5} fontFamily="monospace" opacity={0.4}>seuil</text>
          </>
        )}

        {/* Area fill */}
        <path d={C.area} fill="url(#ck-area)" clipPath="url(#ck-clip)" />

        {/* Scenario line */}
        {C.sCurve && (
          <path ref={sCurveRef} d={C.sCurve} fill="none" stroke={scenarioColor}
            strokeWidth={1.5} strokeLinecap="round" opacity={0.65}
            clipPath="url(#ck-clip)" />
        )}

        {/* Main curve — tension gradient + glow */}
        <path ref={curveRef} d={C.curve} fill="none" stroke="url(#tension-grad)"
          strokeWidth={2.5} strokeLinecap="round" clipPath="url(#ck-clip)"
          filter="url(#line-glow)" />

        {/* Major event diamonds */}
        {C.majorEvents.map(ev => {
          const s   = 5;
          const col = ev.net > 0 ? "#22c55e" : ev.net < -400 ? "#ef4444" : "#f59e0b";
          return (
            <g key={ev.idx} clipPath="url(#ck-clip)">
              <polygon
                points={`${ev.x},${ev.y - s} ${ev.x + s},${ev.y} ${ev.x},${ev.y + s} ${ev.x - s},${ev.y}`}
                fill="rgba(10,10,22,0.88)" stroke={col} strokeWidth={1.2} opacity={0.7}
              />
            </g>
          );
        })}

        {/* Point bas — drop line */}
        <line x1={pbX} y1={PT} x2={pbX} y2={pbY}
          stroke="#ef4444" strokeWidth={1} strokeDasharray="2 3" opacity={0.22} />
        {/* Callout box */}
        <rect x={pbBX} y={pbBY} width={pbBW} height={pbBH} rx={5}
          fill="rgba(239,68,68,0.10)" stroke="rgba(239,68,68,0.28)" strokeWidth={1} />
        <text x={pbBX + pbBW / 2} y={pbBY + 11} textAnchor="middle"
          fill="rgba(239,68,68,0.5)" fontSize={8} fontFamily="monospace">
          {pb.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </text>
        <text x={pbBX + pbBW / 2} y={pbBY + 22} textAnchor="middle"
          fill="#ef4444" fontSize={11} fontWeight="700" fontFamily="monospace">
          {fmtK(pb.solde)}
        </text>
        {/* Breathing ring (anime.js) */}
        <circle ref={pbRingRef} cx={pbX} cy={pbY} r={4}
          fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.65} filter="url(#red-glow)" />
        {/* Solid dot on top */}
        <circle cx={pbX} cy={pbY} r={4}   fill="rgba(13,13,24,1)" stroke="#ef4444" strokeWidth={1.5} />
        <circle cx={pbX} cy={pbY} r={1.8} fill="#ef4444" />

        {/* Today — line + dot */}
        <line x1={PL} y1={PT} x2={PL} y2={PT + PH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <circle cx={PL} cy={startY} r={3}   fill="rgba(13,13,24,1)" stroke={CURVE_A} strokeWidth={1.5} />
        <circle cx={PL} cy={startY} r={1.4} fill={CURVE_A} />
        <text x={PL + 6} y={PT + 10} fill="rgba(255,255,255,0.22)" fontSize={8.5} fontFamily="monospace">{today0}</text>

        {/* Hover crosshair + contextual tooltip */}
        {hX !== null && hY !== null && hI !== null && hD && (
          <g>
            <line x1={hX} y1={PT} x2={hX} y2={PT + PH} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
            <circle cx={hX} cy={hY} r={5}   fill="rgba(10,10,20,1)" stroke={hColor} strokeWidth={1.5}
              style={{ filter: `drop-shadow(0 0 4px ${hColor}90)` }} />
            <circle cx={hX} cy={hY} r={2.2} fill={hColor} />
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={6}
              fill="rgba(8,8,20,0.97)" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
            <text x={tipX + 10} y={tipY + 14} fill="rgba(255,255,255,0.32)" fontSize={8.5} fontFamily="monospace">
              {hD.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </text>
            <text x={tipX + 10} y={tipY + 30} fill={hColor} fontSize={15} fontWeight="700" fontFamily="monospace"
              style={{ letterSpacing: "-0.02em" }}>
              {fmtK(hD.solde)}
            </text>
            {hCtx && (
              <text x={tipX + 10} y={tipY + 44} fill="rgba(255,255,255,0.25)" fontSize={8} fontFamily="monospace">
                {hCtx.slice(0, 38)}
              </text>
            )}
            {hEvs.slice(0, 3).map((ev, ei) => (
              <text key={ei} x={tipX + 10} y={tipY + (hCtx ? 57 : 44) + ei * 13}
                fill={ev.direction === "revenu" ? "#22c55e" : "rgba(255,255,255,0.38)"} fontSize={8} fontFamily="monospace">
                {ev.direction === "revenu" ? "+" : "−"}{fmtK(ev.montant)} {ev.label.slice(0, 18)}
              </text>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

// ── Circle gauge ──────────────────────────────────────────────────────────────
function CircleGauge({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(1, Math.max(0, value / 100));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${pct * circ} ${(1 - pct) * circ}`} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 5px ${color}70)`, transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)" }} />
    </svg>
  );
}

// ── Events timeline ────────────────────────────────────────────────────────────
function EventsTimeline({ projections }: { projections: DayProjection[] }) {
  const today    = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), [today]);

  const groups = useMemo(() =>
    projections.map((d, i) => ({ date: d.date, events: d.events, i })).filter(g => g.events.length > 0),
    [projections]
  );

  if (groups.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: "0 16px" }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", lineHeight: 1.6 }}>
          Aucun mouvement prévu<br />sur les 14 prochains jours
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {groups.map((group, gi) => {
        const isToday    = isSameDay(group.date, today);
        const isTomorrow = isSameDay(group.date, tomorrow);
        const dayLabel   = isToday    ? "Aujourd'hui"
                         : isTomorrow ? "Demain"
                         : cap(group.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }));
        const dayNet = group.events.reduce((s, e) => s + (e.direction === "revenu" ? e.montant : -e.montant), 0);

        return (
          <div key={group.date.toISOString()}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 16px 4px",
              borderTop: gi === 0 ? "none" : GB,
            }}>
              <span style={{
                fontSize: 9, fontFamily: "monospace", textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: isToday ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.28)",
                fontWeight: isToday ? 700 : 400,
              }}>
                {dayLabel}
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.04)" }} />
              <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 600, color: dayNet >= 0 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>
                {dayNet >= 0 ? "+" : ""}{fmtK(dayNet)}
              </span>
            </div>
            {group.events.map((ev, ei) => {
              const isRev = ev.direction === "revenu";
              return (
                <div key={ei} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 16px 4px 24px" }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                    background: isRev ? "#22c55e" : "rgba(255,255,255,0.18)",
                    boxShadow: isRev ? "0 0 5px rgba(34,197,94,0.45)" : "none",
                  }} />
                  <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.label}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", flexShrink: 0, color: isRev ? "#22c55e" : "rgba(255,255,255,0.5)" }}>
                    {isRev ? "+" : "−"}{fmt(ev.montant)}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Alert pills ────────────────────────────────────────────────────────────────
function AlertPills({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px" }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.55)" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Situation saine</span>
      </div>
    );
  }
  const AC: Record<string, string> = { info: "#6366f1", attention: "#f59e0b", critique: "#ef4444" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {alertes.map(a => (
        <div key={a.id} style={{
          display: "flex", alignItems: "flex-start", gap: 9,
          padding: "8px 10px", borderRadius: 9,
          background: `${AC[a.niveau]}0c`,
          border: `1px solid ${AC[a.niveau]}20`,
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: AC[a.niveau], flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.72)", lineHeight: 1.3, marginBottom: 2 }}>
              {a.titre}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.45 }}>
              {a.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mini stat row ─────────────────────────────────────────────────────────────
function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em", color: color ?? "rgba(255,255,255,0.55)" }}>
        {value}
      </span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scenarioItemsAsBase(items: ScenarioItem[]): import("@/store/baseFinanciere").BaseItem[] {
  return items.map(i => ({
    ...i, archived: false,
    dateDebut: undefined, dateFin: undefined,
    billingDay: undefined, compteId: undefined, notes: undefined,
  }));
}

// ── Main view ─────────────────────────────────────────────────────────────────
export function CockpitView() {
  const router = useRouter();
  const [alerteOpen, setAlerteOpen] = useState(false);

  const { items, seedFromOnboarding } = useBaseFinanciereStore();
  const onboarding        = useOnboardingStore();
  const comptes           = useComptesStore(s => s.comptes);
  const transactions      = useTransactionsStore(s => s.transactions);
  const { confortThreshold } = usePreferencesStore();
  const scenarios         = useScenariosStore(s => s.scenarios);
  const { statuts, paid } = useTimelineStore();
  const engagements       = useEngagementsStore(s => s.engagements);

  useEffect(() => {
    if (onboarding.completed && onboarding.revenus.length > 0)
      seedFromOnboarding(onboarding.revenus, onboarding.depenses);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "f" && !e.ctrlKey && !e.metaKey &&
        !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement))
        router.push("/focus");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [router]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const soldeEffectif      = useSoldeEffectif();
  const active             = useMemo(() => items.filter(i => !i.archived), [items]);
  const activeForNet       = useMemo(() => {
    const now = new Date();
    return active.filter(i => {
      if (i.dateFin   && parseLocalDate(i.dateFin)   < now) return false;
      if (i.dateDebut && parseLocalDate(i.dateDebut) > now) return false;
      return true;
    });
  }, [active]);

  // ── Budget signal ─────────────────────────────────────────────────────────
  const { mois: budgetMois } = useBudgetStore();
  const budgetMetrics = useMemo(() => {
    const d   = new Date();
    const mois = getMoisOrEmpty(budgetMois, d.getFullYear(), d.getMonth());
    return computeBudgetMetrics(mois, transactions, active, engagements, d.getFullYear(), d.getMonth(), d);
  }, [budgetMois, transactions, active, engagements]);
  const budgetCritique  = budgetMetrics.envelopes.filter(e => e.rythme === "critique").length;
  const budgetAttention = budgetMetrics.envelopes.filter(e => e.rythme === "attention").length;
  const budgetHasEnv    = budgetMetrics.envelopes.length > 0;
  const budgetPillColor = budgetCritique > 0 ? "#ef4444" : budgetAttention > 0 ? "#f59e0b" : "#22c55e";
  const budgetPillLabel = budgetCritique > 0
    ? `${budgetCritique} critique${budgetCritique > 1 ? "s" : ""}`
    : budgetAttention > 0
    ? `${budgetAttention} attention`
    : "Budget sain";

  // ── Per-account risk (charges vs solde this month) ─────────────────────────
  const accountRisks = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    return comptes
      .map((compte) => {
        const upcoming = active
          .filter(item =>
            item.direction === "depense" &&
            item.compteId === compte.id &&
            item.frequence !== "ponctuel" &&
            (item.billingDay ?? 1) > currentDay
          )
          .map(item => ({ label: item.label, montant: item.montant, day: item.billingDay ?? 1 }))
          .sort((a, b) => a.day - b.day);

        if (upcoming.length === 0) return null;

        const floor = -(compte.decouvertAutorise ?? 0);
        let balance = compte.solde;
        const triggerCharges: typeof upcoming = [];
        for (const charge of upcoming) {
          balance -= charge.montant;
          if (balance < floor) triggerCharges.push(charge);
        }
        return triggerCharges.length > 0 ? { compte, triggerCharges, projectedBalance: balance } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [comptes, active]);

  const pendingOverdue     = useMemo(() => getPendingOverdueAmount(active, statuts, paid), [active, statuts, paid]);
  const soldeProjection    = soldeEffectif !== null ? soldeEffectif - pendingOverdue : null;
  const revenus            = useMemo(() => activeForNet.filter(i => i.direction === "revenu"),  [activeForNet]);
  const depenses           = useMemo(() => activeForNet.filter(i => i.direction === "depense"), [activeForNet]);
  const totalRevenus       = useMemo(() => revenus.reduce((s, i) => s + toMensuel(i), 0),  [revenus]);
  const totalDepenses      = useMemo(() => depenses.reduce((s, i) => s + toMensuel(i), 0), [depenses]);
  const mensualites        = useMemo(() => getMensualitesEngagements(engagements, new Date()), [engagements]);
  const totalEngagements   = useMemo(() => getTotalEngagements(engagements), [engagements]);
  const totalDepAvecEng    = totalDepenses + mensualites;
  const monthlyNet         = totalRevenus - totalDepAvecEng;
  const runway             = useMemo(() => calculateRunway(soldeProjection, totalRevenus, totalDepAvecEng),
    [soldeProjection, totalRevenus, totalDepAvecEng]);
  const projection90       = useMemo(() =>
    soldeProjection !== null ? projectDailyBalance(soldeProjection, active, 90, new Date(), statuts, paid) : [],
    [soldeProjection, active, statuts, paid]);
  const pointBas           = useMemo(() => getPointBas(projection90), [projection90]);
  const decouvertUtilise   = useMemo(() => comptes.reduce((s, c) => s + (c.decouvertUtilise ?? 0), 0), [comptes]);
  const decouvertAutorise  = useMemo(() => comptes.reduce((s, c) => s + (c.decouvertAutorise ?? 0), 0), [comptes]);
  const fragilite          = useMemo(() => computeFragiliteScore(
    runway.jours, pointBas?.solde ?? null, confortThreshold,
    monthlyNet, totalEngagements, totalRevenus, decouvertUtilise, decouvertAutorise),
    [runway.jours, pointBas, confortThreshold, monthlyNet, totalEngagements, totalRevenus, decouvertUtilise, decouvertAutorise]);
  const momentum           = useMemo(() => computeMomentum(monthlyNet, totalDepAvecEng), [monthlyNet, totalDepAvecEng]);
  const activeScenario     = useMemo(() => scenarios[0] ?? null, [scenarios]);
  const scenarioProjection = useMemo(() => {
    if (!activeScenario || soldeProjection === null) return undefined;
    return projectDailyBalance(soldeProjection, [...active, ...scenarioItemsAsBase(activeScenario.items)], 90, new Date(), statuts, paid);
  }, [activeScenario, active, soldeProjection, statuts, paid]);
  const next14             = useMemo(() => projection90.slice(0, 14), [projection90]);
  const unreconciledCount  = useMemo(() => transactions.filter(t => !t.reconciledItemId).length, [transactions]);
  const alertes            = useMemo(() => buildAlertes({
    unreconciledCount,
    pointBas:        pointBas?.solde ?? null,
    confortThreshold,
    monthlyNet,
    objectifEpargne: onboarding.objectifEpargne,
    tensionLevel:    fragilite.level,
  }), [unreconciledCount, pointBas, confortThreshold, monthlyNet, onboarding.objectifEpargne, fragilite.level]);

  const { revenusAVenir, depensesAVenir } = useMemo(() => {
    const today    = new Date();
    const daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1;
    const slice    = projection90.slice(0, daysLeft);
    return {
      revenusAVenir:  slice.flatMap(d => d.events).filter(e => e.direction === "revenu").reduce((s, e) => s + e.montant, 0),
      depensesAVenir: slice.flatMap(d => d.events).filter(e => e.direction === "depense").reduce((s, e) => s + e.montant, 0),
    };
  }, [projection90]);
  const epargneCeMois = revenusAVenir - depensesAVenir;

  useFintrackNotifications({ runwayJours: runway.jours, pointBas: pointBas?.solde ?? null, confortThreshold, monthlyNet });

  const hasData     = totalRevenus > 0 || totalDepenses > 0;
  const hLevel      = fragilite.level as HealthLevel;
  const mainColor   = HEALTH_COLOR[hLevel];
  const netColor    = monthlyNet >= 0 ? "#22c55e" : "#ef4444";
  const tauxEpargne = totalRevenus > 0 ? Math.round((monthlyNet / totalRevenus) * 100) : 0;
  const todayFmt    = cap(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
  const runwayPct   = runway.jours !== null ? Math.min(100, (runway.jours / 365) * 100) : 0;
  const runwayColor = runway.jours === null ? "#22c55e" : runway.jours > 90 ? "#22c55e" : runway.jours > 30 ? "#f59e0b" : "#ef4444";

  const net14Total     = useMemo(() =>
    next14.flatMap(d => d.events).reduce((s, e) => s + (e.direction === "revenu" ? e.montant : -e.montant), 0),
    [next14]);
  const hasNet14Events = next14.some(d => d.events.length > 0);

  const alertAccent = alertes.some(a => a.niveau === "critique") ? "#ef4444"
    : alertes.some(a => a.niveau === "attention") ? "#f59e0b"
    : alertes.length > 0 ? "#818cf8"
    : null;

  const fragBreakdown = [
    { label: "Runway",    value: fragilite.details.runway,     max: 40 },
    { label: "Point bas", value: fragilite.details.pointBas,   max: 25 },
    { label: "Net",       value: fragilite.details.netMensuel, max: 20 },
    { label: "Découvert", value: fragilite.details.decouvert,  max: 10 },
    { label: "Arriérés",  value: fragilite.details.arrieres,   max: 5  },
  ];

  if (!hasData) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <EmptyState
          title="Base financière vide"
          description="Complétez l'onboarding pour voir votre cockpit de pilotage."
          action={
            <Button size="sm" leftIcon={<Plus size={13} />}
              onClick={() => (window.location.href = "/onboarding")}>
              Configurer
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <CockpitCalmeView
      dateLabel={todayFmt}
      disponible={soldeProjection}
      netMensuel={monthlyNet}
      runwayJours={runway.jours}
      seuil={confortThreshold}
      decouvertAutorise={decouvertAutorise}
      projection={projection90}
      alertesCount={alertes.length}
      recommandation={
        activeScenario
          ? { titre: activeScenario.name, detail: "Simuler l'effet sur la trajectoire." }
          : null
      }
      onFocus={() => router.push("/focus")}
      onAlertes={() => router.push("/review")}
      onSimuler={() => router.push("/scenarios")}
    />
  );
}
