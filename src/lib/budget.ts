import type { Transaction } from "@/store/transactions";
import type { BudgetEnvelope, BudgetMois } from "@/store/budget";
import type { BaseItem } from "@/store/baseFinanciere";
import type { Engagement } from "@/store/engagements";
import { toMensuel } from "@/lib/projection";
import { parseLocalDate } from "@/lib/dateUtils";
import { getMensualitesEngagements } from "@/store/engagements";
import { getMoisOrEmpty } from "@/store/budget";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RythmeStatus = "sain" | "attention" | "critique";

export interface EnveloppeMetrics {
  envelope: BudgetEnvelope;
  // Real spending
  montantDepense: number;
  montantRestant: number;
  pctConsomme: number;       // 0–100
  // Time
  pctMoisEcoule: number;     // 0–100, computed live
  daysInMonth: number;
  dayOfMonth: number;
  // Signal
  rythme: RythmeStatus;
  // Projection
  projectionFinMois: number;
  depassementProjecte: number; // max(0, projection - prevu)
  // Transactions
  transactions: Transaction[];
}

export interface BudgetMetrics {
  // Header KPIs
  resteAAllouer: number;
  budgetARisque: number;
  margeVariableRestante: number;
  // Context
  revenusMensuels: number;
  chargesConnues: number;
  mensualites: number;
  sumEnveloppesPrevu: number;
  // Per-envelope
  envelopes: EnveloppeMetrics[];
}

// ── Matching ──────────────────────────────────────────────────────────────────

export function txMatchesEnvelope(tx: Transaction, env: BudgetEnvelope): boolean {
  if (tx.direction !== "depense") return false;
  const cats = [env.categorie, ...(env.categoriesAlias ?? [])].map(c =>
    c.toLowerCase().trim()
  );
  return cats.includes(tx.categorie.toLowerCase().trim());
}

// ── Rythme ────────────────────────────────────────────────────────────────────

/**
 * The core signal:
 *   sain      — consumption pace ≤ 110% of elapsed time
 *   attention — consumption pace ≤ 135% of elapsed time
 *   critique  — above 135%, or projection already exceeds budget
 * No signal before 5% of month elapsed (too early).
 */
export function getRythme(
  pctConsomme: number,
  pctMoisEcoule: number,
  projectionFinMois: number,
  montantPrevu: number
): RythmeStatus {
  if (pctMoisEcoule < 5) return "sain";
  if (projectionFinMois > montantPrevu * 1.01) return "critique";
  if (pctConsomme > pctMoisEcoule * 1.35) return "critique";
  if (pctConsomme > pctMoisEcoule * 1.10) return "attention";
  return "sain";
}

// ── Per-envelope compute ──────────────────────────────────────────────────────

export function computeEnveloppeMetrics(
  envelope: BudgetEnvelope,
  transactions: Transaction[],
  year: number,
  month: number,
  today: Date = new Date()
): EnveloppeMetrics {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // If viewing a past month, treat as fully elapsed
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const dayOfMonth     = isCurrentMonth ? today.getDate() : daysInMonth;
  const pctMoisEcoule  = (dayOfMonth / daysInMonth) * 100;

  // Transactions for this envelope this month
  const matched = transactions.filter(tx => {
    if (tx.excludedFromAnalytics) return false;
    if (!txMatchesEnvelope(tx, envelope)) return false;
    const d = new Date(tx.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const montantDepense   = matched.reduce((s, tx) => s + tx.montant, 0);
  const montantRestant   = envelope.montantPrevu - montantDepense;
  const pctConsomme      = envelope.montantPrevu > 0
    ? (montantDepense / envelope.montantPrevu) * 100
    : 0;

  const projectionFinMois = pctMoisEcoule > 0
    ? montantDepense / (pctMoisEcoule / 100)
    : 0;
  const depassementProjecte = Math.max(0, projectionFinMois - envelope.montantPrevu);

  const rythme = getRythme(pctConsomme, pctMoisEcoule, projectionFinMois, envelope.montantPrevu);

  return {
    envelope,
    montantDepense,
    montantRestant,
    pctConsomme,
    pctMoisEcoule,
    daysInMonth,
    dayOfMonth,
    rythme,
    projectionFinMois,
    depassementProjecte,
    transactions: matched.sort((a, b) => b.date.localeCompare(a.date)),
  };
}

// ── Full month compute ────────────────────────────────────────────────────────

export function computeBudgetMetrics(
  moisBudget: BudgetMois | null,
  transactions: Transaction[],
  baseItems: BaseItem[],
  engagements: Engagement[],
  year: number,
  month: number,
  today: Date = new Date()
): BudgetMetrics {
  const envelopes = (moisBudget?.envelopes ?? [])
    .slice()
    .sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));

  const envelopeMetrics = envelopes.map(env =>
    computeEnveloppeMetrics(env, transactions, year, month, today)
  );

  // Reste à allouer — only items active in the viewed month
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0);
  const itemsForMonth = baseItems.filter(i => {
    if (i.archived) return false;
    if (i.dateFin   && parseLocalDate(i.dateFin)   < monthStart) return false;
    if (i.dateDebut && parseLocalDate(i.dateDebut) > monthEnd)   return false;
    return true;
  });

  const revenusMensuels = itemsForMonth
    .filter(i => i.direction === "revenu")
    .reduce((s, i) => s + toMensuel(i), 0);

  const chargesConnues = itemsForMonth
    .filter(i => i.direction === "depense")
    .reduce((s, i) => s + toMensuel(i), 0);

  const mensualites      = getMensualitesEngagements(engagements, new Date(year, month, 1));
  const sumEnveloppesPrevu = envelopes.reduce((s, e) => s + e.montantPrevu, 0);
  const resteAAllouer    = revenusMensuels - chargesConnues - mensualites - sumEnveloppesPrevu;

  // Budget à risque = projected overruns on critique envelopes
  const budgetARisque = envelopeMetrics
    .filter(m => m.rythme === "critique")
    .reduce((s, m) => s + m.depassementProjecte, 0);

  // Marge variable restante = remaining budget in sain envelopes only
  const margeVariableRestante = envelopeMetrics
    .filter(m => m.rythme === "sain" && m.montantRestant > 0)
    .reduce((s, m) => s + m.montantRestant, 0);

  return {
    resteAAllouer,
    budgetARisque,
    margeVariableRestante,
    revenusMensuels,
    chargesConnues,
    mensualites,
    sumEnveloppesPrevu,
    envelopes: envelopeMetrics,
  };
}

// ── Variable spend projection (Timeline integration) ───────────────────────────

/**
 * Day-by-day estimate of upcoming variable spend from Budget envelopes, for
 * `days` days starting at `startDate`. Spread evenly across the days left in
 * each calendar month the horizon touches.
 *
 * For the real current month, "days left to spend" isn't just `montantPrevu
 * − montantDepense` — when an envelope is already over budget, that number
 * goes negative and would silently vanish from the projection (as if
 * overspending always stops exactly at the ceiling). Instead it adds
 * `depassementProjecte`, the amount `computeEnveloppeMetrics` already
 * projects will accrue if the current pace continues — so an envelope
 * that's blown its budget keeps pulling the curve down instead of
 * pretending the rest of the month is free. For a future month, there's no
 * real pace yet, so the whole planned envelope total is spread over it.
 */
export function buildVariableDailySpend(
  moisList: BudgetMois[],
  transactions: Transaction[],
  startDate: Date,
  days: number,
  today: Date = new Date()
): number[] {
  const daily = new Array<number>(Math.max(0, days)).fill(0);
  if (days <= 0) return daily;

  let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  let dayIdx = 0;

  while (dayIdx < days) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const daysInMonth   = new Date(y, m + 1, 0).getDate();
    const dayOfMonth    = cursor.getDate();
    const remainingDays = daysInMonth - dayOfMonth + 1;
    const span          = Math.min(remainingDays, days - dayIdx);

    const monthBudget       = getMoisOrEmpty(moisList, y, m);
    const isRealCurrentMois = y === today.getFullYear() && m === today.getMonth();

    const total = isRealCurrentMois
      ? monthBudget.envelopes.reduce((s, env) => {
          const em = computeEnveloppeMetrics(env, transactions, y, m, today);
          return s + Math.max(0, em.montantRestant + em.depassementProjecte);
        }, 0)
      : monthBudget.envelopes.reduce((s, e) => s + e.montantPrevu, 0);

    const spreadOver = isRealCurrentMois ? remainingDays : daysInMonth;
    const perDay = spreadOver > 0 ? total / spreadOver : 0;

    for (let k = 0; k < span; k++) daily[dayIdx + k] = perDay;

    dayIdx += span;
    cursor = new Date(y, m + 1, 1);
  }

  return daily;
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtBudget(n: number): string {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export const RYTHME_COLOR: Record<RythmeStatus, string> = {
  sain:      "#22c55e",
  attention: "#f59e0b",
  critique:  "#ef4444",
};

export const RYTHME_LABEL: Record<RythmeStatus, string> = {
  sain:      "Sain",
  attention: "Attention",
  critique:  "Critique",
};
