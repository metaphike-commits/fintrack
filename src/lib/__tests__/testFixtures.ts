import type { BaseItem } from "@/store/baseFinanciere";

let idCounter = 0;

/** Minimal valid BaseItem, overridable — keeps tests focused on what they assert. */
export function makeItem(overrides: Partial<BaseItem> = {}): BaseItem {
  idCounter += 1;
  return {
    id: `item-${idCounter}`,
    label: "Test item",
    montant: 100,
    direction: "depense",
    categorie: "autre",
    frequence: "mensuel",
    archived: false,
    ...overrides,
  };
}
