import type { Transaction } from "@/store/transactions";
import type { Compte } from "@/store/comptes";

export interface TransferPair {
  outId: string;
  inId: string;
  amount: number;
  daysDiff: number;
  suggestedFlowType: "transfer" | "credit_payment";
  outLabel: string;
  inLabel: string;
  outDate: string;
  inDate: string;
  outCompteId: string | undefined;
  inCompteId: string | undefined;
}

const CREDIT_RE = /amex|american express|mastercard|visa carte|carte cr[eé]dit|prelevement europ[eé]en.*(?:amex|express)/i;

function daysDiff(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86_400_000);
}
function withinTol(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1, a * 0.02);
}
function differentAccounts(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return true; // no compteId — can't confirm same account, allow match
  return a !== b;
}

export function detectTransferPairs(
  transactions: Transaction[],
  comptes: Compte[]
): TransferPair[] {
  const creditIds = new Set(comptes.filter((c) => c.type === "credit").map((c) => c.id));

  // Eligible: no flowType set yet, not already excluded
  const eligible = transactions.filter((t) => !t.flowType && !t.excludedFromAnalytics);

  const outs    = eligible.filter((t) => t.direction === "depense");
  const ins     = eligible.filter((t) => t.direction === "revenu");

  const usedIds = new Set<string>();
  const pairs: TransferPair[] = [];

  // ── Pass 1: depense ↔ revenu (standard transfer / credit settlement) ────
  for (const out of outs) {
    if (usedIds.has(out.id)) continue;

    const candidates = ins
      .filter((inp) => {
        if (usedIds.has(inp.id)) return false;
        if (!differentAccounts(out.compteId, inp.compteId)) return false;
        if (!withinTol(out.montant, inp.montant)) return false;
        if (daysDiff(out.date, inp.date) > 3) return false;
        return true;
      })
      .sort((a, b) => daysDiff(out.date, a.date) - daysDiff(out.date, b.date));

    if (!candidates.length) continue;
    const best = candidates[0];
    usedIds.add(out.id);
    usedIds.add(best.id);

    const isCreditPayment =
      (out.compteId && creditIds.has(out.compteId)) ||
      (best.compteId && creditIds.has(best.compteId)) ||
      CREDIT_RE.test(out.label + " " + best.label);

    pairs.push({
      outId: out.id,
      inId: best.id,
      amount: out.montant,
      daysDiff: Math.round(daysDiff(out.date, best.date)),
      suggestedFlowType: isCreditPayment ? "credit_payment" : "transfer",
      outLabel: out.label,
      inLabel: best.label,
      outDate: out.date,
      inDate: best.date,
      outCompteId: out.compteId,
      inCompteId: best.compteId,
    });
  }

  // ── Pass 2: depense ↔ depense — AmEx-style where payment shows as debit on both sides ─
  // Requires: at least one label has credit keyword OR one compteId is a credit account
  const remainingOuts = outs.filter((t) => !usedIds.has(t.id));

  for (const t1 of remainingOuts) {
    if (usedIds.has(t1.id)) continue;
    const hasCreditKeyword1 = CREDIT_RE.test(t1.label) || (t1.compteId && creditIds.has(t1.compteId));

    const candidates = remainingOuts
      .filter((t2) => {
        if (t2.id === t1.id || usedIds.has(t2.id)) return false;
        if (!differentAccounts(t1.compteId, t2.compteId)) return false;
        if (!withinTol(t1.montant, t2.montant)) return false;
        if (daysDiff(t1.date, t2.date) > 3) return false;
        const hasCreditKeyword2 = CREDIT_RE.test(t2.label) || (t2.compteId && creditIds.has(t2.compteId));
        return hasCreditKeyword1 || hasCreditKeyword2;
      })
      .sort((a, b) => daysDiff(t1.date, a.date) - daysDiff(t1.date, b.date));

    if (!candidates.length) continue;
    const t2 = candidates[0];
    usedIds.add(t1.id);
    usedIds.add(t2.id);

    // "out" = the one from the non-credit account (main bank), or the one with the credit keyword in label
    const t1IsMain = !creditIds.has(t1.compteId ?? "") && CREDIT_RE.test(t2.label);
    const [out, inn] = t1IsMain ? [t1, t2] : [t2, t1];

    pairs.push({
      outId: out.id,
      inId: inn.id,
      amount: out.montant,
      daysDiff: Math.round(daysDiff(out.date, inn.date)),
      suggestedFlowType: "credit_payment",
      outLabel: out.label,
      inLabel: inn.label,
      outDate: out.date,
      inDate: inn.date,
      outCompteId: out.compteId,
      inCompteId: inn.compteId,
    });
  }

  return pairs;
}
