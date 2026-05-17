"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface AiInsightProps {
  totalRevenus: number;
  totalDepenses: number;
  solde: number;
  objectifEpargne: number;
  nombrePostes: number;
  plusGrosseDepense?: string;
  // V3.2 enrichments
  soldeTotal?: number | null;
  nombreComptes?: number;
  resteAPayer?: number;
  pointBas?: number | null;
  pointBasJour?: number;
  prochainPaiementLabel?: string;
  prochainPaiementMontant?: number;
  runwayJours?: number | null;
  confortJours?: number | null;
}

export function AiInsight(props: AiInsightProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (props.totalRevenus === 0) { setLoading(false); return; }

    const tauxEpargne = props.totalRevenus > 0
      ? (props.solde / props.totalRevenus) * 100
      : 0;

    fetch("/api/ai/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...props, tauxEpargne }),
    })
      .then((r) => r.json())
      .then((d) => { setInsight(d.insight ?? null); setAction(d.action ?? null); })
      .catch(() => { setInsight(null); setAction(null); })
      .finally(() => setLoading(false));
  }, []);

  if (props.totalRevenus === 0) return null;

  return (
    <div className="space-y-2">
      {/* Insight */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-surface-overlay border border-border">
        <Sparkles size={14} className="text-accent shrink-0 mt-0.5" />
        {loading ? (
          <Skeleton width="70%" height="16px" />
        ) : insight ? (
          <p className="text-sm text-ink-soft">{insight}</p>
        ) : (
          <p className="text-sm text-ink-ghost italic">
            Configurez <code className="font-mono text-xs">OPENAI_API_KEY</code> pour activer les insights.
          </p>
        )}
      </div>

      {/* Action recommandée */}
      {(loading || action) && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-accent-soft border border-border">
          <ArrowRight size={14} className="text-accent shrink-0 mt-0.5" />
          {loading ? (
            <Skeleton width="55%" height="16px" />
          ) : (
            <p className="text-sm text-ink font-medium">{action}</p>
          )}
        </div>
      )}
    </div>
  );
}
