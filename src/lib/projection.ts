import type { BaseItem } from "@/store/baseFinanciere";
import type { ScenarioItem } from "@/store/scenarios";
import { parseLocalDate, resolveBillingDay } from "@/lib/dateUtils";

export interface DayProjection {
  date: Date;
  solde: number;
  events: { label: string; montant: number; direction: "revenu" | "depense" }[];
}

function getItemOccurrences(item: BaseItem, startDate: Date, days: number): number[] {
  const result: number[] = [];
  const sd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  for (let i = 0; i < days; i++) {
    const d = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate() + i);
    const dayOfMonth = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();

    if (item.dateFin && d > parseLocalDate(item.dateFin)) continue;
    if (item.dateDebut && item.frequence !== "ponctuel" && d < parseLocalDate(item.dateDebut)) continue;

    switch (item.frequence) {
      case "mensuel":
        if (dayOfMonth === resolveBillingDay(item.billingDay, item.dateDebut)) result.push(i);
        break;

      case "hebdomadaire": {
        const refDow = item.dateDebut ? parseLocalDate(item.dateDebut).getDay() : 1;
        if (d.getDay() === refDow) result.push(i);
        break;
      }

      case "trimestriel": {
        const dd = item.dateDebut ? parseLocalDate(item.dateDebut) : null;
        const refMonth = dd ? dd.getMonth() : 0;
        const refDay = resolveBillingDay(item.billingDay, item.dateDebut);
        const diff = (year - (dd?.getFullYear() ?? year)) * 12 + (month - refMonth);
        if (diff >= 0 && diff % 3 === 0 && dayOfMonth === refDay) result.push(i);
        break;
      }

      case "annuel": {
        const dd = item.dateDebut ? parseLocalDate(item.dateDebut) : null;
        const refMonth = dd ? dd.getMonth() : 0;
        const refDay = resolveBillingDay(item.billingDay, item.dateDebut);
        if (month === refMonth && dayOfMonth === refDay) result.push(i);
        break;
      }

      case "ponctuel": {
        if (item.dateDebut) {
          const dd = parseLocalDate(item.dateDebut);
          if (dd.getFullYear() === year && dd.getMonth() === month && dd.getDate() === dayOfMonth)
            result.push(i);
        }
        break;
      }
    }
  }
  return result;
}

export function projectDailyBalance(
  soldeInitial: number,
  items: BaseItem[],
  days = 30,
  startDate = new Date(),
  statuts: Record<string, string> = {},
  paid: Record<string, boolean> = {},
  /** Optional day-by-day estimated variable spend (Budget envelopes), same
   *  length as `days` — see `buildVariableDailySpend`. Opt-in, additive. */
  dailyVariable?: number[]
): DayProjection[] {
  const dailyEvents: DayProjection["events"][] = Array.from({ length: days }, () => []);
  const sd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  for (const item of items.filter((i) => !i.archived)) {
    for (const dayIdx of getItemOccurrences(item, startDate, days)) {
      const occDate = new Date(sd.getFullYear(), sd.getMonth(), sd.getDate() + dayIdx);
      const key = `${item.id}-${occDate.getFullYear()}-${occDate.getMonth()}`;
      const st = statuts[key] ?? (paid[key] ? "paye" : "prevu");
      if (st === "paye" || st === "annule") continue;
      dailyEvents[dayIdx].push({ label: item.label, montant: item.montant, direction: item.direction });
    }
  }

  if (dailyVariable) {
    for (let i = 0; i < days && i < dailyVariable.length; i++) {
      if (dailyVariable[i] > 0) {
        dailyEvents[i].push({ label: "Dépenses variables (estimation)", montant: dailyVariable[i], direction: "depense" });
      }
    }
  }

  const result: DayProjection[] = [];
  let running = soldeInitial;

  for (let i = 0; i < days; i++) {
    for (const ev of dailyEvents[i]) {
      running += ev.direction === "revenu" ? ev.montant : -ev.montant;
    }
    result.push({
      date: new Date(sd.getFullYear(), sd.getMonth(), sd.getDate() + i),
      solde: Math.round(running),
      events: dailyEvents[i],
    });
  }
  return result;
}

export function getPointBas(
  projections: DayProjection[]
): { solde: number; date: Date; dayIndex: number } | null {
  if (projections.length === 0) return null;
  let minIdx = 0;
  for (let i = 1; i < projections.length; i++) {
    if (projections[i].solde < projections[minIdx].solde) minIdx = i;
  }
  return { solde: projections[minIdx].solde, date: projections[minIdx].date, dayIndex: minIdx };
}

export function getProchainPaiement(
  projections: DayProjection[],
  horizonDays = 7
): { label: string; montant: number; date: Date; dayIndex: number } | null {
  let best: { label: string; montant: number; date: Date; dayIndex: number } | null = null;
  for (let i = 0; i < Math.min(horizonDays, projections.length); i++) {
    for (const ev of projections[i].events) {
      if (ev.direction === "depense" && (best === null || ev.montant > best.montant)) {
        best = { label: ev.label, montant: ev.montant, date: projections[i].date, dayIndex: i };
      }
    }
  }
  return best;
}

export function toMensuel(item: { montant: number; frequence: string }): number {
  switch (item.frequence) {
    case "hebdomadaire": return item.montant * 52 / 12;
    case "trimestriel": return item.montant / 3;
    case "annuel": return item.montant / 12;
    case "ponctuel": return 0;
    default: return item.montant;
  }
}

export function computeBaseNet(baseItems: BaseItem[], refDate?: Date): number {
  const ref = refDate ?? new Date();
  return baseItems
    .filter((i) => {
      if (i.archived) return false;
      if (i.dateFin   && parseLocalDate(i.dateFin)   < ref) return false;
      if (i.dateDebut && parseLocalDate(i.dateDebut) > ref) return false;
      return true;
    })
    .reduce((s, i) => s + (i.direction === "revenu" ? 1 : -1) * toMensuel(i), 0);
}

export function computeScenarioNet(
  baseItems: BaseItem[],
  scenarioItems: ScenarioItem[],
  refDate?: Date
): number {
  return (
    computeBaseNet(baseItems, refDate) +
    scenarioItems.reduce(
      (s, i) => s + (i.direction === "revenu" ? 1 : -1) * toMensuel(i),
      0
    )
  );
}

export function projectBalance(
  soldeCourant: number,
  monthlyNet: number,
  months = 12
): number[] {
  return Array.from({ length: months }, (_, i) =>
    Math.round(soldeCourant + monthlyNet * (i + 1))
  );
}

export function getMonthLabels(count = 12): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    return d.toLocaleDateString("fr-FR", { month: "short" });
  });
}

export function runwayDays(soldeCourant: number, monthlyNet: number): number | null {
  if (monthlyNet >= 0) return null;
  return Math.floor((soldeCourant / Math.abs(monthlyNet)) * 30);
}
