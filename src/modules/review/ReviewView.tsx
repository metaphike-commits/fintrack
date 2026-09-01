"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useReviewStore } from "@/store/review";
import { useTransactionsStore } from "@/store/transactions";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useBudgetStore } from "@/store/budget";
import { useEngagementsStore } from "@/store/engagements";
import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { useCompteStore } from "@/store/compte";
import { useTimelineStore } from "@/store/timeline";
import { usePreferencesStore } from "@/store/preferences";
import { getPendingOverdueAmount } from "@/lib/timeline";
import { generateMonthlyReview } from "@/lib/review/generateMonthlyReview";
import type { ReviewData } from "@/lib/review/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmt(n: number) {
  return `${Math.abs(n).toLocaleString("fr-FR")} €`;
}
function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmt(n)}`;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  ok:     "#22c55e",
  warn:   "#f59e0b",
  danger: "#ef4444",
  accent: "#818cf8",
  text:   "rgba(255,255,255,0.75)",
  muted:  "rgba(255,255,255,0.32)",
  faint:  "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.07)",
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 24, marginBottom: 56 }}>
      {/* Left: number + vertical line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0, width: 28 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: C.faint, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: C.accent,
          flexShrink: 0,
        }}>
          {n}
        </div>
        <div style={{ width: 1, flex: 1, background: C.border, marginTop: 8 }} />
      </div>
      {/* Right: content */}
      <div style={{ flex: 1, paddingBottom: 8 }}>
        <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: C.muted, marginBottom: 12 }}>
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

// ── Status chip ───────────────────────────────────────────────────────────────
function Chip({ label, ok }: { label: string; ok: "ok" | "warn" | "bad" }) {
  const color = ok === "ok" ? C.ok : ok === "warn" ? C.warn : C.danger;
  const Icon  = ok === "ok" ? CheckCircle : ok === "warn" ? AlertCircle : XCircle;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7, padding: "7px 12px",
      background: `${color}10`, border: `1px solid ${color}25`,
      borderRadius: 9, marginBottom: 8,
    }}>
      <Icon size={13} style={{ color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: C.text }}>{label}</span>
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color = C.accent }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.muted, textTransform: "capitalize" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: C.text }}>{fmt(value)}</span>
      </div>
      <div style={{ height: 3, background: C.faint, borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ── Narrative block ───────────────────────────────────────────────────────────
function Narrative({ text }: { text: string }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: `${C.accent}09`, border: `1px solid ${C.accent}20`,
      fontSize: 13, lineHeight: 1.65, color: C.text, fontStyle: "italic",
    }}>
      {text}
    </div>
  );
}

// ── KPI row ───────────────────────────────────────────────────────────────────
function KRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
      <span style={{ fontSize: 11.5, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: color ?? C.text }}>{value}</span>
    </div>
  );
}

// ── S1 — Intégrité ────────────────────────────────────────────────────────────
function S1({ d }: { d: ReviewData["reconciliation"] }) {
  const { totalTransactions, uncategorized, probableTransfers, potentialDuplicates, reconciliationRate } = d;

  // A month with zero imported transactions has no data, not a clean bill of
  // health — surface that plainly instead of a reassuring 100% chip, since
  // every other section of Review silently relies on this month's imports
  // being complete.
  if (totalTransactions === 0) {
    return (
      <Chip label="Aucune transaction importée ce mois — les sections suivantes peuvent être incomplètes ou inexactes" ok="warn" />
    );
  }

  return (
    <>
      <Chip label={`${totalTransactions} transaction${totalTransactions > 1 ? "s" : ""} importée${totalTransactions > 1 ? "s" : ""}`} ok="ok" />
      {probableTransfers > 0 && (
        <Chip label={`${probableTransfers} transfert${probableTransfers > 1 ? "s" : ""} à confirmer`} ok="warn" />
      )}
      {uncategorized > 0 && (
        <Chip label={`${uncategorized} transaction${uncategorized > 1 ? "s" : ""} non catégorisée${uncategorized > 1 ? "s" : ""}`} ok={uncategorized > 5 ? "bad" : "warn"} />
      )}
      {potentialDuplicates > 0 && (
        <Chip label={`${potentialDuplicates} doublon${potentialDuplicates > 1 ? "s" : ""} potentiel${potentialDuplicates > 1 ? "s" : ""}`} ok="warn" />
      )}
      {reconciliationRate !== null && (
        <Chip label={`${reconciliationRate} % des flux réconciliés`} ok={reconciliationRate >= 80 ? "ok" : reconciliationRate >= 50 ? "warn" : "bad"} />
      )}
    </>
  );
}

// ── S2 — Ce qui s'est passé ───────────────────────────────────────────────────
function S2({ d }: { d: ReviewData["highlights"] }) {
  const maxCat = d.topCategories[0]?.montant ?? 1;
  return (
    <>
      {/* Totaux */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Revenus", value: d.totalRevenus, color: C.ok },
          { label: "Dépenses", value: d.totalDepenses, color: C.danger },
          { label: "Solde net", value: d.soldeNet, color: d.soldeNet >= 0 ? C.ok : C.danger },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, padding: "10px 12px", borderRadius: 9,
            background: C.faint, border: `1px solid ${C.border}`,
          }}>
            <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums", color }}>{fmtSigned(value)}</p>
          </div>
        ))}
      </div>

      {/* Top catégories */}
      {d.topCategories.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 10 }}>
            Top catégories
          </p>
          {d.topCategories.map(cat => (
            <HBar
              key={cat.categorie}
              label={cat.categorie + (cat.variationPct !== null ? `  ${cat.variationPct > 0 ? "+" : ""}${cat.variationPct}%` : "")}
              value={cat.montant}
              max={maxCat}
              color={cat.variationPct !== null && cat.variationPct > 20 ? C.warn : C.accent}
            />
          ))}
        </div>
      )}

      {/* Alertes enveloppes */}
      {d.depassements.length > 0 && d.depassements.map(e => (
        <Chip key={e.label} label={`${e.label} — dépassement de ${fmt(e.delta)}`} ok="bad" />
      ))}
      {d.sousConsommation.length > 0 && d.sousConsommation.map(e => (
        <Chip key={e.label} label={`${e.label} — sous-consommé de ${fmt(Math.abs(e.delta))}`} ok="warn" />
      ))}

      {/* Dépenses exceptionnelles */}
      {d.depensesExceptionnelles.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 8 }}>
            Dépenses hors normes
          </p>
          {d.depensesExceptionnelles.map(e => (
            <div key={e.date + e.label} style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 12, color: C.text }}>{e.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: C.warn }}>{fmt(e.montant)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── S3 — Tension ──────────────────────────────────────────────────────────────
function S3({ d }: { d: ReviewData["tension"] }) {
  if (!d.pointBas) {
    return <p style={{ fontSize: 13, color: C.muted }}>Pas assez de transactions pour analyser la tension ce mois-ci.</p>;
  }
  return (
    <>
      {/* Point bas */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: 9, background: `${C.danger}0c`,
        border: `1px solid ${C.danger}20`, marginBottom: 16,
      }}>
        <span style={{ fontSize: 12, color: C.muted }}>Point bas du mois</span>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: C.danger }}>
            {d.pointBas.solde < 0 ? "−" : ""}{fmt(Math.abs(d.pointBas.solde))}
          </p>
          <p style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>
            {new Date(d.pointBas.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      {/* Causes */}
      {d.causes.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {d.causes.map((c, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "6px 0",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 12, color: C.text, maxWidth: "70%" }}>{c.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: C.warn }}>{fmt(c.montant)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Narrative */}
      <Narrative text={d.narrative} />
    </>
  );
}

// ── S4 — Budget mois suivant ──────────────────────────────────────────────────
function S4({ d, nextMonthLabel }: { d: ReviewData["budgetSummary"]; nextMonthLabel: string }) {
  return (
    <>
      {/* À répartir */}
      {d.aRepartir !== null && (
        <div style={{
          padding: "12px 16px", borderRadius: 9,
          background: `${C.accent}0a`, border: `1px solid ${C.accent}20`,
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 6 }}>
            À répartir pour {nextMonthLabel}
          </p>
          <p style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: d.resteNonAlloue !== null && d.resteNonAlloue >= 0 ? C.ok : C.danger }}>
            {fmt(d.aRepartir)}
          </p>
        </div>
      )}

      <KRow label="Enveloppes déjà allouées" value={`−${fmt(d.sumEnveloppesPrevu)}`} />
      {d.resteNonAlloue !== null && (
        <KRow
          label="Reste non alloué"
          value={fmtSigned(d.resteNonAlloue)}
          color={d.resteNonAlloue >= 0 ? C.ok : C.danger}
        />
      )}

      {d.topDepensesMoyennes3Mois.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 10 }}>
            Moyenne 3 mois par catégorie
          </p>
          {d.topDepensesMoyennes3Mois.map(r => (
            <KRow key={r.categorie} label={r.categorie} value={fmt(r.moyenne)} />
          ))}
        </div>
      )}
    </>
  );
}

// ── S5 — Projection ───────────────────────────────────────────────────────────
function S5({ d }: { d: ReviewData["projection"] }) {
  const MomentumIcon = d.momentum === "positif" ? TrendingUp : d.momentum === "negatif" ? TrendingDown : Minus;
  const momentumColor = d.momentum === "positif" ? C.ok : d.momentum === "negatif" ? C.danger : C.muted;
  const momentumLabel = d.momentum === "positif" ? "Tendance positive" : d.momentum === "negatif" ? "Tendance négative" : "Tendance stable";

  return (
    <>
      {/* Runway + fragility */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 9, background: C.faint, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 4 }}>Runway</p>
          <p style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: d.runwayDays !== null && d.runwayDays < 60 ? C.danger : C.ok }}>
            {d.runwayDays !== null ? `${d.runwayDays} j` : "∞"}
          </p>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 9, background: C.faint, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 4 }}>Fragilité</p>
          <p style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: d.fragiliteScore > 60 ? C.danger : d.fragiliteScore > 30 ? C.warn : C.ok }}>
            {d.fragiliteScore}/100
          </p>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 9, background: C.faint, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 4 }}>Momentum</p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
            <MomentumIcon size={14} style={{ color: momentumColor }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: momentumColor }}>{momentumLabel}</span>
          </div>
        </div>
      </div>

      {d.pointBasProjeté && (
        <div style={{
          display: "flex", justifyContent: "space-between", padding: "10px 14px",
          borderRadius: 9, background: `${C.warn}0a`, border: `1px solid ${C.warn}20`,
        }}>
          <span style={{ fontSize: 12, color: C.muted }}>Point bas projeté (90 j)</span>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: d.pointBasProjeté.solde < 0 ? C.danger : C.text }}>
              {d.pointBasProjeté.solde < 0 ? "−" : ""}{fmt(Math.abs(d.pointBasProjeté.solde))}
            </p>
            <p style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>
              {new Date(d.pointBasProjeté.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

// ── S6 — Recommandation ───────────────────────────────────────────────────────
function S6({ d }: { d: ReviewData["recommendation"] }) {
  const hasImpact = d.impactEstime !== null && d.impactEstime > 0;
  return (
    <div style={{
      padding: "20px 22px", borderRadius: 12,
      background: `${C.accent}08`, border: `1px solid ${C.accent}18`,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
        {d.titre}
      </p>
      <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
        {d.corps}
      </p>
      {hasImpact && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          marginTop: 14, padding: "5px 10px", borderRadius: 7,
          background: `${C.ok}12`, border: `1px solid ${C.ok}25`,
        }}>
          <TrendingUp size={11} style={{ color: C.ok }} />
          <span style={{ fontSize: 11, color: C.ok, fontWeight: 600 }}>
            Impact estimé : +{fmt(d.impactEstime!)} sur ton point bas
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export function ReviewView() {
  const today = useMemo(() => new Date(), []);
  const { year, month, setMonth } = useReviewStore();

  // Store reads — read-only, no modifications
  const transactions = useTransactionsStore(s => s.transactions);
  const baseItems    = useBaseFinanciereStore(s => s.items);
  const { mois }    = useBudgetStore();
  const engagements  = useEngagementsStore(s => s.engagements);
  const comptes      = useComptesStore(s => s.comptes);
  const { soldeCourant } = useCompteStore();
  const statuts      = useTimelineStore(s => s.statuts);
  const paid         = useTimelineStore(s => s.paid);
  const { reconciliationAmountTol, budgetReviewDay } = usePreferencesStore();

  const soldeEffectif = getSoldeRunway(comptes) ?? soldeCourant;
  const activeItems   = useMemo(() => baseItems.filter(i => !i.archived), [baseItems]);
  const pendingOverdue = useMemo(
    () => getPendingOverdueAmount(activeItems, statuts, paid, today),
    [activeItems, statuts, paid, today]
  );

  const nextYear  = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  const budgetMois = useMemo(
    () => mois.find(m => m.year === year && m.month === month) ?? null,
    [mois, year, month]
  );
  const nextBudgetMois = useMemo(
    () => mois.find(m => m.year === nextYear && m.month === nextMonth) ?? null,
    [mois, nextYear, nextMonth]
  );

  const reviewData = useMemo(() => generateMonthlyReview({
    transactions, baseItems, budgetMois, nextBudgetMois, engagements,
    soldeEffectif: soldeEffectif ?? 0,
    pendingOverdue, statuts, paid,
    reconciliationAmountTol, budgetReviewDay,
    year, month, today,
  }), [
    transactions, baseItems, budgetMois, nextBudgetMois, engagements,
    soldeEffectif, pendingOverdue, statuts, paid,
    reconciliationAmountTol, budgetReviewDay, year, month, today,
  ]);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const monthLabel = cap(new Date(year, month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
  const nextMonthLabel = new Date(nextYear, nextMonth, 1).toLocaleDateString("fr-FR", { month: "long" });

  function prevM() {
    if (month === 0) setMonth(year - 1, 11);
    else setMonth(year, month - 1);
  }
  function nextM() {
    if (month === 11) setMonth(year + 1, 0);
    else setMonth(year, month + 1);
  }

  const GB = `1px solid ${C.border}`;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px 100px" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.16em", color: C.muted, marginBottom: 8 }}>
          Revue mensuelle
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={prevM}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 6, display: "flex" }}
          >
            <ChevronLeft size={16} />
          </button>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: C.text }}>
            {monthLabel}
            {isCurrentMonth && (
              <span style={{ marginLeft: 10, fontSize: 11, fontFamily: "monospace", fontWeight: 500, color: C.accent, letterSpacing: "0.08em", textTransform: "uppercase", verticalAlign: "middle" }}>
                en cours
              </span>
            )}
          </h1>
          <button
            onClick={nextM}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 6, display: "flex" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
          Synthèse de ta trajectoire financière. Calme, guidée, décisionnelle.
        </p>
      </div>

      {/* ── 6 sections ──────────────────────────────────────────────────────── */}
      <Section n={1} title="Intégrité des données">
        <S1 d={reviewData.reconciliation} />
      </Section>

      <Section n={2} title="Ce qui s'est réellement passé">
        <S2 d={reviewData.highlights} />
      </Section>

      <Section n={3} title="Ce qui a créé la tension">
        <S3 d={reviewData.tension} />
      </Section>

      <Section n={4} title={`Budget — ${nextMonthLabel}`}>
        <S4 d={reviewData.budgetSummary} nextMonthLabel={nextMonthLabel} />
      </Section>

      <Section n={5} title="Projection & trajectoire">
        <S5 d={reviewData.projection} />
      </Section>

      <div style={{ display: "flex", gap: 24 }}>
        {/* Left: number (no line after last section) */}
        <div style={{ flexShrink: 0, width: 28 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `${C.accent}18`, border: `1px solid ${C.accent}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: C.accent,
          }}>
            6
          </div>
        </div>
        {/* Right: content */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.14em", color: C.muted, marginBottom: 12 }}>
            Recommandation principale
          </p>
          <S6 d={reviewData.recommendation} />
        </div>
      </div>

    </div>
  );
}
