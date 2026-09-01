import { describe, it, expect } from "vitest";
import { getRythme, computeEnveloppeMetrics, buildVariableDailySpend } from "@/lib/budget";
import type { BudgetEnvelope, BudgetMois } from "@/store/budget";
import type { Transaction } from "@/store/transactions";

function makeEnvelope(overrides: Partial<BudgetEnvelope> = {}): BudgetEnvelope {
  return { id: "env-1", label: "Alimentation", categorie: "alimentation", montantPrevu: 400, ...overrides };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx-${Math.random()}`,
    date: "2026-08-10T12:00:00.000Z",
    label: "Courses",
    montant: 50,
    direction: "depense",
    categorie: "alimentation",
    importedAt: "2026-08-10T12:00:00.000Z",
    ...overrides,
  };
}

describe("getRythme", () => {
  it("is sain before 5% of the month has elapsed, regardless of pace", () => {
    expect(getRythme(200, 4, 5000, 400)).toBe("sain");
  });

  it("is sain when consuming at or below the elapsed-time pace", () => {
    expect(getRythme(50, 50, 100, 400)).toBe("sain"); // 50% consumed at 50% elapsed
  });

  it("is attention above 110% of pace", () => {
    expect(getRythme(60, 50, 120, 400)).toBe("attention"); // 60% consumed at 50% elapsed
  });

  it("is critique above 135% of pace or once the full-month projection exceeds the budget", () => {
    expect(getRythme(70, 50, 140, 400)).toBe("critique"); // pace-based
    expect(getRythme(50, 50, 450, 400)).toBe("critique"); // projection already over montantPrevu
  });
});

describe("computeEnveloppeMetrics", () => {
  it("computes spend, remaining, and pace for the current month", () => {
    const envelope = makeEnvelope({ montantPrevu: 400 });
    const transactions = [makeTx({ montant: 100 }), makeTx({ montant: 50 })];
    const today = new Date(2026, 7, 16); // day 16 of 31 -> ~51.6% elapsed
    const m = computeEnveloppeMetrics(envelope, transactions, 2026, 7, today);
    expect(m.montantDepense).toBe(150);
    expect(m.montantRestant).toBe(250);
    expect(m.pctConsomme).toBeCloseTo(37.5);
  });

  it("ignores transactions excluded from analytics or outside the month", () => {
    const envelope = makeEnvelope({ montantPrevu: 400 });
    const transactions = [
      makeTx({ montant: 100, excludedFromAnalytics: true }),
      makeTx({ montant: 999, date: "2026-07-10T12:00:00.000Z" }),
      makeTx({ montant: 50 }),
    ];
    const m = computeEnveloppeMetrics(envelope, transactions, 2026, 7, new Date(2026, 7, 16));
    expect(m.montantDepense).toBe(50);
  });

  it("goes negative on montantRestant once overspent — it does not clamp to zero", () => {
    const envelope = makeEnvelope({ montantPrevu: 400 });
    const transactions = [makeTx({ montant: 500 })];
    const m = computeEnveloppeMetrics(envelope, transactions, 2026, 7, new Date(2026, 7, 16));
    expect(m.montantRestant).toBe(-100);
  });
});

describe("buildVariableDailySpend", () => {
  const budgetMois: BudgetMois[] = [
    { id: "2026-07", year: 2026, month: 7, envelopes: [makeEnvelope({ montantPrevu: 400 })] },
  ];

  it("spreads the remaining budget evenly over the days left in the current month", () => {
    const today = new Date(2026, 7, 21); // 11 days left (21..31)
    const transactions = [makeTx({ montant: 100 })]; // 300 remaining
    const daily = buildVariableDailySpend(budgetMois, transactions, today, 11, today);
    const total = daily.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(300);
    expect(daily[0]).toBeCloseTo(300 / 11);
  });

  it("keeps pulling the projection down when an envelope is already over budget, instead of flooring to zero", () => {
    // Day 20 of 31 (~64.5% elapsed), already spent 500 on a 400 budget.
    const today = new Date(2026, 7, 20);
    const transactions = [makeTx({ montant: 500, date: "2026-08-18T12:00:00.000Z" })];
    const daily = buildVariableDailySpend(budgetMois, transactions, today, 11, today);
    const total = daily.reduce((s, v) => s + v, 0);
    // Naive floor(0, prevu - depense) would give 0 here — real life doesn't
    // stop overspending exactly at the ceiling, so this must stay positive.
    expect(total).toBeGreaterThan(0);
  });

  it("spreads a future month's full envelope total evenly across the whole month", () => {
    const today = new Date(2026, 7, 5); // August 5th — looking ahead to Sept
    const sept: BudgetMois[] = [
      { id: "2026-08", year: 2026, month: 8, envelopes: [makeEnvelope({ montantPrevu: 300 })] },
    ];
    const daily = buildVariableDailySpend(sept, [], new Date(2026, 8, 1), 30, today);
    const total = daily.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(300);
    expect(daily[0]).toBeCloseTo(300 / 30);
  });

  it("returns all zeros when no budget is set for the touched months", () => {
    const daily = buildVariableDailySpend([], [], new Date(2026, 7, 1), 10, new Date(2026, 7, 1));
    expect(daily.every((v) => v === 0)).toBe(true);
  });
});
