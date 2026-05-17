"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, CalendarDays, Plus, ArrowRight, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useOnboardingStore } from "@/store/onboarding";
import { useCompteStore } from "@/store/compte";
import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { useTimelineStore } from "@/store/timeline";
import { usePreferencesStore } from "@/store/preferences";
import { calculateRunway, calculateRunwayConfort } from "@/lib/runway";
import { projectDailyBalance, getPointBas, getProchainPaiement } from "@/lib/projection";
import { getRowsForMonth } from "@/lib/timeline";
import { RunwayHero } from "./RunwayHero";
import { AiInsight } from "./AiInsight";
import { MiniGraphique } from "./MiniGraphique";
import { ComptesCompacts } from "./ComptesCompacts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

function toMensuel(item: { montant: number; frequence: string }): number {
  switch (item.frequence) {
    case "hebdomadaire": return item.montant * 52 / 12;
    case "trimestriel": return item.montant / 3;
    case "annuel": return item.montant / 12;
    default: return item.montant;
  }
}

function formatEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const SHORTCUTS = [
  { href: "/base-financiere", label: "Ajouter un poste", icon: <Plus size={15} />, desc: "Base Financière" },
  { href: "/timeline", label: "Voir la timeline", icon: <CalendarDays size={15} />, desc: "Ce mois" },
  { href: "/scenarios", label: "Nouveau scénario", icon: <GitBranch size={15} />, desc: "Simulation" },
];

export function HomeView() {
  const router = useRouter();
  const { items, seedFromOnboarding } = useBaseFinanciereStore();
  const onboarding = useOnboardingStore();
  const { soldeCourant, setSoldeCourant } = useCompteStore();
  const comptes = useComptesStore((s) => s.comptes);
  const soldeRunway = getSoldeRunway(comptes);
  const soldeEffectif = soldeRunway ?? soldeCourant;
  const { paid } = useTimelineStore();
  const { confortThreshold, setConfortThreshold } = usePreferencesStore();

  useEffect(() => {
    if (onboarding.completed && onboarding.revenus.length > 0) {
      seedFromOnboarding(onboarding.revenus, onboarding.depenses);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "f" && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        router.push("/focus");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const active = useMemo(() => items.filter((i) => !i.archived), [items]);
  const revenus = useMemo(() => active.filter((i) => i.direction === "revenu"), [active]);
  const depenses = useMemo(() => active.filter((i) => i.direction === "depense"), [active]);

  const totalRevenus = useMemo(() => revenus.reduce((s, i) => s + toMensuel(i), 0), [revenus]);
  const totalDepenses = useMemo(() => depenses.reduce((s, i) => s + toMensuel(i), 0), [depenses]);
  const solde = totalRevenus - totalDepenses;
  const tauxEpargne = totalRevenus > 0 ? (solde / totalRevenus) * 100 : 0;

  const plusGrosseDepense = depenses.length
    ? depenses.reduce((a, b) => toMensuel(a) > toMensuel(b) ? a : b).label
    : undefined;

  const runway = calculateRunway(soldeEffectif, totalRevenus, totalDepenses);
  const runwayConfort = calculateRunwayConfort(soldeEffectif, totalRevenus, totalDepenses, confortThreshold);

  // Day-by-day 30-day projection
  const dailyProjection = useMemo(() => {
    if (soldeEffectif === null) return [];
    return projectDailyBalance(soldeEffectif, active, 30);
  }, [soldeEffectif, active]);

  const pointBas = useMemo(() => getPointBas(dailyProjection), [dailyProjection]);
  const prochainPaiement = useMemo(() => getProchainPaiement(dailyProjection, 7), [dailyProjection]);

  // Reste à payer ce mois
  const now = new Date();
  const monthRows = useMemo(
    () => getRowsForMonth(active, now.getFullYear(), now.getMonth()),
    [active]
  );
  const resteAPayer = useMemo(
    () => monthRows.filter((r) => r.direction === "depense" && !paid[r.key]).reduce((s, r) => s + r.montant, 0),
    [monthRows, paid]
  );

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const hasData = totalRevenus > 0 || totalDepenses > 0;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <PageHeader
        title="Aujourd'hui"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        actions={
          <Link
            href="/focus"
            title="Mode Focus (f)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-ink-soft hover:bg-surface-overlay hover:text-ink transition-colors"
          >
            <Maximize2 size={13} />
            Focus
          </Link>
        }
      />

      {!hasData ? (
        <EmptyState
          title="Base financière vide"
          description="Complétez l'onboarding pour voir votre runway et vos indicateurs."
          action={
            <Button size="sm" leftIcon={<Plus size={13} />} onClick={() => window.location.href = "/onboarding"}>
              Configurer
            </Button>
          }
        />
      ) : (
        <>
          {/* Runway hero (trésorerie + confort) */}
          <RunwayHero
            runway={runway}
            soldeCourant={soldeEffectif}
            onSoldeSet={setSoldeCourant}
            hasComptes={comptes.length > 0}
            soldeTotal={soldeRunway}
            runwayConfort={runwayConfort}
            confortThreshold={confortThreshold}
            onConfortThresholdChange={setConfortThreshold}
          />

          {/* Decision KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <Card elevated>
              <CardContent className="py-4">
                <Stat
                  label="Reste à payer"
                  value={formatEur(resteAPayer)}
                  caption="ce mois"
                  trend={resteAPayer > totalDepenses * 0.5 ? "down" : "neutral"}
                />
              </CardContent>
            </Card>
            <Card elevated>
              <CardContent className="py-4">
                <Stat
                  label="Point bas"
                  value={pointBas ? formatEur(pointBas.solde) : "—"}
                  caption={pointBas ? `le ${fmtDate(pointBas.date)}` : "aucune projection"}
                  trend={pointBas && pointBas.solde < confortThreshold ? "down" : "neutral"}
                />
              </CardContent>
            </Card>
            <Card elevated>
              <CardContent className="py-4">
                <Stat
                  label="Prochain paiement"
                  value={prochainPaiement ? formatEur(prochainPaiement.montant) : "—"}
                  caption={prochainPaiement ? `${prochainPaiement.label} · ${fmtDate(prochainPaiement.date)}` : "aucun dans 7j"}
                  trend="neutral"
                />
              </CardContent>
            </Card>
          </div>

          {/* Mini-graphique 30 jours */}
          {dailyProjection.length > 0 && (
            <Card elevated>
              <CardContent className="py-4">
                <p className="text-xs font-mono uppercase tracking-widest text-ink-ghost mb-3">
                  Projection 30 jours
                </p>
                <MiniGraphique
                  projections={dailyProjection}
                  confortThreshold={confortThreshold}
                />
              </CardContent>
            </Card>
          )}

          {/* Comptes compacts */}
          {comptes.length > 0 && soldeRunway !== null && (
            <ComptesCompacts
              comptes={comptes}
              soldeTotal={soldeRunway}
            />
          )}

          {/* AI insight + action recommandée */}
          <AiInsight
            totalRevenus={totalRevenus}
            totalDepenses={totalDepenses}
            solde={solde}
            objectifEpargne={onboarding.objectifEpargne}
            nombrePostes={active.length}
            plusGrosseDepense={plusGrosseDepense}
            soldeTotal={soldeRunway}
            nombreComptes={comptes.length}
            resteAPayer={resteAPayer}
            pointBas={pointBas?.solde}
            pointBasJour={pointBas?.dayIndex}
            prochainPaiementLabel={prochainPaiement?.label}
            prochainPaiementMontant={prochainPaiement?.montant}
            runwayJours={runway.jours}
            confortJours={runwayConfort.jours}
          />

          {/* Contextual stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card elevated>
              <CardContent className="py-4">
                <Stat
                  label="Dépenses fixes"
                  value={formatEur(totalDepenses)}
                  caption="ce mois"
                  trend={totalDepenses > totalRevenus ? "down" : "neutral"}
                />
              </CardContent>
            </Card>
            <Card elevated>
              <CardContent className="py-4">
                <Stat
                  label="Taux d'épargne"
                  value={`${Math.max(0, tauxEpargne).toFixed(0)}%`}
                  caption={`objectif : ${onboarding.objectifEpargne > 0 ? formatEur(onboarding.objectifEpargne) : "non défini"}`}
                  trend={tauxEpargne > 15 ? "up" : tauxEpargne > 0 ? "neutral" : "down"}
                />
              </CardContent>
            </Card>
            <Card elevated>
              <CardContent className="py-4">
                <Stat
                  label="Postes actifs"
                  value={String(active.length)}
                  caption={`${revenus.length} revenus · ${depenses.length} dépenses`}
                />
              </CardContent>
            </Card>
          </div>

          {/* Quick shortcuts */}
          <div>
            <SectionTitle title="Actions rapides" />
            <div className="flex flex-col gap-2">
              {SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-surface-elevated hover:border-border-strong hover:bg-surface-overlay transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-ink-ghost group-hover:text-accent transition-colors">{s.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-ink">{s.label}</p>
                      <p className="text-xs text-ink-ghost">{s.desc}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-ink-ghost group-hover:text-ink transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
