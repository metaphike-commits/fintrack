"use client";

import { AlertTriangle, Link2Off, TrendingDown, Target, CheckCircle2 } from "lucide-react";

export interface Alerte {
  id: string;
  niveau: "info" | "attention" | "critique";
  titre: string;
  description: string;
  icon: "reconciliation" | "trend" | "objectif" | "tension";
}

interface AlertesActivesProps {
  alertes: Alerte[];
}

const NIVEAU_STYLES = {
  info: {
    border: "border-l-accent",
    bg: "bg-accent-soft",
    text: "text-accent",
    dot: "bg-accent",
  },
  attention: {
    border: "border-l-attention",
    bg: "bg-attention-soft",
    text: "text-attention",
    dot: "bg-attention",
  },
  critique: {
    border: "border-l-critique",
    bg: "bg-critique-soft",
    text: "text-critique",
    dot: "bg-critique",
  },
};

function AlerteIcon({ icon, className }: { icon: Alerte["icon"]; className?: string }) {
  switch (icon) {
    case "reconciliation": return <Link2Off size={12} className={className} />;
    case "trend": return <TrendingDown size={12} className={className} />;
    case "objectif": return <Target size={12} className={className} />;
    case "tension": return <AlertTriangle size={12} className={className} />;
  }
}

export function AlertesActives({ alertes }: AlertesActivesProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">
          Alertes actives
        </p>
        {alertes.length > 0 && (
          <span className="text-[10px] font-medium text-attention bg-attention-soft px-2 py-0.5 rounded-full">
            {alertes.length}
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {alertes.length === 0 ? (
          <div className="px-4 py-5 flex items-center gap-3">
            <CheckCircle2 size={14} className="text-calm shrink-0" />
            <p className="text-xs text-ink-soft">Aucune alerte — situation saine</p>
          </div>
        ) : (
          alertes.map((alerte) => {
            const s = NIVEAU_STYLES[alerte.niveau];
            return (
              <div
                key={alerte.id}
                className={`flex items-start gap-3 px-4 py-3 border-l-2 ${s.border} hover:bg-surface-overlay transition-colors`}
              >
                <div className={`shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center ${s.bg}`}>
                  <AlerteIcon icon={alerte.icon} className={s.text} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink leading-snug">{alerte.titre}</p>
                  <p className="text-[10px] text-ink-soft mt-0.5 leading-snug">{alerte.description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Builds the list of active alerts from computed financial state. */
export function buildAlertes({
  unreconciledCount,
  pointBas,
  confortThreshold,
  monthlyNet,
  objectifEpargne,
  tensionLevel,
}: {
  unreconciledCount: number;
  pointBas: number | null;
  confortThreshold: number;
  monthlyNet: number;
  objectifEpargne: number;
  tensionLevel: "faible" | "modéré" | "élevé" | "critique";
}): Alerte[] {
  const list: Alerte[] = [];

  if (unreconciledCount > 0) {
    list.push({
      id: "reconciliation",
      niveau: "attention",
      titre: `${unreconciledCount} transaction${unreconciledCount > 1 ? "s" : ""} non réconciliée${unreconciledCount > 1 ? "s" : ""}`,
      description: "Des mouvements importés n'ont pas de correspondance dans la Base Financière.",
      icon: "reconciliation",
    });
  }

  if (pointBas !== null && pointBas < confortThreshold) {
    list.push({
      id: "point-bas",
      niveau: pointBas < 0 ? "critique" : "attention",
      titre: `Point bas sous le seuil de confort`,
      description: `Le solde projeté descend à ${Math.round(pointBas).toLocaleString("fr-FR")} € — sous votre seuil de ${Math.round(confortThreshold).toLocaleString("fr-FR")} €.`,
      icon: "tension",
    });
  }

  if (objectifEpargne > 0 && monthlyNet < objectifEpargne) {
    list.push({
      id: "objectif-epargne",
      niveau: monthlyNet < 0 ? "critique" : "attention",
      titre: "Objectif d'épargne en danger",
      description: `Net mensuel (${monthlyNet >= 0 ? "+" : ""}${Math.round(monthlyNet).toLocaleString("fr-FR")} €) inférieur à l'objectif (${Math.round(objectifEpargne).toLocaleString("fr-FR")} €).`,
      icon: "objectif",
    });
  }

  if (tensionLevel === "élevé" || tensionLevel === "critique") {
    list.push({
      id: "tension",
      niveau: tensionLevel === "critique" ? "critique" : "attention",
      titre: `Score de tension ${tensionLevel}`,
      description:
        tensionLevel === "critique"
          ? "Plusieurs indicateurs simultanément dégradés — revoyez votre Base Financière."
          : "La situation financière mérite une attention particulière ce mois-ci.",
      icon: "tension",
    });
  }

  return list;
}
