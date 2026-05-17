import type { BaseItem, Direction, Frequence } from "@/store/baseFinanciere";

export interface TimelineRow {
  key: string;
  itemId: string;
  label: string;
  montant: number;
  direction: Direction;
  categorie: string;
  frequence: Frequence;
  billingDay?: number;
}

export function getRowsForMonth(
  items: BaseItem[],
  year: number,
  month: number
): TimelineRow[] {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  return items
    .filter((item) => {
      if (item.archived) return false;

      const dateDebut = item.dateDebut ? new Date(item.dateDebut) : null;
      const dateFin = item.dateFin ? new Date(item.dateFin) : null;

      if (dateFin && dateFin < monthStart) return false;
      if (dateDebut && dateDebut > monthEnd) return false;

      switch (item.frequence) {
        case "mensuel":
        case "hebdomadaire":
          return true;

        case "trimestriel": {
          if (!dateDebut) return true;
          const diff =
            (year - dateDebut.getFullYear()) * 12 +
            (month - dateDebut.getMonth());
          return diff >= 0 && diff % 3 === 0;
        }

        case "annuel": {
          const refMonth = dateDebut ? dateDebut.getMonth() : 0;
          return month === refMonth;
        }

        case "ponctuel": {
          if (!dateDebut) return false;
          return (
            dateDebut.getFullYear() === year && dateDebut.getMonth() === month
          );
        }
      }
    })
    .map((item) => ({
      key: `${item.id}-${year}-${month}`,
      itemId: item.id,
      label: item.label,
      montant: item.montant,
      direction: item.direction,
      categorie: item.categorie,
      frequence: item.frequence,
      billingDay: item.billingDay,
    }));
}

/**
 * Returns the sum of expense items whose billing day has passed this month
 * but are not yet marked as paid or cancelled in the timeline.
 * Subtract this from the real account balance before projecting to avoid
 * overestimating runway when bills are pending.
 */
export function getPendingOverdueAmount(
  items: BaseItem[],
  statuts: Record<string, string>,
  paid: Record<string, boolean>,
  today: Date = new Date()
): number {
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDay = today.getDate();

  const rows = getRowsForMonth(items, year, month);
  let total = 0;

  for (const row of rows) {
    if (row.direction !== "depense") continue;

    // Check if already settled
    const statut = statuts[row.key] ?? (paid[row.key] ? "paye" : "prevu");
    if (statut === "paye" || statut === "annule") continue;

    // Find the source item to check frequency/billing day
    const item = items.find((i) => i.id === row.itemId);
    if (!item) continue;

    let hasPassed = false;

    switch (item.frequence) {
      case "mensuel":
        hasPassed = (item.billingDay ?? 1) <= todayDay;
        break;

      case "ponctuel": {
        if (!item.dateDebut) break;
        const d = new Date(item.dateDebut);
        hasPassed =
          d.getFullYear() === year &&
          d.getMonth() === month &&
          d.getDate() <= todayDay;
        break;
      }

      case "trimestriel":
      case "annuel": {
        const refDay = item.billingDay ??
          (item.dateDebut ? new Date(item.dateDebut).getDate() : 1);
        hasPassed = refDay <= todayDay;
        break;
      }

      case "hebdomadaire": {
        // Check if any weekly occurrence has fired between the 1st and today
        const refDow = item.dateDebut ? new Date(item.dateDebut).getDay() : 1;
        for (let d = 1; d <= todayDay; d++) {
          if (new Date(year, month, d).getDay() === refDow) {
            hasPassed = true;
            break;
          }
        }
        break;
      }
    }

    if (hasPassed) total += row.montant;
  }

  return total;
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

export function prevMonth(
  year: number,
  month: number
): { year: number; month: number } {
  return month === 0
    ? { year: year - 1, month: 11 }
    : { year, month: month - 1 };
}

export function nextMonth(
  year: number,
  month: number
): { year: number; month: number } {
  return month === 11
    ? { year: year + 1, month: 0 }
    : { year, month: month + 1 };
}
