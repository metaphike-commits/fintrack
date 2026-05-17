import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Direction = "revenu" | "depense";
export type Frequence = "mensuel" | "hebdomadaire" | "trimestriel" | "annuel" | "ponctuel";
export type BaseItemType = "incompressible" | "reductible" | "discret";

export interface BaseItem {
  id: string;
  label: string;
  montant: number;
  direction: Direction;
  categorie: string;
  frequence: Frequence;
  /** incompressible = loyer/impôts, réductible = abonnements, discret = loisirs */
  type?: BaseItemType;
  /** Fiabilité du revenu 0–100 (100 = salaire garanti, 0 = freelance irrégulier) */
  fiabilite?: number;
  dateDebut?: string;
  dateFin?: string;
  billingDay?: number;
  compteId?: string;
  notes?: string;
  archived: boolean;
}

interface BaseFinanciereState {
  items: BaseItem[];
  seeded: boolean;

  addItem: (item: Omit<BaseItem, "id" | "archived">) => void;
  updateItem: (id: string, patch: Partial<Omit<BaseItem, "id">>) => void;
  archiveItem: (id: string) => void;
  deleteItem: (id: string) => void;
  seedFromOnboarding: (
    revenus: { label: string; montant: number; billingDay?: number; fiabilite?: number; compteId?: string }[],
    depenses: { label: string; montant: number; categorie: string; billingDay?: number; type?: BaseItemType; compteId?: string }[]
  ) => void;
  purgePonctuel: () => number;
}

export const useBaseFinanciereStore = create<BaseFinanciereState>()(
  persist(
    (set) => ({
      items: [],
      seeded: false,

      addItem: (item) =>
        set((s) => ({
          items: [...s.items, { ...item, id: crypto.randomUUID(), archived: false }],
        })),

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      archiveItem: (id) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, archived: true } : i)),
        })),

      deleteItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      purgePonctuel: () => {
        let count = 0;
        set((s) => {
          const kept = s.items.filter((i) => i.frequence !== "ponctuel");
          count = s.items.length - kept.length;
          return { items: kept };
        });
        return count;
      },

      seedFromOnboarding: (revenus, depenses) =>
        set((s) => {
          if (s.seeded) return s;
          const newItems: BaseItem[] = [
            ...revenus.map((r) => ({
              id: crypto.randomUUID(),
              label: r.label,
              montant: r.montant,
              direction: "revenu" as Direction,
              categorie: "revenu",
              frequence: "mensuel" as Frequence,
              billingDay: r.billingDay,
              fiabilite: r.fiabilite,
              compteId: r.compteId,
              archived: false,
            })),
            ...depenses.map((d) => ({
              id: crypto.randomUUID(),
              label: d.label,
              montant: d.montant,
              direction: "depense" as Direction,
              categorie: d.categorie,
              frequence: "mensuel" as Frequence,
              billingDay: d.billingDay,
              type: d.type,
              compteId: d.compteId,
              archived: false,
            })),
          ];
          return { items: newItems, seeded: true };
        }),
    }),
    { name: "fts-base-financiere" }
  )
);
