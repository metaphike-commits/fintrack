import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompteState {
  soldeCourant: number | null;
  setSoldeCourant: (n: number) => void;
}

export const useCompteStore = create<CompteState>()(
  persist(
    (set) => ({
      soldeCourant: null,
      setSoldeCourant: (soldeCourant) => set({ soldeCourant }),
    }),
    { name: "fts-compte" }
  )
);
