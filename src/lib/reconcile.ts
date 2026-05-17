import type { BaseItem } from "@/store/baseFinanciere";

function normalize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9àâäéèêëîïôùûü]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(normalize(a));
  const wb = new Set(normalize(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) { if (wb.has(w)) shared++; }
  return shared / Math.max(wa.size, wb.size);
}

export interface ReconcileMatch {
  item: BaseItem;
  score: number;
  amountDiff: number;
}

export function findMatch(
  transaction: { label: string; montant: number; direction: "revenu" | "depense" },
  items: BaseItem[],
  amountTol = 5
): ReconcileMatch | null {
  let best: ReconcileMatch | null = null;

  for (const item of items) {
    if (item.archived || item.direction !== transaction.direction) continue;

    const labelScore = wordOverlap(transaction.label, item.label);
    const amountDiff = Math.abs(transaction.montant - item.montant);
    const amountScore = amountDiff <= amountTol ? 1 - amountDiff / (amountTol + 1) : 0;
    const score = labelScore * 0.65 + amountScore * 0.35;

    if (score > 0.28 && (!best || score > best.score)) {
      best = { item, score, amountDiff };
    }
  }

  return best;
}
