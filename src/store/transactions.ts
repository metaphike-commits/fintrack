import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Transaction {
  id: string;
  date: string;
  label: string;
  montant: number;
  direction: "revenu" | "depense" | "transfert";
  categorie: string;
  importedAt: string;
  reconciledItemId?: string;
}

export interface ImportSession {
  id: string;
  fileName: string;
  importedAt: string;
  transactionCount: number;
  reconciledCount: number;
}

interface TransactionsState {
  transactions: Transaction[];
  importSessions: ImportSession[];
  addTransactions: (txs: Omit<Transaction, "importedAt">[]) => void;
  addImportSession: (session: Omit<ImportSession, "id" | "importedAt">) => void;
  clearAll: () => void;
}

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set) => ({
      transactions: [],
      importSessions: [],

      addTransactions: (txs) =>
        set((s) => ({
          transactions: [
            ...s.transactions,
            ...txs.map((t) => ({ ...t, importedAt: new Date().toISOString() })),
          ],
        })),

      addImportSession: (session) =>
        set((s) => ({
          importSessions: [
            { ...session, id: crypto.randomUUID(), importedAt: new Date().toISOString() },
            ...s.importSessions,
          ].slice(0, 20),
        })),

      clearAll: () => set({ transactions: [], importSessions: [] }),
    }),
    { name: "fts-transactions" }
  )
);
