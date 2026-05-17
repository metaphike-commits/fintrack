"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, TrendingUp, TrendingDown, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { computeTensionScore, computeMomentum } from "@/lib/tensionScore";
import { calculateRunway } from "@/lib/runway";
import { projectDailyBalance, getPointBas } from "@/lib/projection";
import type { BaseItem } from "@/store/baseFinanciere";
import type { ScenarioItem } from "@/store/scenarios";

interface ScenarioRapideProps {
  active: BaseItem[];
  soldeEffectif: number | null;
  monthlyNet: number;
  totalRevenus: number;
  totalDepenses: number;
  runwayJours: number | null;
  tensionScore: number;
  tensionLevel: "faible" | "modéré" | "élevé" | "critique";
  confortThreshold: number;
}

interface ParsedScenario {
  name: string;
  description?: string;
  items: ScenarioItem[];
}

function toMensuel(item: { montant: number; frequence: string }): number {
  switch (item.frequence) {
    case "hebdomadaire": return item.montant * 52 / 12;
    case "trimestriel": return item.montant / 3;
    case "annuel": return item.montant / 12;
    default: return item.montant;
  }
}

export function ScenarioRapide({
  active,
  soldeEffectif,
  monthlyNet,
  totalRevenus,
  totalDepenses,
  runwayJours,
  tensionScore,
  tensionLevel,
  confortThreshold,
}: ScenarioRapideProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute impact of the parsed scenario
  const impact = parsed
    ? computeImpact(parsed.items, active, soldeEffectif, monthlyNet, totalRevenus, totalDepenses, confortThreshold, runwayJours, tensionScore, tensionLevel)
    : null;

  async function handleAnalyse() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setParsed(null);

    try {
      const res = await fetch("/api/ai/scenario-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          baseNet: monthlyNet,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.scenario) {
        // Assign ids
        const items: ScenarioItem[] = (data.scenario.items ?? []).map(
          (it: Omit<ScenarioItem, "id">) => ({ ...it, id: crypto.randomUUID() })
        );
        setParsed({ ...data.scenario, items });
      } else {
        setError("L'IA n'a pas pu analyser ce scénario.");
      }
    } catch {
      setError("Erreur lors de l'analyse — vérifiez OPENAI_API_KEY.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setParsed(null);
    setError(null);
    setPrompt("");
  }

  return (
    <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles size={12} className="text-accent" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost flex-1">
          Scénario rapide
        </p>
        {parsed && (
          <button
            onClick={handleReset}
            className="text-ink-ghost hover:text-ink transition-colors"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {!parsed ? (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAnalyse();
              }}
              placeholder="Que se passe-t-il si je réduis mes restos de 25% ce mois-ci ?"
              className="w-full text-xs text-ink bg-surface border border-border rounded-lg px-3 py-2.5 resize-none leading-relaxed placeholder:text-ink-ghost focus:outline-none focus:border-accent transition-colors"
              rows={3}
            />

            {error && (
              <p className="text-[10px] text-critique">{error}</p>
            )}

            <Button
              size="sm"
              onClick={handleAnalyse}
              disabled={!prompt.trim() || loading}
              className="w-full"
              leftIcon={loading ? undefined : <Sparkles size={11} />}
            >
              {loading ? "Analyse en cours…" : "Analyser (⌘↵)"}
            </Button>
          </>
        ) : (
          <>
            {/* Scenario name */}
            <div>
              <p className="text-xs font-semibold text-ink">{parsed.name}</p>
              {parsed.description && (
                <p className="text-[10px] text-ink-soft mt-0.5">{parsed.description}</p>
              )}
            </div>

            {/* Impact indicators */}
            {impact && (
              <div className="grid grid-cols-2 gap-2">
                <ImpactCard
                  label="Runway"
                  delta={impact.deltaRunway}
                  unit="j"
                  positive={impact.deltaRunway >= 0}
                />
                <ImpactCard
                  label="Tension"
                  delta={-impact.deltaTension}
                  unit="pts"
                  positive={impact.deltaTension > 0}
                  invert
                />
              </div>
            )}

            {/* Items preview */}
            {parsed.items.length > 0 && (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {parsed.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-[10px]">
                    <span className="text-ink-soft truncate">{item.label}</span>
                    <span
                      className={`tabular-nums shrink-0 ml-2 ${
                        item.direction === "revenu" ? "text-calm" : "text-critique"
                      }`}
                    >
                      {item.direction === "revenu" ? "+" : "-"}
                      {item.montant.toLocaleString("fr-FR")} €
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              rightIcon={<ArrowRight size={11} />}
              onClick={() => router.push("/scenarios")}
            >
              Créer ce scénario
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ImpactCard({
  label,
  delta,
  unit,
  positive,
  invert = false,
}: {
  label: string;
  delta: number;
  unit: string;
  positive: boolean;
  invert?: boolean;
}) {
  const isGood = invert ? !positive : positive;
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5 text-center">
      <p className="text-[10px] text-ink-ghost mb-1">{label}</p>
      <div className="flex items-center justify-center gap-1">
        {isGood ? (
          <TrendingUp size={11} className="text-calm" />
        ) : (
          <TrendingDown size={11} className="text-critique" />
        )}
        <span
          className={`text-sm font-bold tabular-nums ${isGood ? "text-calm" : "text-critique"}`}
        >
          {delta >= 0 ? "+" : ""}
          {Math.round(delta)}
          {unit}
        </span>
      </div>
    </div>
  );
}

function computeImpact(
  scenarioItems: ScenarioItem[],
  active: BaseItem[],
  soldeEffectif: number | null,
  monthlyNet: number,
  totalRevenus: number,
  totalDepenses: number,
  confortThreshold: number,
  runwayJours: number | null,
  baseTensionScore: number,
  baseTensionLevel: "faible" | "modéré" | "élevé" | "critique"
) {
  if (soldeEffectif === null || scenarioItems.length === 0) return null;

  const scenarioDelta = scenarioItems.reduce(
    (s, i) => s + (i.direction === "revenu" ? 1 : -1) * toMensuel(i),
    0
  );
  const scenarioNet = monthlyNet + scenarioDelta;

  const scenarioDepenses = totalDepenses + scenarioItems
    .filter((i) => i.direction === "depense")
    .reduce((s, i) => s + toMensuel(i), 0);

  const scenarioRevenus = totalRevenus + scenarioItems
    .filter((i) => i.direction === "revenu")
    .reduce((s, i) => s + toMensuel(i), 0);

  const scenarioRunway = calculateRunway(soldeEffectif, scenarioRevenus, scenarioDepenses);

  // Merge scenario items into base for projection
  const mergedItems: BaseItem[] = [
    ...active,
    ...scenarioItems.map((si) => ({
      ...si,
      archived: false,
      frequence: si.frequence,
      categorie: si.categorie,
    })),
  ];

  const proj = projectDailyBalance(soldeEffectif, mergedItems, 90);
  const pb = getPointBas(proj);

  const scenarioTension = computeTensionScore(
    scenarioRunway.jours,
    pb?.solde ?? null,
    confortThreshold,
    scenarioNet
  );

  const baseRunwayJours = runwayJours ?? 0;
  const scenarioRunwayJours = scenarioRunway.jours ?? (scenarioNet >= 0 ? 180 : 0);

  return {
    deltaRunway: scenarioRunwayJours - baseRunwayJours,
    deltaTension: baseTensionScore - scenarioTension.score,
  };
}
