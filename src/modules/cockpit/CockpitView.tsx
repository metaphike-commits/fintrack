"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Maximize2 } from "lucide-react";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useOnboardingStore } from "@/store/onboarding";
import { useCompteStore } from "@/store/compte";
import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { useTransactionsStore } from "@/store/transactions";
import { usePreferencesStore } from "@/store/preferences";
import { useScenariosStore } from "@/store/scenarios";
import { calculateRunway } from "@/lib/runway";
import { projectDailyBalance, getPointBas, toMensuel } from "@/lib/projection";
import {
  computeFragiliteScore,
  computeMomentum,
} from "@/lib/tensionScore";
import { getBurnRateGlissant } from "@/lib/analyse";
import { useFintrackNotifications } from "@/hooks/useFintrackNotifications";
import { getPendingOverdueAmount } from "@/lib/timeline";
import { useTimelineStore } from "@/store/timeline";
import { useEngagementsStore, getMensualitesEngagements, getTotalEngagements } from "@/store/engagements";
import { SignalIA } from "./SignalIA";
import { CockpitKPIs } from "./CockpitKPIs";
import { ProjectionCockpit } from "./ProjectionCockpit";
import { CeQuiArrive } from "./CeQuiArrive";
import { AlertesActives, buildAlertes } from "./AlertesActives";
import { ScenarioRapide } from "./ScenarioRapide";
import { ProchainVirement } from "./ProchainVirement";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function scenarioItemsAsBase(
  items: import("@/store/scenarios").ScenarioItem[]
): import("@/store/baseFinanciere").BaseItem[] {
  return items.map((i) => ({
    ...i,
    archived: false,
    dateDebut: undefined,
    dateFin: undefined,
    billingDay: undefined,
    compteId: undefined,
    notes: undefined,
  }));
}

export function CockpitView() {
  const router = useRouter();

  // ── Stores ────────────────────────────────────────────────────
  const { items, seedFromOnboarding } = useBaseFinanciereStore();
  const onboarding = useOnboardingStore();
  const { soldeCourant } = useCompteStore();
  const comptes = useComptesStore((s) => s.comptes);
  const transactions = useTransactionsStore((s) => s.transactions);
  const { confortThreshold } = usePreferencesStore();
  const scenarios = useScenariosStore((s) => s.scenarios);
  const { statuts, paid } = useTimelineStore();
  const engagements = useEngagementsStore((s) => s.engagements);

  // Seed from onboarding once
  useEffect(() => {
    if (onboarding.completed && onboarding.revenus.length > 0) {
      seedFromOnboarding(onboarding.revenus, onboarding.depenses);
    }
  }, []);

  // F key → Focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "f" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        router.push("/focus");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  // ── Derived values ────────────────────────────────────────────
  const soldeRunway = getSoldeRunway(comptes);
  const soldeEffectif = soldeRunway ?? soldeCourant;

  const active = useMemo(() => items.filter((i) => !i.archived), [items]);

  // Bills whose billing day has passed this month but are not yet marked "paye".
  // Their amount is still in the account balance but must be deducted for an
  // accurate projection — otherwise runway is overestimated.
  const pendingOverdue = useMemo(
    () => getPendingOverdueAmount(active, statuts, paid),
    [active, statuts, paid]
  );
  const soldeProjection = soldeEffectif !== null ? soldeEffectif - pendingOverdue : null;
  const revenus = useMemo(() => active.filter((i) => i.direction === "revenu"), [active]);
  const depenses = useMemo(() => active.filter((i) => i.direction === "depense"), [active]);

  const totalRevenus = useMemo(
    () => revenus.reduce((s, i) => s + toMensuel(i), 0),
    [revenus]
  );
  const totalDepenses = useMemo(
    () => depenses.reduce((s, i) => s + toMensuel(i), 0),
    [depenses]
  );

  // Engagement mensualités add to effective monthly outflow (arriérés échelonnés)
  const mensualitesEngagements = useMemo(
    () => getMensualitesEngagements(engagements),
    [engagements]
  );
  const totalEngagements = useMemo(
    () => getTotalEngagements(engagements),
    [engagements]
  );
  const totalDepensesAvecEngagements = totalDepenses + mensualitesEngagements;

  const burnRateResult = useMemo(
    () => getBurnRateGlissant(transactions, 3),
    [transactions]
  );
  const monthlyNet = totalRevenus - totalDepensesAvecEngagements;

  const runway = useMemo(
    () => calculateRunway(soldeProjection, totalRevenus, totalDepensesAvecEngagements),
    [soldeProjection, totalRevenus, totalDepensesAvecEngagements]
  );

  const projection90 = useMemo(() => {
    if (soldeProjection === null) return [];
    return projectDailyBalance(soldeProjection, active, 90);
  }, [soldeProjection, active]);

  const pointBas = useMemo(() => getPointBas(projection90), [projection90]);

  // Découvert agrégé sur tous les comptes (pour score fragilité)
  const decouvertUtilise = useMemo(
    () => comptes.reduce((s, c) => s + (c.decouvertUtilise ?? 0), 0),
    [comptes]
  );
  const decouvertAutorise = useMemo(
    () => comptes.reduce((s, c) => s + (c.decouvertAutorise ?? 0), 0),
    [comptes]
  );

  const fragilite = useMemo(
    () =>
      computeFragiliteScore(
        runway.jours,
        pointBas?.solde ?? null,
        confortThreshold,
        monthlyNet,
        totalEngagements,
        totalRevenus,
        decouvertUtilise,
        decouvertAutorise
      ),
    [runway.jours, pointBas, confortThreshold, monthlyNet, totalEngagements, totalRevenus, decouvertUtilise, decouvertAutorise]
  );

  const momentum = useMemo(
    () => computeMomentum(monthlyNet, totalDepensesAvecEngagements),
    [monthlyNet, totalDepensesAvecEngagements]
  );

  useFintrackNotifications({
    runwayJours: runway.jours,
    pointBas: pointBas?.solde ?? null,
    confortThreshold,
    monthlyNet,
  });

  // Active scenario (first one, if exists)
  const activeScenario = useMemo(() => scenarios[0] ?? null, [scenarios]);
  const scenarioProjection = useMemo(() => {
    if (!activeScenario || soldeProjection === null) return undefined;
    const merged = [...active, ...scenarioItemsAsBase(activeScenario.items)];
    return projectDailyBalance(soldeProjection, merged, 90);
  }, [activeScenario, active, soldeProjection]);

  // Next 7 days events
  const next7Projections = useMemo(() => projection90.slice(0, 7), [projection90]);

  // Reconciled item IDs (from transactions)
  const reconciledItemIds = useMemo(
    () => new Set(transactions.filter((t) => t.reconciledItemId).map((t) => t.reconciledItemId!)),
    [transactions]
  );

  // Unreconciled transaction count
  const unreconciledCount = useMemo(
    () => transactions.filter((t) => !t.reconciledItemId).length,
    [transactions]
  );

  const alertes = useMemo(
    () =>
      buildAlertes({
        unreconciledCount,
        pointBas: pointBas?.solde ?? null,
        confortThreshold,
        monthlyNet,
        objectifEpargne: onboarding.objectifEpargne,
        tensionLevel: fragilite.level,
      }),
    [unreconciledCount, pointBas, confortThreshold, monthlyNet, onboarding.objectifEpargne, fragilite.level]
  );

  // Remaining month stats
  const { revenusAVenir, depensesAVenir } = useMemo(() => {
    const today = new Date();
    const daysLeft =
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() -
      today.getDate() +
      1;
    const slice = projection90.slice(0, daysLeft);
    const revenusAVenir = slice
      .flatMap((d) => d.events)
      .filter((e) => e.direction === "revenu")
      .reduce((s, e) => s + e.montant, 0);
    const depensesAVenir = slice
      .flatMap((d) => d.events)
      .filter((e) => e.direction === "depense")
      .reduce((s, e) => s + e.montant, 0);
    return { revenusAVenir, depensesAVenir };
  }, [projection90]);

  const epargneCeMois = revenusAVenir - depensesAVenir;

  const hasData = totalRevenus > 0 || totalDepenses > 0;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Empty state ───────────────────────────────────────────────
  if (!hasData) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <EmptyState
          title="Base financière vide"
          description="Complétez l'onboarding pour voir votre cockpit de pilotage."
          action={
            <Button
              size="sm"
              leftIcon={<Plus size={13} />}
              onClick={() => (window.location.href = "/onboarding")}
            >
              Configurer
            </Button>
          }
        />
      </div>
    );
  }

  // ── Cockpit ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <p className="text-xs text-ink-ghost font-mono capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-[10px] text-ink-ghost">
            <span className="w-1.5 h-1.5 rounded-full bg-calm animate-pulse" />
            IA Active
          </div>
          <button
            onClick={() => router.push("/focus")}
            title="Mode Focus (f)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-ink-soft hover:bg-surface-overlay hover:text-ink transition-colors"
          >
            <Maximize2 size={13} />
            Focus
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 overflow-auto">
        {/* Signal IA */}
        <SignalIA
          totalRevenus={totalRevenus}
          totalDepenses={totalDepenses}
          solde={monthlyNet}
          pointBas={pointBas?.solde}
          runwayJours={runway.jours}
          confortThreshold={confortThreshold}
          monthlyNet={monthlyNet}
          tensionScore={fragilite.score}
        />

        {/* 2-col layout */}
        <div
          className="mt-5 grid gap-5"
          style={{ gridTemplateColumns: "1fr 296px" }}
        >
          {/* ── Left column ──────────────────────────────────── */}
          <div className="space-y-5 min-w-0">
            {/* KPIs */}
            <CockpitKPIs
              runway={runway}
              fragilite={fragilite}
              momentum={momentum}
              soldeEffectif={soldeEffectif}
              monthlyNet={monthlyNet}
            />

            {/* Projection 90j */}
            {projection90.length > 0 && (
              <ProjectionCockpit
                projections={projection90}
                confortThreshold={confortThreshold}
                scenarioProjections={scenarioProjection}
                scenarioColor={activeScenario?.color}
              />
            )}

            {/* Bottom stats */}
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${4 + (totalEngagements > 0 ? 1 : 0) + (burnRateResult !== null ? 1 : 0)}, minmax(0, 1fr))`,
              }}
            >
              <StatBox
                label="Solde actuel"
                value={soldeEffectif !== null ? fmt(soldeEffectif) : "—"}
                color={
                  soldeEffectif !== null && soldeEffectif < confortThreshold
                    ? "var(--critique)"
                    : "var(--ink)"
                }
              />
              <StatBox
                label="Revenus à venir"
                value={fmt(revenusAVenir)}
                color="var(--calm)"
                prefix="+"
              />
              <StatBox
                label="Dépenses à venir"
                value={fmt(depensesAVenir)}
                color="var(--critique)"
                prefix="-"
              />
              <StatBox
                label="Épargne ce mois"
                value={fmt(Math.abs(epargneCeMois))}
                color={epargneCeMois >= 0 ? "var(--calm)" : "var(--critique)"}
                prefix={epargneCeMois >= 0 ? "+" : "-"}
              />
              {totalEngagements > 0 && (
                <StatBox
                  label="Engagements restants"
                  value={fmt(totalEngagements)}
                  color="var(--attention)"
                />
              )}
              {burnRateResult !== null && (
                <StatBox
                  label={`Burn rate (${burnRateResult.moisCount} mois)`}
                  value={fmt(burnRateResult.burnRate)}
                  color={
                    burnRateResult.burnRate > totalDepensesAvecEngagements * 1.1
                      ? "var(--attention)"
                      : "var(--ink)"
                  }
                  prefix="-"
                />
              )}
            </div>
          </div>

          {/* ── Right column ─────────────────────────────────── */}
          <div className="space-y-4">
            <ProchainVirement items={active} />
            <CeQuiArrive
              projections={next7Projections}
              reconciledItemIds={reconciledItemIds}
            />
            <AlertesActives alertes={alertes} />
            <ScenarioRapide
              active={active}
              soldeEffectif={soldeEffectif}
              monthlyNet={monthlyNet}
              totalRevenus={totalRevenus}
              totalDepenses={totalDepensesAvecEngagements}
              runwayJours={runway.jours}
              tensionScore={fragilite.score}
              tensionLevel={fragilite.level}
              confortThreshold={confortThreshold}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  prefix,
}: {
  label: string;
  value: string;
  color?: string;
  prefix?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-2">
        {label}
      </p>
      <p className="text-base font-bold tabular-nums leading-none" style={{ color }}>
        {prefix && value !== "—" ? prefix : ""}
        {value}
      </p>
    </div>
  );
}
