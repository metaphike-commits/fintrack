import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME_REGISTRY } from "@/lib/themes";
import type { ThemeId } from "@/lib/themes";

interface PreferencesState {
  confortThreshold: number;
  setConfortThreshold: (n: number) => void;
  budgetReviewDay: number;
  setBudgetReviewDay: (n: number) => void;
  reconciliationAmountTol: number;
  setReconciliationAmountTol: (n: number) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  notificationRunwayThreshold: number;
  setNotificationRunwayThreshold: (n: number) => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  /** Fold estimated variable spend (Budget envelopes) into the Timeline projection */
  includeVariableInTimeline: boolean;
  setIncludeVariableInTimeline: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      confortThreshold: 500,
      setConfortThreshold: (confortThreshold) => set({ confortThreshold }),
      budgetReviewDay: 28,
      setBudgetReviewDay: (budgetReviewDay) => set({ budgetReviewDay: Math.min(28, Math.max(1, Math.round(budgetReviewDay))) }),
      reconciliationAmountTol: 5,
      setReconciliationAmountTol: (reconciliationAmountTol) => set({ reconciliationAmountTol }),
      notificationsEnabled: false,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      notificationRunwayThreshold: 30,
      setNotificationRunwayThreshold: (notificationRunwayThreshold) => set({ notificationRunwayThreshold }),
      theme: "midnight",
      setTheme: (theme) => set({ theme }),
      includeVariableInTimeline: false,
      setIncludeVariableInTimeline: (includeVariableInTimeline) => set({ includeVariableInTimeline }),
    }),
    {
      name: "fts-preferences",
      // Validate persisted theme — migrate old IDs (violet/plasma/etc.) to midnight
      onRehydrateStorage: () => (state) => {
        if (state && !THEME_REGISTRY[state.theme]) {
          state.theme = "midnight";
        }
      },
    }
  )
);
