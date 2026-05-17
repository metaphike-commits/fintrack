"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, GitBranch } from "lucide-react";
import Link from "next/link";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useCompteStore } from "@/store/compte";
import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { usePreferencesStore } from "@/store/preferences";
import { useScenariosStore } from "@/store/scenarios";
import {
  projectDailyBalance,
  getPointBas,
  computeBaseNet,
  computeScenarioNet,
} from "@/lib/projection";
import { calculateRunway, calculateRunwayConfort } from "@/lib/runway";
import type { BaseItem } from "@/store/baseFinanciere";
import type { ScenarioItem } from "@/store/scenarios";
import { FocusCourbe } from "./FocusCourbe";

const GHOST_DAYS = 30;
const PROJ_DAYS = 90;

function formatEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function scenarioItemsAsBase(items: ScenarioItem[]): BaseItem[] {
  return items.map((si) => ({
    ...si,
    archived: false,
    dateDebut: undefined,
    dateFin: undefined,
    billingDay: undefined,
    compteId: undefined,
  }));
}

function buildGhostSoldes(soldeEffectif: number, monthlyNet: number): number[] {
  // Linear estimate: 30 days ago → today
  const estimatedStart = soldeEffectif - monthlyNet;
  return Array.from({ length: GHOST_DAYS }, (_, i) =>
    Math.round(estimatedStart + (monthlyNet * i) / (GHOST_DAYS - 1))
  );
}

export function FocusView() {
  const router = useRouter();
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const { items } = useBaseFinanciereStore();
  const { soldeCourant } = useCompteStore();
  const comptes = useComptesStore((s) => s.comptes);
  const soldeRunway = getSoldeRunway(comptes);
  const soldeEffectif = soldeRunway ?? soldeCourant;
  const { confortThreshold } = usePreferencesStore();
  const { scenarios } = useScenariosStore();

  const active = useMemo(() => items.filter((i) => !i.archived), [items]);
  const monthlyNet = useMemo(() => computeBaseNet(active), [active]);

  const ghostSoldes = useMemo(
    () => (soldeEffectif !== null ? buildGhostSoldes(soldeEffectif, monthlyNet) : []),
    [soldeEffectif, monthlyNet]
  );

  const baseProjection = useMemo(() => {
    if (soldeEffectif === null) return [];
    return projectDailyBalance(soldeEffectif, active, PROJ_DAYS);
  }, [soldeEffectif, active]);

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId) ?? null,
    [scenarios, activeScenarioId]
  );

  const scenarioProjection = useMemo(() => {
    if (!activeScenario || soldeEffectif === null) return undefined;
    const combined = [...active, ...scenarioItemsAsBase(activeScenario.items)];
    return projectDailyBalance(soldeEffectif, combined, PROJ_DAYS);
  }, [activeScenario, soldeEffectif, active]);

  const pointBas = useMemo(() => getPointBas(baseProjection), [baseProjection]);
  const scenarioPointBas = useMemo(
    () => (scenarioProjection ? getPointBas(scenarioProjection) : null),
    [scenarioProjection]
  );

  const runway = calculateRunway(soldeEffectif, Math.max(0, monthlyNet), Math.max(0, -monthlyNet));
  const runwayConfort = calculateRunwayConfort(
    soldeEffectif,
    Math.max(0, monthlyNet),
    Math.max(0, -monthlyNet),
    confortThreshold
  );

  const scenarioNet = activeScenario
    ? computeScenarioNet(active, activeScenario.items)
    : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/dashboard");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const hasData = baseProjection.length > 0;

  return (
    <div
      className="focus-mode min-h-screen flex flex-col"
      style={{ background: "var(--surface)", color: "var(--ink)" }}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{
          height: 56,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)" }}
          >
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Mode Focus
          </span>
          <span
            className="text-xs ml-1"
            style={{ color: "var(--ink-soft)", opacity: 0.5 }}
          >
            · 90 jours
          </span>
        </div>

        {/* Scenario pills */}
        {scenarios.length > 0 && (
          <div className="flex items-center gap-2">
            <GitBranch size={12} style={{ color: "var(--ink-soft)", opacity: 0.5 }} />
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() =>
                  setActiveScenarioId((prev) => (prev === sc.id ? null : sc.id))
                }
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors"
                style={{
                  border: `1px solid ${activeScenarioId === sc.id ? sc.color : "var(--border)"}`,
                  background: activeScenarioId === sc.id ? `${sc.color}18` : "transparent",
                  color: activeScenarioId === sc.id ? sc.color : "var(--ink-soft)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: sc.color }}
                />
                {sc.name}
              </button>
            ))}
          </div>
        )}

        {/* Back link */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "var(--ink-soft)" }}
          title="Esc"
        >
          <ArrowLeft size={13} />
          Réel
          <kbd
            className="text-[10px] px-1 rounded"
            style={{
              border: "1px solid var(--border)",
              color: "var(--ink-ghost)",
              fontFamily: "monospace",
            }}
          >
            Esc
          </kbd>
        </Link>
      </header>

      {/* Chart area */}
      <main className="flex-1 flex flex-col justify-center px-6 py-6">
        {!hasData ? (
          <div className="text-center" style={{ color: "var(--ink-soft)" }}>
            <p className="text-sm">Aucune donnée — renseignez votre solde et vos postes.</p>
            <Link
              href="/dashboard"
              className="text-xs mt-2 inline-block"
              style={{ color: "var(--accent)" }}
            >
              Retour au tableau de bord
            </Link>
          </div>
        ) : (
          <div>
            <FocusCourbe
              ghostSoldes={ghostSoldes}
              projections={baseProjection}
              scenarioProjections={scenarioProjection}
              scenarioColor={activeScenario?.color}
              confortThreshold={confortThreshold}
            />

            {/* Point bas summary row */}
            <div className="flex items-center gap-6 mt-2 px-1">
              {pointBas && (
                <span className="text-xs" style={{ color: "var(--critique)", opacity: 0.8 }}>
                  Point bas base : {formatEur(pointBas.solde)} · {fmtDate(pointBas.date)}
                </span>
              )}
              {scenarioPointBas && activeScenario && (
                <span
                  className="text-xs"
                  style={{ color: activeScenario.color, opacity: 0.85 }}
                >
                  Point bas {activeScenario.name} : {formatEur(scenarioPointBas.solde)} · {fmtDate(scenarioPointBas.date)}
                </span>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Stats bar */}
      <footer
        className="flex items-center gap-8 px-6 shrink-0"
        style={{
          height: 64,
          borderTop: "1px solid var(--border)",
        }}
      >
        <StatChip
          label="Runway"
          value={runway.label}
          sub={runway.sublabel}
          status={runway.status}
        />
        <div style={{ width: 1, height: 28, background: "var(--border)" }} />
        <StatChip
          label="Confort"
          value={runwayConfort.label}
          sub={`seuil ${formatEur(confortThreshold)}`}
          status={runwayConfort.status}
        />
        <div style={{ width: 1, height: 28, background: "var(--border)" }} />
        <StatChip
          label="Net mensuel"
          value={formatEur(monthlyNet)}
          sub={monthlyNet >= 0 ? "excédent" : "déficit"}
          status={monthlyNet >= 0 ? "stable" : "critique"}
        />
        {scenarioNet !== null && activeScenario && (
          <>
            <div style={{ width: 1, height: 28, background: "var(--border)" }} />
            <StatChip
              label={`Net · ${activeScenario.name}`}
              value={formatEur(scenarioNet)}
              sub={scenarioNet >= 0 ? "excédent" : "déficit"}
              status={scenarioNet >= 0 ? "stable" : "critique"}
              color={activeScenario.color}
            />
          </>
        )}
      </footer>
    </div>
  );
}

function StatChip({
  label,
  value,
  sub,
  status,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  status: "critique" | "attention" | "calm" | "stable";
  color?: string;
}) {
  const statusColor =
    color ??
    (status === "critique"
      ? "var(--critique)"
      : status === "attention"
      ? "var(--attention)"
      : "var(--calm)");

  return (
    <div className="flex flex-col gap-0.5">
      <p
        className="text-[10px] uppercase tracking-widest font-mono"
        style={{ color: "var(--ink-soft)", opacity: 0.6 }}
      >
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums" style={{ color: statusColor }}>
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "var(--ink-soft)", opacity: 0.5 }}>
        {sub}
      </p>
    </div>
  );
}
