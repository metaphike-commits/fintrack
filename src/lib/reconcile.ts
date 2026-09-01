import type { BaseItem } from "@/store/baseFinanciere";

const NOISE_RE = [
  /^cb\s+/i,
  /^facture\s+cb\s+/i,
  /^vir(?:ement)?\s+(?:sepa\s+)?/i,
  /^prélèvement\s+(?:sepa\s+)?/i,
  /^prelevement\s+(?:sepa\s+)?/i,
  /^prel(?:ev)?\s+(?:sepa\s+)?/i,
  /^achat\s+(?:cb\s+)?/i,
  /^retrait\s+(?:cb\s+)?/i,
  /^paiement\s+(?:cb\s+)?/i,
  /^rcpt\s+/i,
  /\d{2}\/\d{2}(?:\/\d{2,4})?\s*/g,
  /\*+\d+\*+/g,
];

function stripNoise(s: string): string {
  let r = s.toLowerCase();
  for (const re of NOISE_RE) r = r.replace(re, "");
  return r.trim();
}

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

function substringScore(clean_a: string, clean_b: string): number {
  if (!clean_a || !clean_b) return 0;
  if (clean_a.includes(clean_b) || clean_b.includes(clean_a)) return 1;
  const wb = normalize(clean_b);
  for (const w of wb) {
    if (w.length >= 4 && clean_a.includes(w)) return 0.7;
  }
  const wa = normalize(clean_a);
  for (const w of wa) {
    if (w.length >= 4 && clean_b.includes(w)) return 0.7;
  }
  return 0;
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
  const dynTol = Math.max(amountTol, transaction.montant * 0.03);
  const txClean = stripNoise(transaction.label);
  let best: ReconcileMatch | null = null;

  for (const item of items) {
    if (item.archived || item.direction !== transaction.direction) continue;

    const itemClean = stripNoise(item.label);
    const wScore = wordOverlap(txClean, itemClean);
    const sScore = substringScore(txClean, itemClean);
    const labelScore = Math.max(wScore, sScore);

    const amountDiff = Math.abs(transaction.montant - item.montant);
    const amountScore = amountDiff <= dynTol ? 1 - amountDiff / (dynTol + 1) : 0;
    const score = labelScore * 0.65 + amountScore * 0.35;

    if (score > 0.22 && (!best || score > best.score)) {
      best = { item, score, amountDiff };
    }
  }

  return best;
}
