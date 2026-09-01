"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Copy, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Zap, Sparkles } from "lucide-react";
import { useBudgetStore, getMoisOrEmpty } from "@/store/budget";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useTransactionsStore } from "@/store/transactions";
import { useEngagementsStore } from "@/store/engagements";
import { usePreferencesStore } from "@/store/preferences";
import { computeBudgetMetrics, fmtBudget, RYTHME_COLOR, RYTHME_LABEL } from "@/lib/budget";
import { projectDailyBalance, toMensuel } from "@/lib/projection";
import { getRowsForMonth, getPendingOverdueAmount } from "@/lib/timeline";
import { useSoldeEffectif } from "@/hooks/useSoldeEffectif";
import { useTimelineStore } from "@/store/timeline";
import type { EnveloppeMetrics } from "@/lib/budget";
import { EnveloppePanel } from "./EnveloppePanel";
import { SaisieRapidePanel } from "./SaisieRapidePanel";
import { RituelPanel } from "./RituelPanel";
import { BudgetVsReel } from "@/modules/analyse/BudgetVsReel";
import type { BudgetEnvelope } from "@/store/budget";

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}k€`;
  return `${Math.round(n)}€`;
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Header KPI pill ───────────────────────────────────────────────────────────
function KpiPill({
  label,
  value,
  sub,
  color,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  positive?: boolean;
}) {
  const c = color ?? (positive === true ? "#22c55e" : positive === false ? "#ef4444" : "rgba(255,255,255,0.75)");
  return (
    <div style={{
      flex: 1, padding: "10px 14px",
      background: "rgba(255,255,255,0.028)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10, display: "flex", flexDirection: "column", gap: 3,
    }}>
      <span style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.28)" }}>
        {label}
      </span>
      <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", color: c, lineHeight: 1 }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{sub}</span>
      )}
    </div>
  );
}

// ── Bi-cursor progress bar ────────────────────────────────────────────────────
function BiCursorBar({ pctConsomme, pctMoisEcoule, color }: { pctConsomme: number; pctMoisEcoule: number; color: string }) {
  return (
    <div style={{ position: "relative", height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "visible" }}>
      {/* Spending fill */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: `${Math.min(100, pctConsomme)}%`,
        background: color, borderRadius: 3,
        boxShadow: `0 0 6px ${color}50`,
        transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
      }} />
      {/* Time elapsed marker */}
      <div style={{
        position: "absolute", top: -3, width: 2, height: 11,
        left: `${Math.min(100, pctMoisEcoule)}%`,
        background: "rgba(255,255,255,0.55)", borderRadius: 1,
        transform: "translateX(-1px)",
        boxShadow: "0 0 4px rgba(255,255,255,0.4)",
      }} />
    </div>
  );
}

// ── Single envelope card ──────────────────────────────────────────────────────
function EnveloppeCard({
  metrics,
  onEdit,
}: {
  metrics: EnveloppeMetrics;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { envelope, montantDepense, montantRestant, pctConsomme, pctMoisEcoule,
    rythme, projectionFinMois, depassementProjecte, transactions } = metrics;
  const color     = envelope.couleur ?? RYTHME_COLOR[rythme];
  const rColor    = RYTHME_COLOR[rythme];
  const isOver    = montantRestant < 0;
  const hasTx     = transactions.length > 0;

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${color}90, transparent)` }} />

      <div style={{ padding: "12px 14px 14px" }}>
        {/* Row 1: name + rythme + edit */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}70` }} />
          <button
            onClick={onEdit}
            style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            {envelope.label}
          </button>
          {/* Rythme badge */}
          <div style={{
            padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700,
            fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase",
            background: `${rColor}18`, border: `1px solid ${rColor}28`, color: rColor,
          }}>
            {RYTHME_LABEL[rythme]}
          </div>
        </div>

        {/* Row 2: numbers */}
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Prévu</p>
            <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,0.6)" }}>{fmtShort(envelope.montantPrevu)}</p>
          </div>
          <div>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Dépensé</p>
            <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: rColor }}>{fmtShort(montantDepense)}</p>
          </div>
          <div>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Restant</p>
            <p style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: isOver ? "#ef4444" : "rgba(255,255,255,0.55)" }}>
              {isOver ? "−" : ""}{fmtShort(Math.abs(montantRestant))}
            </p>
          </div>
          {/* Projection */}
          {pctMoisEcoule >= 5 && (
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Projection</p>
              <p style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: depassementProjecte > 0 ? "#ef4444" : "rgba(255,255,255,0.4)" }}>
                {fmtShort(projectionFinMois)}
                {depassementProjecte > 0 && (
                  <span style={{ fontSize: 10, marginLeft: 3, color: "#ef4444" }}>+{fmtShort(depassementProjecte)}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Row 3: bi-cursor bar */}
        <BiCursorBar pctConsomme={pctConsomme} pctMoisEcoule={pctMoisEcoule} color={rColor} />

        {/* Row 4: bar labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: rColor }}>
            {Math.round(pctConsomme)}% consommé
          </span>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.28)" }}>
            {Math.round(pctMoisEcoule)}% du mois écoulé
          </span>
        </div>

        {/* Row 5: transactions */}
        {hasTx && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5, marginTop: 10,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              color: "rgba(255,255,255,0.28)", fontSize: 10,
            }}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            <span>{transactions.length} transaction{transactions.length > 1 ? "s" : ""} ce mois</span>
          </button>
        )}
      </div>

      {/* Expanded transactions */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.045)" }}>
          {transactions.slice(0, 8).map(tx => (
            <div key={tx.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                  {tx.label}
                </p>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
                  {new Date(tx.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,0.5)", flexShrink: 0, marginLeft: 12 }}>
                −{fmtBudget(tx.montant)}
              </span>
            </div>
          ))}
          {transactions.length > 8 && (
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", textAlign: "center", padding: "6px 0" }}>
              +{transactions.length - 8} autres
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyEnvelopes({
  hasPrevious,
  onAdd,
  onCopy,
}: {
  hasPrevious: boolean;
  onAdd: () => void;
  onCopy: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, padding: "40px 24px" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Plus size={20} style={{ color: "#818cf8" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>
          Aucune enveloppe ce mois
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
          Créez vos enveloppes variables<br />pour piloter vos dépenses.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onAdd}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, cursor: "pointer",
            background: "#818cf8", border: "none",
            fontSize: 12, fontWeight: 600, color: "white",
          }}
        >
          <Plus size={13} /> Nouvelle enveloppe
        </button>
        {hasPrevious && (
          <button
            onClick={onCopy}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, cursor: "pointer",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)",
            }}
          >
            <Copy size={13} /> Copier mois précédent
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export function BudgetView() {
  const today    = useMemo(() => new Date(), []);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [panelOpen, setPanelOpen]           = useState(false);
  const [editing, setEditing]               = useState<BudgetEnvelope | null>(null);
  const [saisieOpen, setSaisieOpen]         = useState(false);
  const [rituelOpen, setRituelOpen]         = useState(false);
  const [view, setView]                     = useState<"envelopes" | "categories">("envelopes");

  const { mois, addEnvelope, updateEnvelope, removeEnvelope, copyFromPreviousMois } = useBudgetStore();
  const baseItems    = useBaseFinanciereStore(s => s.items);
  const transactions = useTransactionsStore(s => s.transactions);
  const engagements  = useEngagementsStore(s => s.engagements);
  const { budgetReviewDay } = usePreferencesStore();
  const soldeEffectif = useSoldeEffectif();
  const statuts = useTimelineStore(s => s.statuts);
  const paid    = useTimelineStore(s => s.paid);

  const currentMois  = useMemo(() => getMoisOrEmpty(mois, year, month), [mois, year, month]);
  const hasPrevious  = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    return mois.some(m => m.year === py && m.month === pm && m.envelopes.length > 0);
  }, [mois, year, month]);

  const metrics = useMemo(
    () => computeBudgetMetrics(currentMois, transactions, baseItems, engagements, year, month, today),
    [currentMois, transactions, baseItems, engagements, year, month, today]
  );

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const isFutureMonth  = year * 12 + month > today.getFullYear() * 12 + today.getMonth();
  const monthLabel = cap(new Date(year, month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));

  const activeItems = useMemo(() => baseItems.filter(i => !i.archived), [baseItems]);

  const pendingOverdue = useMemo(
    () => getPendingOverdueAmount(activeItems, statuts, paid, today),
    [activeItems, statuts, paid, today]
  );

  // Projected balance at reviewDay of the month preceding the viewed month
  const soldeEntrant = useMemo(() => {
    if (!isFutureMonth || soldeEffectif == null) return null;
    const prevY = month === 0 ? year - 1 : year;
    const prevM = month === 0 ? 11 : month - 1;
    const maxDay = new Date(prevY, prevM + 1, 0).getDate();
    const reviewDayClamped = Math.min(budgetReviewDay, maxDay);
    const reviewDate = new Date(prevY, prevM, reviewDayClamped);

    // Review day already passed → use today's real projectable balance
    if (reviewDate <= today) return soldeEffectif - pendingOverdue;

    const daysToReview = Math.ceil((reviewDate.getTime() - today.getTime()) / 86400000);
    const chain = projectDailyBalance(soldeEffectif - pendingOverdue, activeItems, daysToReview, today, statuts, paid);
    return chain[chain.length - 1]?.solde ?? soldeEffectif;
  }, [isFutureMonth, soldeEffectif, pendingOverdue, activeItems, year, month, budgetReviewDay, today, statuts, paid]);

  // Expected income for the viewed month (from Base Financière items)
  // Weekly items: getRowsForMonth returns 1 row with weekly montant — scale to monthly equivalent
  // Annual/quarterly: returns occurrence amount (correct — you receive the full amount that month)
  const revenusViewedMonth = useMemo(
    () => getRowsForMonth(baseItems, year, month)
      .filter(r => r.direction === "revenu")
      .reduce((s, r) => s + (r.frequence === "hebdomadaire"
        ? toMensuel({ montant: r.montant, frequence: r.frequence })
        : r.montant
      ), 0),
    [baseItems, year, month]
  );

  // Total available to distribute = projected starting balance + expected income
  const aRepartir = soldeEntrant !== null ? soldeEntrant + revenusViewedMonth : null;

  // Label helpers for the review anchor
  const prevMonthLabel = useMemo(() => {
    const prevY = month === 0 ? year - 1 : year;
    const prevM = month === 0 ? 11 : month - 1;
    return new Date(prevY, prevM, 1).toLocaleDateString("fr-FR", { month: "short" });
  }, [year, month]);

  const reviewIsProjected = useMemo(() => {
    if (!isFutureMonth) return false;
    const prevY = month === 0 ? year - 1 : year;
    const prevM = month === 0 ? 11 : month - 1;
    const maxDay = new Date(prevY, prevM + 1, 0).getDate();
    return new Date(prevY, prevM, Math.min(budgetReviewDay, maxDay)) > today;
  }, [isFutureMonth, year, month, budgetReviewDay, today]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function openAdd() { setEditing(null); setPanelOpen(true); }
  function openEdit(env: BudgetEnvelope) { setEditing(env); setPanelOpen(true); }
  function closePanel() { setPanelOpen(false); setEditing(null); }

  function handleSave(data: Omit<BudgetEnvelope, "id">) {
    if (editing) updateEnvelope(year, month, editing.id, data);
    else addEnvelope(year, month, data);
    closePanel();
  }

  function handleDelete() {
    if (editing) { removeEnvelope(year, month, editing.id); closePanel(); }
  }

  function handleCopy() {
    copyFromPreviousMois(year, month);
  }

  // Derived
  const resteColor = metrics.resteAAllouer >= 0 ? "#22c55e" : "#ef4444";
  const hasEnvelopes = currentMois.envelopes.length > 0;
  const critique = metrics.envelopes.filter(m => m.rythme === "critique");
  const attention = metrics.envelopes.filter(m => m.rythme === "attention");

  const GB = "1px solid rgba(255,255,255,0.07)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 44, borderBottom: GB, flexShrink: 0,
      }}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)", minWidth: 140, textAlign: "center" }}>
            {monthLabel}
            {isCurrentMonth && (
              <span style={{ marginLeft: 6, fontSize: 9, fontFamily: "monospace", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.1em" }}>en cours</span>
            )}
          </span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", padding: 4, borderRadius: 6 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasEnvelopes && hasPrevious && (
            <button
              onClick={handleCopy}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, border: GB, background: "rgba(255,255,255,0.025)", fontSize: 11, color: "rgba(255,255,255,0.35)", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.65)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
            >
              <Copy size={11} /> Copier mois préc.
            </button>
          )}
          {hasEnvelopes && (
            <button
              onClick={() => setRituelOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, border: "1px solid rgba(129,140,248,0.35)", background: "rgba(129,140,248,0.08)", fontSize: 11, color: "#818cf8", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(129,140,248,0.16)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(129,140,248,0.08)"; }}
            >
              <Sparkles size={11} /> Rituel
            </button>
          )}
          <button
            onClick={() => setSaisieOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 7, border: GB, background: "rgba(255,255,255,0.025)", fontSize: 11, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
          >
            <Zap size={11} /> Saisie rapide
          </button>
          <button
            onClick={openAdd}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 7, background: "#818cf8", border: "none", fontSize: 11, fontWeight: 600, color: "white", cursor: "pointer" }}
          >
            <Plus size={11} /> Enveloppe
          </button>
        </div>
      </div>

      {/* ── KPIs strip ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, padding: "10px 20px", borderBottom: GB, flexShrink: 0 }}>
        {/* Primary allocation pill: balance-anchored for future months, cashflow for current/past */}
        {aRepartir !== null ? (
          <KpiPill
            label={`À répartir · j.${budgetReviewDay} ${prevMonthLabel}`}
            value={fmtShort(aRepartir)}
            sub={reviewIsProjected ? "Solde projeté + revenus prévus" : "Solde actuel + revenus prévus"}
            color={aRepartir >= metrics.sumEnveloppesPrevu ? "#22c55e" : "#ef4444"}
          />
        ) : (
          <KpiPill
            label="Reste à allouer"
            value={`${metrics.resteAAllouer >= 0 ? "+" : ""}${fmtShort(metrics.resteAAllouer)}`}
            sub={metrics.resteAAllouer > 0 ? "Budget disponible non affecté" : metrics.resteAAllouer === 0 ? "Budget équilibré" : "Sur-allocation"}
            color={resteColor}
          />
        )}
        <KpiPill
          label="Budget à risque"
          value={metrics.budgetARisque > 0 ? `+${fmtShort(metrics.budgetARisque)}` : "—"}
          sub={critique.length > 0 ? `${critique.length} enveloppe${critique.length > 1 ? "s" : ""} en dépassement projeté` : "Aucun dépassement projeté"}
          color={metrics.budgetARisque > 0 ? "#ef4444" : "rgba(255,255,255,0.25)"}
        />
        <KpiPill
          label="Marge variable restante"
          value={metrics.margeVariableRestante > 0 ? fmtShort(metrics.margeVariableRestante) : "—"}
          sub={attention.length > 0 ? `${attention.length} enveloppe${attention.length > 1 ? "s" : ""} en attention` : "Enveloppes saines"}
          color={metrics.margeVariableRestante > 0 ? "#22c55e" : "rgba(255,255,255,0.25)"}
        />
      </div>

      {/* ── View tabs ────────────────────────────────────────────────────────── */}
      {hasEnvelopes && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 20px", height: 36, borderBottom: GB, flexShrink: 0 }}>
          {(["envelopes", "categories"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: view === v ? 600 : 400,
                background: view === v ? "rgba(255,255,255,0.08)" : "transparent",
                color: view === v ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                transition: "all 0.12s",
              }}
            >
              {v === "envelopes" ? "Enveloppes" : "Par catégorie"}
            </button>
          ))}
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0 }}>

        {/* Left: envelopes / category view */}
        <div style={{ flex: 1, overflowY: "auto", padding: view === "categories" ? "16px 20px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {view === "categories" ? (
            <BudgetVsReel year={year} month={month} />
          ) : hasEnvelopes ? (
            <>
              {metrics.envelopes.map(m => (
                <EnveloppeCard
                  key={m.envelope.id}
                  metrics={m}
                  onEdit={() => openEdit(m.envelope)}
                />
              ))}
              <button
                onClick={openAdd}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 0", borderRadius: 10,
                  border: "1px dashed rgba(255,255,255,0.12)",
                  background: "transparent", cursor: "pointer",
                  fontSize: 12, color: "rgba(255,255,255,0.28)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.28)"; }}
              >
                <Plus size={12} /> Ajouter une enveloppe
              </button>
            </>
          ) : (
            <EmptyEnvelopes
              hasPrevious={hasPrevious}
              onAdd={openAdd}
              onCopy={handleCopy}
            />
          )}
        </div>

        {/* Right: context sidebar */}
        <div style={{
          width: 260, flexShrink: 0, borderLeft: GB, overflowY: "auto",
          padding: "16px 16px 24px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Reste à vivre breakdown */}
          <div>
            <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", marginBottom: 10 }}>
              Reste à vivre
            </p>

            <ContextRow label="Revenus mensuels" value={`+${fmtShort(metrics.revenusMensuels)}`} color="#22c55e" />
            <ContextRow label="Charges fixes" value={`−${fmtShort(metrics.chargesConnues)}`} />
            {metrics.mensualites > 0 && (
              <ContextRow label="Mensualités" value={`−${fmtShort(metrics.mensualites)}`} />
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.045)", margin: "8px 0" }} />

            <ContextRow
              label="Reste à vivre brut"
              value={fmtShort(metrics.revenusMensuels - metrics.chargesConnues - metrics.mensualites)}
              bold
            />
            <ContextRow label="Budget alloué" value={`−${fmtShort(metrics.sumEnveloppesPrevu)}`} />

            <div style={{ height: 1, background: "rgba(255,255,255,0.045)", margin: "8px 0" }} />

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 10px", borderRadius: 8,
              background: `${resteColor}0d`, border: `1px solid ${resteColor}20`,
            }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Reste à allouer</span>
              <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: resteColor }}>
                {metrics.resteAAllouer >= 0 ? "+" : ""}{fmtShort(metrics.resteAAllouer)}
              </span>
            </div>
          </div>

          {/* À répartir — future months only */}
          {aRepartir !== null && soldeEntrant !== null && (
            <div>
              <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", marginBottom: 10 }}>
                À répartir
              </p>
              <ContextRow
                label={reviewIsProjected ? `Solde proj. j.${budgetReviewDay} ${prevMonthLabel}` : `Solde réel j.${budgetReviewDay} ${prevMonthLabel}`}
                value={fmtShort(soldeEntrant)}
                color="#6366f1"
              />
              <ContextRow label="Revenus prévus" value={`+${fmtShort(revenusViewedMonth)}`} color="#22c55e" />
              <div style={{ height: 1, background: "rgba(255,255,255,0.045)", margin: "8px 0" }} />
              <ContextRow label="Total disponible" value={fmtShort(aRepartir)} bold />
              <ContextRow label="Enveloppes allouées" value={`−${fmtShort(metrics.sumEnveloppesPrevu)}`} />
              <div style={{ height: 1, background: "rgba(255,255,255,0.045)", margin: "8px 0" }} />
              <ContextRow
                label="Reste non alloué"
                value={`${aRepartir - metrics.sumEnveloppesPrevu >= 0 ? "+" : ""}${fmtShort(aRepartir - metrics.sumEnveloppesPrevu)}`}
                bold
                color={aRepartir - metrics.sumEnveloppesPrevu >= 0 ? "#22c55e" : "#ef4444"}
              />
            </div>
          )}

          {/* Charges connues list — only items active in the viewed month */}
          {baseItems.filter(i => {
            if (i.archived || i.direction !== "depense") return false;
            const ms = new Date(year, month, 1);
            const me = new Date(year, month + 1, 0);
            if (i.dateFin   && new Date(i.dateFin)   < ms) return false;
            if (i.dateDebut && new Date(i.dateDebut) > me) return false;
            return true;
          }).length > 0 && (
            <div>
              <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", marginBottom: 8 }}>
                Charges connues
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {baseItems
                  .filter(i => {
                    if (i.archived || i.direction !== "depense") return false;
                    const ms = new Date(year, month, 1);
                    const me = new Date(year, month + 1, 0);
                    if (i.dateFin   && new Date(i.dateFin)   < ms) return false;
                    if (i.dateDebut && new Date(i.dateDebut) > me) return false;
                    return true;
                  })
                  .slice(0, 10)
                  .map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.38)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                        {fmtShort(item.montant)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Budget tempo indicator */}
          {hasEnvelopes && isCurrentMonth && (
            <div style={{ marginTop: "auto", paddingTop: 8 }}>
              <div style={{
                padding: "10px 12px", borderRadius: 9,
                background: "rgba(255,255,255,0.025)", border: GB,
              }}>
                <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.22)", marginBottom: 6 }}>
                  Tempo du mois
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {metrics.budgetARisque > 0
                    ? <TrendingDown size={12} style={{ color: "#ef4444" }} />
                    : <TrendingUp size={12} style={{ color: "#22c55e" }} />}
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                    {critique.length > 0
                      ? `${critique.length} enveloppe${critique.length > 1 ? "s" : ""} critique${critique.length > 1 ? "s" : ""}`
                      : attention.length > 0
                      ? `${attention.length} enveloppe${attention.length > 1 ? "s" : ""} en attention`
                      : "Toutes les enveloppes saines"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Panels ───────────────────────────────────────────────────────────── */}
      <EnveloppePanel
        open={panelOpen}
        envelope={editing}
        onClose={closePanel}
        onSave={handleSave}
        onDelete={editing ? handleDelete : undefined}
      />
      <SaisieRapidePanel
        open={saisieOpen}
        onClose={() => setSaisieOpen(false)}
      />
      <RituelPanel
        open={rituelOpen}
        year={year}
        month={month}
        onClose={() => setRituelOpen(false)}
      />
    </div>
  );
}

// ── Context sidebar row ───────────────────────────────────────────────────────
function ContextRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.32)" }}>{label}</span>
      <span style={{
        fontSize: bold ? 12 : 11, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em",
        fontWeight: bold ? 700 : 500,
        color: color ?? "rgba(255,255,255,0.45)",
      }}>
        {value}
      </span>
    </div>
  );
}
