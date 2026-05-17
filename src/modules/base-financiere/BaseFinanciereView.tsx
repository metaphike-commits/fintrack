"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Archive, Trash2, Search, Database, TrendingUp, TrendingDown,
  Home, Car, ShoppingCart, Heart, Smartphone, Music, PiggyBank, Landmark, Package,
  Wallet, ChevronDown, Info, AlertTriangle,
} from "lucide-react";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useComptesStore, getSoldeRunway, COMPTE_TYPE_LABEL } from "@/store/comptes";
import { useOnboardingStore } from "@/store/onboarding";
import { useEngagementsStore, ENGAGEMENT_TYPE_LABEL, PRESSION_COLOR } from "@/store/engagements";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemPanel } from "./ItemPanel";
import { ComptePanel } from "./ComptePanel";
import { cn } from "@/lib/cn";
import type { BaseItem } from "@/store/baseFinanciere";
import type { Compte } from "@/store/comptes";

// Glass border tokens — no harsh white grid anywhere
const GB  = "1px solid rgba(255, 255, 255, 0.07)";
const GBF = "1px solid rgba(255, 255, 255, 0.10)"; // slightly stronger for card frames

const FREQ_LABEL: Record<string, string> = {
  mensuel: "Mensuel", hebdomadaire: "Hebdo",
  trimestriel: "Trim.", annuel: "Annuel", ponctuel: "Ponctuel",
};

const CAT_LABEL: Record<string, string> = {
  revenu: "Revenu", logement: "Logement", transport: "Transport",
  alimentation: "Alimentation", sante: "Santé", abonnements: "Abonnements",
  loisirs: "Loisirs", epargne: "Épargne", impôts: "Impôts", autre: "Autre",
  // extended
  salaire: "Salaire", freelance: "Freelance", remboursement: "Remboursement", allocation: "Allocation",
  loyer: "Loyer", "électricité": "Électricité", eau: "Eau", internet: "Internet",
  stationnement: "Stationnement", carburant: "Carburant",
  restauration: "Restauration", santé: "Santé", "vêtements": "Vêtements",
  assurance: "Assurance", "crédit": "Crédit", amende: "Amende",
};

const CAT_COLOR: Record<string, string> = {
  logement: "#6366f1", loyer: "#6366f1", transport: "#f59e0b", alimentation: "#10b981",
  sante: "#ec4899", santé: "#ec4899", abonnements: "#8b5cf6", loisirs: "#06b6d4",
  epargne: "#22c55e", impôts: "#ef4444", autre: "#94a3b8", revenu: "#22c55e",
  salaire: "#22c55e", freelance: "#10b981", remboursement: "#06b6d4", allocation: "#22c55e",
  "électricité": "#f59e0b", eau: "#38bdf8", internet: "#8b5cf6",
  stationnement: "#f59e0b", carburant: "#fb923c",
  restauration: "#f97316", "vêtements": "#a78bfa",
  assurance: "#64748b", "crédit": "#ef4444", amende: "#ef4444",
};

const CAT_ICON: Record<string, React.ReactNode> = {
  revenu:        <Wallet size={13} />,
  logement:      <Home size={13} />,
  loyer:         <Home size={13} />,
  transport:     <Car size={13} />,
  alimentation:  <ShoppingCart size={13} />,
  sante:         <Heart size={13} />,
  santé:         <Heart size={13} />,
  abonnements:   <Smartphone size={13} />,
  loisirs:       <Music size={13} />,
  epargne:       <PiggyBank size={13} />,
  "impôts":      <Landmark size={13} />,
  autre:         <Package size={13} />,
  salaire:       <Wallet size={13} />,
  freelance:     <Wallet size={13} />,
  remboursement: <Package size={13} />,
  allocation:    <Wallet size={13} />,
  "électricité": <Package size={13} />,
  eau:           <Package size={13} />,
  internet:      <Smartphone size={13} />,
  stationnement: <Car size={13} />,
  carburant:     <Car size={13} />,
  restauration:  <ShoppingCart size={13} />,
  "vêtements":   <ShoppingCart size={13} />,
  assurance:     <Package size={13} />,
  "crédit":      <Landmark size={13} />,
  amende:        <Package size={13} />,
};

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  incompressible: { label: "Fixe",     color: "#ef4444", bg: "#ef444418" },
  reductible:     { label: "Variable", color: "#f59e0b", bg: "#f59e0b18" },
  discret:        { label: "Discret",  color: "#6366f1", bg: "#6366f118" },
};

function toMensuel(item: BaseItem): number {
  switch (item.frequence) {
    case "hebdomadaire": return item.montant * 52 / 12;
    case "trimestriel":  return item.montant / 3;
    case "annuel":       return item.montant / 12;
    default:             return item.montant;
  }
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ── Category breakdown bars ──────────────────────────────────────────────────

function CategoryBreakdown({ items }: { items: BaseItem[] }) {
  const depenses = items.filter((i) => i.direction === "depense");
  const total = depenses.reduce((s, i) => s + toMensuel(i), 0);

  const groups = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of depenses) {
      const m = toMensuel(i);
      map.set(i.categorie, (map.get(i.categorie) ?? 0) + m);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [depenses]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {groups.map(([cat, amount]) => {
        const pct = total > 0 ? (amount / total) * 100 : 0;
        const color = CAT_COLOR[cat] ?? "#94a3b8";
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-ink-soft">{CAT_LABEL[cat] ?? cat}</span>
              <span className="text-xs font-mono text-ink-ghost">{fmt(amount)}</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Net flow hero ─────────────────────────────────────────────────────────────

function NetHero({ revenus, depenses }: { revenus: number; depenses: number }) {
  const net = revenus - depenses;
  const taux = revenus > 0 ? (depenses / revenus) * 100 : 0;
  const netColorVar = net >= 0 ? "var(--calm)" : "var(--critique)";
  const netColorHex = net >= 0 ? "#22c55e" : "#ef4444";
  const tauxColor = taux > 90 ? "var(--critique)" : taux > 75 ? "var(--attention)" : "var(--calm)";
  const tauxLabel = taux > 90 ? "Critique" : taux > 75 ? "Tendu" : "Sain";

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${netColorHex}30` }}>
      <div className="px-5 pt-5 pb-4" style={{ background: `${netColorHex}09` }}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-2 text-ink-ghost">Flux net mensuel</p>
        <p className="text-4xl font-bold tabular-nums leading-none" style={{ color: netColorVar }}>
          {net >= 0 ? "+" : ""}{fmt(net)}
        </p>
        {revenus > 0 && (
          <p className="text-[10px] mt-2 text-ink-ghost">
            {net >= 0
              ? `${((net / revenus) * 100).toFixed(0)} % du revenu préservé`
              : `Déficit — ${((-net / revenus) * 100).toFixed(0)} % au-delà des revenus`}
          </p>
        )}
      </div>
      <div className="px-5 py-3" style={{ borderTop: GB }}>
        <div className="flex items-center justify-between py-1.5">
          <span className="flex items-center gap-2 text-xs text-ink-soft"><TrendingUp size={11} className="text-calm" />Revenus</span>
          <span className="text-sm font-bold tabular-nums text-calm">{fmt(revenus)}</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="flex items-center gap-2 text-xs text-ink-soft"><TrendingDown size={11} className="text-critique" />Dépenses</span>
          <span className="text-sm font-bold tabular-nums text-ink">{fmt(depenses)}</span>
        </div>
      </div>
      <div className="px-5 py-3.5 space-y-2" style={{ borderTop: GB }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-ink-ghost">Taux d'engagement</span>
            <div className="group relative">
              <Info size={10} className="text-ink-ghost cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 text-[10px] text-ink-soft bg-surface-elevated border border-white/10 rounded-lg px-3 py-2 shadow-lg z-10 leading-relaxed">
                Part du revenu engagée sur des dépenses fixes. Au-delà de 75 % c'est tendu, au-delà de 90 % critique.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ color: tauxColor, background: tauxColor + "20" }}>{tauxLabel}</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: tauxColor }}>{taux.toFixed(0)} %</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, taux)}%`, background: tauxColor }} />
        </div>
      </div>
    </div>
  );
}

// ── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item, indent = false, onEdit, onArchive, onDelete,
}: {
  item: BaseItem; indent?: boolean; onEdit: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const mensuel = toMensuel(item);
  const typeMeta = item.type ? TYPE_META[item.type] : null;
  return (
    <div
      className={cn(
        "flex items-center gap-3 pr-4 py-2.5 group hover:bg-white/[0.025] transition-colors cursor-pointer",
        indent ? "pl-12" : "pl-5"
      )}
      style={{ borderBottom: GB }}
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{item.label}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.frequence !== "mensuel" && (
            <span className="text-[10px] text-ink-ghost bg-white/5 px-1.5 py-0.5 rounded-full">
              {FREQ_LABEL[item.frequence]}
            </span>
          )}
          {typeMeta && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ color: typeMeta.color, background: typeMeta.bg }}>
              {typeMeta.label}
            </span>
          )}
          {item.notes && (
            <span className="text-[10px] text-ink-ghost truncate max-w-[140px]">{item.notes}</span>
          )}
        </div>
      </div>
      {item.billingDay != null && (
        <div className="shrink-0 px-1.5 py-0.5 rounded-md" style={{ border: GB, background: "rgba(255,255,255,0.03)" }}>
          <span className="text-[10px] font-mono text-ink-ghost">j.{item.billingDay}</span>
        </div>
      )}
      <span className={cn(
        "text-sm font-bold tabular-nums shrink-0 w-20 text-right",
        item.direction === "revenu" ? "text-calm" : "text-ink"
      )}>
        {item.direction === "revenu" ? "+" : "−"}{fmt(mensuel)}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onArchive(); }} className="p-1.5 text-ink-ghost hover:text-attention transition-colors rounded-md" title="Archiver"><Archive size={12} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-ink-ghost hover:text-critique transition-colors rounded-md" title="Supprimer"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

// ── Category group ───────────────────────────────────────────────────────────

function CategoryGroup({
  categorie, items, onEdit, onArchive, onDelete,
}: {
  categorie: string; items: BaseItem[];
  onEdit: (i: BaseItem) => void; onArchive: (i: BaseItem) => void; onDelete: (i: BaseItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const subtotal = items.reduce((s, i) => s + toMensuel(i), 0);
  const color = CAT_COLOR[categorie] ?? "#94a3b8";
  const icon = CAT_ICON[categorie] ?? <Package size={13} />;

  return (
    <div style={{ borderBottom: GB }}>
      <button
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.025] transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18", color }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink capitalize">{CAT_LABEL[categorie] ?? categorie}</p>
          <p className="text-[10px] text-ink-ghost">{items.length} poste{items.length > 1 ? "s" : ""}</p>
        </div>
        <span className="text-sm font-bold tabular-nums text-ink shrink-0">
          {fmt(subtotal)}<span className="text-[10px] font-normal text-ink-ghost"> /mois</span>
        </span>
        <ChevronDown size={13} className={cn("text-ink-ghost transition-transform duration-200 shrink-0", !open && "-rotate-90")} />
      </button>
      {open && (
        <div style={{ borderTop: GB, background: "rgba(255,255,255,0.015)" }}>
          {items.map((i) => (
            <ItemRow key={i.id} item={i} indent
              onEdit={() => onEdit(i)} onArchive={() => onArchive(i)} onDelete={() => onDelete(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Glass card wrapper ────────────────────────────────────────────────────────

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-xl overflow-hidden", className)}
      style={{ border: GBF, background: "rgba(255, 255, 255, 0.02)" }}
    >
      {children}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export function BaseFinanciereView() {
  const { items, addItem, updateItem, archiveItem, deleteItem, seedFromOnboarding, purgePonctuel } = useBaseFinanciereStore();
  const { comptes, addCompte, updateCompte, deleteCompte } = useComptesStore();
  const onboarding = useOnboardingStore();
  const { engagements } = useEngagementsStore();
  const { toast } = useToast();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<BaseItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [comptePanelOpen, setComptePanelOpen] = useState(false);
  const [editingCompte, setEditingCompte] = useState<Compte | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (onboarding.completed && onboarding.revenus.length > 0) {
      seedFromOnboarding(onboarding.revenus, onboarding.depenses);
    }
  }, []);

  const active   = useMemo(() => items.filter((i) => !i.archived), [items]);
  const archived = useMemo(() => items.filter((i) => i.archived), [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter((i) => i.label.toLowerCase().includes(q) || i.categorie.toLowerCase().includes(q));
  }, [active, search]);

  const revenus  = useMemo(() => filtered.filter((i) => i.direction === "revenu"), [filtered]);
  const depenses = useMemo(() => filtered.filter((i) => i.direction === "depense"), [filtered]);

  const totalRevenus  = useMemo(() => revenus.reduce((s, i) => s + toMensuel(i), 0), [revenus]);
  const totalDepenses = useMemo(() => depenses.reduce((s, i) => s + toMensuel(i), 0), [depenses]);

  const net      = totalRevenus - totalDepenses;
  const taux     = totalRevenus > 0 ? (totalDepenses / totalRevenus) * 100 : 0;
  const tauxColor = taux > 90 ? "var(--critique)" : taux > 75 ? "var(--attention)" : "var(--calm)";
  const tauxLabel = taux > 90 ? "Critique" : taux > 75 ? "Tendu" : "Sain";

  const depensesBycat = useMemo(() => {
    const map = new Map<string, BaseItem[]>();
    for (const i of depenses) {
      if (!map.has(i.categorie)) map.set(i.categorie, []);
      map.get(i.categorie)!.push(i);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const sa = a[1].reduce((s, i) => s + toMensuel(i), 0);
      const sb = b[1].reduce((s, i) => s + toMensuel(i), 0);
      return sb - sa;
    });
  }, [depenses]);

  const upcomingEngagements = useMemo(() => {
    const today = new Date();
    return engagements
      .filter((e) => !e.solde && e.dateEcheance && new Date(e.dateEcheance) >= today)
      .sort((a, b) => {
        const presOrder: Record<string, number> = { haute: 0, moderee: 1, basse: 2 };
        const pa = presOrder[a.pression ?? "basse"] ?? 2;
        const pb = presOrder[b.pression ?? "basse"] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(a.dateEcheance!).getTime() - new Date(b.dateEcheance!).getTime();
      })
      .slice(0, 3);
  }, [engagements]);

  const soldeRunway = getSoldeRunway(comptes);

  const ponctuelCount = useMemo(() => items.filter((i) => i.frequence === "ponctuel" && !i.archived).length, [items]);

  function handlePurgePonctuel() {
    if (!window.confirm(`Supprimer les ${ponctuelCount} poste${ponctuelCount > 1 ? "s" : ""} ponctuels (issus d'imports) ?\n\nLes postes récurrents ne seront pas affectés.`)) return;
    const n = purgePonctuel();
    toast({ variant: "success", title: `${n} poste${n > 1 ? "s" : ""} supprimé${n > 1 ? "s" : ""}` });
  }

  function openAdd()  { setEditing(null); setPanelOpen(true); }
  function openEdit(item: BaseItem) { setEditing(item); setPanelOpen(true); }
  function openAddCompte()  { setEditingCompte(null); setComptePanelOpen(true); }
  function openEditCompte(c: Compte) { setEditingCompte(c); setComptePanelOpen(true); }

  function handleSave(data: Omit<BaseItem, "id" | "archived">) {
    if (editing) { updateItem(editing.id, data); toast({ variant: "success", title: "Poste mis à jour" }); }
    else         { addItem(data);                toast({ variant: "success", title: "Poste ajouté" }); }
    setPanelOpen(false);
  }

  function handleSaveCompte(data: Omit<Compte, "id" | "createdAt">) {
    if (editingCompte) { updateCompte(editingCompte.id, data); toast({ variant: "success", title: "Compte mis à jour" }); }
    else               { addCompte(data);                      toast({ variant: "success", title: "Compte ajouté" }); }
    setComptePanelOpen(false);
  }

  function handleArchive(item: BaseItem) {
    archiveItem(item.id);
    toast({ variant: "info", title: "Poste archivé", description: item.label });
  }

  function handleDelete(item: BaseItem) {
    deleteItem(item.id);
    toast({ variant: "error", title: "Poste supprimé", description: item.label });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 shrink-0" style={{ height: 56, borderBottom: GB }}>
        <div className="flex items-center gap-2.5">
          <Database size={15} className="text-ink-ghost" />
          <h1 className="text-sm font-semibold text-ink">Base Financière</h1>
          {active.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full text-ink-ghost font-mono" style={{ background: "rgba(255,255,255,0.05)" }}>
              {active.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost" />
            <input
              type="text" placeholder="Rechercher…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs rounded-md text-ink placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-accent w-44"
              style={{ border: GB, background: "rgba(255,255,255,0.04)" }}
            />
          </div>
          {ponctuelCount > 0 && (
            <Button size="sm" variant="ghost" onClick={handlePurgePonctuel} className="text-critique hover:text-critique">
              Purger les imports ({ponctuelCount})
            </Button>
          )}
          <Button size="sm" leftIcon={<Plus size={13} />} onClick={openAdd}>Ajouter</Button>
        </div>
      </div>

      {active.length === 0 && !search ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="Aucun poste"
            description="Ajoutez vos revenus et dépenses récurrentes pour construire votre base financière."
            action={<Button leftIcon={<Plus size={13} />} onClick={openAdd}>Ajouter un poste</Button>}
          />
        </div>
      ) : (
        <>
          {/* KPI Bar */}
          <div className="grid grid-cols-4 gap-3 px-5 py-3.5 shrink-0" style={{ borderBottom: GB }}>
            {/* Revenus */}
            <div className="rounded-xl px-4 py-3" style={{ border: GBF, background: "rgba(34,197,94,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={11} className="text-calm" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Revenus</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-calm leading-none">{fmt(totalRevenus)}</p>
              <p className="text-[10px] text-ink-ghost mt-1">{revenus.length} poste{revenus.length > 1 ? "s" : ""} · /mois</p>
            </div>
            {/* Dépenses */}
            <div className="rounded-xl px-4 py-3" style={{ border: GBF, background: "rgba(239,68,68,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={11} className="text-critique" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Dépenses</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-ink leading-none">{fmt(totalDepenses)}</p>
              <p className="text-[10px] text-ink-ghost mt-1">{depenses.length} poste{depenses.length > 1 ? "s" : ""} · /mois</p>
            </div>
            {/* Épargne nette */}
            <div className="rounded-xl px-4 py-3" style={{ border: GBF, background: net >= 0 ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                {net >= 0 ? <TrendingUp size={11} className="text-calm" /> : <TrendingDown size={11} className="text-critique" />}
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Épargne nette</span>
              </div>
              <p className="text-lg font-bold tabular-nums leading-none" style={{ color: net >= 0 ? "var(--calm)" : "var(--critique)" }}>
                {net >= 0 ? "+" : ""}{fmt(net)}
              </p>
              <p className="text-[10px] text-ink-ghost mt-1">{net >= 0 ? "excédent" : "déficit"} mensuel</p>
            </div>
            {/* Taux d'engagement */}
            <div className="rounded-xl px-4 py-3" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Info size={11} className="text-ink-ghost" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Engagement</span>
              </div>
              <p className="text-lg font-bold tabular-nums leading-none" style={{ color: tauxColor }}>
                {taux.toFixed(0)} %
              </p>
              <p className="text-[10px] mt-1 font-medium" style={{ color: tauxColor }}>{tauxLabel}</p>
            </div>
          </div>

          {/* Main grid */}
          <div className="flex-1 overflow-hidden grid grid-cols-[1fr_288px]">

            {/* ── Left: items ──────────────────────────────────────────────── */}
            <div className="flex flex-col overflow-hidden" style={{ borderRight: GB }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* Revenus card */}
                {revenus.length > 0 && (
                  <GlassCard>
                    {/* Section header */}
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: GB }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 rounded-full bg-calm shrink-0" />
                        <span className="text-xs font-semibold text-calm">Revenus</span>
                        <span className="text-[10px] text-ink-ghost">{revenus.length} poste{revenus.length > 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-calm">
                        {fmt(totalRevenus)}<span className="text-[10px] font-normal text-ink-ghost"> /mois</span>
                      </span>
                    </div>
                    {/* Items — no bottom border on last */}
                    <div>
                      {revenus.map((item, idx) => (
                        <div key={item.id} style={idx === revenus.length - 1 ? { borderBottom: "none" } : {}}>
                          <ItemRow item={item}
                            onEdit={() => openEdit(item)} onArchive={() => handleArchive(item)} onDelete={() => handleDelete(item)} />
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Dépenses card */}
                {depensesBycat.length > 0 && (
                  <GlassCard>
                    {/* Section header */}
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: GB }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 rounded-full bg-critique shrink-0" />
                        <span className="text-xs font-semibold text-critique">Dépenses</span>
                        <span className="text-[10px] text-ink-ghost">{depenses.length} poste{depenses.length > 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-ink">
                        {fmt(totalDepenses)}<span className="text-[10px] font-normal text-ink-ghost"> /mois</span>
                      </span>
                    </div>
                    {/* Category groups */}
                    <div>
                      {depensesBycat.map(([cat, catItems], idx) => (
                        <div key={cat} style={idx === depensesBycat.length - 1 ? { borderBottom: "none" } : {}}>
                          <CategoryGroup categorie={cat} items={catItems}
                            onEdit={openEdit} onArchive={handleArchive} onDelete={handleDelete} />
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {filtered.length === 0 && search && (
                  <div className="flex items-center justify-center py-16 text-sm text-ink-ghost">
                    Aucun résultat pour « {search} »
                  </div>
                )}

                {/* Archived */}
                {archived.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: GB }}>
                    <button
                      className="w-full text-left px-5 py-2.5 text-xs text-ink-ghost hover:text-ink transition-colors"
                      onClick={() => setShowArchived((v) => !v)}
                    >
                      {showArchived ? "▾ Masquer" : "▸ Afficher"} les archivés ({archived.length})
                    </button>
                    {showArchived && (
                      <div style={{ borderTop: GB }}>
                        {archived.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 px-5 py-2 opacity-50 hover:opacity-70 transition-opacity" style={{ borderBottom: GB }}>
                            <span className="flex-1 text-xs text-ink-soft truncate">{item.label}</span>
                            <span className="text-xs font-mono text-ink-ghost">{fmt(item.montant)}</span>
                            <Badge variant="neutral" size="sm">Archivé</Badge>
                            <button onClick={() => handleDelete(item)} className="p-1 text-ink-ghost hover:text-critique transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right sidebar ─────────────────────────────────────────────── */}
            <div className="overflow-y-auto p-4 flex flex-col gap-4">

              {/* Net hero */}
              <NetHero revenus={totalRevenus} depenses={totalDepenses} />

              {/* Prochains engagements */}
              {upcomingEngagements.length > 0 && (
                <GlassCard>
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: GB }}>
                    <AlertTriangle size={11} className="text-attention" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Prochains engagements</p>
                  </div>
                  <div>
                    {upcomingEngagements.map((e) => {
                      const presColor = e.pression ? PRESSION_COLOR[e.pression] : "#94a3b8";
                      return (
                        <div key={e.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: GB }}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: presColor }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink truncate font-medium">{e.label}</p>
                            <p className="text-[10px] text-ink-ghost">{ENGAGEMENT_TYPE_LABEL[e.type]} · {fmtDate(e.dateEcheance!)}</p>
                          </div>
                          <span className="text-xs font-bold tabular-nums text-ink shrink-0">{fmt(e.montantRestant)}</span>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              )}

              {/* Category breakdown */}
              {depenses.length > 0 && (
                <GlassCard className="p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Répartition dépenses</p>
                  <CategoryBreakdown items={active} />
                </GlassCard>
              )}

              {/* Comptes */}
              <GlassCard>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: GB }}>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Comptes</p>
                  <button onClick={openAddCompte} className="text-[10px] text-accent hover:underline flex items-center gap-1">
                    <Plus size={10} />Ajouter
                  </button>
                </div>
                {comptes.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-ink-ghost">
                    Aucun compte.{" "}
                    <button onClick={openAddCompte} className="underline hover:text-ink transition-colors">En ajouter un</button>
                  </p>
                ) : (
                  <div>
                    {comptes.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 group cursor-pointer hover:bg-white/[0.025] transition-colors" style={{ borderBottom: GB }}
                        onClick={() => openEditCompte(c)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-ink truncate">{c.label}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="neutral" size="sm">{COMPTE_TYPE_LABEL[c.type]}</Badge>
                            {c.includedInRunway && <Badge variant="calm" size="sm">Runway</Badge>}
                          </div>
                        </div>
                        <span className={cn("text-sm font-semibold tabular-nums shrink-0", c.solde >= 0 ? "text-ink" : "text-critique")}>
                          {fmt(c.solde)}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); deleteCompte(c.id); toast({ variant: "info", title: "Compte supprimé" }); }} className="p-1 text-ink-ghost hover:text-critique transition-colors"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    ))}
                    {soldeRunway !== null && (
                      <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: GB, background: "rgba(255,255,255,0.02)" }}>
                        <span className="text-[10px] text-ink-ghost font-mono uppercase tracking-widest">Total runway</span>
                        <span className="text-sm font-semibold tabular-nums text-ink">{fmt(soldeRunway)}</span>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </>
      )}

      <ItemPanel open={panelOpen} item={editing} onClose={() => setPanelOpen(false)} onSave={handleSave} />
      <ComptePanel open={comptePanelOpen} compte={editingCompte} onClose={() => setComptePanelOpen(false)} onSave={handleSaveCompte} />
    </div>
  );
}
