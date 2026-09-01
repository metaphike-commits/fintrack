import type { Transaction } from "@/store/transactions";
import type { TensionCause, TensionCauseType, TensionData } from "./types";

export function computeTension(
  transactions: Transaction[],
  year: number,
  month: number,
  startBalance = 0,
  forcedPointBas?: { solde: number; date: string }
): TensionData {
  const monthTx = transactions
    .filter(t => {
      if (t.excludedFromAnalytics) return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (monthTx.length === 0) {
    return {
      pointBas: forcedPointBas ?? null,
      causes: [],
      narrative: forcedPointBas
        ? buildNarrative(new Date(forcedPointBas.date), [])
        : "Pas assez de données pour analyser ce mois.",
    };
  }

  // Reconstruct running balance from transactions (absolute when startBalance is provided)
  const dailyBalance = new Map<string, number>();
  let running = startBalance;
  for (const t of monthTx) {
    running += t.direction === "revenu" ? t.montant : -t.montant;
    const day = t.date.slice(0, 10);
    dailyBalance.set(day, running);
  }

  // Point bas: use forced projected value if provided (current month), else derive from transactions
  let minDate: string;
  let minSolde: number;

  if (forcedPointBas) {
    minDate  = forcedPointBas.date;
    minSolde = forcedPointBas.solde;
  } else {
    minDate  = "";
    minSolde = Infinity;
    for (const [date, solde] of dailyBalance) {
      if (solde < minSolde) { minSolde = solde; minDate = date; }
    }
  }

  if (!minDate) {
    return { pointBas: null, causes: [], narrative: "Impossible de déterminer un point bas ce mois-ci." };
  }

  const pointBasDate = new Date(minDate);

  // Look at expense transactions in the 6 days leading to and including the point bas
  const windowStart = new Date(pointBasDate);
  windowStart.setDate(windowStart.getDate() - 6);

  const windowTx = monthTx
    .filter(t => {
      const d = new Date(t.date);
      return t.direction === "depense" && d >= windowStart && d <= pointBasDate;
    })
    .sort((a, b) => b.montant - a.montant);

  const causes: TensionCause[] = [];
  const usedIds = new Set<string>();

  // 1 — Credit card reimbursements
  const creditTx = windowTx.filter(t => t.flowType === "credit_payment");
  if (creditTx.length > 0) {
    creditTx.forEach(t => usedIds.add(t.id));
    const total = creditTx.reduce((s, t) => s + t.montant, 0);
    const label = creditTx.length === 1
      ? creditTx[0].label
      : `${creditTx.length} remboursements carte`;
    causes.push({ label, montant: Math.round(total), type: "remboursement_carte" });
  }

  // 2 — Grouped charges (2+ significant expenses within a 3-day window, not already captured)
  const remaining = windowTx.filter(t => !usedIds.has(t.id) && t.montant > 120);
  const groups = groupByDateProximity(remaining, 3);
  for (const group of groups) {
    if (group.length >= 2) {
      group.forEach(t => usedIds.add(t.id));
      const total = group.reduce((s, t) => s + t.montant, 0);
      const shortLabels = group
        .slice(0, 3)
        .map(t => t.label.split(/\s+/).slice(0, 2).join(" "))
        .join(", ");
      causes.push({ label: shortLabels, montant: Math.round(total), type: "charge_groupee" });
    }
  }

  // 3 — Late variable expenses (after the 20th of the month)
  if (pointBasDate.getDate() >= 18) {
    const lateTx = windowTx.filter(t => !usedIds.has(t.id) && new Date(t.date).getDate() >= 20 && t.montant > 40);
    if (lateTx.length >= 2) {
      lateTx.forEach(t => usedIds.add(t.id));
      const total = lateTx.reduce((s, t) => s + t.montant, 0);
      causes.push({ label: "dépenses variables de fin de mois", montant: Math.round(total), type: "depense_variable_tardive" });
    }
  }

  // 4 — Single exceptional expense (not yet captured)
  const bigSingle = windowTx.find(t => !usedIds.has(t.id) && t.montant > 250);
  if (bigSingle) {
    usedIds.add(bigSingle.id);
    causes.push({ label: bigSingle.label, montant: bigSingle.montant, type: "exceptionnel" });
  }

  const topCauses = causes.sort((a, b) => b.montant - a.montant).slice(0, 3);
  const narrative = buildNarrative(pointBasDate, topCauses);

  return {
    pointBas: { solde: forcedPointBas?.solde ?? Math.round(minSolde), date: minDate },
    causes: topCauses,
    narrative,
  };
}

function groupByDateProximity(txs: Transaction[], windowDays: number): Transaction[][] {
  if (txs.length === 0) return [];
  const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
  const groups: Transaction[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date).getTime();
    const curr = new Date(sorted[i].date).getTime();
    if ((curr - prev) / 86_400_000 <= windowDays) {
      groups[groups.length - 1].push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }
  return groups;
}

function fmt(n: number) {
  return `${n.toLocaleString("fr-FR")} €`;
}

function describeCause(cause: TensionCause): string {
  switch (cause.type) {
    case "remboursement_carte":
      return `du prélèvement ${cause.label} (${fmt(cause.montant)})`;
    case "charge_groupee":
      return `de plusieurs charges regroupées — ${cause.label} — pour un total de ${fmt(cause.montant)}`;
    case "depense_variable_tardive":
      return `de ${cause.label} concentrées sur la fin du mois (${fmt(cause.montant)})`;
    case "exceptionnel":
      return `d'une dépense exceptionnelle — ${cause.label} — de ${fmt(cause.montant)}`;
    default:
      return `de ${cause.label} (${fmt(cause.montant)})`;
  }
}

function buildNarrative(pointBasDate: Date, causes: TensionCause[]): string {
  const dateStr = pointBasDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  if (causes.length === 0) {
    return `Ton point bas du ${dateStr} reflète la concentration habituelle des charges sur cette période du mois.`;
  }

  const d1 = describeCause(causes[0]);

  if (causes.length === 1) {
    return `Ton point bas du ${dateStr} vient principalement ${d1}.`;
  }

  const d2 = describeCause(causes[1]);

  if (causes.length === 2) {
    return `Ton point bas du ${dateStr} vient principalement ${d1}, combiné ${d2}.`;
  }

  const d3 = describeCause(causes[2]);
  return `Ton point bas du ${dateStr} vient principalement ${d1}, combiné ${d2} et ${d3}.`;
}
