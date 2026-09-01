import { describe, it, expect } from "vitest";
import { getRowsForMonth, getPendingOverdueAmount } from "@/lib/timeline";
import { makeItem } from "./testFixtures";

describe("getRowsForMonth", () => {
  it("derives billingDay from dateDebut for a mensuel item (regression: EDF bug)", () => {
    const item = makeItem({ frequence: "mensuel", dateDebut: "2026-08-05", billingDay: undefined });
    const rows = getRowsForMonth([item], 2026, 7); // August, 0-indexed
    expect(rows).toHaveLength(1);
    expect(rows[0].billingDay).toBe(5);
  });

  it("keeps the explicit billingDay when both are set", () => {
    const item = makeItem({ frequence: "mensuel", dateDebut: "2026-08-01", billingDay: 20 });
    const rows = getRowsForMonth([item], 2026, 7);
    expect(rows[0].billingDay).toBe(20);
  });

  it("only surfaces a ponctuel item in its exact month/year", () => {
    const item = makeItem({ frequence: "ponctuel", dateDebut: "2026-08-10" });
    expect(getRowsForMonth([item], 2026, 7)).toHaveLength(1);
    expect(getRowsForMonth([item], 2026, 8)).toHaveLength(0);
    expect(getRowsForMonth([item], 2025, 7)).toHaveLength(0);
  });

  it("excludes archived items and items outside dateDebut/dateFin", () => {
    const archived = makeItem({ frequence: "mensuel", archived: true });
    const notYetStarted = makeItem({ frequence: "mensuel", dateDebut: "2099-01-01" });
    const alreadyEnded = makeItem({ frequence: "mensuel", dateFin: "2020-01-01" });
    const rows = getRowsForMonth([archived, notYetStarted, alreadyEnded], 2026, 7);
    expect(rows).toHaveLength(0);
  });
});

describe("getPendingOverdueAmount", () => {
  const today = new Date(2026, 7, 20); // Aug 20 2026

  it("counts a depense whose billingDay has passed and isn't paid/cancelled", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 5, montant: 240, direction: "depense" });
    expect(getPendingOverdueAmount([item], {}, {}, today)).toBe(240);
  });

  it("does not count a depense whose billingDay hasn't happened yet", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 25, montant: 240, direction: "depense" });
    expect(getPendingOverdueAmount([item], {}, {}, today)).toBe(0);
  });

  it("does not double-count an item already marked paye", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 5, montant: 240, direction: "depense" });
    const key = `${item.id}-2026-7`;
    expect(getPendingOverdueAmount([item], { [key]: "paye" }, {}, today)).toBe(0);
  });

  it("does not count an item marked annule", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 5, montant: 240, direction: "depense" });
    const key = `${item.id}-2026-7`;
    expect(getPendingOverdueAmount([item], { [key]: "annule" }, {}, today)).toBe(0);
  });

  it("derives the overdue day from dateDebut when billingDay is unset (same fix as projection)", () => {
    // Due on the 5th (derived from dateDebut) — today is the 20th, so overdue.
    const item = makeItem({ frequence: "mensuel", dateDebut: "2026-08-05", billingDay: undefined, montant: 240 });
    expect(getPendingOverdueAmount([item], {}, {}, today)).toBe(240);
  });

  it("ignores revenus", () => {
    const item = makeItem({ frequence: "mensuel", billingDay: 5, montant: 2000, direction: "revenu" });
    expect(getPendingOverdueAmount([item], {}, {}, today)).toBe(0);
  });
});
