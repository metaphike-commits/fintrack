import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BudgetEnvelope {
  id: string;
  label: string;
  /** Primary category — matches Transaction.categorie */
  categorie: string;
  /** Additional categories merged into this envelope */
  categoriesAlias?: string[];
  montantPrevu: number;
  couleur?: string;
  ordre?: number;
  notes?: string;
}

export interface BudgetMois {
  id: string;
  year: number;
  month: number; // 0-11
  envelopes: BudgetEnvelope[];
  /** Reserved Sprint 2 — rituel IA */
  builtAt?: string;
  aiSuggestions?: { categorie: string; montantSuggere: number; raison: string }[];
}

interface BudgetState {
  mois: BudgetMois[];
  addEnvelope:    (year: number, month: number, env: Omit<BudgetEnvelope, "id">) => void;
  updateEnvelope: (year: number, month: number, id: string, patch: Partial<Omit<BudgetEnvelope, "id">>) => void;
  removeEnvelope: (year: number, month: number, id: string) => void;
  copyFromPreviousMois: (year: number, month: number) => void;
}

function moisId(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function ensureMois(mois: BudgetMois[], year: number, month: number): BudgetMois[] {
  if (mois.some(m => m.year === year && m.month === month)) return mois;
  return [...mois, { id: moisId(year, month), year, month, envelopes: [] }];
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      mois: [],

      addEnvelope: (year, month, env) =>
        set(s => {
          const base = ensureMois(s.mois, year, month);
          const newEnv: BudgetEnvelope = { ...env, id: crypto.randomUUID() };
          return {
            mois: base.map(m =>
              m.year === year && m.month === month
                ? { ...m, envelopes: [...m.envelopes, newEnv] }
                : m
            ),
          };
        }),

      updateEnvelope: (year, month, id, patch) =>
        set(s => ({
          mois: s.mois.map(m =>
            m.year === year && m.month === month
              ? { ...m, envelopes: m.envelopes.map(e => e.id === id ? { ...e, ...patch } : e) }
              : m
          ),
        })),

      removeEnvelope: (year, month, id) =>
        set(s => ({
          mois: s.mois.map(m =>
            m.year === year && m.month === month
              ? { ...m, envelopes: m.envelopes.filter(e => e.id !== id) }
              : m
          ),
        })),

      copyFromPreviousMois: (year, month) => {
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear  = month === 0 ? year - 1 : year;
        const prev = get().mois.find(m => m.year === prevYear && m.month === prevMonth);
        if (!prev || prev.envelopes.length === 0) return;
        const copied = prev.envelopes.map(e => ({ ...e, id: crypto.randomUUID() }));
        set(s => {
          const base = ensureMois(s.mois, year, month);
          return {
            mois: base.map(m =>
              m.year === year && m.month === month
                ? { ...m, envelopes: copied }
                : m
            ),
          };
        });
      },
    }),
    { name: "fts-budget" }
  )
);

/** Pure selector — never creates state */
export function getMoisOrEmpty(mois: BudgetMois[], year: number, month: number): BudgetMois {
  return (
    mois.find(m => m.year === year && m.month === month) ??
    { id: moisId(year, month), year, month, envelopes: [] }
  );
}
