export type RunwayStatus = "critique" | "attention" | "calm" | "stable";

export interface RunwayResult {
  jours: number | null;
  status: RunwayStatus;
  label: string;
  sublabel: string;
}

export function calculateRunway(
  soldeCourant: number | null,
  totalRevenus: number,
  totalDepenses: number
): RunwayResult {
  const net = totalRevenus - totalDepenses;

  if (soldeCourant === null) {
    return { jours: null, status: "calm", label: "—", sublabel: "Renseignez votre solde actuel" };
  }

  if (net >= 0) {
    return {
      jours: null,
      status: "stable",
      label: "Stable",
      sublabel: `+${formatEur(net)}/mois · excédent mensuel`,
    };
  }

  const mois = soldeCourant / Math.abs(net);
  const jours = Math.floor(mois * 30);

  const status: RunwayStatus =
    jours < 30 ? "critique" : jours < 60 ? "attention" : "calm";

  const label =
    jours >= 365
      ? `${Math.floor(jours / 30)} mois`
      : `${jours} j`;

  return {
    jours,
    status,
    label,
    sublabel: `à taux actuel · ${formatEur(Math.abs(net))}/mois de déficit`,
  };
}

export function calculateRunwayConfort(
  soldeCourant: number | null,
  totalRevenus: number,
  totalDepenses: number,
  confortThreshold: number
): RunwayResult {
  if (soldeCourant === null) {
    return { jours: null, status: "calm", label: "—", sublabel: "Solde non renseigné" };
  }

  const net = totalRevenus - totalDepenses;
  const soldeConfort = soldeCourant - confortThreshold;

  if (soldeConfort <= 0) {
    return {
      jours: 0,
      status: "critique",
      label: "Sous seuil",
      sublabel: `En dessous du seuil de confort (${formatEur(confortThreshold)})`,
    };
  }

  if (net >= 0) {
    return {
      jours: null,
      status: "stable",
      label: "Stable",
      sublabel: `Seuil de confort maintenu`,
    };
  }

  const mois = soldeConfort / Math.abs(net);
  const jours = Math.floor(mois * 30);
  const status: RunwayStatus =
    jours < 30 ? "critique" : jours < 60 ? "attention" : "calm";
  const label = jours >= 365 ? `${Math.floor(jours / 30)} mois` : `${jours} j`;

  return {
    jours,
    status,
    label,
    sublabel: `avant le seuil de ${formatEur(confortThreshold)}`,
  };
}

function formatEur(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}
