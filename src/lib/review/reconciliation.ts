import type { Transaction } from "@/store/transactions";
import type { ReconciliationData } from "./types";

export function computeReconciliation(
  transactions: Transaction[],
  year: number,
  month: number,
  reconciliationAmountTol: number
): ReconciliationData {
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalTransactions = monthTx.length;

  // Uncategorized: empty category, "autre", or "non catégorisé"
  const uncategorized = monthTx.filter(t =>
    !t.categorie || t.categorie.trim() === "" ||
    t.categorie.toLowerCase() === "autre" ||
    t.categorie.toLowerCase() === "non catégorisé"
  ).length;

  // Probable transfers: direction:"transfert" with no confirmed linked transaction
  const probableTransfers = monthTx.filter(t =>
    t.direction === "transfert" && !t.linkedTransactionId
  ).length;

  // Potential duplicates: same montant (± tol), same day (± 1), different id
  let potentialDuplicates = 0;
  for (let i = 0; i < monthTx.length; i++) {
    for (let j = i + 1; j < monthTx.length; j++) {
      const a = monthTx[i];
      const b = monthTx[j];
      if (Math.abs(a.montant - b.montant) <= reconciliationAmountTol) {
        const diff = Math.abs(
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        if (diff <= 86_400_000) potentialDuplicates++;
      }
    }
  }

  const reconciledCount = monthTx.filter(t => !!t.reconciledItemId).length;
  // null (not 100) when there's nothing to reconcile — a month with zero
  // imported transactions is missing data, not "perfectly reconciled".
  const reconciliationRate = totalTransactions > 0
    ? Math.round((reconciledCount / totalTransactions) * 100)
    : null;

  return {
    totalTransactions,
    uncategorized,
    probableTransfers,
    potentialDuplicates,
    reconciliationRate,
  };
}
