// Single source of truth — all category definitions for the app.
// Benchmarked against Bankin', Linxo, Lydia, YNAB, Mint.

export interface CategoryGroup {
  group: string;
  items: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: "Revenus",
    items: ["salaire", "freelance", "remboursement", "allocation", "revenus-divers"],
  },
  {
    group: "Logement",
    items: ["loyer", "charges", "électricité", "eau", "internet", "téléphonie", "travaux"],
  },
  {
    group: "Transport",
    items: ["carburant", "transport", "taxi-vtc", "stationnement"],
  },
  {
    group: "Alimentation",
    items: ["alimentation", "restauration"],
  },
  {
    group: "Santé",
    items: ["santé", "mutuelle", "sport"],
  },
  {
    group: "Shopping",
    items: ["vêtements", "high-tech", "maison", "beauté"],
  },
  {
    group: "Loisirs",
    items: ["loisirs", "streaming", "voyages", "éducation"],
  },
  {
    group: "Famille",
    items: ["enfants", "animaux", "cadeaux"],
  },
  {
    group: "Financier",
    items: [
      "abonnements", "assurance", "épargne", "crédit",
      "investissement", "frais-bancaires", "impôts", "amende",
    ],
  },
  {
    group: "Autre",
    items: ["autre"],
  },
];

/** Flat list for AI prompts and validation */
export const CATEGORIES_FLAT: string[] = CATEGORY_GROUPS.flatMap(g => g.items);

/** For ImportView: <optgroup> / <option> shape */
export const CATEGORY_OPTGROUPS = CATEGORY_GROUPS.map(g => ({
  group: g.group,
  items: g.items,
}));

/** For ItemPanel's grouped <Select> component */
export const CATEGORY_SELECT_GROUPS = CATEGORY_GROUPS.map(g => ({
  label: g.group,
  options: g.items.map(item => ({
    value: item,
    label: item.charAt(0).toUpperCase() + item.slice(1).replace(/-/g, " "),
  })),
}));
