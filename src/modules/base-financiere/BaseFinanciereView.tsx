"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Archive, Trash2, Search, Database, TrendingUp, TrendingDown,
  Home, Car, ShoppingCart, Heart, Smartphone, Music, PiggyBank, Landmark, Package,
  Wallet, ChevronDown, ChevronLeft, ChevronRight, Info, AlertTriangle, Lock,
} from "lucide-react";
import { useBaseFinanciereStore, isSyncedItem } from "@/store/baseFinanciere";
import { useComptesStore, getSoldeRunway, COMPTE_TYPE_LABEL } from "@/store/comptes";
import { useOnboardingStore } from "@/store/onboarding";
import { useEngagementsStore, ENGAGEMENT_TYPE_LABEL, PRESSION_COLOR } from "@/store/engagements";
import { getRowsForMonth } from "@/lib/timeline";
import { projectDailyBalance } from "@/lib/projection";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ItemPanel } from "./ItemPanel";
import { ComptePanel } from "./ComptePanel";
import { cn } from "@/lib/cn";
import type { BaseItem } from "@/store/baseFinanciere";
import type { Compte } from "@/store/comptes";

const GB  = "1px solid rgba(255, 255, 255, 0.07)";
const GBF = "1px solid rgba(255, 255, 255, 0.10)";

const FREQ_LABEL: Record<string, string> = {
  mensuel: "Mensuel", hebdomadaire: "Hebdo",
  trimestriel: "Trim.", annuel: "Annuel", ponctuel: "Ponctuel",
};

const CAT_LABEL: Record<string, string> = {
  revenu: "Revenu", logement: "Logement", transport: "Transport",
  alimentation: "Alimentation", sante: "Santé", abonnements: "Abonnements",
  loisirs: "Loisirs", epargne: "Épargne", impôts: "Impôts", autre: "Autre",
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
  revenu: <Wallet size={13} />, logement: <Home size={13} />, loyer: <Home size={13} />,
  transport: <Car size={13} />, alimentation: <ShoppingCart size={13} />,
  sante: <Heart size={13} />, santé: <Heart size={13} />, abonnements: <Smartphone size={13} />,
  loisirs: <Music size={13} />, epargne: <PiggyBank size={13} />, "impôts": <Landmark size={13} />,
  autre: <Package size={13} />, salaire: <Wallet size={13} />, freelance: <Wallet size={13} />,
  remboursement: <Package size={13} />, allocation: <Wallet size={13} />,
  "électricité": <Package size={13} />, eau: <Package size={13} />, internet: <Smartphone size={13} />,
  stationnement: <Car size={13} />, carburant: <Car size={13} />,
  restauration: <ShoppingCart size={13} />, "vêtements": <ShoppingCart size={13} />,
  assurance: <Package size={13} />, "crédit": <Landmark size={13} />, amende: <Package size={13} />,
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
    case "ponctuel":     return 0;
    default:             return item.montant;
  }
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function capMonthLabel(year: number, month: number): string {
  const s = new Date(year, month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── SVG Donut chart ──────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function donutArc(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number): string {
  const GAP = 2;
  const s = a0 + GAP / 2;
  const e = a1 - GAP / 2;
  if (e - s < 0.2) return "";
  const [x1, y1] = polarToXY(cx, cy, ro, s);
  const [x2, y2] = polarToXY(cx, cy, ro, e);
  const [x3, y3] = polarToXY(cx, cy, ri, e);
  const [x4, y4] = polarToXY(cx, cy, ri, s);
  const lg = e - s > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${ro} ${ro} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A${ri} ${ri} 0 ${lg} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`;
}

function CategoryDonut({
  depenses,
  itemAmounts,
}: {
  depenses: BaseItem[];
  itemAmounts: Map<string, number>;
}) {
  const [hov, setHov] = useState<string | null>(null);

  const segs = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of depenses) {
      // Use actual nav-month amount when available, fall back to toMensuel
      const m = itemAmounts.get(i.id) ?? toMensuel(i);
      if (m <= 0) continue;
      map.set(i.categorie, (map.get(i.categorie) ?? 0) + m);
    }
    // Always derive total from actual segment sums so percentages add up to 100 %
    const tot = [...map.values()].reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, amt]) => ({ cat, amt, pct: tot > 0 ? amt / tot : 0, color: CAT_COLOR[cat] ?? "#94a3b8" }));
  }, [depenses, itemAmounts]);

  const segsTotal = segs.reduce((s, g) => s + g.amt, 0);

  const cx = 62, cy = 62, ro = 54, ri = 36;
  let offset = 0;
  const arcs = segs.map(seg => {
    const a0 = offset * 360;
    const a1 = (offset + seg.pct) * 360;
    offset += seg.pct;
    return { ...seg, a0, a1, path: donutArc(cx, cy, ro, ri, a0, a1) };
  });

  const hovSeg = hov ? arcs.find(a => a.cat === hov) ?? null : null;

  if (segs.length === 0) return null;

  // Proper SVG-space scale around donut center (CSS transform-origin on <path> is unreliable)
  const scaleTransform = `translate(${cx} ${cy}) scale(1.07) translate(-${cx} -${cy})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Legend — full width, no truncation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {arcs.map(arc => (
          <div key={arc.cat}
            style={{
              display: "flex", alignItems: "center", gap: 7, cursor: "default",
              opacity: hov ? (hov === arc.cat ? 1 : 0.3) : 1,
              transition: "opacity 0.15s",
              padding: "2px 0",
            }}
            onMouseEnter={() => setHov(arc.cat)}
            onMouseLeave={() => setHov(null)}
          >
            <div style={{ width: 7, height: 7, borderRadius: 2, background: arc.color, flexShrink: 0 }} />
            <span style={{
              flex: 1, fontSize: 11, color: "rgba(255,255,255,0.65)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {CAT_LABEL[arc.cat] ?? arc.cat}
            </span>
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
              {(arc.pct * 100).toFixed(0)}%
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 48, textAlign: "right" }}>
              {fmt(arc.amt)}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

      {/* Donut — centered, full-size */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={148} height={148} viewBox="0 0 124 124">
          {/* Track ring */}
          <circle cx={cx} cy={cy} r={(ro + ri) / 2} fill="none"
            stroke="rgba(255,255,255,0.045)" strokeWidth={ro - ri} />
          {/* Segments */}
          {arcs.map(arc => (
            <path key={arc.cat} d={arc.path}
              fill={arc.color}
              fillOpacity={hov ? (hov === arc.cat ? 1 : 0.22) : 0.84}
              transform={hov === arc.cat ? scaleTransform : undefined}
              style={{ transition: "fill-opacity 0.15s", cursor: "default" }}
              onMouseEnter={() => setHov(arc.cat)}
              onMouseLeave={() => setHov(null)}
            />
          ))}
          {/* Center label */}
          {hovSeg ? (
            <>
              <text x={cx} y={cy - 9} textAnchor="middle" fontSize={14} fontWeight="800" fill="white">
                {(hovSeg.pct * 100).toFixed(0)}%
              </text>
              <text x={cx} y={cy + 7} textAnchor="middle" fontSize={11} fontWeight="600"
                fill="rgba(255,255,255,0.75)">
                {fmt(hovSeg.amt)}
              </text>
              <text x={cx} y={cy + 19} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.38)"
                style={{ fontFamily: "monospace" }}>
                {(CAT_LABEL[hovSeg.cat] ?? hovSeg.cat).slice(0, 11)}
              </text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 5} textAnchor="middle" fontSize={8}
                fill="rgba(255,255,255,0.28)"
                style={{ fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                total
              </text>
              <text x={cx} y={cy + 11} textAnchor="middle" fontSize={13} fontWeight="700"
                fill="rgba(255,255,255,0.88)">
                {fmt(segsTotal)}
              </text>
            </>
          )}
        </svg>
      </div>

    </div>
  );
}

// ── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item, rowMontant, indent = false, onEdit, onArchive, onDelete,
}: {
  item: BaseItem; rowMontant: number; indent?: boolean;
  onEdit: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const typeMeta  = item.type ? TYPE_META[item.type] : null;
  const isSynced  = isSyncedItem(item);
  const syncLabel = item.source === "compte" ? "Compte" : "Patrimoine";
  return (
    <div
      className={cn(
        "flex items-center gap-3 pr-4 py-2.5 transition-colors",
        isSynced ? "opacity-90" : "group hover:bg-white/[0.025] cursor-pointer",
        indent ? "pl-12" : "pl-5"
      )}
      style={{ borderBottom: GB }}
      onClick={isSynced ? undefined : onEdit}
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
          {isSynced && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
              style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
              <Lock size={8} />{syncLabel}
            </span>
          )}
        </div>
      </div>
      {item.billingDay != null && item.frequence !== "ponctuel" && (
        <div className="shrink-0 px-1.5 py-0.5 rounded-md" style={{ border: GB, background: "rgba(255,255,255,0.03)" }}>
          <span className="text-[10px] font-mono text-ink-ghost">j.{item.billingDay}</span>
        </div>
      )}
      {item.frequence === "ponctuel" && item.dateDebut && (
        <div className="shrink-0 px-1.5 py-0.5 rounded-md" style={{ border: GB, background: "rgba(255,255,255,0.03)" }}>
          <span className="text-[10px] font-mono text-ink-ghost">
            {new Date(item.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        </div>
      )}
      <span className={cn(
        "text-sm font-bold tabular-nums shrink-0 w-20 text-right",
        item.direction === "revenu" ? "text-calm" : "text-ink"
      )}>
        {item.direction === "revenu" ? "+" : "−"}{fmt(rowMontant)}
      </span>
      {!isSynced && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onArchive(); }} className="p-1.5 text-ink-ghost hover:text-attention transition-colors rounded-md" title="Archiver"><Archive size={12} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-ink-ghost hover:text-critique transition-colors rounded-md" title="Supprimer"><Trash2 size={12} /></button>
        </div>
      )}
    </div>
  );
}

// ── Category group ───────────────────────────────────────────────────────────

function CategoryGroup({
  categorie, items, itemAmounts, onEdit, onArchive, onDelete,
}: {
  categorie: string; items: BaseItem[]; itemAmounts: Map<string, number>;
  onEdit: (i: BaseItem) => void; onArchive: (i: BaseItem) => void; onDelete: (i: BaseItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const subtotal = items.reduce((s, i) => s + (itemAmounts.get(i.id) ?? toMensuel(i)), 0);
  const color = CAT_COLOR[categorie] ?? "#94a3b8";
  const icon  = CAT_ICON[categorie] ?? <Package size={13} />;

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
          {fmt(subtotal)}
        </span>
        <ChevronDown size={13} className={cn("text-ink-ghost transition-transform duration-200 shrink-0", !open && "-rotate-90")} />
      </button>
      {open && (
        <div style={{ borderTop: GB, background: "rgba(255,255,255,0.015)" }}>
          {items.map((i) => (
            <ItemRow key={i.id} item={i} rowMontant={itemAmounts.get(i.id) ?? toMensuel(i)} indent
              onEdit={() => onEdit(i)} onArchive={() => onArchive(i)} onDelete={() => onDelete(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Glass card wrapper ────────────────────────────────────────────────────────

function GlassCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("rounded-xl overflow-hidden", className)}
      style={{ border: GBF, background: "rgba(255, 255, 255, 0.02)", ...style }}>
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

  const now = useMemo(() => new Date(), []);

  const [panelOpen,        setPanelOpen]        = useState(false);
  const [editing,          setEditing]          = useState<BaseItem | null>(null);
  const [panelDefaults,    setPanelDefaults]    = useState<Partial<Omit<BaseItem, "id" | "archived">> | undefined>();
  const [showArchived,     setShowArchived]     = useState(false);
  const [comptePanelOpen,  setComptePanelOpen]  = useState(false);
  const [editingCompte,    setEditingCompte]    = useState<Compte | null>(null);
  const [search,           setSearch]           = useState("");
  const [navYear,          setNavYear]          = useState(now.getFullYear());
  const [navMonth,         setNavMonth]         = useState(now.getMonth());

  useEffect(() => {
    if (onboarding.completed && onboarding.revenus.length > 0) {
      seedFromOnboarding(onboarding.revenus, onboarding.depenses);
    }
  }, []);

  const active   = useMemo(() => items.filter((i) => !i.archived), [items]);
  const archived = useMemo(() => items.filter((i) => i.archived),  [items]);

  const navIsCurrentMonth = navYear === now.getFullYear() && navMonth === now.getMonth();

  function navPrevMonth() {
    if (navMonth === 0) { setNavYear((y) => y - 1); setNavMonth(11); }
    else setNavMonth((m) => m - 1);
  }
  function navNextMonth() {
    if (navMonth === 11) { setNavYear((y) => y + 1); setNavMonth(0); }
    else setNavMonth((m) => m + 1);
  }
  function navReset() { setNavYear(now.getFullYear()); setNavMonth(now.getMonth()); }

  // ── Nav-month derived data ──────────────────────────────────────────────────
  const navMonthStart = useMemo(() => new Date(navYear, navMonth, 1), [navYear, navMonth]);
  const navMonthDays  = useMemo(() => new Date(navYear, navMonth + 1, 0).getDate(), [navYear, navMonth]);
  const navMonthRows  = useMemo(() => getRowsForMonth(active, navYear, navMonth), [active, navYear, navMonth]);

  // Projection over the nav month (starting from 0 to get pure month totals)
  const navMonthProj = useMemo(
    () => projectDailyBalance(0, active, navMonthDays, navMonthStart),
    [active, navMonthDays, navMonthStart]
  );
  const navMonthRev = useMemo(
    () => navMonthProj.reduce((s, d) => s + d.events.filter(e => e.direction === "revenu").reduce((s2, e) => s2 + e.montant, 0), 0),
    [navMonthProj]
  );
  const navMonthDep = useMemo(
    () => navMonthProj.reduce((s, d) => s + d.events.filter(e => e.direction === "depense").reduce((s2, e) => s2 + e.montant, 0), 0),
    [navMonthProj]
  );
  const navMonthNet = navMonthRev - navMonthDep;

  // Items active in nav month
  const navMonthItemIds = useMemo(() => new Set(navMonthRows.map(r => r.itemId)), [navMonthRows]);

  // Amount per item for this month (from navMonthRows — exact occurrence amount)
  const navItemAmounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of navMonthRows) m.set(r.itemId, (m.get(r.itemId) ?? 0) + r.montant);
    return m;
  }, [navMonthRows]);

  const navActiveItems = useMemo(
    () => active.filter(i => navMonthItemIds.has(i.id)),
    [active, navMonthItemIds]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return navActiveItems;
    const q = search.toLowerCase();
    return navActiveItems.filter(i => i.label.toLowerCase().includes(q) || i.categorie.toLowerCase().includes(q));
  }, [navActiveItems, search]);

  const revenus  = useMemo(() => filtered.filter(i => i.direction === "revenu"),  [filtered]);
  const depenses = useMemo(() => filtered.filter(i => i.direction === "depense"), [filtered]);

  const totalRevenus  = navMonthRev;
  const totalDepenses = navMonthDep;
  const net           = navMonthNet;
  const taux          = totalRevenus > 0 ? (totalDepenses / totalRevenus) * 100 : 0;
  const tauxColor     = taux > 90 ? "var(--critique)" : taux > 75 ? "var(--attention)" : "var(--calm)";
  const tauxLabel     = taux > 90 ? "Critique" : taux > 75 ? "Tendu" : "Sain";

  const depensesBycat = useMemo(() => {
    const map = new Map<string, BaseItem[]>();
    for (const i of depenses) {
      if (!map.has(i.categorie)) map.set(i.categorie, []);
      map.get(i.categorie)!.push(i);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const sa = a[1].reduce((s, i) => s + (navItemAmounts.get(i.id) ?? 0), 0);
      const sb = b[1].reduce((s, i) => s + (navItemAmounts.get(i.id) ?? 0), 0);
      return sb - sa;
    });
  }, [depenses, navItemAmounts]);

  const upcomingEngagements = useMemo(() => {
    const today = new Date();
    return engagements
      .filter(e => !e.solde && e.dateEcheance && new Date(e.dateEcheance) >= today)
      .sort((a, b) => {
        const ord: Record<string, number> = { haute: 0, moderee: 1, basse: 2 };
        const pa = ord[a.pression ?? "basse"] ?? 2;
        const pb = ord[b.pression ?? "basse"] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(a.dateEcheance!).getTime() - new Date(b.dateEcheance!).getTime();
      })
      .slice(0, 3);
  }, [engagements]);

  const soldeRunway   = getSoldeRunway(comptes);
  const ponctuelCount = useMemo(() => items.filter(i => i.frequence === "ponctuel" && !i.archived).length, [items]);

  const prevMonthLabel = capMonthLabel(
    navMonth === 0 ? navYear - 1 : navYear,
    navMonth === 0 ? 11 : navMonth - 1
  );
  const nextMonthLabel = capMonthLabel(
    navMonth === 11 ? navYear + 1 : navYear,
    navMonth === 11 ? 0 : navMonth + 1
  );

  function handlePurgePonctuel() {
    if (!window.confirm(`Supprimer les ${ponctuelCount} poste${ponctuelCount > 1 ? "s" : ""} ponctuels ?\n\nLes postes récurrents ne seront pas affectés.`)) return;
    const n = purgePonctuel();
    toast({ variant: "success", title: `${n} poste${n > 1 ? "s" : ""} supprimé${n > 1 ? "s" : ""}` });
  }

  function openAdd()  { setPanelDefaults(undefined); setEditing(null); setPanelOpen(true); }
  function openAddPonctuel() {
    setPanelDefaults({ direction: "revenu", frequence: "ponctuel", categorie: "freelance", dateDebut: new Date().toISOString().split("T")[0] });
    setEditing(null);
    setPanelOpen(true);
  }
  function openEdit(item: BaseItem)    { setPanelDefaults(undefined); setEditing(item); setPanelOpen(true); }
  function openAddCompte()             { setEditingCompte(null); setComptePanelOpen(true); }
  function openEditCompte(c: Compte)   { setEditingCompte(c); setComptePanelOpen(true); }

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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 shrink-0" style={{ height: 52, borderBottom: GB }}>
        <div className="flex items-center gap-2.5">
          <Database size={15} className="text-ink-ghost" />
          <h1 className="text-sm font-semibold text-ink">Base Financière</h1>
          {active.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full text-ink-ghost font-mono"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              {active.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost" />
            <input type="text" placeholder="Rechercher…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs rounded-md text-ink placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-accent w-44"
              style={{ border: GB, background: "rgba(255,255,255,0.04)" }} />
          </div>
          {ponctuelCount > 0 && (
            <Button size="sm" variant="ghost" onClick={handlePurgePonctuel} className="text-critique hover:text-critique">
              Purger les imports ({ponctuelCount})
            </Button>
          )}
          <Button size="sm" variant="ghost" leftIcon={<Plus size={13} />} onClick={openAddPonctuel} className="text-calm">
            Revenu ponctuel
          </Button>
          <Button size="sm" leftIcon={<Plus size={13} />} onClick={openAdd}>Ajouter</Button>
        </div>
      </div>

      {/* ── Month navigation bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1 shrink-0 px-6"
        style={{ height: 44, borderBottom: GB, background: "rgba(255,255,255,0.008)" }}>
        <button onClick={navPrevMonth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
          <ChevronLeft size={13} />
          <span>{prevMonthLabel}</span>
        </button>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: GBF, minWidth: 180, justifyContent: "center" }}>
          <span className="text-sm font-bold text-ink capitalize" style={{ letterSpacing: "-0.01em" }}>
            {capMonthLabel(navYear, navMonth)}
          </span>
          {navIsCurrentMonth ? (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              ce mois
            </span>
          ) : (
            <button onClick={navReset}
              className="text-[9px] px-1.5 py-0.5 rounded-full transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", background: "none", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>
              ce mois
            </button>
          )}
        </div>

        <button onClick={navNextMonth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
          <span>{nextMonthLabel}</span>
          <ChevronRight size={13} />
        </button>
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
          {/* ── KPI bar ───────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3 px-5 py-3 shrink-0" style={{ borderBottom: GB }}>
            <div className="rounded-xl px-4 py-3" style={{ border: GBF, background: "rgba(34,197,94,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={11} className="text-calm" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Revenus</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-calm leading-none">{fmt(totalRevenus)}</p>
              <p className="text-[10px] text-ink-ghost mt-1">{revenus.length} poste{revenus.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ border: GBF, background: "rgba(239,68,68,0.05)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingDown size={11} className="text-critique" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Dépenses</span>
              </div>
              <p className="text-lg font-bold tabular-nums text-ink leading-none">{fmt(totalDepenses)}</p>
              <p className="text-[10px] text-ink-ghost mt-1">{depenses.length} poste{depenses.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="rounded-xl px-4 py-3"
              style={{ border: GBF, background: net >= 0 ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                {net >= 0 ? <TrendingUp size={11} className="text-calm" /> : <TrendingDown size={11} className="text-critique" />}
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Net</span>
              </div>
              <p className="text-lg font-bold tabular-nums leading-none"
                style={{ color: net >= 0 ? "var(--calm)" : "var(--critique)" }}>
                {net >= 0 ? "+" : ""}{fmt(net)}
              </p>
              <p className="text-[10px] text-ink-ghost mt-1">{net >= 0 ? "excédent" : "déficit"}</p>
            </div>
            <div className="rounded-xl px-4 py-3" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Info size={11} className="text-ink-ghost" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Engagement</span>
              </div>
              <p className="text-lg font-bold tabular-nums leading-none" style={{ color: tauxColor }}>
                {taux.toFixed(0)} %
              </p>
              <p className="text-[10px] mt-1 font-medium" style={{ color: tauxColor }}>{tauxLabel}</p>
            </div>
          </div>

          {/* ── Main grid ─────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden grid grid-cols-[1fr_296px]">

            {/* Left: items list */}
            <div className="flex flex-col overflow-hidden" style={{ borderRight: GB }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">

                {/* Comptes */}
                <GlassCard style={{ border: "1px solid rgba(96,165,250,0.28)", background: "rgba(96,165,250,0.04)" }}>
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom: "1px solid rgba(96,165,250,0.15)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-4 rounded-full shrink-0" style={{ background: "#60a5fa" }} />
                      <p className="text-xs font-semibold" style={{ color: "#60a5fa" }}>Comptes</p>
                      <span className="text-[10px] text-ink-ghost">
                        {comptes.length} compte{comptes.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {soldeRunway !== null && (
                        <span className="text-sm font-bold tabular-nums" style={{ color: "#60a5fa" }}>
                          {fmt(soldeRunway)}
                        </span>
                      )}
                      <button onClick={openAddCompte}
                        className="text-[10px] hover:underline flex items-center gap-1 transition-colors"
                        style={{ color: "#60a5fa" }}>
                        <Plus size={10} />Ajouter
                      </button>
                    </div>
                  </div>
                  {comptes.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-ink-ghost">
                      Aucun compte.{" "}
                      <button onClick={openAddCompte} className="underline hover:text-ink transition-colors">En ajouter un</button>
                    </p>
                  ) : (
                    <div>
                      {comptes.map(c => (
                        <div key={c.id}
                          className="flex items-center gap-3 px-4 py-2.5 group cursor-pointer transition-colors"
                          style={{ borderBottom: "1px solid rgba(96,165,250,0.1)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(96,165,250,0.06)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          onClick={() => openEditCompte(c)}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink truncate">{c.label}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="neutral" size="sm">{COMPTE_TYPE_LABEL[c.type]}</Badge>
                              {c.includedInRunway && c.type !== "credit" && <Badge variant="calm" size="sm">Runway</Badge>}
                            </div>
                          </div>
                          <span className={cn("text-sm font-semibold tabular-nums shrink-0",
                            c.solde >= 0 ? "text-ink" : "text-critique")}>
                            {fmt(c.solde)}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); deleteCompte(c.id); toast({ variant: "info", title: "Compte supprimé" }); }}
                              className="p-1 text-ink-ghost hover:text-critique transition-colors">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>

                {revenus.length > 0 && (
                  <GlassCard>
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: GB }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 rounded-full bg-calm shrink-0" />
                        <span className="text-xs font-semibold text-calm">Revenus</span>
                        <span className="text-[10px] text-ink-ghost">{revenus.length} poste{revenus.length !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-calm">{fmt(totalRevenus)}</span>
                    </div>
                    <div>
                      {revenus.map((item, idx) => (
                        <div key={item.id} style={idx === revenus.length - 1 ? { borderBottom: "none" } : {}}>
                          <ItemRow item={item} rowMontant={navItemAmounts.get(item.id) ?? toMensuel(item)}
                            onEdit={() => openEdit(item)} onArchive={() => handleArchive(item)} onDelete={() => handleDelete(item)} />
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {depensesBycat.length > 0 && (
                  <GlassCard>
                    <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: GB }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1 h-4 rounded-full bg-critique shrink-0" />
                        <span className="text-xs font-semibold text-critique">Dépenses</span>
                        <span className="text-[10px] text-ink-ghost">{depenses.length} poste{depenses.length !== 1 ? "s" : ""}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-ink">{fmt(totalDepenses)}</span>
                    </div>
                    <div>
                      {depensesBycat.map(([cat, catItems], idx) => (
                        <div key={cat} style={idx === depensesBycat.length - 1 ? { borderBottom: "none" } : {}}>
                          <CategoryGroup categorie={cat} items={catItems} itemAmounts={navItemAmounts}
                            onEdit={openEdit} onArchive={handleArchive} onDelete={handleDelete} />
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {navMonthRows.length === 0 && !search && (
                  <div className="flex items-center justify-center py-16 text-sm text-ink-ghost">
                    Aucun poste actif en {capMonthLabel(navYear, navMonth).split(" ")[0].toLowerCase()}.
                  </div>
                )}

                {filtered.length === 0 && search && (
                  <div className="flex items-center justify-center py-16 text-sm text-ink-ghost">
                    Aucun résultat pour « {search} »
                  </div>
                )}

                {archived.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ border: GB }}>
                    <button
                      className="w-full text-left px-5 py-2.5 text-xs text-ink-ghost hover:text-ink transition-colors"
                      onClick={() => setShowArchived(v => !v)}>
                      {showArchived ? "▾ Masquer" : "▸ Afficher"} les archivés ({archived.length})
                    </button>
                    {showArchived && (
                      <div style={{ borderTop: GB }}>
                        {archived.map(item => (
                          <div key={item.id}
                            className="flex items-center gap-3 px-5 py-2 opacity-50 hover:opacity-70 transition-opacity"
                            style={{ borderBottom: GB }}>
                            <span className="flex-1 text-xs text-ink-soft truncate">{item.label}</span>
                            <span className="text-xs font-mono text-ink-ghost">{fmt(item.montant)}</span>
                            <Badge variant="neutral" size="sm">Archivé</Badge>
                            <button onClick={() => handleDelete(item)}
                              className="p-1 text-ink-ghost hover:text-critique transition-colors">
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

            {/* ── Right sidebar ───────────────────────────────────────────────── */}
            <div className="overflow-y-auto">
              <div className="p-4 flex flex-col gap-4">

                {/* 1 — Net du mois */}
                <GlassCard>
                  <div className="px-4 py-3" style={{ background: `${net >= 0 ? "#22c55e" : "#ef4444"}09` }}>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-ink-ghost mb-1.5">
                      Flux net · {capMonthLabel(navYear, navMonth)}
                    </p>
                    <p className="text-3xl font-bold tabular-nums leading-none"
                      style={{ color: net >= 0 ? "var(--calm)" : "var(--critique)" }}>
                      {net >= 0 ? "+" : ""}{fmt(net)}
                    </p>
                    {totalRevenus > 0 && (
                      <p className="text-[10px] mt-1.5 text-ink-ghost">
                        {net >= 0
                          ? `${((net / totalRevenus) * 100).toFixed(0)} % du revenu préservé`
                          : `Déficit — ${((-net / totalRevenus) * 100).toFixed(0)} % au-delà des revenus`}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2" style={{ borderTop: GB }}>
                    {[
                      { label: "Revenus", val: totalRevenus, color: "var(--calm)" },
                      { label: "Dépenses", val: totalDepenses, color: "var(--ink)" },
                    ].map(({ label, val, color }, i) => (
                      <div key={label} className="px-4 py-2.5"
                        style={{ borderRight: i === 0 ? GB : "none" }}>
                        <p className="text-[9px] font-mono uppercase tracking-wide text-ink-ghost mb-0.5">{label}</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color }}>{fmt(val)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 space-y-1.5" style={{ borderTop: GB }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-ink-ghost flex items-center gap-1">
                        Taux d'engagement
                        <div className="group relative inline-block">
                          <Info size={9} className="text-ink-ghost cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-52 text-[10px] text-ink-soft bg-surface-elevated border border-white/10 rounded-lg px-3 py-2 shadow-lg z-10 leading-relaxed">
                            Part du revenu engagée sur des dépenses fixes. Au-delà de 75 % tendu, 90 % critique.
                          </div>
                        </div>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ color: tauxColor, background: tauxColor + "20" }}>{tauxLabel}</span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: tauxColor }}>{taux.toFixed(0)} %</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, taux)}%`, background: tauxColor }} />
                    </div>
                  </div>
                </GlassCard>

                {/* 3 — Répartition dépenses (donut chart) */}
                {depenses.length > 0 && (
                  <GlassCard>
                    <div className="px-4 py-2.5" style={{ borderBottom: GB }}>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Répartition dépenses</p>
                    </div>
                    <div className="px-4 py-4">
                      <CategoryDonut depenses={depenses} itemAmounts={navItemAmounts} />
                    </div>
                  </GlassCard>
                )}

                {/* 4 — Prochains engagements */}
                {upcomingEngagements.length > 0 && (
                  <GlassCard>
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: GB }}>
                      <AlertTriangle size={11} className="text-attention" />
                      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Engagements à venir</p>
                    </div>
                    <div>
                      {upcomingEngagements.map(e => {
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

              </div>
            </div>
          </div>
        </>
      )}

      <ItemPanel open={panelOpen} item={editing} defaults={panelDefaults} onClose={() => setPanelOpen(false)} onSave={handleSave} />
      <ComptePanel open={comptePanelOpen} compte={editingCompte} onClose={() => setComptePanelOpen(false)} onSave={handleSaveCompte} />
    </div>
  );
}
