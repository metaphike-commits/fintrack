"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useScenariosStore, SCENARIO_COLORS, type Scenario, type ScenarioItem } from "@/store/scenarios";
import { useToast } from "@/components/ui/Toast";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { cn } from "@/lib/cn";

interface ScenarioPanelProps {
  open: boolean;
  scenario?: Scenario;
  nextColor: string;
  onClose: () => void;
}

const DIR_OPTIONS = [
  { value: "revenu", label: "Revenu" },
  { value: "depense", label: "Dépense" },
];
const FREQ_OPTIONS = [
  { value: "mensuel", label: "Mensuel" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "annuel", label: "Annuel" },
  { value: "ponctuel", label: "Ponctuel" },
];

function formatEur(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export function ScenarioPanel({ open, scenario, nextColor, onClose }: ScenarioPanelProps) {
  const { addScenario, updateScenario, addItem, removeItem } = useScenariosStore();
  const toast = useToast();

  const [name, setName] = useState("");
  const [color, setColor] = useState(nextColor);

  const [itemLabel, setItemLabel] = useState("");
  const [itemMontant, setItemMontant] = useState("");
  const [itemDir, setItemDir] = useState<"revenu" | "depense">("depense");
  const [itemFreq, setItemFreq] = useState("mensuel");
  const [itemCat, setItemCat] = useState("");

  const [savedId, setSavedId] = useState<string | undefined>(scenario?.id);
  const scenarios = useScenariosStore((s) => s.scenarios);
  const items: ScenarioItem[] = useMemo(
    () => scenarios.find((sc) => sc.id === savedId)?.items ?? [],
    [scenarios, savedId]
  );

  useEffect(() => {
    if (open) {
      if (scenario) {
        setName(scenario.name);
        setColor(scenario.color);
        setSavedId(scenario.id);
      } else {
        setName("");
        setColor(nextColor);
        setSavedId(undefined);
      }
      setItemLabel(""); setItemMontant(""); setItemDir("depense"); setItemFreq("mensuel"); setItemCat("");
    }
  }, [open, scenario, nextColor]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function ensureScenario(): string {
    if (savedId) {
      updateScenario(savedId, { name: name.trim() || "Scénario sans nom", color });
      return savedId;
    }
    const id = crypto.randomUUID();
    addScenario({ id, name: name.trim() || "Scénario sans nom", color, items: [] });
    setSavedId(id);
    return id;
  }

  function handleAddItem() {
    const m = parseFloat(itemMontant);
    if (!itemLabel.trim()) { toast.toast({ variant: "error", title: "Label requis" }); return; }
    if (isNaN(m) || m <= 0) { toast.toast({ variant: "error", title: "Montant invalide" }); return; }

    const id = ensureScenario();
    addItem(id, {
      label: itemLabel.trim(),
      montant: m,
      direction: itemDir,
      frequence: itemFreq as ScenarioItem["frequence"],
      categorie: itemCat.trim() || itemDir,
    });
    setItemLabel(""); setItemMontant(""); setItemCat("");
  }

  function handleSave() {
    if (!name.trim() && !savedId) { toast.toast({ variant: "error", title: "Nommez le scénario" }); return; }
    ensureScenario();
    toast.toast({ variant: "success", title: "Scénario enregistré" });
    onClose();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:bg-black/20"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-surface shadow-xl flex flex-col transition-transform duration-250",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-ink">
            {scenario ? "Modifier le scénario" : "Nouveau scénario"}
          </h2>
          <button onClick={onClose} className="text-ink-ghost hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Name + color */}
          <div className="space-y-3">
            <Input
              label="Nom du scénario"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. : Freelance +500€"
            />
            <div>
              <p className="text-xs font-medium text-ink-soft mb-2">Couleur</p>
              <div className="flex gap-2">
                {SCENARIO_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-transform",
                      color === c && "ring-2 ring-offset-2 ring-border scale-110"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Add item form */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-mono uppercase tracking-widest text-ink-ghost">
              Ajuster les flux
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Libellé"
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="Ex. : Loyer studio"
              />
              <Input
                label="Montant (€)"
                type="number"
                value={itemMontant}
                onChange={(e) => setItemMontant(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Direction"
                value={itemDir}
                onChange={(e) => setItemDir(e.target.value as "revenu" | "depense")}
                options={DIR_OPTIONS}
              />
              <Select
                label="Fréquence"
                value={itemFreq}
                onChange={(e) => setItemFreq(e.target.value)}
                options={FREQ_OPTIONS}
              />
            </div>
            <Input
              label="Catégorie (optionnel)"
              value={itemCat}
              onChange={(e) => setItemCat(e.target.value)}
              placeholder="loyer, salaire…"
            />
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus size={13} />}
              onClick={handleAddItem}
              className="w-full"
            >
              Ajouter ce flux
            </Button>
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-mono uppercase tracking-widest text-ink-ghost">
                Flux ajoutés ({items.length})
              </p>
              <div className="rounded-lg border border-border overflow-hidden">
                {items.map((item) => (
                  <DataRow
                    key={item.id}
                    label={item.label}
                    value={
                      <span className={item.direction === "revenu" ? "text-calm" : "text-critique"}>
                        {item.direction === "revenu" ? "+" : "-"}
                        {formatEur(item.montant)}
                      </span>
                    }
                    action={
                      <button
                        onClick={() => savedId && removeItem(savedId, item.id)}
                        className="text-ink-ghost hover:text-critique transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-border">
          <Button onClick={handleSave} className="w-full">
            Enregistrer le scénario
          </Button>
        </div>
      </div>
    </>
  );
}
