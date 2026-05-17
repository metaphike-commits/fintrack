import { create } from "zustand";
import type { ParsedRow } from "@/lib/csvParser";

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[*\d]/g, "")
    .replace(/[^a-zàâéèêëîïôùûüç\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

export interface CategorizedRow {
  id: string;
  date: string;
  label: string;
  montant: number;
  direction: "revenu" | "depense";
  categorie: string;
  include: boolean;
  matchedItemId?: string;
  matchedItemLabel?: string;
  reconciled: boolean;
}

export type ImportStep = "upload" | "preview" | "categorizing" | "validation" | "done";

interface ImportState {
  step: ImportStep;
  fileName: string;
  rawRows: ParsedRow[];
  rows: CategorizedRow[];
  importedCount: number;

  setStep: (step: ImportStep) => void;
  setFile: (fileName: string, rawRows: ParsedRow[]) => void;
  setRows: (rows: CategorizedRow[]) => void;
  toggleInclude: (id: string) => void;
  updateRow: (id: string, patch: Partial<Pick<CategorizedRow, "direction" | "categorie">>) => void;
  updateCategorieBySimilarLabel: (id: string, categorie: string) => number;
  setReconciled: (id: string, reconciled: boolean) => void;
  setImportedCount: (n: number) => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>()((set, get) => ({
  step: "upload",
  fileName: "",
  rawRows: [],
  rows: [],
  importedCount: 0,

  setStep: (step) => set({ step }),
  setFile: (fileName, rawRows) => set({ fileName, rawRows, step: "preview" }),
  setRows: (rows) => set({ rows }),
  toggleInclude: (id) =>
    set((s) => ({
      rows: s.rows.map((r) => (r.id === id ? { ...r, include: !r.include } : r)),
    })),
  updateRow: (id, patch) =>
    set((s) => ({
      rows: s.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
  updateCategorieBySimilarLabel: (id, categorie) => {
    const source = get().rows.find((r) => r.id === id);
    if (!source) return 0;
    const norm = normalizeLabel(source.label);
    let count = 0;
    set((s) => ({
      rows: s.rows.map((r) => {
        if (normalizeLabel(r.label) === norm) {
          if (r.id !== id) count++;
          return { ...r, categorie };
        }
        return r;
      }),
    }));
    return count;
  },
  setReconciled: (id, reconciled) =>
    set((s) => ({
      rows: s.rows.map((r) => (r.id === id ? { ...r, reconciled } : r)),
    })),
  setImportedCount: (importedCount) => set({ importedCount }),
  reset: () => set({ step: "upload", fileName: "", rawRows: [], rows: [], importedCount: 0 }),
}));
