import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ItemStatut = "prevu" | "paye" | "reporte" | "annule";

export const STATUT_CYCLE: ItemStatut[] = ["prevu", "paye", "reporte", "annule"];

interface TimelineState {
  paid: Record<string, boolean>;    // legacy — kept for backward compat with HomeView
  statuts: Record<string, ItemStatut>; // V3.3 enriched statuts
  togglePaid: (key: string) => void;
  setPaid: (key: string, value: boolean) => void;
  setStatut: (key: string, statut: ItemStatut) => void;
  cycleStatut: (key: string) => void;
}

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set) => ({
      paid: {},
      statuts: {},

      togglePaid: (key) =>
        set((s) => {
          const current = s.statuts[key] ?? (s.paid[key] ? "paye" : "prevu");
          const next: ItemStatut = current === "paye" ? "prevu" : "paye";
          return {
            statuts: { ...s.statuts, [key]: next },
            paid: { ...s.paid, [key]: next === "paye" },
          };
        }),

      setPaid: (key, value) =>
        set((s) => ({
          paid: { ...s.paid, [key]: value },
          statuts: { ...s.statuts, [key]: value ? "paye" : "prevu" },
        })),

      setStatut: (key, statut) =>
        set((s) => ({
          statuts: { ...s.statuts, [key]: statut },
          paid: { ...s.paid, [key]: statut === "paye" },
        })),

      cycleStatut: (key) =>
        set((s) => {
          const current = s.statuts[key] ?? (s.paid[key] ? "paye" : "prevu");
          const idx = STATUT_CYCLE.indexOf(current);
          const next = STATUT_CYCLE[(idx + 1) % STATUT_CYCLE.length];
          return {
            statuts: { ...s.statuts, [key]: next },
            paid: { ...s.paid, [key]: next === "paye" },
          };
        }),
    }),
    { name: "fts-timeline" }
  )
);

export function getEffectiveStatut(
  key: string,
  statuts: Record<string, ItemStatut>,
  paid: Record<string, boolean>
): ItemStatut {
  if (statuts[key]) return statuts[key];
  return paid[key] ? "paye" : "prevu";
}
