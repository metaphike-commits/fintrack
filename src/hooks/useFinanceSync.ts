"use client";

import { useEffect, useState } from "react";
import { usePatrimoineStore, type PassifType } from "@/store/patrimoine";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useComptesStore } from "@/store/comptes";

const PASSIF_CAT: Record<PassifType, string> = {
  "crédit immobilier": "logement",
  "crédit conso":      "crédit",
  banque:              "crédit",
  découvert:           "crédit",
  amicale:             "autre",
  fiscale:             "impôts",
  autre:               "autre",
};

export function useFinanceSync() {
  const [hydrated, setHydrated] = useState(false);

  const passifs            = usePatrimoineStore((s) => s.passifs);
  const comptes            = useComptesStore((s) => s.comptes);
  const syncFromPatrimoine = useBaseFinanciereStore((s) => s.syncFromPatrimoine);
  const syncFromComptes    = useBaseFinanciereStore((s) => s.syncFromComptes);

  // Gate all sync on full hydration — prevents phantom items when a user
  // deletes their last credit compte: with hydration guard, the empty comptes
  // array is authoritative, and the sync correctly clears all "compte" items.
  useEffect(() => {
    function check() {
      if (
        usePatrimoineStore.persist.hasHydrated() &&
        useComptesStore.persist.hasHydrated() &&
        useBaseFinanciereStore.persist.hasHydrated()
      ) {
        setHydrated(true);
      }
    }

    check(); // Fast path: all stores may already be hydrated on re-mount (HMR / SSR skip)

    const u1 = usePatrimoineStore.persist.onFinishHydration(check);
    const u2 = useComptesStore.persist.onFinishHydration(check);
    const u3 = useBaseFinanciereStore.persist.onFinishHydration(check);

    return () => { u1(); u2(); u3(); };
  }, []);

  // Sync active passifs → Base Financière (credit comptes are handled separately below)
  useEffect(() => {
    if (!hydrated) return;

    const now = new Date();
    const openStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const openEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const creditCompteIds = new Set(
      comptes.filter((c) => c.type === "credit").map((c) => c.id)
    );
    const creditLabels = new Set(
      comptes.filter((c) => c.type === "credit").map((c) => c.label.toLowerCase().trim())
    );

    const active = passifs
      .filter((p) => {
        if (!(p.statut === "actif" || !p.statut)) return false;
        if (!p.mensualite || p.mensualite <= 0) return false;
        // Explicit link takes priority; fall back to label match for legacy data
        const linkedToCredit = p.compteId
          ? creditCompteIds.has(p.compteId)
          : creditLabels.has(p.label.toLowerCase().trim());
        return !linkedToCredit;
      })
      .map((p) => {
        if (p.dureeMois) {
          const d = p.dateOctroi ? new Date(p.dateOctroi) : new Date(now);
          d.setMonth(d.getMonth() + p.dureeMois);
          return {
            id: p.id,
            label: p.label,
            mensualite: p.mensualite!,
            billingDay: p.billingDay,
            categorie: PASSIF_CAT[p.type] ?? "autre",
            dateDebut: p.dateOctroi,
            dateFin: d.toISOString().slice(0, 10),
          };
        }
        // Open-ended passif (no fixed term): pin to current month only.
        // User updates the balance each month; future months default to 0.
        return {
          id: p.id,
          label: p.label,
          mensualite: p.mensualite!,
          billingDay: p.billingDay,
          categorie: PASSIF_CAT[p.type] ?? "autre",
          dateDebut: openStart,
          dateFin: openEnd,
        };
      });

    syncFromPatrimoine(active);
  }, [hydrated, passifs, comptes, syncFromPatrimoine]);

  // Sync credit comptes → Base Financière (one item per compte, current month only)
  useEffect(() => {
    if (!hydrated) return;

    syncFromComptes(
      comptes
        .filter((c) => c.type === "credit")
        .map((c) => ({ id: c.id, label: c.label, solde: c.solde, billingDay: c.billingDay }))
    );
  }, [hydrated, comptes, syncFromComptes]);
}
