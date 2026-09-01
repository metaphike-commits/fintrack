"use client";

/**
 * CockpitCalmeView — direction 1a (« Journal — l'agenda d'abord »).
 *
 * Composant 100 % présentationnel : aucun store, aucun hook métier.
 * Il rend UNIQUEMENT la colonne principale (la sidebar reste celle de
 * <AppShell> / <Sidebar>).
 *
 * Toutes les valeurs affichées sont dérivées de `projection` (la sortie de
 * projectDailyBalance) + quelques scalaires déjà calculés dans CockpitView.
 *
 * Emplacement conseillé : src/modules/cockpit/CockpitCalmeView.tsx
 */

import { useMemo } from "react";
import { Maximize2 } from "lucide-react";
import type { DayProjection } from "@/lib/projection";

// Same hairline convention as the rest of the app (BaseFinanciereView's
// GB/GBF, the old CockpitView header border) — this part already matched.
const LINE = "1px solid rgba(255,255,255,0.06)";
const HAIR = "1px solid rgba(255,255,255,0.05)";

// Theme tokens, not hardcoded hex — this view was originally built with its
// own fixed palette (#0a0c10/#e8eaed/#d9534f), which looked like a different
// app once dropped next to Timeline/Budget/Base Financière. `alpha()` mixes
// a CSS var toward transparent, so dimmed text/borders still track whichever
// theme (and light/dark) the user has picked, the same way TimelineView does.
function alpha(c: string, a: number): string {
  return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
}
const INK = "var(--ink)";
const DIM = (a: number) => alpha("var(--ink)", a);
const ALERT = "var(--critique)";

export interface CockpitCalmeViewProps {
  /** « Mardi 5 août » */
  dateLabel: string;
  /** Solde de projection (solde effectif − charges en attente) */
  disponible: number | null;
  /** totalRevenus − (totalDepenses + mensualités) */
  netMensuel: number;
  /** runway.jours */
  runwayJours: number | null;
  /** Seuil de confort (préférences) */
  seuil: number;
  /** Découvert autorisé cumulé */
  decouvertAutorise: number;
  /** projectDailyBalance(..., 90) */
  projection: DayProjection[];
  /** Nombre d'alertes actives */
  alertesCount: number;
  /** Recommandation issue de Signal IA / Scénario rapide (optionnelle) */
  recommandation?: { titre: string; detail: string } | null;
  onFocus?: () => void;
  onAlertes?: () => void;
  onSimuler?: () => void;
  onIgnorer?: () => void;
}

function fmt(n: number, signed = false) {
  const s = Math.round(Math.abs(n)).toLocaleString("fr-FR");
  const sign = n < 0 ? "−" : signed ? "+" : "";
  return `${sign}${s} €`;
}
function dayShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }).replace(".", "");
}
function dayLong(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
function monthShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function isToday(d: Date) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export function CockpitCalmeView({
  dateLabel,
  disponible,
  netMensuel,
  runwayJours,
  seuil,
  decouvertAutorise,
  projection,
  alertesCount,
  recommandation,
  onFocus,
  onAlertes,
  onSimuler,
  onIgnorer,
}: CockpitCalmeViewProps) {
  const d = useMemo(() => {
    const pointBas = projection.reduce<DayProjection | null>(
      (min, day) => (min === null || day.solde < min.solde ? day : min),
      null
    );
    const sousSeuil = projection.find((day) => day.solde < seuil) ?? null;
    const negatif = projection.find((day) => day.solde < 0) ?? null;

    // Ligne par événement sur 14 jours, avec le solde courant après passage.
    type Row = { date: Date; label: string; montant: number; direction: "revenu" | "depense"; solde: number };
    const rows: Row[] = [];
    for (const day of projection.slice(0, 14)) {
      for (const e of day.events) {
        rows.push({ date: day.date, label: e.label, montant: e.montant, direction: e.direction, solde: day.solde });
      }
    }
    const shown = rows.slice(0, 7);
    const reste = rows.length - shown.length;

    const prochaineEntree = rows.find((r) => r.direction === "revenu") ?? null;

    // Sparkline 90 j
    const W = 460;
    const H = 300;
    const soldes = projection.map((p) => p.solde);
    const lo = Math.min(0, ...soldes, seuil);
    const hi = Math.max(seuil, ...soldes);
    const span = hi - lo || 1;
    const x = (i: number) => (i / Math.max(1, projection.length - 1)) * W;
    const y = (v: number) => H - 12 - ((v - lo) / span) * (H - 24);
    const points = projection.map((p, i) => `${x(i).toFixed(1)},${y(p.solde).toFixed(1)}`).join(" ");
    const pbIdx = pointBas ? projection.indexOf(pointBas) : -1;

    return { pointBas, sousSeuil, negatif, shown, reste, prochaineEntree, points, W, H, x, y, pbIdx, ySeuil: y(seuil), yZero: y(0) };
  }, [projection, seuil]);

  const jours = runwayJours;
  const horizon = projection.length ? projection[projection.length - 1].date : null;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface)", color: INK }}>
      {/* ── Barre de contexte ────────────────────────────────────────── */}
      <div
        style={{
          height: 60,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          borderBottom: LINE,
        }}
      >
        <span style={{ fontSize: 13.5, color: DIM(0.42) }}>{dateLabel}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {alertesCount > 0 && (
            <button
              onClick={onAlertes}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                color: ALERT,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 3, background: ALERT }} />
              {alertesCount} alerte{alertesCount > 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={onFocus}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              color: DIM(0.4),
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <Maximize2 size={13} strokeWidth={1.6} />
            Focus
          </button>
        </div>
      </div>

      {/* ── Verdict ──────────────────────────────────────────────────── */}
      <div style={{ padding: "44px 40px 34px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 38,
            fontWeight: 500,
            letterSpacing: "-0.03em",
            lineHeight: 1.18,
            maxWidth: 780,
            textWrap: "pretty",
          }}
        >
          {jours !== null ? `Tu tiens ${jours} jours.` : "Trajectoire stable."}{" "}
          {d.sousSeuil && (
            <span style={{ color: ALERT }}>
              {d.sousSeuil.events[0]?.label
                ? `${d.sousSeuil.events[0].label} du ${dayLong(d.sousSeuil.date)} fait passer le compte sous ton seuil.`
                : `Le compte passe sous ton seuil le ${dayLong(d.sousSeuil.date)}.`}
            </span>
          )}
        </p>
        {d.pointBas && (
          <p style={{ margin: "14px 0 0", fontSize: 15, color: DIM(0.45) }}>
            Point bas prévu à {fmt(d.pointBas.solde)} le {dayLong(d.pointBas.date)}
            {d.prochaineEntree ? `, avant l'entrée du ${d.prochaineEntree.date.getDate()}.` : "."}
          </p>
        )}
      </div>

      {/* ── Bandeau de chiffres ──────────────────────────────────────── */}
      <div style={{ display: "flex", borderTop: LINE, borderBottom: LINE, flexShrink: 0 }}>
        <Metric label="Disponible" value={disponible === null ? "—" : fmt(disponible)} first />
        <Metric label="Net mensuel" value={fmt(netMensuel, true)} color={netMensuel < 0 ? ALERT : undefined} />
        <Metric
          label="Prochaine entrée"
          value={d.prochaineEntree ? fmt(d.prochaineEntree.montant, true) : "—"}
          suffix={d.prochaineEntree ? `le ${d.prochaineEntree.date.getDate()}` : undefined}
        />
        <Metric label="Seuil de confort" value={fmt(seuil)} color={DIM(0.55)} last />
      </div>

      {/* ── Corps : agenda | trajectoire ─────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1.35fr 1fr" }}>
        {/* Agenda 14 j */}
        <div style={{ borderRight: LINE, padding: "26px 40px 30px", overflow: "hidden" }}>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: DIM(0.5) }}>Les 14 prochains jours</p>

          {d.shown.map((r, i) => {
            const under = r.solde < seuil;
            const strong = isToday(r.date) || r.direction === "revenu" || Math.abs(r.montant) > 500;
            return (
              <div
                key={`${r.label}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  padding: "11px 0 9px",
                  borderTop: HAIR,
                  borderBottom: i === d.shown.length - 1 ? HAIR : undefined,
                }}
              >
                <span style={{ width: 92, flexShrink: 0, fontSize: 13.5, color: isToday(r.date) ? INK : DIM(0.55) }}>
                  {isToday(r.date) ? "Aujourd'hui" : dayShort(r.date)}
                </span>
                <span style={{ flex: 1, fontSize: 14, color: strong ? DIM(0.75) : DIM(0.6) }}>{r.label}</span>
                <span
                  style={{
                    fontSize: 14.5,
                    fontVariantNumeric: "tabular-nums",
                    color: strong ? DIM(0.75) : DIM(0.55),
                  }}
                >
                  {fmt(r.direction === "revenu" ? r.montant : -r.montant, r.direction === "revenu")}
                </span>
                <span
                  style={{
                    width: 96,
                    textAlign: "right",
                    fontSize: 14.5,
                    fontVariantNumeric: "tabular-nums",
                    color: under ? ALERT : DIM(0.35),
                  }}
                >
                  {fmt(r.solde)}
                </span>
              </div>
            );
          })}

          {d.reste > 0 && (
            <p style={{ margin: "16px 0 0", fontSize: 13, color: DIM(0.3) }}>
              + {d.reste} mouvement{d.reste > 1 ? "s" : ""} plus tard dans la quinzaine
            </p>
          )}
        </div>

        {/* Trajectoire 90 j */}
        <div style={{ padding: "26px 40px 30px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: 14, color: DIM(0.5) }}>Trajectoire · 90 jours</p>
            {horizon && <p style={{ margin: 0, fontSize: 13, color: DIM(0.3) }}>au {monthShort(horizon)}</p>}
          </div>

          <svg
            viewBox={`0 0 ${d.W} ${d.H}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: 300, display: "block" }}
          >
            {/* Same graph tokens as Timeline's HeroGraph — seuil de confort,
                ligne zéro, et courbe de trajectoire partagent le même langage
                visuel sur les deux pages. */}
            <line x1="0" y1={d.ySeuil} x2={d.W} y2={d.ySeuil} stroke="var(--graph-confort-line)" strokeOpacity={0.35} strokeWidth="1" strokeDasharray="3 4" />
            <line x1="0" y1={d.yZero} x2={d.W} y2={d.yZero} stroke="var(--graph-point-bas)" strokeOpacity={0.45} strokeWidth="1" />
            <polyline
              points={d.points}
              fill="none"
              stroke="var(--graph-line)"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {d.pointBas && d.pbIdx >= 0 && (
              <circle cx={d.x(d.pbIdx)} cy={d.y(d.pointBas.solde)} r="3.5" fill="var(--surface)" stroke="var(--graph-point-bas)" strokeWidth="1.6" />
            )}
          </svg>

          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 22 }}>
            {d.pointBas && (
              <Row
                label="Point bas"
                value={`${fmt(d.pointBas.solde)} · ${monthShort(d.pointBas.date)}`}
                color={d.pointBas.solde < 0 ? "var(--graph-point-bas)" : DIM(0.7)}
              />
            )}
            {d.sousSeuil && <Row label="Sous le seuil à partir du" value={dayLong(d.sousSeuil.date)} />}
            <Row label="Découvert autorisé" value={fmt(decouvertAutorise)} last />
          </div>

          {recommandation && (
            <div
              style={{
                marginTop: "auto",
                padding: "16px 18px",
                borderRadius: 10,
                border: `1px solid ${alpha(ALERT, 0.28)}`,
                background: alpha(ALERT, 0.06),
              }}
            >
              <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 500, color: ALERT }}>{recommandation.titre}</p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: DIM(0.45) }}>{recommandation.detail}</p>
              {(onSimuler || onIgnorer) && (
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  {onSimuler && (
                    <button onClick={onSimuler} style={btn(0.18, 0.75)}>
                      Simuler
                    </button>
                  )}
                  {onIgnorer && (
                    <button onClick={onIgnorer} style={btn(0.1, 0.45)}>
                      Ignorer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function btn(border: number, text: number): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 6,
    border: `1px solid ${DIM(border)}`,
    background: "none",
    fontSize: 13.5,
    color: DIM(text),
    cursor: "pointer",
    font: "inherit",
  };
}

function Metric({
  label,
  value,
  suffix,
  color,
  first,
  last,
}: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div style={{ flex: 1, padding: first ? "20px 40px" : "20px 32px", borderRight: last ? undefined : LINE }}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: DIM(0.4) }}>{label}</p>
      <p
        style={{
          margin: 0,
          fontSize: 27,
          fontWeight: 500,
          letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums",
          color,
        }}
      >
        {value}
        {suffix && <span style={{ fontSize: 14, color: DIM(0.38), fontWeight: 400 }}> {suffix}</span>}
      </p>
    </div>
  );
}

function Row({ label, value, color, last }: { label: string; value: string; color?: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        paddingBottom: last ? 0 : 9,
        borderBottom: last ? undefined : HAIR,
      }}
    >
      <span style={{ fontSize: 13.5, color: DIM(0.45) }}>{label}</span>
      <span style={{ fontSize: 15, fontVariantNumeric: "tabular-nums", color: color ?? DIM(0.7) }}>{value}</span>
    </div>
  );
}
