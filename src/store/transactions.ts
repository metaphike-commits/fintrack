import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FlowType = "expense" | "income" | "transfer" | "credit_payment" | "refund";

export interface Transaction {
  id: string;
  date: string;
  label: string;
  montant: number;
  direction: "revenu" | "depense" | "transfert";
  categorie: string;
  importedAt: string;
  reconciledItemId?: string;
  importSessionId?: string;
  // Multi-account / flow enrichment
  compteId?: string;
  flowType?: FlowType;
  linkedTransactionId?: string;
  excludedFromAnalytics?: boolean;
}

export interface ImportSession {
  id: string;
  fileName: string;
  importedAt: string;
  transactionCount: number;
  reconciledCount: number;
  bank?: string;
  compteId?: string;
}

interface TransactionsState {
  transactions: Transaction[];
  importSessions: ImportSession[];
  addTransactions: (txs: Omit<Transaction, "importedAt">[]) => void;
  addImportSession: (session: Omit<ImportSession, "importedAt">) => void;
  deleteImportSession: (sessionId: string) => void;
  updateTransaction: (id: string, patch: Partial<Pick<Transaction, "categorie" | "label" | "direction" | "montant" | "flowType" | "excludedFromAnalytics" | "reconciledItemId" | "linkedTransactionId">>) => void;
  updateTransactionsBatch: (ids: string[], patch: Partial<Pick<Transaction, "categorie">>) => void;
  deleteTransaction: (id: string) => void;
  deleteTransactions: (ids: string[]) => void;
  confirmTransferPair: (outId: string, inId: string, flowType: "transfer" | "credit_payment") => void;
  dismissTransferPair: (outId: string, inId: string) => void;
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
            { ...session, importedAt: new Date().toISOString() },
            ...s.importSessions,
          ].slice(0, 20),
        })),

      deleteImportSession: (sessionId) =>
        set((s) => ({
          importSessions: s.importSessions.filter((s) => s.id !== sessionId),
          transactions: s.transactions.filter((t) => t.importSessionId !== sessionId),
        })),

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => t.id === id ? { ...t, ...patch } : t),
        })),

      updateTransactionsBatch: (ids, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => ids.includes(t.id) ? { ...t, ...patch } : t),
        })),

      confirmTransferPair: (outId, inId, flowType) =>
        set((s) => ({
          transactions: s.transactions.map((t) => {
            if (t.id === outId) return { ...t, flowType, linkedTransactionId: inId, excludedFromAnalytics: true };
            if (t.id === inId) return { ...t, flowType, linkedTransactionId: outId, excludedFromAnalytics: true };
            return t;
          }),
        })),

      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      deleteTransactions: (ids) =>
        set((s) => ({ transactions: s.transactions.filter((t) => !ids.includes(t.id)) })),

      dismissTransferPair: (outId, inId) =>
        set((s) => ({
          transactions: s.transactions.map((t) => {
            if (t.id === outId) return { ...t, flowType: "expense" as FlowType, linkedTransactionId: undefined };
            if (t.id === inId) return { ...t, flowType: "income" as FlowType, linkedTransactionId: undefined };
            return t;
          }),
        })),

      clearAll: () => set({ transactions: [], importSessions: [] }),
    }),
    { name: "fts-transactions" }
  )
);
