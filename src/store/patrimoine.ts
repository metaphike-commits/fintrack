import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActifType = "immobilier" | "financier" | "liquidités" | "véhicule" | "autre";
export type PassifType = "amicale" | "fiscale" | "crédit conso" | "crédit immobilier" | "banque" | "découvert" | "autre";
export type PassifStatut = "actif" | "on_hold" | "gele_bdf" | "negociation" | "rembourse";
export type ObjectifType = "épargne" | "remboursement" | "acquisition";

export interface Actif {
  id: string;
  label: string;
  type: ActifType;
  valeur: number;
  valeurAcquisition?: number;
  dateAcquisition?: string;
  notes?: string;
}

export interface Passif {
  id: string;
  /** Organisme / créancier */
  label: string;
  type: PassifType;
  statut?: PassifStatut;
  /** Capital restant dû */
  capital: number;
  montantInitial?: number;
  mensualite?: number;
  /** Date d'octroi du crédit (ISO) */
  dateOctroi?: string;
  /** Durée totale en mois */
  dureeMois?: number;
  tauxInteret?: number;
  notes?: string;
}

export interface Objectif {
  id: string;
  label: string;
  type: ObjectifType;
  cible: number;
  actuel: number;
  dateButoir?: string;
  color?: string;
}

/** Minimal shape from useEngagementsStore — avoids circular import */
export interface EngagementSeed {
  label: string;
  type: string;
  montantRestant: number;
  montantTotal: number;
  etalementMode: string;
  mensualite?: number;
  dateDebut?: string;
  gele?: boolean;
  pression?: string;
  notes?: string;
  solde: boolean;
}

const ENG_TYPE_MAP: Record<string, PassifType> = {
  dette_amicale:  "amicale",
  impot:          "fiscale",
  credit_conso:   "crédit conso",
  cb_differe:     "banque",
  arriere_loyer:  "autre",
  arriere_charge: "autre",
  autre:          "autre",
};

function engStatut(e: EngagementSeed): PassifStatut {
  if (e.gele)                    return "gele_bdf";
  if (e.type === "dette_amicale") return "on_hold";
  return "actif";
}

interface PatrimoineState {
  actifs: Actif[];
  passifs: Passif[];
  objectifs: Objectif[];
  seededFromEngagements: boolean;

  addActif:    (a: Omit<Actif,   "id">) => void;
  updateActif: (id: string, patch: Partial<Omit<Actif,   "id">>) => void;
  deleteActif: (id: string) => void;

  addPassif:    (p: Omit<Passif,   "id">) => void;
  updatePassif: (id: string, patch: Partial<Omit<Passif,   "id">>) => void;
  deletePassif: (id: string) => void;

  addObjectif:    (o: Omit<Objectif, "id">) => void;
  updateObjectif: (id: string, patch: Partial<Omit<Objectif, "id">>) => void;
  deleteObjectif: (id: string) => void;

  seedFromEngagements: (engagements: EngagementSeed[]) => void;
}

export const usePatrimoineStore = create<PatrimoineState>()(
  persist(
    (set) => ({
      actifs: [], passifs: [], objectifs: [],
      seededFromEngagements: false,

      addActif: (a) =>
        set((s) => ({ actifs: [...s.actifs, { ...a, id: crypto.randomUUID() }] })),
      updateActif: (id, patch) =>
        set((s) => ({ actifs: s.actifs.map((a) => a.id === id ? { ...a, ...patch } : a) })),
      deleteActif: (id) =>
        set((s) => ({ actifs: s.actifs.filter((a) => a.id !== id) })),

      addPassif: (p) =>
        set((s) => ({ passifs: [...s.passifs, { ...p, id: crypto.randomUUID() }] })),
      updatePassif: (id, patch) =>
        set((s) => ({ passifs: s.passifs.map((p) => p.id === id ? { ...p, ...patch } : p) })),
      deletePassif: (id) =>
        set((s) => ({ passifs: s.passifs.filter((p) => p.id !== id) })),

      addObjectif: (o) =>
        set((s) => ({ objectifs: [...s.objectifs, { ...o, id: crypto.randomUUID() }] })),
      updateObjectif: (id, patch) =>
        set((s) => ({ objectifs: s.objectifs.map((o) => o.id === id ? { ...o, ...patch } : o) })),
      deleteObjectif: (id) =>
        set((s) => ({ objectifs: s.objectifs.filter((o) => o.id !== id) })),

      seedFromEngagements: (engagements) =>
        set((s) => {
          if (s.seededFromEngagements) return {};
          const seeded: Passif[] = engagements
            .filter((e) => !e.solde && e.montantRestant > 0)
            .map((e) => ({
              id: crypto.randomUUID(),
              label: e.label,
              type: ENG_TYPE_MAP[e.type] ?? "autre",
              statut: engStatut(e),
              capital: e.montantRestant,
              montantInitial: e.montantTotal > 0 ? e.montantTotal : undefined,
              mensualite: e.etalementMode === "mensuel" ? e.mensualite : undefined,
              dateOctroi: e.dateDebut,
              notes: e.notes,
            }));
          return { seededFromEngagements: true, passifs: [...s.passifs, ...seeded] };
        }),
    }),
    { name: "fts-patrimoine" }
  )
);

// ── Labels & colours ──────────────────────────────────────────────────────────

export const ACTIF_TYPE_LABELS: Record<ActifType, string> = {
  immobilier: "Immobilier",
  financier:  "Placement",
  liquidités: "Liquidités",
  véhicule:   "Véhicule",
  autre:      "Autre",
};

export const PASSIF_TYPE_LABELS: Record<PassifType, string> = {
  amicale:            "Amicale",
  fiscale:            "Fiscale",
  "crédit conso":     "Crédit conso",
  "crédit immobilier":"Crédit immo.",
  banque:             "Banque",
  découvert:          "Découvert",
  autre:              "Autre",
};

export const PASSIF_STATUT_LABELS: Record<PassifStatut, string> = {
  actif:       "Actif",
  on_hold:     "On hold",
  gele_bdf:    "Gelée BDF",
  negociation: "Négociations",
  rembourse:   "Remboursé",
};

export const PASSIF_STATUT_COLOR: Record<PassifStatut, { text: string; bg: string }> = {
  actif:       { text: "#6366f1", bg: "#6366f118" },
  on_hold:     { text: "#f59e0b", bg: "#f59e0b18" },
  gele_bdf:    { text: "#ef4444", bg: "#ef444418" },
  negociation: { text: "#06b6d4", bg: "#06b6d418" },
  rembourse:   { text: "#22c55e", bg: "#22c55e18" },
};

export const OBJECTIF_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
