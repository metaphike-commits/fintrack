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
  /** Set when automatically synced — "patrimoine" from passifs, "compte" from credit accounts */
  source?: "patrimoine" | "compte";
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
  syncFromPatrimoine: (activePassifs: {
    id: string; label: string; mensualite: number; billingDay?: number; categorie: string;
    dateDebut?: string; dateFin?: string;
  }[]) => void;
  syncFromComptes: (creditComptes: { id: string; label: string; solde: number; billingDay?: number }[]) => void;
}

export function isSyncedItem(item: BaseItem): boolean {
  return item.source === "patrimoine" || item.source === "compte";
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

      syncFromPatrimoine: (activePassifs) =>
        set((s) => {
          const nonPat = s.items.filter((i) => i.source !== "patrimoine");
          const synced: BaseItem[] = activePassifs.map((p) => ({
            id: `pat:${p.id}`,
            label: p.label,
            montant: p.mensualite,
            direction: "depense" as Direction,
            categorie: p.categorie,
            frequence: "mensuel" as Frequence,
            billingDay: p.billingDay,
            dateDebut: p.dateDebut,
            dateFin: p.dateFin,
            archived: false,
            source: "patrimoine" as const,
          }));
          return { items: [...nonPat, ...synced] };
        }),

      syncFromComptes: (creditComptes) =>
        set((s) => {
          const nonCompte = s.items.filter((i) => i.source !== "compte");
          const now = new Date();
          const dateDebut = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
          const dateFin   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
          const synced: BaseItem[] = creditComptes
            .filter((c) => c.solde < 0)
            .map((c) => ({
              id: `compte:${c.id}`,
              label: c.label,
              montant: Math.abs(c.solde),
              direction: "depense" as Direction,
              categorie: "crédit",
              frequence: "mensuel" as Frequence,
              billingDay: c.billingDay,
              dateDebut,
              dateFin,
              archived: false,
              source: "compte" as const,
            }));
          return { items: [...nonCompte, ...synced] };
        }),

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
