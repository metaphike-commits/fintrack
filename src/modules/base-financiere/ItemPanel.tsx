"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { cn } from "@/lib/cn";
import { useComptesStore } from "@/store/comptes";
import type { BaseItem, BaseItemType, Direction, Frequence } from "@/store/baseFinanciere";

const DIRECTIONS = [
  { value: "depense", label: "Dépense" },
  { value: "revenu", label: "Revenu" },
];

const CATEGORY_GROUPS = [
  { label: "Revenus",      options: [{ value: "salaire", label: "Salaire" }, { value: "freelance", label: "Freelance" }, { value: "remboursement", label: "Remboursement" }, { value: "allocation", label: "Allocation" }] },
  { label: "Logement",     options: [{ value: "loyer", label: "Loyer" }, { value: "électricité", label: "Électricité" }, { value: "eau", label: "Eau" }, { value: "internet", label: "Internet" }] },
  { label: "Transport",    options: [{ value: "transport", label: "Transport" }, { value: "stationnement", label: "Stationnement" }, { value: "carburant", label: "Carburant" }] },
  { label: "Vie courante", options: [{ value: "alimentation", label: "Alimentation" }, { value: "restauration", label: "Restauration" }, { value: "santé", label: "Santé" }, { value: "loisirs", label: "Loisirs" }, { value: "vêtements", label: "Vêtements" }] },
  { label: "Financier",    options: [{ value: "abonnements", label: "Abonnements" }, { value: "assurance", label: "Assurance" }, { value: "épargne", label: "Épargne" }, { value: "crédit", label: "Crédit" }, { value: "impôts", label: "Impôts" }, { value: "amende", label: "Amende" }] },
  { label: "Autre",        options: [{ value: "autre", label: "Autre" }] },
];

const FREQUENCES = [
  { value: "mensuel", label: "Mensuel" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "annuel", label: "Annuel" },
  { value: "ponctuel", label: "Ponctuel" },
];

interface ItemPanelProps {
  open: boolean;
  item?: BaseItem | null;
  onClose: () => void;
  onSave: (data: Omit<BaseItem, "id" | "archived">) => void;
}

const TYPE_OPTIONS: { value: BaseItemType; label: string; color: string; bg: string }[] = [
  { value: "incompressible", label: "Fixe",     color: "#ef4444", bg: "#ef444418" },
  { value: "reductible",     label: "Variable", color: "#f59e0b", bg: "#f59e0b18" },
  { value: "discret",        label: "Discret",  color: "#6366f1", bg: "#6366f118" },
];

const EMPTY: Omit<BaseItem, "id" | "archived"> = {
  label: "",
  montant: 0,
  direction: "depense",
  categorie: "logement",
  frequence: "mensuel",
  dateDebut: "",
  dateFin: "",
  notes: "",
  billingDay: undefined,
  compteId: undefined,
  type: undefined,
};

export function ItemPanel({ open, item, onClose, onSave }: ItemPanelProps) {
  const comptes = useComptesStore((s) => s.comptes);
  const [form, setForm] = useState<Omit<BaseItem, "id" | "archived">>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(item ? {
        label: item.label,
        montant: item.montant,
        direction: item.direction,
        categorie: item.categorie,
        frequence: item.frequence,
        dateDebut: item.dateDebut ?? "",
        dateFin: item.dateFin ?? "",
        notes: item.notes ?? "",
        billingDay: item.billingDay,
        compteId: item.compteId,
        type: item.type,
      } : EMPTY);
      setErrors({});
    }
  }, [open, item]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "Libellé requis.";
    if (!form.montant || form.montant <= 0) e.montant = "Montant invalide.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave(form);
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm bg-surface-elevated border-l border-border shadow-lg",
          "transition-transform duration-250",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-medium text-ink">
            {item ? "Modifier le poste" : "Nouveau poste"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-ghost hover:text-ink hover:bg-surface-overlay transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <Input
            label="Libellé"
            placeholder="Ex. : Loyer"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            error={errors.label}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Direction"
              options={DIRECTIONS}
              value={form.direction}
              onChange={(e) => set("direction", e.target.value as Direction)}
            />
            <Input
              label="Montant (€)"
              type="number"
              placeholder="0"
              value={form.montant > 0 ? String(form.montant) : ""}
              onChange={(e) => set("montant", parseFloat(e.target.value) || 0)}
              error={errors.montant}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Catégorie"
              groups={CATEGORY_GROUPS}
              value={form.categorie}
              onChange={(e) => set("categorie", e.target.value)}
            />
            <Select
              label="Fréquence"
              options={FREQUENCES}
              value={form.frequence}
              onChange={(e) => set("frequence", e.target.value as Frequence)}
            />
          </div>

          {form.direction === "depense" && (
            <div>
              <p className="text-xs text-ink-soft mb-2">Nature de la dépense</p>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-surface-overlay">
                {TYPE_OPTIONS.map((opt) => {
                  const active = form.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("type", active ? undefined : opt.value)}
                      className={cn(
                        "py-1.5 px-2 rounded-md text-xs font-medium transition-all",
                        active ? "shadow-sm" : "text-ink-ghost hover:text-ink-soft"
                      )}
                      style={active ? { background: opt.bg, color: opt.color } : {}}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.frequence === "mensuel" && (
            <Input
              label="Jour de prélèvement"
              type="number"
              placeholder="1–31"
              value={form.billingDay != null ? String(form.billingDay) : ""}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                set("billingDay", isNaN(v) ? undefined : Math.min(31, Math.max(1, v)));
              }}
              hint="Optionnel — pour le calcul du point bas du mois."
            />
          )}

          {comptes.length > 0 && (
            <Select
              label="Compte associé"
              options={[
                { value: "", label: "Aucun compte" },
                ...comptes.map((c) => ({ value: c.id, label: c.label })),
              ]}
              value={form.compteId ?? ""}
              onChange={(e) => set("compteId", e.target.value || undefined)}
            />
          )}

          <Divider />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date de début"
              type="date"
              value={form.dateDebut ?? ""}
              onChange={(e) => set("dateDebut", e.target.value)}
            />
            <Input
              label="Date de fin"
              type="date"
              value={form.dateFin ?? ""}
              onChange={(e) => set("dateFin", e.target.value)}
              hint="Laisser vide si indéfini."
            />
          </div>

          <Textarea
            label="Notes"
            placeholder="Contexte ou remarques…"
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            {item ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </aside>
    </>
  );
}
