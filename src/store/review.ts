import { create } from "zustand";

interface ReviewState {
  year: number;
  month: number;
  setMonth: (year: number, month: number) => void;
}

const now = new Date();

export const useReviewStore = create<ReviewState>()((set) => ({
  year:  now.getFullYear(),
  month: now.getMonth(),
  setMonth: (year, month) => set({ year, month }),
}));
