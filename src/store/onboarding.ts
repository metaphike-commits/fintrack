import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BaseItemType } from "./baseFinanciere";

export interface OnboardingRevenu {
  id: string;
  label: string;
  montant: number;
  billingDay?: number;
  /** 0–100 : fiabilité du revenu (100 = salaire garanti) */
  fiabilite?: number;
  compteId?: string;
}

export interface OnboardingDepense {
  id: string;
  label: string;
  montant: number;
  categorie: string;
  billingDay?: number;
  type?: BaseItemType;
  compteId?: string;
}

export interface OnboardingCompte {
  id: string;
  label: string;
  solde: number;
  decouvertAutorise?: number;
  decouvertUtilise?: number;
}

// ── Save slots ───────────────────────────────────────────────────────────────

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OnboardingSnapshot {
  completed: boolean;
  step: OnboardingStep;
  revenus: OnboardingRevenu[];
  depenses: OnboardingDepense[];
  comptes: OnboardingCompte[];
  objectifEpargne: number;
  savedAt: string;
}

export interface SaveSlot {
  id: 1 | 2 | 3;
  name: string;
  snapshot: OnboardingSnapshot | null;
}

const EMPTY_SLOTS: SaveSlot[] = [
  { id: 1, name: "Partie 1", snapshot: null },
  { id: 2, name: "Partie 2", snapshot: null },
  { id: 3, name: "Partie 3", snapshot: null },
];

// ── Store ────────────────────────────────────────────────────────────────────

export interface OnboardingState {
  // Active session
  completed: boolean;
  step: OnboardingStep;
  revenus: OnboardingRevenu[];
  depenses: OnboardingDepense[];
  comptes: OnboardingCompte[];
  objectifEpargne: number;

  // Save slots
  slots: SaveSlot[];
  activeSlotId: 1 | 2 | 3 | null;

  // Actions — flux
  setStep: (step: OnboardingStep) => void;
  addRevenu: (item: Omit<OnboardingRevenu, "id">) => void;
  updateRevenu: (id: string, patch: Partial<Omit<OnboardingRevenu, "id">>) => void;
  removeRevenu: (id: string) => void;
  addDepense: (item: Omit<OnboardingDepense, "id">) => void;
  updateDepense: (id: string, patch: Partial<Omit<OnboardingDepense, "id">>) => void;
  removeDepense: (id: string) => void;
  addCompte: (item: Omit<OnboardingCompte, "id">) => void;
  updateCompte: (id: string, patch: Partial<Omit<OnboardingCompte, "id">>) => void;
  removeCompte: (id: string) => void;
  setObjectifEpargne: (amount: number) => void;
  complete: () => void;
  reset: () => void;

  // Actions — save slots
  saveToSlot: (slotId: 1 | 2 | 3, name?: string) => void;
  loadFromSlot: (slotId: 1 | 2 | 3) => void;
  setSlotSnapshot: (slotId: 1 | 2 | 3, snapshot: OnboardingSnapshot) => void;
  renameSlot: (slotId: 1 | 2 | 3, name: string) => void;
  clearSlot: (slotId: 1 | 2 | 3) => void;
  autoSave: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completed: false,
      step: 0,
      revenus: [],
      depenses: [],
      comptes: [],
      objectifEpargne: 0,
      slots: EMPTY_SLOTS,
      activeSlotId: null,

      setStep: (step) => set({ step }),

      addRevenu: (item) =>
        set((s) => ({ revenus: [...s.revenus, { ...item, id: crypto.randomUUID() }] })),

      updateRevenu: (id, patch) =>
        set((s) => ({ revenus: s.revenus.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

      removeRevenu: (id) =>
        set((s) => ({ revenus: s.revenus.filter((r) => r.id !== id) })),

      addDepense: (item) =>
        set((s) => ({ depenses: [...s.depenses, { ...item, id: crypto.randomUUID() }] })),

      updateDepense: (id, patch) =>
        set((s) => ({ depenses: s.depenses.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),

      removeDepense: (id) =>
        set((s) => ({ depenses: s.depenses.filter((d) => d.id !== id) })),

      addCompte: (item) =>
        set((s) => ({ comptes: [...s.comptes, { ...item, id: crypto.randomUUID() }] })),

      updateCompte: (id, patch) =>
        set((s) => ({ comptes: s.comptes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      removeCompte: (id) =>
        set((s) => ({ comptes: s.comptes.filter((c) => c.id !== id) })),

      setObjectifEpargne: (objectifEpargne) => set({ objectifEpargne }),

      complete: () => set({ completed: true }),

      reset: () =>
        set({
          completed: false,
          step: 0,
          revenus: [],
          depenses: [],
          comptes: [],
          objectifEpargne: 0,
          activeSlotId: null,
        }),

      saveToSlot: (slotId, name) => {
        const s = get();
        const snapshot: OnboardingSnapshot = {
          completed: s.completed,
          step: s.step,
          revenus: s.revenus,
          depenses: s.depenses,
          comptes: s.comptes,
          objectifEpargne: s.objectifEpargne,
          savedAt: new Date().toISOString(),
        };
        set((st) => ({
          activeSlotId: slotId,
          slots: st.slots.map((slot) =>
            slot.id === slotId
              ? { ...slot, name: name ?? slot.name, snapshot }
              : slot
          ),
        }));
      },

      loadFromSlot: (slotId) => {
        const slot = get().slots.find((s) => s.id === slotId);
        if (!slot?.snapshot) return;
        const snap = slot.snapshot;
        set({
          activeSlotId: slotId,
          completed: snap.completed,
          step: snap.step,
          revenus: snap.revenus,
          depenses: snap.depenses,
          comptes: snap.comptes ?? [],
          objectifEpargne: snap.objectifEpargne,
        });
      },

      setSlotSnapshot: (slotId, snapshot) =>
        set((s) => ({
          slots: s.slots.map((slot) => (slot.id === slotId ? { ...slot, snapshot } : slot)),
        })),

      renameSlot: (slotId, name) =>
        set((s) => ({
          slots: s.slots.map((slot) => (slot.id === slotId ? { ...slot, name } : slot)),
        })),

      clearSlot: (slotId) =>
        set((s) => ({
          slots: s.slots.map((slot) =>
            slot.id === slotId ? { ...slot, snapshot: null } : slot
          ),
          activeSlotId: s.activeSlotId === slotId ? null : s.activeSlotId,
        })),

      autoSave: () => {
        const s = get();
        const slotId = s.activeSlotId;
        if (!slotId) return;
        s.saveToSlot(slotId);
      },
    }),
    { name: "fts-onboarding" }
  )
);
