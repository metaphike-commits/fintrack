import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { useCompteStore } from "@/store/compte";

/**
 * Solde de référence pour tous les calculs de runway : somme des comptes
 * marqués "inclus dans le runway" (les comptes crédit en sont toujours
 * exclus, cf. `getSoldeRunway`), avec repli sur l'ancien solde mono-compte
 * legacy si aucun compte n'est configuré. Unifié ici pour que Cockpit,
 * Timeline, Budget, Focus et Scénarios lisent tous exactement la même
 * source — avant ce hook, chacun refaisait `getSoldeRunway(comptes) ??
 * soldeCourant` séparément.
 *
 * Ce que ce hook NE fait PAS — et c'est volontaire, pas un oubli à corriger :
 * il ne déduit pas les charges en attente (`pendingOverdue`) et n'inclut pas
 * les mensualités d'engagements. Chaque vue applique ça différemment par
 * choix produit assumé :
 * - Cockpit / Timeline / Budget : vues "réelles" — déduisent `pendingOverdue`
 *   et incluent les engagements, reflètent la trésorerie effective.
 * - Focus / Scénarios : vues exploratoires (badge "Simulation" visible dans
 *   l'UI), n'incluent pas les charges en attente — décision actée au sprint
 *   consolidation du 2026-05-23 (voir docs/TASKS.md).
 */
export function useSoldeEffectif(): number | null {
  const comptes = useComptesStore((s) => s.comptes);
  const soldeCourant = useCompteStore((s) => s.soldeCourant);
  return getSoldeRunway(comptes) ?? soldeCourant;
}
