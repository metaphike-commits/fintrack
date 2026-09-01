"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { COMPTE_TYPE_LABEL } from "@/store/comptes";
import type { Compte, CompteType } from "@/store/comptes";

const TYPE_OPTIONS = (Object.entries(COMPTE_TYPE_LABEL) as [CompteType, string][]).map(
  ([value, label]) => ({ value, label })
);

interface ComptePanelProps {
  open: boolean;
  compte?: Compte | null;
  onClose: () => void;
  onSave: (data: Omit<Compte, "id" | "createdAt">) => void;
}

const EMPTY: Omit<Compte, "id" | "createdAt"> = {
  label: "",
  type: "courant",
  institution: "",
  solde: 0,
  includedInRunway: true,
  decouvertAutorise: undefined,
  billingDay: undefined,
};

export function ComptePanel({ open, compte, onClose, onSave }: ComptePanelProps) {
  const [form, setForm] = useState<Omit<Compte, "id" | "createdAt">>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(
        compte
          ? {
              label: compte.label,
              type: compte.type,
              institution: compte.institution,
              solde: compte.solde,
              includedInRunway: compte.includedInRunway,
              decouvertAutorise: compte.decouvertAutorise,
              billingDay: compte.billingDay,
            }
          : EMPTY
      );
      setErrors({});
    }
  }, [open, compte]);

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
          className="fixed inset-0 z-40 bg-black/30 md:bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-sm bg-surface-elevated border-l border-border shadow-lg",
          "transition-transform duration-250",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-medium text-ink">
            {compte ? "Modifier le compte" : "Nouveau compte"}
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
          <Input
            label="Nom du compte"
            placeholder="Ex. : Compte courant SG"
            value={form.label}
            onChange={(e) => set("label", e.target.value)}
            error={errors.label}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={form.type}
              onChange={(e) => {
                const t = e.target.value as CompteType;
                set("type", t);
                if (t === "credit") set("includedInRunway", false);
              }}
            />
            {form.type === "credit" ? (
              <div className="flex flex-col gap-1">
                <Input
                  label="Montant dû ce mois (€)"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.solde !== 0 ? String(Math.abs(form.solde)) : ""}
                  onChange={(e) => set("solde", -(parseFloat(e.target.value) || 0))}
                />
                <p className="text-[10px] text-ink-ghost leading-snug">
                  Montant du dernier relevé · reporté automatiquement en dépense ce mois
                </p>
              </div>
            ) : (
              <Input
                label="Solde actuel (€)"
                type="number"
                placeholder="0"
                value={form.solde !== 0 ? String(form.solde) : ""}
                onChange={(e) => set("solde", parseFloat(e.target.value) || 0)}
              />
            )}
          </div>

          <Input
            label="Institution"
            placeholder="Ex. : Société Générale"
            value={form.institution}
            onChange={(e) => set("institution", e.target.value)}
          />

          {form.type === "credit" ? (
            <Input
              label="Jour de prélèvement (1–31)"
              type="number"
              placeholder="Ex. : 24"
              min="1"
              max="31"
              value={form.billingDay != null ? String(form.billingDay) : ""}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                set("billingDay", isNaN(v) ? undefined : Math.min(31, Math.max(1, v)));
              }}
            />
          ) : (
            <Input
              label="Découvert autorisé (€)"
              type="number"
              placeholder="Ex. : 500"
              value={form.decouvertAutorise != null ? String(form.decouvertAutorise) : ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                set("decouvertAutorise", isNaN(v) || v <= 0 ? undefined : v);
              }}
            />
          )}

          {form.type === "credit" ? (
            <p className="text-[11px] text-ink-ghost leading-snug px-0.5">
              Un compte Crédit n&apos;est jamais compté dans le solde du jour : le montant dû est
              automatiquement ajouté comme dépense à sa date de prélèvement, pour éviter de le
              déduire deux fois.
            </p>
          ) : (
            <Toggle
              label="Inclure dans le runway"
              description="Ce solde est pris en compte dans le calcul de trésorerie."
              checked={form.includedInRunway}
              onChange={(e) => set("includedInRunway", e.target.checked)}
            />
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            {compte ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </aside>
    </>
  );
}
