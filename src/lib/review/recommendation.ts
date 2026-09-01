import type { TensionData, HighlightsData, RecommendationData } from "./types";

function fmt(n: number) {
  return `${n.toLocaleString("fr-FR")} €`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function computeRecommendation(
  tension: TensionData,
  highlights: HighlightsData
): RecommendationData {
  const primaryCause = tension.causes[0];

  if (!primaryCause || tension.pointBas === null) {
    return {
      type: "aucun",
      titre: "Situation équilibrée",
      corps: highlights.soldeNet >= 0
        ? "Ce mois-ci, tes revenus couvrent tes dépenses sans tension notable. Continue sur cette lancée — la régularité est la meilleure protection sur le long terme."
        : "Ce mois-ci, tes dépenses dépassent légèrement tes revenus. Reste attentif au mois suivant, mais il n'y a pas de cause spécifique à corriger.",
      impactEstime: null,
    };
  }

  const pbDate = fmtDate(tension.pointBas.date);

  switch (primaryCause.type) {
    case "remboursement_carte":
      return {
        type: "lisser_carte",
        titre: "Lisser le remboursement carte",
        corps: `Le prélèvement de ta carte (${fmt(primaryCause.montant)}) concentre une sortie importante autour du ${pbDate}. Réduire les achats carte en fin de cycle ou augmenter légèrement le virement de couverture mensuel réduirait ce creux d'environ ${fmt(Math.round(primaryCause.montant * 0.35))}.`,
        impactEstime: Math.round(primaryCause.montant * 0.35),
      };

    case "charge_groupee":
      return {
        type: "etaler_paiements",
        titre: "Étaler les charges groupées",
        corps: `Plusieurs charges importantes (${fmt(primaryCause.montant)}) arrivent en quelques jours, créant un creux marqué le ${pbDate}. Décaler l'une d'entre elles d'une semaine améliorerait ton point bas d'environ ${fmt(Math.round(primaryCause.montant * 0.3))}.`,
        impactEstime: Math.round(primaryCause.montant * 0.3),
      };

    case "depense_variable_tardive": {
      const topCat = highlights.topCategories[0];
      return {
        type: "reduire_categorie",
        titre: "Anticiper les dépenses de fin de mois",
        corps: `Les dépenses variables concentrées après le 20 (${fmt(primaryCause.montant)}) accentuent ton creux de fin de mois.${topCat ? ` La catégorie "${topCat.categorie}" est la plus importante ce mois-ci.` : ""} Répartir ces dépenses en début de mois suivant ou prévoir une enveloppe dédiée réduirait naturellement cette tension.`,
        impactEstime: Math.round(primaryCause.montant * 0.25),
      };
    }

    case "revenu_retarde":
      return {
        type: "securiser_virement",
        titre: "Sécuriser la date de virement",
        corps: `Un revenu attendu n'était pas encore encaissé au moment du point bas (${pbDate}). Si ce décalage est récurrent, anticiper avec une petite réserve tampon ou ajuster la date de virement avec ton employeur suffit généralement à effacer cette tension.`,
        impactEstime: null,
      };

    case "exceptionnel":
      return {
        type: "aucun",
        titre: "Dépense exceptionnelle identifiée",
        corps: `La dépense exceptionnelle — ${primaryCause.label} (${fmt(primaryCause.montant)}) — explique l'essentiel de la tension de ce mois. Ce type d'événement est par nature ponctuel. L'essentiel est que ta trajectoire reparte à la hausse dès le mois suivant.`,
        impactEstime: null,
      };
  }
}
