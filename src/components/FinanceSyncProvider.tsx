"use client";

import { useFinanceSync } from "@/hooks/useFinanceSync";

export function FinanceSyncProvider({ children }: { children: React.ReactNode }) {
  useFinanceSync();
  return <>{children}</>;
}
