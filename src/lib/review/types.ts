// ── Section 1 ─────────────────────────────────────────────────────────────────

export interface ReconciliationData {
  totalTransactions: number;
  uncategorized: number;
  probableTransfers: number;    // direction:"transfert" sans linkedTransactionId confirmé
  potentialDuplicates: number;  // même montant ± tol, même jour ± 1
  reconciliationRate: number | null;   // 0–100, % ayant reconciledItemId ; null = aucune transaction ce mois (pas "100% réconcilié")
}

// ── Section 2 ─────────────────────────────────────────────────────────────────

export interface CategoryHighlight {
  categorie: string;
  montant: number;
  variationPct: number | null;  // vs même catégorie mois précédent
}

export interface EnveloppeAlert {
  label: string;
  prevu: number;
  reel: number;
  delta: number;   // reel - prevu (+= dépassement, -= sous-conso)
}

export interface HighlightsData {
  totalDepenses: number;
  totalRevenus: number;
  soldeNet: number;
  topCategories: CategoryHighlight[];   // top 5 par montant
  depassements: EnveloppeAlert[];
  sousConsommation: EnveloppeAlert[];   // delta < -20% du prévu
  depensesExceptionnelles: { label: string; montant: number; date: string }[];
}

// ── Section 3 ─────────────────────────────────────────────────────────────────

export type TensionCauseType =
  | "charge_groupee"
  | "depense_variable_tardive"
  | "revenu_retarde"
  | "remboursement_carte"
  | "exceptionnel";

export interface TensionCause {
  label: string;
  montant: number;
  type: TensionCauseType;
}

export interface TensionData {
  pointBas: { solde: number; date: string } | null;
  causes: TensionCause[];     // triées par montant desc, max 3
  narrative: string;
}

// ── Section 4 ─────────────────────────────────────────────────────────────────

export interface BudgetSummaryData {
  aRepartir: number | null;     // solde projeté au jour de revue + revenus mois suivant
  sumEnveloppesPrevu: number;   // enveloppes déjà allouées pour le mois suivant
  resteNonAlloue: number | null;
  topDepensesMoyennes3Mois: { categorie: string; moyenne: number }[];
}

// ── Section 5 ─────────────────────────────────────────────────────────────────

export interface ProjectionData {
  runwayDays: number | null;
  pointBasProjeté: { solde: number; date: string } | null;
  fragiliteScore: number;     // 0–100
  momentum: "positif" | "neutre" | "negatif";
  runwayDeltaVsPrevMonth: number | null;
}

// ── Section 6 ─────────────────────────────────────────────────────────────────

export type RecommendationType =
  | "etaler_paiements"
  | "reduire_categorie"
  | "securiser_virement"
  | "lisser_carte"
  | "aucun";

export interface RecommendationData {
  type: RecommendationType;
  titre: string;
  corps: string;
  impactEstime: number | null;  // € d'amélioration estimée
}

// ── Root ──────────────────────────────────────────────────────────────────────

export interface ReviewData {
  year: number;
  month: number;
  generatedAt: string;          // ISO timestamp
  reconciliation: ReconciliationData;
  highlights: HighlightsData;
  tension: TensionData;
  budgetSummary: BudgetSummaryData;
  projection: ProjectionData;
  recommendation: RecommendationData;
}
