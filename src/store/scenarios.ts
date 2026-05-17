import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Direction, Frequence } from "@/store/baseFinanciere";

export interface ScenarioItem {
  id: string;
  label: string;
  montant: number;
  direction: Direction;
  frequence: Frequence;
  categorie: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  color: string;
  items: ScenarioItem[];
  createdAt: string;
}

export const SCENARIO_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
];

interface ScenariosState {
  scenarios: Scenario[];
  addScenario: (s: Omit<Scenario, "createdAt">) => void;
  updateScenario: (id: string, patch: Partial<Omit<Scenario, "id" | "createdAt">>) => void;
  deleteScenario: (id: string) => void;
  addItem: (scenarioId: string, item: Omit<ScenarioItem, "id">) => void;
  removeItem: (scenarioId: string, itemId: string) => void;
}

export const useScenariosStore = create<ScenariosState>()(
  persist(
    (set) => ({
      scenarios: [],

      addScenario: (s) =>
        set((st) => ({
          scenarios: [
            ...st.scenarios,
            { ...s, createdAt: new Date().toISOString() },
          ],
        })),

      updateScenario: (id, patch) =>
        set((st) => ({
          scenarios: st.scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),

      deleteScenario: (id) =>
        set((st) => ({ scenarios: st.scenarios.filter((s) => s.id !== id) })),

      addItem: (scenarioId, item) =>
        set((st) => ({
          scenarios: st.scenarios.map((s) =>
            s.id === scenarioId
              ? { ...s, items: [...s.items, { ...item, id: crypto.randomUUID() }] }
              : s
          ),
        })),

      removeItem: (scenarioId, itemId) =>
        set((st) => ({
          scenarios: st.scenarios.map((s) =>
            s.id === scenarioId
              ? { ...s, items: s.items.filter((i) => i.id !== itemId) }
              : s
          ),
        })),
    }),
    { name: "fts-scenarios" }
  )
);
