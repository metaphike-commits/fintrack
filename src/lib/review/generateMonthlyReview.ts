import type { Transaction } from "@/store/transactions";
import type { BaseItem } from "@/store/baseFinanciere";
import type { BudgetMois } from "@/store/budget";
import type { Engagement } from "@/store/engagements";
import { getMensualitesEngagements } from "@/store/engagements";

import { projectDailyBalance, runwayDays, toMensuel, getPointBas, computeBaseNet } from "@/lib/projection";
import { getRowsForMonth } from "@/lib/timeline";
import { computeReconciliation } from "./reconciliation";
import { computeHighlights } from "./highlights";
import { computeTension } from "./tension";
import { computeRecommendation } from "./recommendation";
import type { ReviewData, ProjectionData, BudgetSummaryData } from "./types";

export interface GenerateMonthlyReviewParams {
  transactions: Transaction[];
  baseItems: BaseItem[];
  budgetMois: BudgetMois | null;      // for the reviewed month
  nextBudgetMois: BudgetMois | null;  // for the next month
  engagements: Engagement[];
  soldeEffectif: number;
  pendingOverdue: number;
  statuts: Record<string, string>;
  paid: Record<string, boolean>;
  reconciliationAmountTol: number;
  budgetReviewDay: number;
  year: number;
  month: number;
  today: Date;
}

export function generateMonthlyReview(params: GenerateMonthlyReviewParams): ReviewData {
  const {
    transactions, baseItems, budgetMois, nextBudgetMois, engagements,
    soldeEffectif, pendingOverdue, statuts, paid,
    reconciliationAmountTol, budgetReviewDay,
    year, month, today,
  } = params;

  const activeItems = baseItems.filter(i => !i.archived);

  // Back-calculate balance at start of reviewed month from imported transactions
  // soldeEffectif = startOfMonth balance + net of all transactions from that month onwards
  const netFromMonthStart = transactions
    .filter(t => {
      if (t.excludedFromAnalytics) return false;
      const d = new Date(t.date);
      return d.getFullYear() * 12 + d.getMonth() >= year * 12 + month;
    })
    .reduce((s, t) => s + (t.direction === "revenu" ? t.montant : -t.montant), 0);
  const soldeDebutMois = soldeEffectif - netFromMonthStart;

  // For the current month: derive point bas from the same forward projection as Timeline
  // so Section 3 shows the same value as Timeline instead of a relative transaction balance
  let projectedPointBas: { solde: number; date: string } | undefined;
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  if (isCurrentMonth) {
    const daysLeft = Math.ceil(
      (new Date(year, month + 1, 0).getTime() - today.getTime()) / 86_400_000
    ) + 1;
    const monthProj = projectDailyBalance(
      soldeEffectif - pendingOverdue, activeItems, daysLeft, today, statuts, paid
    );
    const pb = getPointBas(monthProj);
    if (pb) {
      projectedPointBas = { solde: pb.solde, date: pb.date.toISOString().slice(0, 10) };
    }
  }

  const reconciliation = computeReconciliation(transactions, year, month, reconciliationAmountTol);
  const highlights     = computeHighlights(transactions, budgetMois, year, month);
  const tension        = computeTension(transactions, year, month, soldeDebutMois, projectedPointBas);
  const budgetSummary  = computeBudgetSummary({
    transactions, activeItems, nextBudgetMois, engagements,
    soldeEffectif, pendingOverdue, statuts, paid, budgetReviewDay, year, month, today,
  });
  const projection     = computeProjection({ activeItems, soldeEffectif, pendingOverdue, statuts, paid, today, transactions, engagements, year, month });
  const recommendation = computeRecommendation(tension, highlights);

  return {
    year,
    month,
    generatedAt: new Date().toISOString(),
    reconciliation,
    highlights,
    tension,
    budgetSummary,
    projection,
    recommendation,
  };
}

// ── Budget summary for next month ─────────────────────────────────────────────

function computeBudgetSummary(p: {
  transactions: Transaction[];
  activeItems: BaseItem[];
  nextBudgetMois: BudgetMois | null;
  engagements: Engagement[];
  soldeEffectif: number;
  pendingOverdue: number;
  statuts: Record<string, string>;
  paid: Record<string, boolean>;
  budgetReviewDay: number;
  year: number;
  month: number;
  today: Date;
}): BudgetSummaryData {
  const { transactions, activeItems, nextBudgetMois, soldeEffectif, pendingOverdue, statuts, paid, budgetReviewDay, year, month, today } = p;

  // Projected balance at reviewDay of the current viewed month (= solde entrant for next month)
  const maxDay = new Date(year, month + 1, 0).getDate();
  const reviewDayClamped = Math.min(budgetReviewDay, maxDay);
  const reviewDate = new Date(year, month, reviewDayClamped);

  let aRepartir: number | null = null;

  if (soldeEffectif != null) {
    const startBalance = soldeEffectif - pendingOverdue;
    let soldeAtReview: number;

    if (reviewDate <= today) {
      soldeAtReview = startBalance;
    } else {
      const daysToReview = Math.ceil((reviewDate.getTime() - today.getTime()) / 86_400_000);
      const chain = projectDailyBalance(startBalance, activeItems, daysToReview, today, statuts, paid);
      soldeAtReview = chain[chain.length - 1]?.solde ?? startBalance;
    }

    // Add expected income for next month
    const nextYear  = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const revenusNextMonth = getRowsForMonth(activeItems, nextYear, nextMonth)
      .filter(r => r.direction === "revenu")
      .reduce((s, r) => s + (r.frequence === "hebdomadaire" ? toMensuel({ montant: r.montant, frequence: r.frequence }) : r.montant), 0);

    aRepartir = Math.round(soldeAtReview + revenusNextMonth);
  }

  const sumEnveloppesPrevu = (nextBudgetMois?.envelopes ?? []).reduce((s, e) => s + e.montantPrevu, 0);
  const resteNonAlloue = aRepartir !== null ? aRepartir - sumEnveloppesPrevu : null;

  // Average spending per category over last 3 months
  const topDepensesMoyennes3Mois = computeAvgByCategory(transactions, year, month, 3);

  return { aRepartir, sumEnveloppesPrevu, resteNonAlloue, topDepensesMoyennes3Mois };
}

function computeAvgByCategory(
  transactions: Transaction[],
  year: number,
  month: number,
  nMonths: number
): { categorie: string; moyenne: number }[] {
  const catTotals = new Map<string, number>();

  for (let i = 1; i <= nMonths; i++) {
    const m = month - i;
    const y = m < 0 ? year - 1 : year;
    const mi = ((m % 12) + 12) % 12;
    const monthTx = transactions.filter(t => {
      if (t.excludedFromAnalytics || t.direction !== "depense") return false;
      const d = new Date(t.date);
      return d.getFullYear() === y && d.getMonth() === mi;
    });
    for (const t of monthTx) {
      catTotals.set(t.categorie, (catTotals.get(t.categorie) ?? 0) + t.montant);
    }
  }

  return Array.from(catTotals.entries())
    .map(([categorie, total]) => ({ categorie, moyenne: Math.round(total / nMonths) }))
    .sort((a, b) => b.moyenne - a.moyenne)
    .slice(0, 5);
}

// ── Projection ────────────────────────────────────────────────────────────────

function computeProjection(p: {
  activeItems: BaseItem[];
  soldeEffectif: number;
  pendingOverdue: number;
  statuts: Record<string, string>;
  paid: Record<string, boolean>;
  today: Date;
  transactions: Transaction[];
  engagements: Engagement[];
  year: number;
  month: number;
}): ProjectionData {
  const { activeItems, soldeEffectif, pendingOverdue, statuts, paid, today, transactions, engagements, year, month } = p;
  const startBalance = soldeEffectif - pendingOverdue;

  // 90-day projection from today
  const projections = projectDailyBalance(startBalance, activeItems, 90, today, statuts, paid);
  const pointBasObj = getPointBas(projections);

  const baseNet    = computeBaseNet(activeItems, today);
  const mensualites = getMensualitesEngagements(engagements, today);
  const monthlyNet = baseNet - mensualites;
  const runway = runwayDays(startBalance, monthlyNet);

  // Fragility score: simple composite
  let fragScore = 0;
  if (runway !== null) {
    if (runway < 30)  fragScore += 50;
    else if (runway < 60)  fragScore += 35;
    else if (runway < 90)  fragScore += 20;
    else if (runway < 180) fragScore += 10;
  }
  if (pointBasObj && pointBasObj.solde < 0) {
    fragScore += Math.min(30, Math.round(Math.abs(pointBasObj.solde) / 50));
  }
  if (startBalance < 500) fragScore += 20;
  else if (startBalance < 1000) fragScore += 10;

  // Momentum: compare this month's soldeNet vs previous month
  const prevYear  = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  const soldeNetThisMonth = computeSoldeNet(transactions, year, month);
  const soldeNetPrevMonth = computeSoldeNet(transactions, prevYear, prevMonth);

  let momentum: ProjectionData["momentum"] = "neutre";
  if (soldeNetThisMonth !== null && soldeNetPrevMonth !== null) {
    const delta = soldeNetThisMonth - soldeNetPrevMonth;
    if (delta > 50)  momentum = "positif";
    else if (delta < -50) momentum = "negatif";
  }

  return {
    runwayDays: runway,
    pointBasProjeté: pointBasObj
      ? { solde: pointBasObj.solde, date: pointBasObj.date.toISOString().slice(0, 10) }
      : null,
    fragiliteScore: Math.min(100, fragScore),
    momentum,
    runwayDeltaVsPrevMonth: null,   // V1: not computed
  };
}

function computeSoldeNet(transactions: Transaction[], year: number, month: number): number | null {
  const monthTx = transactions.filter(t => {
    if (t.excludedFromAnalytics) return false;
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  if (monthTx.length === 0) return null;
  return monthTx.reduce(
    (s, t) => s + (t.direction === "revenu" ? t.montant : -t.montant),
    0
  );
}
