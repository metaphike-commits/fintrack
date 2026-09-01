"use client";

import { useEffect, useState } from "react";
import { X, Zap } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { BUDGET_CATEGORIES } from "./EnveloppePanel";
import { useTransactionsStore } from "@/store/transactions";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface SaisieForm {
  montant: number;
  label: string;
  categorie: string;
  date: string;
}

const EMPTY: SaisieForm = {
  montant: 0,
  label: "",
  categorie: "restauration",
  date: todayIso(),
};

interface SaisieRapidePanelProps {
  open: boolean;
  onClose: () => void;
}

export function SaisieRapidePanel({ open, onClose }: SaisieRapidePanelProps) {
  const [form, setForm] = useState<SaisieForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addTransactions = useTransactionsStore(s => s.addTransactions);
  const addItem = useBaseFinanciereStore(s => s.addItem);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, date: todayIso() });
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function set<K extends keyof SaisieForm>(key: K, value: SaisieForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.montant || form.montant <= 0) e.montant = "Montant invalide.";
    if (!form.date) e.date = "Date requise.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;

    const resolvedLabel =
      form.label.trim() ||
      (BUDGET_CATEGORIES.find(c => c.value === form.categorie)?.label ?? form.categorie);

    // Local noon → avoids UTC midnight crossing timezone boundaries
    const isoDate = `${form.date}T12:00:00.000Z`;

    // 1. Transaction → Budget module capte immédiatement
    addTransactions([{
      id: crypto.randomUUID(),
      date: isoDate,
      label: resolvedLabel,
      montant: form.montant,
      direction: "depense",
      categorie: form.categorie,
    }]);

    // 2. Ponctuel BaseItem → Timeline reflète la sortie de trésorerie
    addItem({
      label: resolvedLabel,
      montant: form.montant,
      direction: "depense",
      categorie: form.categorie,
      frequence: "ponctuel",
      type: "discret",
      dateDebut: isoDate,
    });

    onClose();
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
        "fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-xs bg-surface-elevated border-l border-border shadow-lg",
        "transition-transform duration-250",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent" />
            <h2 className="text-sm font-medium text-ink">Saisie rapide</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-ghost hover:text-ink hover:bg-surface-overlay transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Montant (€)"
              type="number"
              placeholder="0"
              value={form.montant > 0 ? String(form.montant) : ""}
              onChange={e => set("montant", parseFloat(e.target.value) || 0)}
              error={errors.montant}
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={e => set("date", e.target.value)}
              error={errors.date}
            />
          </div>

          <Select
            label="Catégorie"
            options={BUDGET_CATEGORIES}
            value={form.categorie}
            onChange={e => set("categorie", e.target.value)}
          />

          <Input
            label="Libellé (optionnel)"
            placeholder={BUDGET_CATEGORIES.find(c => c.value === form.categorie)?.label ?? ""}
            value={form.label}
            onChange={e => set("label", e.target.value)}
          />

          <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
            La dépense sera imputée à l&apos;enveloppe correspondante et reflétée dans la Timeline.
          </p>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            Enregistrer
          </Button>
        </div>
      </aside>
    </>
  );
}
