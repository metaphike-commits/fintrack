export interface TensionResult {
  score: number; // 0–100
  level: "faible" | "modéré" | "élevé" | "critique";
  label: string;
  color: string;
}

/**
 * Composite tension indicator (0 = relaxed, 100 = critical).
 * Three components:
 *   • Runway      0–40 pts — how many days of cash remain
 *   • Point bas   0–30 pts — how close the floor gets to the comfort zone
 *   • Monthly net 0–30 pts — whether the balance is structurally declining
 */
export function computeTensionScore(
  runwayDays: number | null,
  pointBas: number | null,
  confortThreshold: number,
  monthlyNet: number
): TensionResult {
  // ── Runway component (0–40) ──────────────────────────────────
  let runwayScore = 0;
  if (runwayDays !== null) {
    if (runwayDays <= 0) runwayScore = 40;
    else if (runwayDays < 30) runwayScore = Math.round(30 + (1 - runwayDays / 30) * 10);
    else if (runwayDays < 60) runwayScore = Math.round(15 + (1 - (runwayDays - 30) / 30) * 15);
    else if (runwayDays < 90) runwayScore = Math.round((1 - (runwayDays - 60) / 30) * 15);
    // > 90 days: score 0
  }

  // ── Point bas component (0–30) ───────────────────────────────
  let pointBasScore = 0;
  if (pointBas !== null) {
    if (pointBas <= 0) {
      pointBasScore = 30;
    } else if (pointBas < confortThreshold) {
      pointBasScore = Math.round(30 * (1 - pointBas / confortThreshold));
    }
  }

  // ── Monthly net component (0–30) ─────────────────────────────
  let netScore = 0;
  if (monthlyNet < -1000) netScore = 30;
  else if (monthlyNet < -500) netScore = 20;
  else if (monthlyNet < -200) netScore = 15;
  else if (monthlyNet < 0) netScore = 10;

  const score = Math.min(100, Math.max(0, runwayScore + pointBasScore + netScore));

  if (score >= 75) return { score, level: "critique", label: "Critique", color: "var(--critique)" };
  if (score >= 50) return { score, level: "élevé", label: "Élevé", color: "#f97316" };
  if (score >= 25) return { score, level: "modéré", label: "Modéré", color: "var(--attention)" };
  return { score, level: "faible", label: "Faible", color: "var(--calm)" };
}

/**
 * Runway delta in days per month.
 * Positive → gaining runway, negative → burning runway.
 */
export function computeMomentum(monthlyNet: number, totalDepenses: number): number | null {
  if (totalDepenses <= 0) return null;
  return Math.round(monthlyNet / (totalDepenses / 30));
}

// ── Score de fragilité V6.4 ─────────────────────────────────────────────────

export interface FragiliteResult {
  score: number; // 0–100
  level: "faible" | "modéré" | "élevé" | "critique";
  label: string;
  color: string;
  details: {
    runway: number;    // 0–40
    pointBas: number;  // 0–25
    netMensuel: number; // 0–20
    decouvert: number; // 0–10
    arrieres: number;  // 0–5
  };
}

/**
 * Composite fragility score (0 = sain, 100 = critique).
 * Five components: runway (40) + point bas (25) + net mensuel (20)
 *   + taux d'utilisation découvert (10) + poids des arriérés/revenu (5).
 */
export function computeFragiliteScore(
  runwayDays: number | null,
  pointBas: number | null,
  confortThreshold: number,
  monthlyNet: number,
  totalEngagements: number,
  totalRevenus: number,
  decouvertUtilise = 0,
  decouvertAutorise = 0
): FragiliteResult {
  // Runway (0–40)
  let runwayScore = 0;
  if (runwayDays !== null) {
    if (runwayDays <= 0) runwayScore = 40;
    else if (runwayDays < 30) runwayScore = Math.round(30 + (1 - runwayDays / 30) * 10);
    else if (runwayDays < 60) runwayScore = Math.round(15 + (1 - (runwayDays - 30) / 30) * 15);
    else if (runwayDays < 90) runwayScore = Math.round((1 - (runwayDays - 60) / 30) * 15);
  }

  // Point bas (0–25)
  let pointBasScore = 0;
  if (pointBas !== null) {
    if (pointBas <= 0) pointBasScore = 25;
    else if (pointBas < confortThreshold)
      pointBasScore = Math.round(25 * (1 - pointBas / confortThreshold));
  }

  // Net mensuel (0–20)
  let netScore = 0;
  if (monthlyNet < -1000) netScore = 20;
  else if (monthlyNet < -500) netScore = 15;
  else if (monthlyNet < -200) netScore = 10;
  else if (monthlyNet < 0) netScore = 7;

  // Découvert utilisé / autorisé (0–10)
  let decouvertScore = 0;
  if (decouvertAutorise > 0) {
    const ratio = decouvertUtilise / decouvertAutorise;
    if (ratio >= 1) decouvertScore = 10;
    else if (ratio >= 0.75) decouvertScore = 8;
    else if (ratio >= 0.5) decouvertScore = 5;
    else if (ratio >= 0.25) decouvertScore = 2;
  }

  // Arriérés / revenu mensuel (0–5)
  let arrieresScore = 0;
  if (totalRevenus > 0 && totalEngagements > 0) {
    const ratio = totalEngagements / totalRevenus;
    if (ratio >= 3) arrieresScore = 5;
    else if (ratio >= 2) arrieresScore = 4;
    else if (ratio >= 1) arrieresScore = 3;
    else if (ratio >= 0.5) arrieresScore = 2;
    else arrieresScore = 1;
  }

  const score = Math.min(100, Math.max(0, runwayScore + pointBasScore + netScore + decouvertScore + arrieresScore));
  const details = {
    runway: runwayScore,
    pointBas: pointBasScore,
    netMensuel: netScore,
    decouvert: decouvertScore,
    arrieres: arrieresScore,
  };

  if (score >= 75) return { score, level: "critique", label: "Critique", color: "var(--critique)", details };
  if (score >= 50) return { score, level: "élevé", label: "Élevé", color: "#f97316", details };
  if (score >= 25) return { score, level: "modéré", label: "Modéré", color: "var(--attention)", details };
  return { score, level: "faible", label: "Faible", color: "var(--calm)", details };
}

/** 0–100 gauge value for a runway expressed in days (180 j = full gauge). */
export function runwayToGaugeValue(jours: number | null): number {
  if (jours === null) return 100;
  return Math.min(100, Math.max(0, (jours / 180) * 100));
}

export function runwayColor(jours: number | null): string {
  if (jours === null) return "var(--calm)";
  if (jours > 90) return "var(--calm)";
  if (jours > 60) return "var(--attention)";
  if (jours > 30) return "#f97316";
  return "var(--critique)";
}
