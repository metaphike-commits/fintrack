"use client";

import { useEffect, useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface SignalIAProps {
  totalRevenus: number;
  totalDepenses: number;
  solde: number;
  pointBas?: number | null;
  runwayJours?: number | null;
  confortThreshold: number;
  monthlyNet: number;
  tensionScore: number;
}

export function SignalIA({
  totalRevenus,
  totalDepenses,
  solde,
  pointBas,
  runwayJours,
  confortThreshold,
  monthlyNet,
  tensionScore,
}: SignalIAProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (totalRevenus === 0) { setLoading(false); return; }

    const tauxEpargne = totalRevenus > 0 ? (monthlyNet / totalRevenus) * 100 : 0;

    fetch("/api/ai/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalRevenus,
        totalDepenses,
        solde,
        pointBas,
        runwayJours,
        confortJours: runwayJours,
        tauxEpargne,
        nombrePostes: 0,
      }),
    })
      .then((r) => r.json())
      .then((d) => setInsight(d.insight ?? null))
      .catch(() => setInsight(null))
      .finally(() => setLoading(false));
  }, []);

  if (totalRevenus === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl px-5 py-4 flex items-start gap-4"
      style={{
        background:
          "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #6366f1 100%)",
      }}
    >
      {/* Glow blob */}
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }}
      />

      <div className="shrink-0 mt-0.5">
        <Sparkles size={16} className="text-white/80" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1.5">
          Signal IA · Tension {tensionScore}/100
        </p>
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton width="85%" height="13px" />
            <Skeleton width="60%" height="13px" />
          </div>
        ) : insight ? (
          <p className="text-sm text-white/90 leading-relaxed">{insight}</p>
        ) : (
          <p className="text-sm text-white/60 italic">
            Configurez{" "}
            <code className="font-mono text-xs bg-white/10 px-1 rounded">OPENAI_API_KEY</code>{" "}
            pour activer le Signal IA.
          </p>
        )}
      </div>

      {insight && (
        <button className="shrink-0 flex items-center gap-0.5 text-[11px] text-white/60 hover:text-white/90 transition-colors mt-1">
          Voir pourquoi
          <ChevronRight size={11} />
        </button>
      )}

      {/* Seuil de confort indicator */}
      {pointBas !== null && pointBas !== undefined && pointBas < confortThreshold && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20" />
      )}
    </div>
  );
}
