import { describe, it, expect } from "vitest";
import {
  projectDailyBalance, getPointBas, toMensuel, computeBaseNet, runwayDays,
} from "@/lib/projection";
import { makeItem } from "./testFixtures";

describe("projectDailyBalance", () => {
  it("fires a mensuel item on its explicit billingDay", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 15, montant: 200, direction: "depense" });
    const proj = projectDailyBalance(1000, [item], 31, new Date(2026, 7, 1));
    expect(proj[13].solde).toBe(1000); // Aug 14 — not yet due
    expect(proj[14].solde).toBe(800);  // Aug 15 — billingDay hit
  });

  it("derives the billing day from dateDebut when billingDay is unset (regression: EDF bug)", () => {
    // A mensuel item with only a dateDebut used to default to day 1 and skip
    // the month entirely if day 1 had already passed — see lib/dateUtils.ts
    // resolveBillingDay(). This must fire on the 5th, not day 1 or never.
    const item = makeItem({ frequence: "mensuel", dateDebut: "2026-08-05", montant: 50, billingDay: undefined });
    const proj = projectDailyBalance(1000, [item], 31, new Date(2026, 7, 1));
    expect(proj[3].solde).toBe(1000); // Aug 4 — not due yet
    expect(proj[4].solde).toBe(950);  // Aug 5 — due
  });

  it("fires a ponctuel item exactly once, on its dateDebut", () => {
    const item = makeItem({ frequence: "ponctuel", dateDebut: "2026-08-10", montant: 300, direction: "revenu" });
    const proj = projectDailyBalance(1000, [item], 31, new Date(2026, 7, 1));
    expect(proj[8].solde).toBe(1000);  // Aug 9
    expect(proj[9].solde).toBe(1300);  // Aug 10
    expect(proj[30].solde).toBe(1300); // stays afterward, no repeat
  });

  it("excludes archived items entirely", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 5, montant: 999, archived: true });
    const proj = projectDailyBalance(1000, [item], 10, new Date(2026, 7, 1));
    expect(proj[9].solde).toBe(1000);
  });

  it("skips occurrences already marked paye/annule via statuts", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 5, montant: 200 });
    const key = `${item.id}-2026-7`; // month is 0-indexed: August = 7
    const proj = projectDailyBalance(1000, [item], 10, new Date(2026, 7, 1), { [key]: "paye" });
    expect(proj[9].solde).toBe(1000);
  });

  it("adds an optional daily variable-spend array on top of the base items", () => {
    const proj = projectDailyBalance(1000, [], 5, new Date(2026, 7, 1), {}, {}, [10, 10, 10, 10, 10]);
    expect(proj[0].solde).toBe(990);
    expect(proj[4].solde).toBe(950);
  });
});

describe("getPointBas", () => {
  it("finds the lowest balance and its day index", () => {
    const item = makeItem({ frequence: "ponctuel", dateDebut: "2026-08-05", montant: 500, direction: "depense" });
    const proj = projectDailyBalance(1000, [item], 10, new Date(2026, 7, 1));
    const pb = getPointBas(proj);
    expect(pb?.solde).toBe(500);
    expect(pb?.dayIndex).toBe(4);
  });

  it("returns null for an empty projection", () => {
    expect(getPointBas([])).toBeNull();
  });
});

describe("toMensuel", () => {
  it("converts each frequency to a monthly-equivalent amount", () => {
    expect(toMensuel({ montant: 100, frequence: "mensuel" })).toBe(100);
    expect(toMensuel({ montant: 100, frequence: "hebdomadaire" })).toBeCloseTo((100 * 52) / 12);
    expect(toMensuel({ montant: 300, frequence: "trimestriel" })).toBe(100);
    expect(toMensuel({ montant: 1200, frequence: "annuel" })).toBe(100);
    expect(toMensuel({ montant: 500, frequence: "ponctuel" })).toBe(0);
  });
});

describe("computeBaseNet", () => {
  it("sums revenus minus depenses (monthly-equivalent)", () => {
    const items = [
      makeItem({ direction: "revenu", montant: 2000, frequence: "mensuel" }),
      makeItem({ direction: "depense", montant: 800, frequence: "mensuel" }),
    ];
    expect(computeBaseNet(items)).toBe(1200);
  });

  it("excludes items outside the reference date's dateDebut/dateFin range", () => {
    const items = [
      makeItem({ direction: "revenu", montant: 2000, frequence: "mensuel" }),
      makeItem({ direction: "depense", montant: 800, frequence: "mensuel" }),
      makeItem({ direction: "depense", montant: 500, frequence: "mensuel", dateDebut: "2099-01-01" }),
    ];
    expect(computeBaseNet(items, new Date(2026, 0, 1))).toBe(1200);
  });

  it("excludes archived items", () => {
    const items = [
      makeItem({ direction: "revenu", montant: 2000, frequence: "mensuel" }),
      makeItem({ direction: "depense", montant: 9999, frequence: "mensuel", archived: true }),
    ];
    expect(computeBaseNet(items)).toBe(2000);
  });
});

describe("runwayDays", () => {
  it("returns null when monthlyNet is non-negative", () => {
    expect(runwayDays(1000, 500)).toBeNull();
    expect(runwayDays(1000, 0)).toBeNull();
  });

  it("computes floor(solde/|net| * 30) on deficit", () => {
    expect(runwayDays(1000, -500)).toBe(60);
  });
});
