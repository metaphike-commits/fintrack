import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CoupDur {
  id: string;
  label: string;
  montant: number;
  /** Date prévue (ISO string) — dans les 90 prochains jours idéalement */
  datePrevue: string;
  /** Compte impacté */
  compteId?: string;
  notes?: string;
  createdAt: string;
  /** Marqué comme géré (passé ou annulé) */
  traite: boolean;
}

interface CoupsDursState {
  coupsDurs: CoupDur[];
  addCoupDur: (c: Omit<CoupDur, "id" | "createdAt" | "traite">) => void;
  updateCoupDur: (id: string, patch: Partial<Omit<CoupDur, "id" | "createdAt">>) => void;
  traiterCoupDur: (id: string) => void;
  deleteCoupDur: (id: string) => void;
}

export const useCoupsDursStore = create<CoupsDursState>()(
  persist(
    (set) => ({
      coupsDurs: [],

      addCoupDur: (c) =>
        set((s) => ({
          coupsDurs: [
            ...s.coupsDurs,
            { ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString(), traite: false },
          ],
        })),

      updateCoupDur: (id, patch) =>
        set((s) => ({
          coupsDurs: s.coupsDurs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      traiterCoupDur: (id) =>
        set((s) => ({
          coupsDurs: s.coupsDurs.map((c) => (c.id === id ? { ...c, traite: true } : c)),
        })),

      deleteCoupDur: (id) =>
        set((s) => ({ coupsDurs: s.coupsDurs.filter((c) => c.id !== id) })),
    }),
    { name: "fts-coups-durs" }
  )
);

/** Coups durs non traités dans les N prochains jours depuis une date de référence */
export function getCoupsDursProches(
  coupsDurs: CoupDur[],
  jours: number = 90,
  ref: Date = new Date()
): CoupDur[] {
  const limit = new Date(ref);
  limit.setDate(limit.getDate() + jours);
  return coupsDurs.filter((c) => {
    if (c.traite) return false;
    const d = new Date(c.datePrevue);
    return d >= ref && d <= limit;
  });
}

/** Total des coups durs non traités dans les N prochains jours */
export function getTotalCoupsDursProches(
  coupsDurs: CoupDur[],
  jours: number = 90,
  ref: Date = new Date()
): number {
  return getCoupsDursProches(coupsDurs, jours, ref).reduce((s, c) => s + c.montant, 0);
}
