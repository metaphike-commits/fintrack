import { create } from "zustand";
import { persist } from "zustand/middleware";

export type EngagementType =
  | "arriere_loyer"      // arriéré de loyer
  | "arriere_charge"     // charges/factures en retard
  | "dette_amicale"      // prêt entre particuliers
  | "credit_conso"       // crédit consommation (peut être gelé)
  | "impot"              // impôts / taxes en attente
  | "cb_differe"         // CB à débit différé non encore prélevé
  | "autre";

export type Pression = "haute" | "moderee" | "basse";

export type EtalementMode = "comptant" | "mensuel" | "libre";

export interface Engagement {
  id: string;
  label: string;
  type: EngagementType;
  montantTotal: number;
  montantRestant: number;
  /** Date de contraction de la dette (ISO string) */
  dateDebut?: string;
  /** Date limite de règlement (ISO string) */
  dateEcheance?: string;
  /** Étalement : comptant, mensuel fixe, ou libre */
  etalementMode: EtalementMode;
  /** Montant mensuel si etalementMode = "mensuel" */
  mensualite?: number;
  /** Pression sociale/financière — pertinent pour dette_amicale */
  pression?: Pression;
  /** Crédit gelé (décision Banque de France surendettement) */
  gele?: boolean;
  /** Date de fin du gel (ISO string) */
  dateFinGel?: string;
  /** Compte depuis lequel sera prélevé */
  compteId?: string;
  notes?: string;
  createdAt: string;
  /** Soldé = plus inclus dans les calculs */
  solde: boolean;
}

interface EngagementsState {
  engagements: Engagement[];
  addEngagement: (e: Omit<Engagement, "id" | "createdAt" | "solde">) => void;
  updateEngagement: (id: string, patch: Partial<Omit<Engagement, "id" | "createdAt">>) => void;
  solderEngagement: (id: string) => void;
  deleteEngagement: (id: string) => void;
}

export const useEngagementsStore = create<EngagementsState>()(
  persist(
    (set) => ({
      engagements: [],

      addEngagement: (e) =>
        set((s) => ({
          engagements: [
            ...s.engagements,
            { ...e, id: crypto.randomUUID(), createdAt: new Date().toISOString(), solde: false },
          ],
        })),

      updateEngagement: (id, patch) =>
        set((s) => ({
          engagements: s.engagements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      solderEngagement: (id) =>
        set((s) => ({
          engagements: s.engagements.map((e) => (e.id === id ? { ...e, solde: true, montantRestant: 0 } : e)),
        })),

      deleteEngagement: (id) =>
        set((s) => ({ engagements: s.engagements.filter((e) => e.id !== id) })),
    }),
    { name: "fts-engagements" }
  )
);

/** Total des engagements non soldés (montantRestant) */
export function getTotalEngagements(engagements: Engagement[]): number {
  return engagements
    .filter((e) => !e.solde)
    .reduce((s, e) => s + e.montantRestant, 0);
}

/** Mensualités dues ce mois (engagements etalementMode = "mensuel", non soldés, non gelés) */
export function getMensualitesEngagements(engagements: Engagement[]): number {
  return engagements
    .filter((e) => !e.solde && !e.gele && e.etalementMode === "mensuel" && e.mensualite)
    .reduce((s, e) => s + (e.mensualite ?? 0), 0);
}

export const ENGAGEMENT_TYPE_LABEL: Record<EngagementType, string> = {
  arriere_loyer: "Arriéré de loyer",
  arriere_charge: "Charges en retard",
  dette_amicale: "Dette amicale",
  credit_conso: "Crédit consommation",
  impot: "Impôts / taxes",
  cb_differe: "CB différé",
  autre: "Autre",
};

export const PRESSION_LABEL: Record<Pression, string> = {
  haute:   "Pression haute",
  moderee: "Modérée",
  basse:   "Basse",
};

export const PRESSION_COLOR: Record<Pression, string> = {
  haute:   "#ef4444",
  moderee: "#f59e0b",
  basse:   "#22c55e",
};
