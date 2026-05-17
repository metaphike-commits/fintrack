"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2,
  TrendingUp, TrendingDown, Download, Upload, Save,
  Lock, Scissors, Sparkles, Landmark, FileText, CreditCard,
  Package, Zap, Check,
} from "lucide-react";
import {
  useOnboardingStore,
  type OnboardingCompte,
  type OnboardingRevenu,
  type OnboardingDepense,
  type SaveSlot,
  type OnboardingSnapshot,
} from "@/store/onboarding";
import { useComptesStore } from "@/store/comptes";
import { useEngagementsStore, ENGAGEMENT_TYPE_LABEL, PRESSION_LABEL, PRESSION_COLOR, type EngagementType, type EtalementMode, type Pression } from "@/store/engagements";
import { usePatrimoineStore, type ActifType } from "@/store/patrimoine";
import { useCoupsDursStore } from "@/store/coupsDurs";
import { parseFile, detectRecurring, type ParsedRow } from "@/lib/csvParser";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";

// ── Utils ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function downloadSlot(slot: SaveSlot) {
  if (!slot.snapshot) return;
  const blob = new Blob([JSON.stringify(slot.snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fintrack-${slot.name.replace(/\s+/g, "-").toLowerCase()}.fintrack`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── RunwayArc ────────────────────────────────────────────────────────────

function RunwayArc({ months }: { months: number | null }) {
  const r = 52, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const filled = months === null ? circ * 0.75 : Math.min(1, months / 24) * circ * 0.75;
  const color = months === null ? "var(--calm)" : months > 12 ? "var(--calm)" : months > 6 ? "var(--attention)" : "var(--critique)";
  return (
    <svg width={128} height={128} viewBox="0 0 128 128" className="mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={8}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        transform={`rotate(135 ${cx} ${cy})`} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ - filled}`}
        transform={`rotate(135 ${cx} ${cy})`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={13} fill="var(--ink-ghost)" fontFamily="monospace">Runway</text>
      {months === null ? (
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={20} fill={color} fontWeight="700" fontFamily="sans-serif">∞</text>
      ) : (
        <>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize={22} fill={color} fontWeight="700" fontFamily="monospace">{months}</text>
          <text x={cx} y={cy + 30} textAnchor="middle" fontSize={10} fill="var(--ink-ghost)" fontFamily="sans-serif">mois</text>
        </>
      )}
    </svg>
  );
}

// ── LivePreview ──────────────────────────────────────────────────────────

function LivePreview({
  comptes, revenus, depenses, objectif,
}: {
  comptes: OnboardingCompte[];
  revenus: OnboardingRevenu[];
  depenses: OnboardingDepense[];
  objectif: number;
}) {
  const totalSolde = comptes.reduce((s, c) => s + c.solde, 0);
  const totalRevenus = revenus.reduce((s, r) => s + r.montant, 0);
  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
  const net = totalRevenus - totalDepenses;
  const runwayMonths =
    net < 0 && totalSolde > 0 ? Math.floor(totalSolde / Math.abs(net)) : net >= 0 ? null : 0;
  const isEmpty = comptes.length === 0 && totalRevenus === 0 && totalDepenses === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-1">Aperçu en temps réel</p>
        <p className="text-xs text-ink-soft">Se met à jour à chaque saisie.</p>
      </div>
      {!isEmpty && <RunwayArc months={runwayMonths} />}
      {!isEmpty && (
        <div className="space-y-2.5">
          {comptes.length > 0 && (
            <div className="space-y-1 mb-3">
              {comptes.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-ink-ghost truncate">{c.label}</span>
                  <span className={cn("font-mono", c.solde < 0 ? "text-critique" : "text-ink")}>{fmt(c.solde)}</span>
                </div>
              ))}
              <div className="h-px bg-border/50 my-1" />
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-ink-soft">Total bancaire</span>
                <span className={cn("font-mono", totalSolde < 0 ? "text-critique" : "text-ink")}>{fmt(totalSolde)}</span>
              </div>
            </div>
          )}
          {(totalRevenus > 0 || totalDepenses > 0) && (
            <>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="flex items-center gap-1.5 text-xs text-calm"><TrendingUp size={11} />Revenus</span>
                <span className="text-xs font-mono text-calm">{fmt(totalRevenus)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="flex items-center gap-1.5 text-xs text-critique"><TrendingDown size={11} />Dépenses</span>
                <span className="text-xs font-mono text-critique">{fmt(totalDepenses)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-medium text-ink">Net mensuel</span>
                <span className={cn("text-sm font-bold font-mono", net >= 0 ? "text-calm" : "text-critique")}>
                  {net >= 0 ? "+" : ""}{fmt(net)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
      {objectif > 0 && net > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Objectif épargne</p>
          <div className="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
            <div className="h-full rounded-full bg-calm transition-all duration-500"
              style={{ width: `${Math.min(100, (objectif / net) * 100)}%` }} />
          </div>
          <p className="text-[10px] text-ink-ghost text-right">{fmt(objectif)}/mois</p>
        </div>
      )}
      {isEmpty && (
        <div className="text-center py-6 opacity-40">
          <p className="text-xs text-ink-ghost">Renseignez vos données pour voir l'aperçu.</p>
        </div>
      )}
    </div>
  );
}

// ── Slot card ────────────────────────────────────────────────────────────

function SlotCard({ slot, onResume, onNew, onExport, onClear, onImport }: {
  slot: SaveSlot;
  onResume: () => void;
  onNew: () => void;
  onExport: () => void;
  onClear: () => void;
  onImport: () => void;
}) {
  const snap = slot.snapshot;
  const isEmpty = snap === null;
  const isComplete = snap?.completed === true;
  return (
    <div className={cn(
      "rounded-xl border p-5 flex flex-col gap-4 transition-all",
      isEmpty ? "border-border bg-surface-elevated opacity-60 hover:opacity-100" : "border-border-strong bg-surface-elevated",
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-1">Slot {slot.id}</p>
          <p className="text-sm font-semibold text-ink">{slot.name}</p>
        </div>
        <span className={cn(
          "text-[10px] font-mono px-2 py-0.5 rounded-full border",
          isEmpty ? "text-ink-ghost border-border"
            : isComplete ? "text-calm border-calm/30 bg-calm/10"
            : "text-attention border-attention/30 bg-attention/10",
        )}>
          {isEmpty ? "Vide" : isComplete ? "Terminé" : "En cours"}
        </span>
      </div>
      {snap && (
        <div className="space-y-0.5">
          <p className="text-xs text-ink-soft">
            {isComplete ? "Configuration terminée" : `Étape ${snap.step}/7`}
            {snap.revenus.length + snap.depenses.length > 0 ? ` · ${snap.revenus.length + snap.depenses.length} postes` : ""}
          </p>
          <p className="text-[10px] text-ink-ghost font-mono">{fmtDate(snap.savedAt)}</p>
          {snap.comptes.length > 0 && (
            <p className="text-[10px] text-ink-ghost">
              {snap.comptes.length} compte{snap.comptes.length > 1 ? "s" : ""} · {fmt(snap.comptes.reduce((s, c) => s + c.solde, 0))}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 mt-auto">
        {isEmpty ? (
          <>
            <Button size="sm" onClick={onNew} rightIcon={<ArrowRight size={12} />}>Nouvelle partie</Button>
            <Button size="sm" variant="ghost" onClick={onImport} leftIcon={<Upload size={12} />}>Importer .fintrack</Button>
          </>
        ) : (
          <>
            <Button size="sm" onClick={onResume} rightIcon={<ArrowRight size={12} />}>Reprendre</Button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={onExport} leftIcon={<Download size={12} />}>Exporter</Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={onClear} leftIcon={<Trash2 size={12} />}>Effacer</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Slot selector (step 0) ───────────────────────────────────────────────

function SlotSelector() {
  const store = useOnboardingStore();
  const importRef = useRef<HTMLInputElement>(null);
  const [importSlotId, setImportSlotId] = useState<1 | 2 | 3 | null>(null);

  function handleNew(slotId: 1 | 2 | 3) { store.reset(); store.saveToSlot(slotId); store.setStep(1); }
  function handleResume(slotId: 1 | 2 | 3) { store.loadFromSlot(slotId); }

  function handleImportClick(slotId: 1 | 2 | 3) { setImportSlotId(slotId); importRef.current?.click(); }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !importSlotId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const snap: OnboardingSnapshot = {
          completed: raw.completed ?? false, step: raw.step ?? 1,
          revenus: raw.revenus ?? [], depenses: raw.depenses ?? [],
          comptes: raw.comptes ?? [], objectifEpargne: raw.objectifEpargne ?? 0,
          savedAt: new Date().toISOString(),
        };
        store.setSlotSnapshot(importSlotId, snap);
        store.loadFromSlot(importSlotId);
      } catch { /* ignore invalid files */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface)", color: "var(--ink)" }}>
      <header className="flex items-center gap-2.5 px-6 shrink-0" style={{ height: 52, borderBottom: "1px solid var(--border)" }}>
        <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
          <span className="text-white text-xs font-bold">F</span>
        </div>
        <span className="text-sm font-semibold text-ink">Fintrack</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-2">Configuration</p>
            <h1 className="text-2xl font-bold text-ink">Choisissez votre session</h1>
            <p className="text-sm text-ink-soft mt-2">Trois créneaux indépendants. Reprenez là où vous en étiez.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {store.slots.map((slot) => (
              <SlotCard key={slot.id} slot={slot}
                onNew={() => handleNew(slot.id)} onResume={() => handleResume(slot.id)}
                onExport={() => downloadSlot(slot)} onClear={() => store.clearSlot(slot.id)}
                onImport={() => handleImportClick(slot.id)} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <button onClick={() => { store.reset(); store.setStep(1); }}
              className="text-xs text-ink-ghost hover:text-ink transition-colors underline underline-offset-4">
              Continuer sans sauvegarder
            </button>
          </div>
        </div>
      </div>
      <input ref={importRef} type="file" accept=".fintrack,.json" className="sr-only" onChange={handleImportFile} />
    </div>
  );
}

// ── CP1 — Situation bancaire ─────────────────────────────────────────────

function StepBancaire({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { comptes, addCompte, removeCompte } = useOnboardingStore();
  const { toast } = useToast();
  const [label, setLabel] = useState("Compte courant");
  const [solde, setSolde] = useState("");
  const [decouvert, setDecouvert] = useState("");
  const [decouvertUtilise, setDecouvertUtilise] = useState("");

  function handleAdd() {
    const s = parseFloat(solde);
    if (!label.trim() || isNaN(s)) { toast({ variant: "error", title: "Nom et solde requis" }); return; }
    addCompte({ label: label.trim(), solde: s, decouvertAutorise: decouvert ? parseFloat(decouvert) : undefined, decouvertUtilise: decouvertUtilise ? parseFloat(decouvertUtilise) : undefined });
    setLabel(""); setSolde(""); setDecouvert(""); setDecouvertUtilise("");
  }

  const totalSolde = comptes.reduce((s, c) => s + c.solde, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Situation bancaire</h2>
        <p className="text-sm text-ink-soft mt-1.5">Solde réel aujourd'hui. Entrez un montant négatif si vous êtes à découvert.</p>
      </div>
      <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
        <p className="text-xs font-medium text-ink-soft uppercase tracking-wider">Ajouter un compte</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nom" placeholder="Ex. : Compte courant SG" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input label="Solde actuel (€)" type="number" placeholder="Ex. : 420" value={solde}
            onChange={(e) => setSolde(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Découvert autorisé (€) — optionnel" type="number" placeholder="Ex. : 500"
            value={decouvert} onChange={(e) => setDecouvert(e.target.value)} />
          <Input label="Découvert utilisé (€) — optionnel" type="number" placeholder="Ex. : 80"
            value={decouvertUtilise} onChange={(e) => setDecouvertUtilise(e.target.value)} />
        </div>
        <Button size="sm" onClick={handleAdd} leftIcon={<Plus size={13} />}>Ajouter ce compte</Button>
      </div>
      {comptes.length > 0 && (
        <div className="space-y-2">
          {comptes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-elevated border border-border">
              <Landmark size={13} className="text-ink-ghost shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{c.label}</p>
                {c.decouvertAutorise && (
                  <p className="text-[10px] text-ink-ghost">
                    Découvert : {c.decouvertUtilise ? `${fmt(c.decouvertUtilise)} utilisé / ` : ""}{fmt(c.decouvertAutorise)} autorisé
                  </p>
                )}
              </div>
              <span className={cn("text-sm font-mono font-medium shrink-0", c.solde < 0 ? "text-critique" : "text-ink")}>{fmt(c.solde)}</span>
              <button onClick={() => removeCompte(c.id)} className="text-ink-ghost hover:text-critique transition-colors p-0.5 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-1.5 text-xs border-t border-border/50">
            <span className="text-ink-ghost">Solde total</span>
            <span className={cn("font-mono font-medium", totalSolde < 0 ? "text-critique" : "text-ink")}>{fmt(totalSolde)}</span>
          </div>
        </div>
      )}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={onBack}>Retour</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onNext}>Passer</Button>
          <Button rightIcon={<ArrowRight size={14} />} disabled={comptes.length === 0} onClick={onNext}>Continuer</Button>
        </div>
      </div>
    </div>
  );
}

// ── CP2 — Flux récurrents ────────────────────────────────────────────────

const CATEGORIES = [
  { value: "logement", label: "Logement" }, { value: "transport", label: "Transport" },
  { value: "alimentation", label: "Alimentation" }, { value: "sante", label: "Santé" },
  { value: "abonnements", label: "Abonnements" }, { value: "loisirs", label: "Loisirs" },
  { value: "epargne", label: "Épargne" }, { value: "autre", label: "Autre" },
];

const FIABILITE_OPTIONS = [
  { value: "100", label: "Garanti (salaire, APL, pension)" },
  { value: "80", label: "Probable (CDD, freelance régulier)" },
  { value: "60", label: "Variable (freelance, commissions)" },
  { value: "40", label: "Incertain (occasionnel)" },
];

type DepenseType = "incompressible" | "reductible" | "discret";
const TYPE_OPTIONS: { value: DepenseType; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "incompressible", label: "Incompressible", desc: "Loyer, crédit", icon: <Lock size={13} /> },
  { value: "reductible", label: "Réductible", desc: "Abonnements", icon: <Scissors size={13} /> },
  { value: "discret", label: "Discret", desc: "Loisirs", icon: <Sparkles size={13} /> },
];

const REV_SUGGESTIONS = ["Salaire net", "Freelance", "APL", "Pension", "Dividendes"];
const DEP_SUGGESTIONS: { label: string; cat: string; type: DepenseType }[] = [
  { label: "Loyer", cat: "logement", type: "incompressible" },
  { label: "Mutuelle", cat: "sante", type: "incompressible" },
  { label: "Netflix", cat: "abonnements", type: "reductible" },
  { label: "Transport", cat: "transport", type: "reductible" },
  { label: "Courses", cat: "alimentation", type: "reductible" },
];

function StepFlux({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { revenus, addRevenu, removeRevenu, depenses, addDepense, removeDepense, comptes } = useOnboardingStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<"revenus" | "depenses">("revenus");
  const [rLabel, setRLabel] = useState(""); const [rMontant, setRMontant] = useState("");
  const [rBillingDay, setRBillingDay] = useState(""); const [rFiabilite, setRFiabilite] = useState("100");
  const [dLabel, setDLabel] = useState(""); const [dMontant, setDMontant] = useState("");
  const [dCat, setDCat] = useState("logement"); const [dBillingDay, setDBillingDay] = useState("");
  const [dType, setDType] = useState<DepenseType>("incompressible"); const [dCompteId, setDCompteId] = useState("");

  const compteOptions = [{ value: "", label: "Tous les comptes" }, ...comptes.map((c) => ({ value: c.id, label: c.label }))];

  function handleAddRevenu() {
    const m = parseFloat(rMontant);
    if (!rLabel.trim() || isNaN(m) || m <= 0) { toast({ variant: "error", title: "Libellé et montant requis" }); return; }
    const bd = parseInt(rBillingDay);
    addRevenu({ label: rLabel.trim(), montant: m, billingDay: rBillingDay && !isNaN(bd) ? bd : undefined, fiabilite: parseInt(rFiabilite) });
    setRLabel(""); setRMontant(""); setRBillingDay("");
  }

  function handleAddDepense() {
    const m = parseFloat(dMontant);
    if (!dLabel.trim() || isNaN(m) || m <= 0) { toast({ variant: "error", title: "Libellé et montant requis" }); return; }
    const bd = parseInt(dBillingDay);
    addDepense({ label: dLabel.trim(), montant: m, categorie: dCat, billingDay: dBillingDay && !isNaN(bd) ? bd : undefined, type: dType, compteId: dCompteId || undefined });
    setDLabel(""); setDMontant(""); setDBillingDay("");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-ink">Flux récurrents</h2>
        <p className="text-sm text-ink-soft mt-1.5">Revenus et charges qui reviennent chaque mois.</p>
      </div>
      <div className="flex gap-1 p-1 rounded-lg bg-surface-overlay w-fit">
        {(["revenus", "depenses"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              tab === t ? "bg-surface-elevated text-ink shadow-sm" : "text-ink-ghost hover:text-ink")}>
            {t === "revenus" ? `Revenus (${revenus.length})` : `Dépenses (${depenses.length})`}
          </button>
        ))}
      </div>

      {tab === "revenus" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {REV_SUGGESTIONS.filter((s) => !revenus.some((r) => r.label === s)).map((s) => (
              <button key={s} onClick={() => setRLabel(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-border text-ink-ghost hover:text-ink hover:border-border-strong transition-colors">{s}</button>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
            <div className="flex gap-3">
              <Input placeholder="Ex. : Salaire net" value={rLabel} onChange={(e) => setRLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRevenu()} className="flex-1" />
              <Input type="number" placeholder="Montant €" value={rMontant} onChange={(e) => setRMontant(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRevenu()} className="w-28" />
            </div>
            <div className="flex gap-3">
              <Input type="number" placeholder="Jour versement (1-31)" value={rBillingDay}
                onChange={(e) => setRBillingDay(e.target.value)} className="w-44" />
              <Select options={FIABILITE_OPTIONS} value={rFiabilite} onChange={(e) => setRFiabilite(e.target.value)} className="flex-1" />
            </div>
            <Button size="sm" onClick={handleAddRevenu} leftIcon={<Plus size={13} />}>Ajouter ce revenu</Button>
          </div>
          {revenus.length > 0 && (
            <div className="space-y-1.5">
              {revenus.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-elevated border border-border">
                  <TrendingUp size={12} className="text-calm shrink-0" />
                  <span className="flex-1 text-sm text-ink truncate">{r.label}</span>
                  {r.billingDay && <span className="text-[10px] text-ink-ghost font-mono shrink-0">J+{r.billingDay}</span>}
                  {r.fiabilite !== undefined && r.fiabilite < 100 && <span className="text-[10px] text-attention shrink-0">{r.fiabilite}%</span>}
                  <span className="text-sm font-mono text-calm shrink-0">{fmt(r.montant)}</span>
                  <button onClick={() => removeRevenu(r.id)} className="text-ink-ghost hover:text-critique transition-colors p-0.5 shrink-0"><Trash2 size={13} /></button>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-1.5 text-xs border-t border-border/50">
                <span className="text-ink-ghost">Total mensuel</span>
                <span className="font-mono text-calm font-medium">{fmt(revenus.reduce((s, r) => s + r.montant, 0))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "depenses" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {DEP_SUGGESTIONS.filter((s) => !depenses.some((d) => d.label === s.label)).map((s) => (
              <button key={s.label} onClick={() => { setDLabel(s.label); setDCat(s.cat); setDType(s.type); }}
                className="text-xs px-2.5 py-1 rounded-full border border-border text-ink-ghost hover:text-ink hover:border-border-strong transition-colors">{s.label}</button>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
            <div className="flex gap-3">
              <Input placeholder="Ex. : Loyer" value={dLabel} onChange={(e) => setDLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDepense()} className="flex-1" />
              <Input type="number" placeholder="Montant €" value={dMontant} onChange={(e) => setDMontant(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDepense()} className="w-28" />
            </div>
            <div className="flex gap-3">
              <Select options={CATEGORIES} value={dCat} onChange={(e) => setDCat(e.target.value)} className="flex-1" />
              <Input type="number" placeholder="Jour (1-31)" value={dBillingDay} onChange={(e) => setDBillingDay(e.target.value)} className="w-32" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-ink-ghost uppercase tracking-wider mb-2">Type de dépense</p>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setDType(opt.value)}
                    className={cn("flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-center transition-colors",
                      dType === opt.value ? "border-accent text-accent bg-accent/5" : "border-border text-ink-ghost hover:text-ink hover:border-border-strong")}>
                    {opt.icon}
                    <span className="text-[10px] font-medium">{opt.label}</span>
                    <span className="text-[9px] opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            {comptes.length > 0 && (
              <Select label="Compte associé (optionnel)" options={compteOptions} value={dCompteId} onChange={(e) => setDCompteId(e.target.value)} />
            )}
            <Button size="sm" onClick={handleAddDepense} leftIcon={<Plus size={13} />}>Ajouter cette dépense</Button>
          </div>
          {depenses.length > 0 && (
            <div className="space-y-1.5">
              {depenses.map((d) => {
                const typeOpt = TYPE_OPTIONS.find((t) => t.value === d.type);
                const compte = comptes.find((c) => c.id === d.compteId);
                return (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-elevated border border-border">
                    <span className="text-ink-ghost shrink-0">{typeOpt?.icon ?? <TrendingDown size={12} />}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink truncate">{d.label}</p>
                      <p className="text-[10px] text-ink-ghost">
                        {CATEGORIES.find((c) => c.value === d.categorie)?.label}
                        {d.billingDay ? ` · J+${d.billingDay}` : ""}
                        {compte ? ` · ${compte.label}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-mono text-ink shrink-0">{fmt(d.montant)}</span>
                    <button onClick={() => removeDepense(d.id)} className="text-ink-ghost hover:text-critique transition-colors p-0.5 shrink-0"><Trash2 size={13} /></button>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-3 py-1.5 text-xs border-t border-border/50">
                <span className="text-ink-ghost">Total mensuel</span>
                <span className="font-mono text-critique font-medium">{fmt(depenses.reduce((s, d) => s + d.montant, 0))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={onBack}>Retour</Button>
        <Button rightIcon={<ArrowRight size={14} />} disabled={revenus.length === 0 && depenses.length === 0} onClick={onNext}>Continuer</Button>
      </div>
    </div>
  );
}

// ── CP3 — Relevé bancaire (optionnel) ────────────────────────────────────

function StepReleve({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { addRevenu, addDepense } = useOnboardingStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [recurring, setRecurring] = useState<ParsedRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const parsed = await parseFile(file);
      const rec = detectRecurring(parsed);
      setRows(parsed);
      setRecurring(rec);
      setSelected(new Set(rec.filter((t) => t.direction === "depense").map((t) => t.id)));
    } catch { /* ignore */ }
    setLoading(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  function handleAddSelected() {
    recurring.filter((t) => selected.has(t.id)).forEach((t) => {
      if (t.direction === "depense") {
        addDepense({ label: t.label, montant: t.montant, categorie: "autre" });
      } else {
        addRevenu({ label: t.label, montant: t.montant });
      }
    });
    onNext();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-ink-ghost shrink-0">
          <FileText size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-ink">Relevé bancaire</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-ink-ghost">Optionnel</span>
          </div>
          <p className="text-sm text-ink-soft mt-1.5">
            Importez un relevé CSV/Excel pour que Fintrack détecte vos abonnements et dépenses récurrentes.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-xl border-2 border-dashed border-border p-10 text-center cursor-pointer hover:border-accent/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={22} className="mx-auto text-ink-ghost mb-3" />
          <p className="text-sm text-ink-soft">Glissez-déposez ou cliquez pour sélectionner</p>
          <p className="text-xs text-ink-ghost mt-1">CSV, Excel (XLS/XLSX) — la majorité des banques françaises</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-ghost">{rows.length} transactions · {recurring.length} récurrentes détectées</p>
            <button onClick={() => { setRows([]); setRecurring([]); setSelected(new Set()); }}
              className="text-xs text-ink-ghost hover:text-critique transition-colors">Changer de fichier</button>
          </div>
          {recurring.length > 0 ? (
            <>
              <p className="text-xs text-ink-soft">Sélectionnez les postes à ajouter à vos flux récurrents :</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {recurring.map((t) => (
                  <div key={t.id} onClick={() => toggleSelect(t.id)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-elevated border border-border cursor-pointer hover:border-border-strong transition-colors">
                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      selected.has(t.id) ? "bg-accent border-accent" : "border-border")}>
                      {selected.has(t.id) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="flex-1 text-sm text-ink truncate">{t.label}</span>
                    <span className={cn("text-sm font-mono shrink-0", t.direction === "revenu" ? "text-calm" : "text-ink")}>
                      {t.direction === "revenu" ? "+" : "-"}{fmt(t.montant)}
                    </span>
                  </div>
                ))}
              </div>
              {selected.size > 0 && (
                <Button onClick={handleAddSelected} rightIcon={<ArrowRight size={14} />}>
                  Ajouter {selected.size} poste{selected.size > 1 ? "s" : ""} à mes flux
                </Button>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-ghost py-4 text-center">Aucune récurrence détectée — ajoutez vos flux manuellement à l'étape 2.</p>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={onBack}>Retour</Button>
        <Button variant="ghost" rightIcon={<ArrowRight size={14} />} onClick={onNext} loading={loading}>Faire plus tard</Button>
      </div>

      <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx,.ofx" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
    </div>
  );
}

// ── CP4 — Ce que vous devez ──────────────────────────────────────────────

const ENGAGEMENT_TYPE_OPTIONS = Object.entries(ENGAGEMENT_TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }));
const ETALEMENT_OPTIONS = [
  { value: "comptant", label: "En une fois" },
  { value: "mensuel", label: "En mensualités" },
  { value: "libre", label: "Au fur et à mesure" },
];

function StepDettes({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { engagements, addEngagement, deleteEngagement } = useEngagementsStore();
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<EngagementType>("arriere_loyer");
  const [montant, setMontant] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [echeance, setEcheance] = useState("");
  const [etalement, setEtalement] = useState<EtalementMode>("comptant");
  const [mensualite, setMensualite] = useState("");
  const [pression, setPression] = useState<Pression>("moderee");
  const [gele, setGele] = useState(false);
  const [dateFinGel, setDateFinGel] = useState("");

  function handleAdd() {
    const m = parseFloat(montant);
    if (!label.trim() || isNaN(m) || m <= 0) { toast({ variant: "error", title: "Libellé et montant requis" }); return; }
    addEngagement({
      label: label.trim(),
      type,
      montantTotal: m,
      montantRestant: m,
      dateDebut: dateDebut || undefined,
      dateEcheance: echeance || undefined,
      etalementMode: etalement,
      mensualite: etalement === "mensuel" && mensualite ? parseFloat(mensualite) : undefined,
      pression: type === "dette_amicale" ? pression : undefined,
      gele: type === "credit_conso" ? gele : undefined,
      dateFinGel: type === "credit_conso" && gele && dateFinGel ? dateFinGel : undefined,
    });
    setLabel(""); setMontant(""); setDateDebut(""); setEcheance(""); setMensualite("");
    setGele(false); setDateFinGel("");
  }

  const totalDu = engagements.filter((e) => !e.solde).reduce((s, e) => s + e.montantRestant, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-ink-ghost shrink-0">
          <CreditCard size={18} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Ce que vous devez</h2>
          <p className="text-sm text-ink-soft mt-1.5">
            Arriérés, dettes amicales, crédits, impôts — tout ce qui pèse sur votre trésorerie.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
        {/* Row 1 — Description + Montant */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Description" placeholder="Ex. : Loyer de mai" value={label}
            onChange={(e) => setLabel(e.target.value)} />
          <Input label="Montant dû (€)" type="number" placeholder="Ex. : 850" value={montant}
            onChange={(e) => setMontant(e.target.value)} />
        </div>

        {/* Row 2 — Type + Date de début */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" options={ENGAGEMENT_TYPE_OPTIONS} value={type}
            onChange={(e) => { setType(e.target.value as EngagementType); setGele(false); }} />
          <Input label="Date de début (optionnel)" type="date" value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)} />
        </div>

        {/* Row 3 — Échéance + Étalement */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date limite (optionnel)" type="date" value={echeance}
            onChange={(e) => setEcheance(e.target.value)} />
          <Select label="Étalement" options={ETALEMENT_OPTIONS} value={etalement}
            onChange={(e) => setEtalement(e.target.value as EtalementMode)} />
        </div>

        {/* Conditional — mensualité */}
        {etalement === "mensuel" && (
          <Input label="Mensualité (€)" type="number" placeholder="Ex. : 200" value={mensualite}
            onChange={(e) => setMensualite(e.target.value)} className="w-1/2" />
        )}

        {/* Conditional — pression (dette amicale) */}
        {type === "dette_amicale" && (
          <div>
            <p className="text-xs text-ink-soft mb-1.5">Niveau de pression</p>
            <div className="flex gap-2">
              {(["haute", "moderee", "basse"] as Pression[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPression(p)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    borderColor: pression === p ? PRESSION_COLOR[p] : "var(--border)",
                    background: pression === p ? PRESSION_COLOR[p] + "18" : "transparent",
                    color: pression === p ? PRESSION_COLOR[p] : "var(--ink-ghost)",
                  }}
                >
                  {PRESSION_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conditional — gel surendettement (crédit conso) */}
        {type === "credit_conso" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div
                onClick={() => setGele((v) => !v)}
                className={cn(
                  "w-9 h-5 rounded-full relative transition-colors",
                  gele ? "bg-attention" : "bg-surface-overlay border border-border"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
                  gele ? "left-4" : "left-0.5"
                )} />
              </div>
              <span className="text-xs text-ink-soft group-hover:text-ink transition-colors">
                Crédit gelé (décision Banque de France — surendettement)
              </span>
            </label>
            {gele && (
              <Input label="Date de fin de gel" type="date" value={dateFinGel}
                onChange={(e) => setDateFinGel(e.target.value)} className="w-1/2" />
            )}
          </div>
        )}

        <Button size="sm" onClick={handleAdd} leftIcon={<Plus size={13} />}>Ajouter cet engagement</Button>
      </div>

      {engagements.filter((e) => !e.solde).length > 0 && (
        <div className="space-y-2">
          {engagements.filter((e) => !e.solde).map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-elevated border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm text-ink truncate">{e.label}</p>
                  {e.gele && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-attention/15 text-attention shrink-0">
                      Gelé{e.dateFinGel ? ` jusqu'au ${new Date(e.dateFinGel).toLocaleDateString("fr-FR")}` : ""}
                    </span>
                  )}
                  {e.pression && (
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: PRESSION_COLOR[e.pression] + "18", color: PRESSION_COLOR[e.pression] }}
                    >
                      {PRESSION_LABEL[e.pression]}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-ink-ghost mt-0.5">
                  {ENGAGEMENT_TYPE_LABEL[e.type]}
                  {e.dateDebut ? ` · depuis le ${new Date(e.dateDebut).toLocaleDateString("fr-FR")}` : ""}
                  {e.etalementMode === "mensuel" && e.mensualite ? ` · ${fmt(e.mensualite)}/mois` : ""}
                  {e.dateEcheance ? ` · avant le ${new Date(e.dateEcheance).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>
              <span className="text-sm font-mono text-critique shrink-0">{fmt(e.montantRestant)}</span>
              <button onClick={() => deleteEngagement(e.id)} className="text-ink-ghost hover:text-critique transition-colors p-0.5 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-1.5 text-xs border-t border-border/50">
            <span className="text-ink-ghost">Total dû</span>
            <span className="font-mono text-critique font-medium">{fmt(totalDu)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={onBack}>Retour</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onNext}>Passer cette étape</Button>
          {engagements.filter((e) => !e.solde).length > 0 && (
            <Button rightIcon={<ArrowRight size={14} />} onClick={onNext}>Continuer</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CP5 — Ce que vous possédez (skippable) ───────────────────────────────

const ACTIF_TYPE_OPTIONS: { value: ActifType; label: string }[] = [
  { value: "liquidités", label: "Épargne / Liquidités" },
  { value: "financier", label: "Placement financier" },
  { value: "immobilier", label: "Immobilier" },
  { value: "véhicule", label: "Véhicule" },
  { value: "autre", label: "Autre actif" },
];

const ACTIF_SUGGESTIONS: { label: string; type: ActifType }[] = [
  { label: "Livret A", type: "liquidités" },
  { label: "PEL", type: "liquidités" },
  { label: "Assurance-vie", type: "financier" },
  { label: "Résidence principale", type: "immobilier" },
  { label: "Voiture", type: "véhicule" },
];

function StepPatrimoine({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { actifs, addActif, deleteActif } = usePatrimoineStore();
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [actifType, setActifType] = useState<ActifType>("liquidités");
  const [valeur, setValeur] = useState("");

  function handleAdd() {
    const v = parseFloat(valeur);
    if (!label.trim() || isNaN(v) || v <= 0) { toast({ variant: "error", title: "Nom et valeur requis" }); return; }
    addActif({ label: label.trim(), type: actifType, valeur: v });
    setLabel(""); setValeur("");
  }

  const totalActifs = actifs.reduce((s, a) => s + a.valeur, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-ink-ghost shrink-0">
          <Package size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-ink">Ce que vous possédez</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-ink-ghost">Optionnel</span>
          </div>
          <p className="text-sm text-ink-soft mt-1.5">
            Épargne touchable, livrets, immobilier, véhicule — pour calculer votre patrimoine net.
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {ACTIF_SUGGESTIONS.filter((s) => !actifs.some((a) => a.label === s.label)).map((s) => (
          <button key={s.label} onClick={() => { setLabel(s.label); setActifType(s.type); }}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-ink-ghost hover:text-ink hover:border-border-strong transition-colors">
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
        <div className="flex gap-3">
          <Input placeholder="Ex. : Livret A" value={label} onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="flex-1" />
          <Input type="number" placeholder="Valeur €" value={valeur} onChange={(e) => setValeur(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="w-32" />
        </div>
        <Select options={ACTIF_TYPE_OPTIONS} value={actifType}
          onChange={(e) => setActifType(e.target.value as ActifType)} />
        <Button size="sm" onClick={handleAdd} leftIcon={<Plus size={13} />}>Ajouter cet actif</Button>
      </div>

      {actifs.length > 0 && (
        <div className="space-y-1.5">
          {actifs.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-elevated border border-border">
              <span className="flex-1 text-sm text-ink truncate">{a.label}</span>
              <span className="text-[10px] text-ink-ghost">{ACTIF_TYPE_OPTIONS.find((o) => o.value === a.type)?.label}</span>
              <span className="text-sm font-mono text-calm shrink-0">{fmt(a.valeur)}</span>
              <button onClick={() => deleteActif(a.id)} className="text-ink-ghost hover:text-critique transition-colors p-0.5 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-1.5 text-xs border-t border-border/50">
            <span className="text-ink-ghost">Total actifs</span>
            <span className="font-mono text-calm font-medium">{fmt(totalActifs)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={onBack}>Retour</Button>
        <Button variant="ghost" rightIcon={<ArrowRight size={14} />} onClick={onNext}>
          {actifs.length > 0 ? "Continuer" : "Passer cette étape"}
        </Button>
      </div>
    </div>
  );
}

// ── CP6 — Coups durs à venir (skippable) ────────────────────────────────

const TODAY_ISO = new Date().toISOString().split("T")[0];

function StepCoupsDurs({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { coupsDurs, addCoupDur, deleteCoupDur } = useCoupsDursStore();
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [montant, setMontant] = useState("");
  const [datePrevue, setDatePrevue] = useState("");

  const SUGGESTIONS = ["Réparation voiture", "Taxe foncière", "Dentiste", "Frais de déménagement", "Impôts"];

  function handleAdd() {
    const m = parseFloat(montant);
    if (!label.trim() || isNaN(m) || m <= 0 || !datePrevue) {
      toast({ variant: "error", title: "Libellé, montant et date requis" }); return;
    }
    addCoupDur({ label: label.trim(), montant: m, datePrevue: new Date(datePrevue).toISOString() });
    setLabel(""); setMontant(""); setDatePrevue("");
  }

  const actifs = coupsDurs.filter((c) => !c.traite);
  const totalPrevu = actifs.reduce((s, c) => s + c.montant, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-ink-ghost shrink-0">
          <Zap size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-ink">Coups durs à venir</h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-ink-ghost">Optionnel</span>
          </div>
          <p className="text-sm text-ink-soft mt-1.5">
            Dépenses exceptionnelles connues dans les 90 prochains jours. Elles seront visibles dans votre projection.
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SUGGESTIONS.filter((s) => !actifs.some((c) => c.label === s)).map((s) => (
          <button key={s} onClick={() => setLabel(s)}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-ink-ghost hover:text-ink hover:border-border-strong transition-colors">
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-3">
        <div className="flex gap-3">
          <Input placeholder="Ex. : Taxe foncière" value={label} onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="flex-1" />
          <Input type="number" placeholder="Montant €" value={montant} onChange={(e) => setMontant(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="w-28" />
        </div>
        <Input label="Date prévue" type="date" min={TODAY_ISO} value={datePrevue}
          onChange={(e) => setDatePrevue(e.target.value)} />
        <Button size="sm" onClick={handleAdd} leftIcon={<Plus size={13} />}>Ajouter ce coup dur</Button>
      </div>

      {actifs.length > 0 && (
        <div className="space-y-1.5">
          {actifs.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-elevated border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{c.label}</p>
                <p className="text-[10px] text-ink-ghost">{new Date(c.datePrevue).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</p>
              </div>
              <span className="text-sm font-mono text-attention shrink-0">{fmt(c.montant)}</span>
              <button onClick={() => deleteCoupDur(c.id)} className="text-ink-ghost hover:text-critique transition-colors p-0.5 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-1.5 text-xs border-t border-border/50">
            <span className="text-ink-ghost">Total à prévoir</span>
            <span className="font-mono text-attention font-medium">{fmt(totalPrevu)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={onBack}>Retour</Button>
        <Button variant="ghost" rightIcon={<ArrowRight size={14} />} onClick={onNext}>
          {actifs.length > 0 ? "Continuer" : "Passer cette étape"}
        </Button>
      </div>
    </div>
  );
}

// ── CP7 — Cockpit d'ancrage ──────────────────────────────────────────────

function StepCockpit({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const store = useOnboardingStore();
  const { addCompte, comptes: existingComptes } = useComptesStore();
  const { revenus, depenses, comptes, objectifEpargne, setObjectifEpargne, complete, autoSave } = store;

  const totalRevenus = revenus.reduce((s, r) => s + r.montant, 0);
  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
  const net = totalRevenus - totalDepenses;
  const totalSolde = comptes.reduce((s, c) => s + c.solde, 0);
  const incompressibles = depenses.filter((d) => d.type === "incompressible").reduce((s, d) => s + d.montant, 0);
  const reductibles = depenses.filter((d) => d.type === "reductible").reduce((s, d) => s + d.montant, 0);
  const discrets = depenses.filter((d) => d.type === "discret" || !d.type).reduce((s, d) => s + d.montant, 0);

  function handleFinish() {
    if (existingComptes.length === 0 && comptes.length > 0) {
      comptes.forEach((c) => {
        addCompte({ label: c.label, type: "courant", institution: "", solde: c.solde, includedInRunway: true, decouvertAutorise: c.decouvertAutorise, decouvertUtilise: c.decouvertUtilise });
      });
    }
    complete();
    autoSave();
    toast({ variant: "success", title: "Configuration terminée — bienvenue !" });
    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink">Résumé de votre situation</h2>
        <p className="text-sm text-ink-soft mt-1.5">Vérifiez que tout est correct avant de lancer Fintrack.</p>
      </div>
      <div className="space-y-3">
        {comptes.length > 0 && (
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Comptes · {fmt(totalSolde)}</p>
            <div className="space-y-1.5">
              {comptes.map((c) => (
                <div key={c.id} className="flex justify-between text-sm">
                  <span className="text-ink-soft">{c.label}</span>
                  <span className={cn("font-mono", c.solde < 0 ? "text-critique" : "text-ink")}>{fmt(c.solde)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Flux mensuels</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-calm">Revenus</span>
              <span className="font-mono text-calm">+{fmt(totalRevenus)}</span>
            </div>
            {incompressibles > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft flex items-center gap-1.5"><Lock size={11} />Incompressibles</span>
                <span className="font-mono text-critique">-{fmt(incompressibles)}</span>
              </div>
            )}
            {reductibles > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft flex items-center gap-1.5"><Scissors size={11} />Réductibles</span>
                <span className="font-mono text-ink">-{fmt(reductibles)}</span>
              </div>
            )}
            {discrets > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft flex items-center gap-1.5"><Sparkles size={11} />Discrets</span>
                <span className="font-mono text-ink">-{fmt(discrets)}</span>
              </div>
            )}
            <div className="h-px bg-border" />
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-ink">Net mensuel</span>
              <span className={cn("font-mono", net >= 0 ? "text-calm" : "text-critique")}>
                {net >= 0 ? "+" : ""}{fmt(net)}
              </span>
            </div>
          </div>
        </div>
        {net > 0 && (
          <div className="rounded-xl border border-border bg-surface-elevated p-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Objectif d'épargne — optionnel</p>
            <Input type="number" placeholder={`Max ${fmt(net)}/mois`}
              value={objectifEpargne > 0 ? String(objectifEpargne) : ""}
              onChange={(e) => setObjectifEpargne(Math.max(0, parseFloat(e.target.value) || 0))}
              hint="Modifiable à tout moment dans les paramètres." />
          </div>
        )}
        {net < 0 && (
          <div className="rounded-lg border border-critique/30 bg-surface-elevated p-4">
            <p className="text-sm text-critique font-medium">Déficit mensuel de {fmt(Math.abs(net))}</p>
            <p className="text-xs text-ink-soft mt-1">Fintrack vous aidera à identifier où réduire en priorité.</p>
          </div>
        )}
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="ghost" leftIcon={<ArrowLeft size={14} />} onClick={onBack}>Retour</Button>
        <Button rightIcon={<CheckCircle2 size={14} />} onClick={handleFinish}>Lancer Fintrack</Button>
      </div>
    </div>
  );
}

// ── Wizard shell ─────────────────────────────────────────────────────────

const CHECKPOINTS = ["Comptes", "Flux", "Relevé", "Dettes", "Patrimoine", "Coups durs", "Résumé"];

export default function OnboardingPage() {
  const store = useOnboardingStore();
  const { step, setStep, autoSave, revenus, depenses, comptes, objectifEpargne } = store;

  if (step === 0) return <SlotSelector />;

  function advance() { const next = Math.min(7, step + 1) as typeof step; setStep(next); autoSave(); }
  function retreat() { if (step <= 1) { setStep(0); return; } setStep((step - 1) as typeof step); }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface)", color: "var(--ink)" }}>
      <header className="flex items-center justify-between px-6 shrink-0" style={{ height: 52, borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="text-sm font-semibold text-ink">Fintrack</span>
          <span className="text-xs ml-1 text-ink-ghost opacity-60">· Configuration</span>
        </div>
        <div className="flex items-center gap-1.5">
          {CHECKPOINTS.map((label, i) => {
            const cpStep = i + 1;
            const done = cpStep < step;
            const active = cpStep === step;
            return <div key={i} title={label} className={cn("rounded-full transition-all",
              active ? "w-4 h-2 bg-accent" : done ? "w-2 h-2 bg-calm" : "w-2 h-2 bg-border")} />;
          })}
        </div>
        <button onClick={autoSave}
          className="flex items-center gap-1.5 text-xs text-ink-ghost hover:text-ink transition-colors px-3 py-1.5 rounded-md hover:bg-surface-overlay">
          <Save size={12} />
          Sauvegarder
        </button>
      </header>

      <div className="flex-1 grid grid-cols-[1fr_320px] divide-x divide-border overflow-hidden">
        <div className="overflow-y-auto">
          <div className="p-8 max-w-lg">
            {step === 1 && <StepBancaire onNext={advance} onBack={retreat} />}
            {step === 2 && <StepFlux onNext={advance} onBack={retreat} />}
            {step === 3 && <StepReleve onNext={advance} onBack={retreat} />}
            {step === 4 && <StepDettes onNext={advance} onBack={retreat} />}
            {step === 5 && <StepPatrimoine onNext={advance} onBack={retreat} />}
            {step === 6 && <StepCoupsDurs onNext={advance} onBack={retreat} />}
            {step === 7 && <StepCockpit onBack={retreat} />}
          </div>
        </div>
        <div className="overflow-y-auto p-8" style={{ background: "var(--surface-elevated)" }}>
          <LivePreview comptes={comptes} revenus={revenus} depenses={depenses} objectif={objectifEpargne} />
        </div>
      </div>
    </div>
  );
}
