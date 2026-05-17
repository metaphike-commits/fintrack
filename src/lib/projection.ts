import type { BaseItem } from "@/store/baseFinanciere";
import type { ScenarioItem } from "@/store/scenarios";

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

    if (item.dateFin && d > new Date(item.dateFin)) continue;
    if (item.dateDebut && item.frequence !== "ponctuel" && d < new Date(item.dateDebut)) continue;

    switch (item.frequence) {
      case "mensuel":
        if (dayOfMonth === (item.billingDay ?? 1)) result.push(i);
        break;

      case "hebdomadaire": {
        const refDow = item.dateDebut ? new Date(item.dateDebut).getDay() : 1;
        if (d.getDay() === refDow) result.push(i);
        break;
      }

      case "trimestriel": {
        const dd = item.dateDebut ? new Date(item.dateDebut) : null;
        const refMonth = dd ? dd.getMonth() : 0;
        const refDay = item.billingDay ?? (dd ? dd.getDate() : 1);
        const diff = (year - (dd?.getFullYear() ?? year)) * 12 + (month - refMonth);
        if (diff >= 0 && diff % 3 === 0 && dayOfMonth === refDay) result.push(i);
        break;
      }

      case "annuel": {
        const dd = item.dateDebut ? new Date(item.dateDebut) : null;
        const refMonth = dd ? dd.getMonth() : 0;
        const refDay = item.billingDay ?? (dd ? dd.getDate() : 1);
        if (month === refMonth && dayOfMonth === refDay) result.push(i);
        break;
      }

      case "ponctuel": {
        if (item.dateDebut) {
          const dd = new Date(item.dateDebut);
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
  startDate = new Date()
): DayProjection[] {
  const dailyEvents: DayProjection["events"][] = Array.from({ length: days }, () => []);

  for (const item of items.filter((i) => !i.archived)) {
    for (const dayIdx of getItemOccurrences(item, startDate, days)) {
      dailyEvents[dayIdx].push({ label: item.label, montant: item.montant, direction: item.direction });
    }
  }

  const sd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
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
    default: return item.montant;
  }
}

export function computeBaseNet(baseItems: BaseItem[]): number {
  return baseItems
    .filter((i) => !i.archived)
    .reduce((s, i) => s + (i.direction === "revenu" ? 1 : -1) * toMensuel(i), 0);
}

export function computeScenarioNet(
  baseItems: BaseItem[],
  scenarioItems: ScenarioItem[]
): number {
  return (
    computeBaseNet(baseItems) +
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
