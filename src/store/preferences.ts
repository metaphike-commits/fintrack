import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  confortThreshold: number;
  setConfortThreshold: (n: number) => void;
  reconciliationAmountTol: number;
  setReconciliationAmountTol: (n: number) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  notificationRunwayThreshold: number;
  setNotificationRunwayThreshold: (n: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      confortThreshold: 500,
      setConfortThreshold: (confortThreshold) => set({ confortThreshold }),
      reconciliationAmountTol: 5,
      setReconciliationAmountTol: (reconciliationAmountTol) => set({ reconciliationAmountTol }),
      notificationsEnabled: false,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      notificationRunwayThreshold: 30,
      setNotificationRunwayThreshold: (notificationRunwayThreshold) => set({ notificationRunwayThreshold }),
    }),
    { name: "fts-preferences" }
  )
);
