import type { Transaction } from "@/store/transactions";

export interface CategorieStat {
  categorie: string;
  total: number;
  count: number;
}

export interface PhaseStat {
  phase: "début" | "milieu" | "fin";
  range: string;
  total: number;
  pct: number;
}

export interface Anomalie {
  transaction: Transaction;
  ratio: number;
  mean: number;
}

export interface DepenseCompressible {
  label: string;
  categorie: string;
  count: number;
  avgMontant: number;
  total: number;
}

export interface MoisStat {
  moisLabel: string;
  revenus: number;
  depenses: number;
  net: number;
}

export function getTopCategories(
  transactions: Transaction[],
  limit = 8
): CategorieStat[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const e = map.get(t.categorie) ?? { total: 0, count: 0 };
    map.set(t.categorie, { total: e.total + t.montant, count: e.count + 1 });
  }
  return [...map.entries()]
    .map(([categorie, { total, count }]) => ({ categorie, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function getPhaseStats(transactions: Transaction[]): PhaseStat[] {
  const phases: PhaseStat[] = [
    { phase: "début", range: "j. 1–10", total: 0, pct: 0 },
    { phase: "milieu", range: "j. 11–20", total: 0, pct: 0 },
    { phase: "fin", range: "j. 21–31", total: 0, pct: 0 },
  ];
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const day = new Date(t.date).getDate();
    if (day <= 10) phases[0].total += t.montant;
    else if (day <= 20) phases[1].total += t.montant;
    else phases[2].total += t.montant;
  }
  const grandTotal = phases.reduce((s, p) => s + p.total, 0);
  return phases.map((p) => ({
    ...p,
    pct: grandTotal > 0 ? (p.total / grandTotal) * 100 : 0,
  }));
}

export function detectAnomalies(
  transactions: Transaction[],
  limit = 5
): Anomalie[] {
  const labelMap = new Map<string, number[]>();
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const arr = labelMap.get(t.label) ?? [];
    arr.push(t.montant);
    labelMap.set(t.label, arr);
  }

  const anomalies: Anomalie[] = [];
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const arr = labelMap.get(t.label) ?? [t.montant];
    if (arr.length < 2) continue;
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    if (mean === 0) continue;
    const ratio = t.montant / mean;
    if (ratio > 1.5) anomalies.push({ transaction: t, ratio, mean });
  }

  return anomalies.sort((a, b) => b.ratio - a.ratio).slice(0, limit);
}

export function getDepensesCompressibles(
  transactions: Transaction[],
  limit = 6
): DepenseCompressible[] {
  const map = new Map<string, { categorie: string; montants: number[] }>();
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const e = map.get(t.label);
    if (!e) map.set(t.label, { categorie: t.categorie, montants: [t.montant] });
    else e.montants.push(t.montant);
  }

  return [...map.entries()]
    .filter(([, { montants }]) => montants.length >= 2)
    .map(([label, { categorie, montants }]) => {
      const total = montants.reduce((s, v) => s + v, 0);
      return { label, categorie, count: montants.length, avgMontant: total / montants.length, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function getTendanceMensuelle(transactions: Transaction[]): MoisStat[] {
  const map = new Map<string, { revenus: number; depenses: number }>();
  for (const t of transactions) {
    if (t.direction === "transfert") continue;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const e = map.get(key) ?? { revenus: 0, depenses: 0 };
    if (t.direction === "revenu") e.revenus += t.montant;
    else e.depenses += t.montant;
    map.set(key, e);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { revenus, depenses }]) => {
      const [year, month] = key.split("-").map(Number);
      const moisLabel = new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      });
      return { moisLabel, revenus, depenses, net: revenus - depenses };
    });
}

export function getPeriode(transactions: Transaction[]): { start: Date; end: Date } | null {
  if (transactions.length === 0) return null;
  const dates = transactions.map((t) => new Date(t.date).getTime());
  return { start: new Date(Math.min(...dates)), end: new Date(Math.max(...dates)) };
}

export interface DayStat {
  date: string; // YYYY-MM-DD
  depenses: number;
  revenus: number;
}

/** Daily spending/revenue aggregates — used for calendar heatmap. */
export function getDailySpending(transactions: Transaction[]): DayStat[] {
  const map = new Map<string, { depenses: number; revenus: number }>();
  for (const t of transactions) {
    if (t.direction === "transfert") continue;
    const key = t.date.slice(0, 10);
    const e = map.get(key) ?? { depenses: 0, revenus: 0 };
    if (t.direction === "depense") e.depenses += t.montant;
    else e.revenus += t.montant;
    map.set(key, e);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { depenses, revenus }]) => ({ date, depenses, revenus }));
}

export interface DayOfWeekStat {
  day: number; // 0=Sun … 6=Sat
  label: string;
  total: number;
  count: number;
}

/** Average spending by day of week. */
export function getDayOfWeekStats(transactions: Transaction[]): DayOfWeekStat[] {
  const LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const map = new Map<number, { total: number; count: number }>();
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const d = new Date(t.date).getDay();
    const e = map.get(d) ?? { total: 0, count: 0 };
    map.set(d, { total: e.total + t.montant, count: e.count + 1 });
  }
  return Array.from({ length: 7 }, (_, i) => ({
    day: i,
    label: LABELS[i],
    total: map.get(i)?.total ?? 0,
    count: map.get(i)?.count ?? 0,
  }));
}

export interface ScoreComportemental {
  score: number; // 0–100
  label: string;
  details: { name: string; pts: number; max: number }[];
}

/** Composite behavioral score (higher = healthier habits). */
export function getScoreComportemental(
  transactions: Transaction[],
  totalRevenus: number,
  totalDepenses: number
): ScoreComportemental {
  const net = totalRevenus - totalDepenses;
  const tauxEpargne = totalRevenus > 0 ? (net / totalRevenus) * 100 : -100;

  // Savings rate 0–35
  const epargneScore =
    tauxEpargne >= 25 ? 35 :
    tauxEpargne >= 15 ? 25 :
    tauxEpargne >= 5  ? 15 :
    tauxEpargne >= 0  ? 5  : 0;

  // Anomaly absence 0–25
  const anomalies = detectAnomalies(transactions, 99);
  const anomalieScore =
    anomalies.length === 0 ? 25 :
    anomalies.length <= 2  ? 18 :
    anomalies.length <= 4  ? 10 : 3;

  // Spending regularity (phase balance) 0–20
  const phases = getPhaseStats(transactions);
  const pcts = phases.map((p) => p.pct);
  const maxPct = Math.max(...pcts, 1);
  const minPct = Math.min(...pcts, 100);
  const balance = maxPct > 0 ? (maxPct - minPct) / maxPct : 0;
  const regulariteScore = Math.round((1 - balance) * 20);

  // Compressibles absence 0–20
  const compressibles = getDepensesCompressibles(transactions, 99);
  const compressiblesScore =
    compressibles.length === 0 ? 20 :
    compressibles.length <= 2  ? 14 :
    compressibles.length <= 4  ? 8  : 3;

  const score = Math.min(100, Math.max(0,
    epargneScore + anomalieScore + regulariteScore + compressiblesScore
  ));

  const label =
    score >= 80 ? "Excellent" :
    score >= 60 ? "Bon" :
    score >= 40 ? "Moyen" : "À améliorer";

  return {
    score,
    label,
    details: [
      { name: "Taux d'épargne", pts: epargneScore, max: 35 },
      { name: "Absence d'anomalies", pts: anomalieScore, max: 25 },
      { name: "Régularité", pts: regulariteScore, max: 20 },
      { name: "Maîtrise des récurrentes", pts: compressiblesScore, max: 20 },
    ],
  };
}

// ── Premium analytics ─────────────────────────────────────────

export interface MoisStatFull {
  key: string; // YYYY-MM
  moisLabel: string;
  revenus: number;
  depenses: number;
  net: number;
}

export function getTendanceFull(transactions: Transaction[]): MoisStatFull[] {
  const map = new Map<string, { revenus: number; depenses: number }>();
  for (const t of transactions) {
    if (t.direction === "transfert") continue;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const e = map.get(key) ?? { revenus: 0, depenses: 0 };
    if (t.direction === "revenu") e.revenus += t.montant;
    else e.depenses += t.montant;
    map.set(key, e);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { revenus, depenses }]) => {
      const [year, month] = key.split("-").map(Number);
      const moisLabel = new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return { key, moisLabel, revenus, depenses, net: revenus - depenses };
    });
}

export interface Beneficiaire {
  label: string;
  total: number;
  count: number;
  categorie: string;
}

export function getTopBeneficiaires(transactions: Transaction[], limit = 5): Beneficiaire[] {
  const map = new Map<string, { total: number; count: number; categorie: string }>();
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const e = map.get(t.label) ?? { total: 0, count: 0, categorie: t.categorie };
    map.set(t.label, { total: e.total + t.montant, count: e.count + 1, categorie: t.categorie });
  }
  return [...map.entries()]
    .map(([label, { total, count, categorie }]) => ({ label, total, count, categorie }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export interface CatEvolution {
  categorie: string;
  current: number;
  prev: number;
  delta: number;
}

export function getEvolutionCategories(transactions: Transaction[]): CatEvolution[] {
  const now = new Date();
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const cur = new Map<string, number>();
  const prev = new Map<string, number>();
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    const k = t.date.slice(0, 7);
    if (k === curKey) cur.set(t.categorie, (cur.get(t.categorie) ?? 0) + t.montant);
    if (k === prevKey) prev.set(t.categorie, (prev.get(t.categorie) ?? 0) + t.montant);
  }
  const cats = new Set([...cur.keys(), ...prev.keys()]);
  return [...cats]
    .map((cat) => {
      const c = cur.get(cat) ?? 0;
      const p = prev.get(cat) ?? 0;
      const delta = p > 0 ? ((c - p) / p) * 100 : c > 0 ? 100 : 0;
      return { categorie: cat, current: c, prev: p, delta };
    })
    .filter((e) => e.current > 0 || e.prev > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 6);
}

export interface SankeyData {
  sources: { label: string; amount: number }[];
  sinks: { categorie: string; amount: number }[];
  totalRevenus: number;
  totalDepenses: number;
}

export function getSankeyData(transactions: Transaction[]): SankeyData {
  const sourceMap = new Map<string, number>();
  for (const t of transactions.filter((t) => t.direction === "revenu")) {
    sourceMap.set(t.label, (sourceMap.get(t.label) ?? 0) + t.montant);
  }
  const sinkMap = new Map<string, number>();
  for (const t of transactions.filter((t) => t.direction === "depense")) {
    sinkMap.set(t.categorie, (sinkMap.get(t.categorie) ?? 0) + t.montant);
  }
  const totalRevenus = [...sourceMap.values()].reduce((s, v) => s + v, 0);
  const totalDepenses = [...sinkMap.values()].reduce((s, v) => s + v, 0);
  return {
    sources: [...sourceMap.entries()].map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5),
    sinks: [...sinkMap.entries()].map(([categorie, amount]) => ({ categorie, amount })).sort((a, b) => b.amount - a.amount).slice(0, 6),
    totalRevenus,
    totalDepenses,
  };
}

export interface Insight {
  id: string;
  type: "positive" | "negative" | "neutral" | "alert";
  icon: "trending-up" | "trending-down" | "star" | "alert" | "info" | "calendar";
  title: string;
  detail: string;
}

export function computeInsights(transactions: Transaction[]): Insight[] {
  const fmtE = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const insights: Insight[] = [];
  if (transactions.length === 0) return insights;

  const depenses = transactions.filter((t) => t.direction === "depense");
  const revenus = transactions.filter((t) => t.direction === "revenu");
  const tendance = getTendanceFull(transactions);

  // 1. Tendance dépenses M vs M-1
  if (tendance.length >= 2) {
    const last = tendance[tendance.length - 1];
    const prev = tendance[tendance.length - 2];
    if (prev.depenses > 0) {
      const delta = ((last.depenses - prev.depenses) / prev.depenses) * 100;
      if (Math.abs(delta) > 5) {
        insights.push({
          id: "dep-trend",
          type: delta > 0 ? "negative" : "positive",
          icon: delta > 0 ? "trending-up" : "trending-down",
          title: `Dépenses ${delta > 0 ? "en hausse" : "en baisse"} de ${Math.abs(delta).toFixed(0)}%`,
          detail: `${last.moisLabel} : ${fmtE(last.depenses)} vs ${fmtE(prev.depenses)} le mois précédent.`,
        });
      }
    }
  }

  // 2. Meilleur mois d'épargne
  if (tendance.length > 0) {
    const best = [...tendance].sort((a, b) => b.net - a.net)[0];
    if (best.net > 0) {
      insights.push({
        id: "best-month",
        type: "positive",
        icon: "star",
        title: `Meilleur mois : ${best.moisLabel}`,
        detail: `Épargne nette de ${fmtE(best.net)} — votre meilleure performance sur la période.`,
      });
    }
  }

  // 3. Weekend spending
  const dowStats = getDayOfWeekStats(transactions);
  const weekendAvg = ((dowStats.find((d) => d.day === 0)?.total ?? 0) + (dowStats.find((d) => d.day === 6)?.total ?? 0)) / 2;
  const weekdayAvg = dowStats.filter((d) => d.day >= 1 && d.day <= 5).reduce((s, d) => s + d.total, 0) / 5;
  if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.4) {
    insights.push({
      id: "weekend",
      type: "negative",
      icon: "calendar",
      title: `Dépenses weekend ${Math.round(weekendAvg / weekdayAvg)}× plus élevées`,
      detail: "Vos fins de semaine concentrent une part disproportionnée des dépenses.",
    });
  }

  // 4. Fin de mois peak
  const phases = getPhaseStats(transactions);
  const fin = phases[2];
  if (fin.pct > 38) {
    insights.push({
      id: "fin-mois",
      type: "alert",
      icon: "alert",
      title: `${fin.pct.toFixed(0)}% des dépenses concentrées après le 20`,
      detail: "Risque de tension de trésorerie en fin de mois avant l'arrivée du salaire.",
    });
  }

  // 5. Abonnements %
  const aboTotal = depenses.filter((t) => t.categorie === "abonnements").reduce((s, t) => s + t.montant, 0);
  const totalDep = depenses.reduce((s, t) => s + t.montant, 0);
  if (totalDep > 0 && (aboTotal / totalDep) * 100 > 5) {
    const pct = ((aboTotal / totalDep) * 100).toFixed(1);
    insights.push({
      id: "abonnements",
      type: "neutral",
      icon: "info",
      title: `${pct}% de vos dépenses en abonnements`,
      detail: `${fmtE(aboTotal)} cumulés — vérifiez les services peu utilisés.`,
    });
  }

  // 6. Anomalies
  const anomalies = detectAnomalies(transactions, 99);
  if (anomalies.length > 0) {
    const worst = anomalies[0];
    insights.push({
      id: "anomalies",
      type: "alert",
      icon: "alert",
      title: `${anomalies.length} transaction${anomalies.length > 1 ? "s" : ""} inhabituelle${anomalies.length > 1 ? "s" : ""}`,
      detail: `La plus forte : ${worst.transaction.label} à ${fmtE(worst.transaction.montant)} (×${worst.ratio.toFixed(1)} la moyenne).`,
    });
  }

  // 7. Revenue stability bonus insight
  if (revenus.length >= 2) {
    const byMonth = new Map<string, number>();
    for (const t of revenus) {
      const k = t.date.slice(0, 7);
      byMonth.set(k, (byMonth.get(k) ?? 0) + t.montant);
    }
    const vals = [...byMonth.values()];
    if (vals.length >= 2) {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      const cv = avg > 0 ? Math.sqrt(vals.reduce((s, v) => s + (v - avg) ** 2, 0) / vals.length) / avg : 1;
      if (cv < 0.08) {
        insights.push({
          id: "rev-stable",
          type: "positive",
          icon: "trending-up",
          title: "Revenus très réguliers",
          detail: `Variabilité de ${(cv * 100).toFixed(1)}% — vos revenus sont stables et prévisibles.`,
        });
      }
    }
  }

  return insights.slice(0, 6);
}

export function getCashflowMensuelMoyen(transactions: Transaction[]): number {
  const t = getTendanceFull(transactions);
  if (t.length === 0) return 0;
  return t.reduce((s, m) => s + m.net, 0) / t.length;
}

// ── Burn rate glissant ────────────────────────────────────────

export interface BurnRateResult {
  burnRate: number;  // dépenses moyennes par mois (€)
  moisCount: number; // nombre de mois complets utilisés
}

/**
 * Average monthly spend from completed past months (current month excluded).
 * Returns null if fewer than 1 complete month of data is available.
 */
export function getBurnRateGlissant(
  transactions: Transaction[],
  mois = 3
): BurnRateResult | null {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const byMonth = new Map<string, number>();
  for (const t of transactions) {
    if (t.direction !== "depense") continue;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key === currentKey) continue;
    byMonth.set(key, (byMonth.get(key) ?? 0) + t.montant);
  }

  if (byMonth.size === 0) return null;

  const sorted = [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, mois);

  const total = sorted.reduce((s, [, v]) => s + v, 0);
  return { burnRate: total / sorted.length, moisCount: sorted.length };
}
