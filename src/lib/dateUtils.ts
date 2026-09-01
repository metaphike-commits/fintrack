export function parseLocalDate(isoString: string): Date {
  const [y, m, d] = isoString.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Resolves the effective day-of-month for a recurring item: an explicit
 * billingDay always wins, otherwise falls back to the day of dateDebut,
 * otherwise defaults to the 1st. Keeps mensuel/trimestriel/annuel items
 * aligned on the date the user actually entered.
 */
export function resolveBillingDay(billingDay?: number, dateDebut?: string): number {
  if (billingDay != null) return billingDay;
  if (dateDebut) return parseLocalDate(dateDebut).getDate();
  return 1;
}
