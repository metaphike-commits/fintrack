import { describe, it, expect } from "vitest";
import { calculateRunway, calculateRunwayConfort } from "@/lib/runway";

describe("calculateRunway", () => {
  it("returns null/calm when soldeCourant is not set", () => {
    const r = calculateRunway(null, 2000, 1800);
    expect(r.jours).toBeNull();
    expect(r.status).toBe("calm");
  });

  it("returns stable when net is non-negative (revenus >= depenses)", () => {
    const r = calculateRunway(500, 2000, 1800);
    expect(r.jours).toBeNull();
    expect(r.status).toBe("stable");
  });

  it("returns stable at exact break-even (net === 0)", () => {
    const r = calculateRunway(500, 2000, 2000);
    expect(r.status).toBe("stable");
  });

  it("computes jours = floor(solde/|net| * 30) on deficit", () => {
    // solde 1000, deficit 500/mois -> 2 mois -> 60 jours
    const r = calculateRunway(1000, 1500, 2000);
    expect(r.jours).toBe(60);
  });

  it("status boundaries: critique < 30j, attention 30-59j, calm >= 60j", () => {
    // deficit 100/mois
    expect(calculateRunway(29 * 100 / 30, 0, 100).status).toBe("critique"); // ~29j
    expect(calculateRunway(30 * 100 / 30, 0, 100).status).toBe("attention"); // 30j
    expect(calculateRunway(59 * 100 / 30, 0, 100).status).toBe("attention"); // 59j
    expect(calculateRunway(60 * 100 / 30, 0, 100).status).toBe("calm"); // 60j
  });

  it("labels in months once jours >= 365", () => {
    // deficit 10/mois, solde large enough for >365j
    const r = calculateRunway(1000, 0, 10);
    expect(r.jours).toBeGreaterThanOrEqual(365);
    expect(r.label).toMatch(/mois$/);
  });
});

describe("calculateRunwayConfort", () => {
  const CONFORT = 500;

  it("returns null/calm when soldeCourant is not set", () => {
    const r = calculateRunwayConfort(null, 2000, 1800, CONFORT);
    expect(r.jours).toBeNull();
    expect(r.status).toBe("calm");
  });

  it("is immediately critique when already under the comfort threshold", () => {
    const r = calculateRunwayConfort(400, 2000, 1800, CONFORT);
    expect(r.jours).toBe(0);
    expect(r.status).toBe("critique");
    expect(r.label).toBe("Sous seuil");
  });

  it("is stable when net is non-negative and above threshold", () => {
    const r = calculateRunwayConfort(1000, 2000, 1800, CONFORT);
    expect(r.status).toBe("stable");
  });

  it("computes runway against the comfort-adjusted balance, not the raw balance", () => {
    // solde 1500, seuil 500 -> marge de confort 1000; deficit 500/mois -> 2 mois -> 60j
    const r = calculateRunwayConfort(1500, 1500, 2000, CONFORT);
    expect(r.jours).toBe(60);
  });
});
