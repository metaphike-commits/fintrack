"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { BudgetEnvelope } from "@/store/budget";

// ── Category options (variable spending only) ─────────────────────────────────
export const BUDGET_CATEGORIES = [
  { value: "alimentation",  label: "Alimentation" },
  { value: "restauration",  label: "Restauration" },
  { value: "loisirs",       label: "Loisirs" },
  { value: "vêtements",     label: "Vêtements" },
  { value: "santé",         label: "Santé" },
  { value: "transport",     label: "Transport" },
  { value: "carburant",     label: "Carburant" },
  { value: "stationnement", label: "Stationnement" },
  { value: "abonnements",   label: "Abonnements" },
  { value: "autre",         label: "Autre" },
];

const PRESET_COLORS = [
  "#818cf8", "#a78bfa", "#67e8f9", "#22c55e",
  "#f59e0b", "#f97316", "#ec4899", "#14b8a6",
];

const EMPTY: Omit<BudgetEnvelope, "id"> = {
  label: "",
  categorie: "restauration",
  montantPrevu: 0,
  couleur: PRESET_COLORS[0],
  notes: "",
};

interface EnveloppePanelProps {
  open: boolean;
  envelope?: BudgetEnvelope | null;
  onClose: () => void;
  onSave: (data: Omit<BudgetEnvelope, "id">) => void;
  onDelete?: () => void;
}

export function EnveloppePanel({ open, envelope, onClose, onSave, onDelete }: EnveloppePanelProps) {
  const [form, setForm] = useState<Omit<BudgetEnvelope, "id">>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(envelope
        ? {
            label: envelope.label,
            categorie: envelope.categorie,
            categoriesAlias: envelope.categoriesAlias,
            montantPrevu: envelope.montantPrevu,
            couleur: envelope.couleur ?? PRESET_COLORS[0],
            ordre: envelope.ordre,
            notes: envelope.notes ?? "",
          }
        : EMPTY
      );
      setErrors({});
    }
  }, [open, envelope]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "Libellé requis.";
    if (!form.montantPrevu || form.montantPrevu <= 0) e.montantPrevu = "Montant invalide.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave(form);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm bg-surface-elevated border-l border-border shadow-lg",
        "transition-transform duration-250",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-medium text-ink">
            {envelope ? "Modifier l'enveloppe" : "Nouvelle enveloppe"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-ghost hover:text-ink hover:bg-surface-overlay transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Color picker */}
          <div>
            <p className="text-xs text-ink-soft mb-2">Couleur</p>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("couleur", c)}
                  style={{ background: c, width: 22, height: 22, borderRadius: "50%", border: form.couleur === c ? "2px solid white" : "2px solid transparent", outline: form.couleur === c ? `2px solid ${c}` : "none", outlineOffset: 1 }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Libellé"
            placeholder="Ex. : Restaurants"
            value={form.label}
            onChange={e => set("label", e.target.value)}
            error={errors.label}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Catégorie"
              options={BUDGET_CATEGORIES}
              value={form.categorie}
              onChange={e => set("categorie", e.target.value)}
            />
            <Input
              label="Budget mensuel (€)"
              type="number"
              placeholder="0"
              value={form.montantPrevu > 0 ? String(form.montantPrevu) : ""}
              onChange={e => set("montantPrevu", parseFloat(e.target.value) || 0)}
              error={errors.montantPrevu}
            />
          </div>

          <Textarea
            label="Notes"
            placeholder="Contexte ou remarques…"
            rows={3}
            value={form.notes ?? ""}
            onChange={e => set("notes", e.target.value)}
          />
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          {envelope && onDelete && (
            <Button variant="secondary" className="shrink-0" onClick={onDelete}>
              Supprimer
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            {envelope ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </aside>
    </>
  );
}
