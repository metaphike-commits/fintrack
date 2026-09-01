import type { Transaction } from "@/store/transactions";
import type { BudgetMois } from "@/store/budget";
import type { CategoryHighlight, EnveloppeAlert, HighlightsData } from "./types";

export function computeHighlights(
  transactions: Transaction[],
  budgetMois: BudgetMois | null,
  year: number,
  month: number
): HighlightsData {
  const prevYear  = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  const inMonth = (t: Transaction, y: number, m: number) => {
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m && !t.excludedFromAnalytics;
  };

  const monthTx = transactions.filter(t => inMonth(t, year, month));
  const prevTx  = transactions.filter(t => inMonth(t, prevYear, prevMonth));

  // Totals
  const totalDepenses = monthTx
    .filter(t => t.direction === "depense")
    .reduce((s, t) => s + t.montant, 0);
  const totalRevenus = monthTx
    .filter(t => t.direction === "revenu")
    .reduce((s, t) => s + t.montant, 0);

  // Top categories
  const catMap  = new Map<string, number>();
  const prevMap = new Map<string, number>();

  for (const t of monthTx.filter(t => t.direction === "depense")) {
    catMap.set(t.categorie, (catMap.get(t.categorie) ?? 0) + t.montant);
  }
  for (const t of prevTx.filter(t => t.direction === "depense")) {
    prevMap.set(t.categorie, (prevMap.get(t.categorie) ?? 0) + t.montant);
  }

  const topCategories: CategoryHighlight[] = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categorie, montant]) => {
      const prev = prevMap.get(categorie);
      const variationPct = prev ? Math.round(((montant - prev) / prev) * 100) : null;
      return { categorie, montant: Math.round(montant), variationPct };
    });

  // Envelope alerts from budget
  const depassements: EnveloppeAlert[] = [];
  const sousConsommation: EnveloppeAlert[] = [];

  if (budgetMois) {
    for (const env of budgetMois.envelopes) {
      const cats = [env.categorie, ...(env.categoriesAlias ?? [])].map(c => c.toLowerCase().trim());
      const reel = monthTx
        .filter(t => t.direction === "depense" && cats.includes(t.categorie.toLowerCase().trim()))
        .reduce((s, t) => s + t.montant, 0);
      const delta = reel - env.montantPrevu;
      if (delta > 0) {
        depassements.push({ label: env.label, prevu: env.montantPrevu, reel: Math.round(reel), delta: Math.round(delta) });
      } else if (env.montantPrevu > 0 && delta < -env.montantPrevu * 0.2) {
        sousConsommation.push({ label: env.label, prevu: env.montantPrevu, reel: Math.round(reel), delta: Math.round(delta) });
      }
    }
  }

  // Exceptional expenses: amount > 2.5× average of all expense transactions and > 100€
  const depenseTxs = monthTx.filter(t => t.direction === "depense");
  const avg = depenseTxs.length > 0 ? totalDepenses / depenseTxs.length : 0;
  const depensesExceptionnelles = depenseTxs
    .filter(t => t.montant > Math.max(avg * 2.5, 150))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 3)
    .map(t => ({ label: t.label, montant: t.montant, date: t.date }));

  return {
    totalDepenses: Math.round(totalDepenses),
    totalRevenus: Math.round(totalRevenus),
    soldeNet: Math.round(totalRevenus - totalDepenses),
    topCategories,
    depassements,
    sousConsommation,
    depensesExceptionnelles,
  };
}
