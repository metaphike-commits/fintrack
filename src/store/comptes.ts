import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CompteType = "courant" | "epargne" | "credit" | "cash";

export interface Compte {
  id: string;
  label: string;
  type: CompteType;
  institution: string;
  solde: number;
  includedInRunway: boolean;
  createdAt: string;
  /** Limite de découvert autorisé par la banque (en €, positif) */
  decouvertAutorise?: number;
  /** Montant actuellement utilisé dans le découvert (en €, positif = en débit) */
  decouvertUtilise?: number;
}

interface ComptesState {
  comptes: Compte[];
  addCompte: (c: Omit<Compte, "id" | "createdAt">) => void;
  updateCompte: (id: string, patch: Partial<Omit<Compte, "id" | "createdAt">>) => void;
  deleteCompte: (id: string) => void;
  setSolde: (id: string, solde: number) => void;
}

export const useComptesStore = create<ComptesState>()(
  persist(
    (set) => ({
      comptes: [],

      addCompte: (c) =>
        set((s) => ({
          comptes: [
            ...s.comptes,
            { ...c, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),

      updateCompte: (id, patch) =>
        set((s) => ({
          comptes: s.comptes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCompte: (id) =>
        set((s) => ({ comptes: s.comptes.filter((c) => c.id !== id) })),

      setSolde: (id, solde) =>
        set((s) => ({
          comptes: s.comptes.map((c) => (c.id === id ? { ...c, solde } : c)),
        })),
    }),
    { name: "fts-comptes" }
  )
);

/** Somme des soldes des comptes marqués `includedInRunway`. Null si aucun compte. */
export function getSoldeRunway(comptes: Compte[]): number | null {
  if (comptes.length === 0) return null;
  const included = comptes.filter((c) => c.includedInRunway);
  if (included.length === 0) return null;
  return included.reduce((s, c) => s + c.solde, 0);
}

export const COMPTE_TYPE_LABEL: Record<CompteType, string> = {
  courant: "Courant",
  epargne: "Épargne",
  credit: "Crédit",
  cash: "Cash",
};
