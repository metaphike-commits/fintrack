"use client";

import { useState } from "react";
import { Sparkles, Check, X, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useScenariosStore } from "@/store/scenarios";
import { toMensuel } from "@/lib/projection";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface ParsedItem {
  label: string;
  montant: number;
  direction: "revenu" | "depense";
  frequence: "mensuel" | "hebdomadaire" | "trimestriel" | "annuel" | "ponctuel";
  categorie: string;
}

interface ParsedScenario {
  name: string;
  description: string;
  items: ParsedItem[];
}

const FREQ_LABEL: Record<string, string> = {
  mensuel: "mois", hebdomadaire: "sem.", trimestriel: "trim.", annuel: "an", ponctuel: "unique",
};

function formatEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

interface ScenarioParserProps {
  baseNet: number;
  nextColor: string;
}

export function ScenarioParser({ baseNet, nextColor }: ScenarioParserProps) {
  const { addScenario } = useScenariosStore();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedScenario | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleParse() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setConfirmed(false);

    try {
      const res = await fetch("/api/ai/scenario-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, baseNet }),
      });
      const data = await res.json();
      if (data.error || !data.scenario) {
        setError(data.error ?? "Aucun scénario détecté.");
      } else {
        setPreview(data.scenario);
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!preview) return;
    addScenario({
      id: crypto.randomUUID(),
      name: preview.name,
      description: preview.description,
      color: nextColor,
      items: preview.items.map((i) => ({ ...i, id: crypto.randomUUID() })),
    });
    setConfirmed(true);
    setPreview(null);
    setPrompt("");
    setTimeout(() => setConfirmed(false), 2000);
  }

  function handleCancel() {
    setPreview(null);
    setError(null);
  }

  const previewDelta = preview
    ? preview.items.reduce((s, i) => {
        const m = toMensuel(i);
        return s + (i.direction === "revenu" ? m : -m);
      }, 0)
    : 0;

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
      <p className="text-xs font-mono uppercase tracking-widest text-ink-ghost flex items-center gap-1.5">
        <Sparkles size={11} />
        Décrire un scénario par IA
      </p>

      {/* Input */}
      {!preview && (
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleParse();
            }}
            rows={2}
            placeholder="Ex : je prends un abonnement Netflix 15€/mois et j'arrête ma salle de sport à 40€..."
            className={cn(
              "w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink",
              "placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent",
              "transition-colors"
            )}
          />
          <div className="flex items-center justify-between gap-2">
            {error && (
              <p className="text-xs text-critique">{error}</p>
            )}
            {confirmed && (
              <p className="text-xs text-calm flex items-center gap-1">
                <Check size={11} /> Scénario créé
              </p>
            )}
            {!error && !confirmed && (
              <p className="text-xs text-ink-ghost">⌘↵ pour envoyer</p>
            )}
            <Button
              size="sm"
              onClick={handleParse}
              disabled={loading || !prompt.trim()}
              leftIcon={loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              className="shrink-0"
            >
              {loading ? "Analyse…" : "Analyser"}
            </Button>
          </div>
        </div>
      )}

      {/* Preview card */}
      {preview && (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{preview.name}</p>
                {preview.description && (
                  <p className="text-xs text-ink-soft mt-0.5">{preview.description}</p>
                )}
              </div>
              <span
                className={cn(
                  "text-xs flex items-center gap-1 shrink-0",
                  previewDelta >= 0 ? "text-calm" : "text-critique"
                )}
              >
                {previewDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {previewDelta >= 0 ? "+" : ""}{formatEur(previewDelta)}/mois
              </span>
            </div>

            {preview.items.length > 0 && (
              <div className="flex flex-col gap-1 pt-1 border-t border-border">
                {preview.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-ink-soft truncate">{item.label}</span>
                    <span
                      className={cn(
                        "font-mono tabular-nums shrink-0 ml-3",
                        item.direction === "revenu" ? "text-calm" : "text-critique"
                      )}
                    >
                      {item.direction === "revenu" ? "+" : "−"}
                      {formatEur(item.montant)}/{FREQ_LABEL[item.frequence]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              leftIcon={<Check size={12} />}
              className="flex-1"
            >
              Confirmer et créer
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCancel}
              leftIcon={<X size={12} />}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
