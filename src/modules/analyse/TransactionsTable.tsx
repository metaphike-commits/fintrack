"use client";

import { useState, useMemo } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Sparkles, X, Zap, Check, ArrowLeftRight,
  AlertTriangle, Trash2, Link2, Link2Off,
} from "lucide-react";
import { useTransactionsStore, type Transaction, type FlowType } from "@/store/transactions";
import { useComptesStore } from "@/store/comptes";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { CATEGORY_OPTGROUPS } from "@/lib/categories";
import { detectTransferPairs, type TransferPair } from "@/lib/detectTransfers";
import { cn } from "@/lib/cn";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch { return s; }
}
function normLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9àâäéèêëîïôùûü]/g, " ").replace(/\s+/g, " ").trim();
}

type SortKey = "date" | "label" | "montant" | "categorie";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={10} className="text-ink-ghost/40" />;
  return dir === "asc" ? <ChevronUp size={10} className="text-accent" /> : <ChevronDown size={10} className="text-accent" />;
}

const FLOW_BADGE: Record<string, { label: string; cls: string }> = {
  transfer:       { label: "Transfert",     cls: "bg-surface-overlay border-border text-ink-ghost" },
  credit_payment: { label: "Paiement CB",   cls: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" },
  refund:         { label: "Remboursement", cls: "bg-calm/10 border-calm/30 text-calm" },
};

// ── Transfer confirmation banner ───────────────────────────────
function TransferBanner({
  pairs, compteById, onConfirm, onConfirmAll, onDismiss,
}: {
  pairs: TransferPair[];
  compteById: Map<string, string>;
  onConfirm: (p: TransferPair) => void;
  onConfirmAll: () => void;
  onDismiss: (p: TransferPair) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  if (!pairs.length) return null;
  return (
    <div className="rounded-xl border border-attention/30 bg-attention/5 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <Zap size={13} className="text-attention shrink-0" />
        <p className="text-xs font-medium text-ink flex-1">
          <span className="text-attention">{pairs.length} transfert{pairs.length > 1 ? "s" : ""} probable{pairs.length > 1 ? "s" : ""}</span>
          <span className="text-ink-ghost font-normal"> — confirmez pour les exclure de l'analyse</span>
        </p>
        <button onClick={onConfirmAll} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-attention/15 text-attention hover:bg-attention/25 transition-colors shrink-0">
          <Check size={11} />Tout confirmer
        </button>
        <button onClick={() => setExpanded((e) => !e)} className="text-xs text-ink-ghost hover:text-ink shrink-0">
          {expanded ? "Réduire" : "Voir"}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-attention/20">
          {pairs.map((p) => {
            const outCompte = (p.outCompteId ? compteById.get(p.outCompteId) : undefined) ?? p.outCompteId ?? "?";
            const inCompte  = (p.inCompteId  ? compteById.get(p.inCompteId)  : undefined) ?? p.inCompteId  ?? "?";
            const typeLabel = p.suggestedFlowType === "credit_payment" ? "Paiement carte" : "Transfert interne";
            const typeCls   = p.suggestedFlowType === "credit_payment"
              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
              : "bg-surface-overlay text-ink-ghost border-border";
            return (
              <div key={p.outId} className="flex items-center gap-3 px-4 py-2.5 border-t border-attention/10 hover:bg-white/[0.015] transition-colors">
                <ArrowLeftRight size={11} className="text-attention/60 shrink-0" />
                <div className="flex-1 min-w-0 text-xs flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay border border-border text-ink-ghost shrink-0">{outCompte}</span>
                  <span className="text-ink truncate max-w-[140px]" title={p.outLabel}>{p.outLabel}</span>
                  <span className="text-ink-ghost tabular-nums">−{fmt(p.amount)}</span>
                  <span className="text-ink-ghost">{fmtDate(p.outDate)}</span>
                  <span className="text-ink-ghost/40">↔</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay border border-border text-ink-ghost shrink-0">{inCompte}</span>
                  <span className="text-ink-ghost tabular-nums">+{fmt(p.amount)}</span>
                  <span className="text-ink-ghost">{fmtDate(p.inDate)}</span>
                  {p.daysDiff > 0 && <span className="text-ink-ghost/60 text-[10px]">J+{p.daysDiff}</span>}
                </div>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0", typeCls)}>{typeLabel}</span>
                <button onClick={() => onConfirm(p)} className="p-1 rounded text-calm hover:bg-calm/10 transition-colors" title="Confirmer"><Check size={12} /></button>
                <button onClick={() => onDismiss(p)} className="p-1 rounded text-ink-ghost hover:bg-surface-overlay transition-colors" title="Ignorer"><X size={12} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Duplicate detection banner ─────────────────────────────────
function DuplicateBanner({
  groups, txById, onCleanGroup, onCleanAll,
}: {
  groups: string[][];
  txById: Map<string, Transaction>;
  onCleanGroup: (ids: string[]) => void;
  onCleanAll: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  if (!groups.length) return null;
  return (
    <div className="rounded-xl border border-critique/30 bg-critique/5 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <AlertTriangle size={13} className="text-critique shrink-0" />
        <p className="text-xs font-medium text-ink flex-1">
          <span className="text-critique">{groups.length} doublon{groups.length > 1 ? "s" : ""} détecté{groups.length > 1 ? "s" : ""}</span>
          <span className="text-ink-ghost font-normal"> — même date, libellé et montant</span>
        </p>
        <button onClick={onCleanAll} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-critique/10 text-critique hover:bg-critique/20 transition-colors shrink-0">
          <Trash2 size={11} />Nettoyer tout
        </button>
        <button onClick={() => setExpanded((e) => !e)} className="text-xs text-ink-ghost hover:text-ink shrink-0">
          {expanded ? "Réduire" : "Voir"}
        </button>
      </div>
      {expanded && (
        <div className="border-t border-critique/20">
          {groups.map((ids) => {
            const t = txById.get(ids[0]);
            if (!t) return null;
            const extras = ids.length - 1;
            return (
              <div key={ids[0]} className="flex items-center gap-3 px-4 py-2.5 border-t border-critique/10 hover:bg-white/[0.015] transition-colors">
                <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                  <span className="text-ink-ghost tabular-nums font-mono shrink-0">{fmtDate(t.date)}</span>
                  <span className="text-ink truncate max-w-[220px]" title={t.label}>{t.label}</span>
                  <span className="text-ink-ghost tabular-nums shrink-0">{fmt(t.montant)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-critique/10 text-critique shrink-0">×{ids.length}</span>
                </div>
                <button
                  onClick={() => onCleanGroup(ids.slice(1))}
                  className="text-xs text-critique hover:underline shrink-0"
                >
                  Supprimer {extras} doublon{extras > 1 ? "s" : ""}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function TransactionsTable() {
  const {
    transactions, updateTransaction, updateTransactionsBatch,
    deleteTransaction, deleteTransactions,
    confirmTransferPair, dismissTransferPair,
  } = useTransactionsStore();
  const comptes = useComptesStore((s) => s.comptes);
  const { items: baseItems } = useBaseFinanciereStore();

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState<"all" | "revenu" | "depense">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });
  const [propagation, setPropagation] = useState<{ label: string; count: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const compteById = useMemo(() => new Map(comptes.map((c) => [c.id, c.label])), [comptes]);
  const itemById   = useMemo(() => new Map(baseItems.map((i) => [i.id, i])), [baseItems]);

  const pendingPairs = useMemo(() => detectTransferPairs(transactions, comptes), [transactions, comptes]);

  // Duplicate detection: same date + montant + normalized label
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const t of transactions) {
      const key = `${t.date.slice(0, 10)}|${t.montant}|${normLabel(t.label)}`;
      const arr = map.get(key) ?? [];
      arr.push(t.id);
      map.set(key, arr);
    }
    return [...map.values()].filter((ids) => ids.length > 1);
  }, [transactions]);

  const txById = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);

  const months = useMemo(() => {
    const s = new Set<string>();
    for (const t of transactions) s.add(t.date.slice(0, 7));
    return [...s].sort().reverse();
  }, [transactions]);

  const rows = useMemo(() => {
    let out = transactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((t) => t.label.toLowerCase().includes(q) || t.categorie.toLowerCase().includes(q));
    }
    if (monthFilter !== "all") out = out.filter((t) => t.date.startsWith(monthFilter));
    if (dirFilter !== "all") out = out.filter((t) => t.direction === dirFilter);
    return [...out].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "date") cmp = a.date.localeCompare(b.date);
      else if (sort.key === "label") cmp = a.label.localeCompare(b.label);
      else if (sort.key === "montant") cmp = a.montant - b.montant;
      else if (sort.key === "categorie") cmp = a.categorie.localeCompare(b.categorie);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [transactions, search, monthFilter, dirFilter, sort]);

  const analyticsRows = rows.filter((t) => !t.excludedFromAnalytics);
  const totalRevenus  = analyticsRows.filter((t) => t.direction === "revenu").reduce((s, t) => s + t.montant, 0);
  const totalDepenses = analyticsRows.filter((t) => t.direction === "depense").reduce((s, t) => s + t.montant, 0);
  const net = totalRevenus - totalDepenses;

  function toggleSort(key: SortKey) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
  }

  function handleCategorieChange(t: Transaction, newCat: string) {
    const norm = normLabel(t.label);
    const siblings = transactions.filter((tx) => tx.id !== t.id && normLabel(tx.label) === norm);
    updateTransaction(t.id, { categorie: newCat });
    if (siblings.length > 0) {
      updateTransactionsBatch(siblings.map((tx) => tx.id), { categorie: newCat });
      setPropagation({ label: t.label, count: siblings.length });
      setTimeout(() => setPropagation(null), 3500);
    }
  }

  function handleLinkItem(t: Transaction, itemId: string) {
    if (!itemId) {
      updateTransaction(t.id, { reconciledItemId: undefined });
      return;
    }
    const item = itemById.get(itemId);
    updateTransaction(t.id, {
      reconciledItemId: itemId,
      categorie: item?.categorie ?? t.categorie,
    });
  }

  const monthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  // Base items options per direction
  const activeItems = useMemo(() => baseItems.filter((i) => !i.archived), [baseItems]);

  return (
    <div className="space-y-4">
      {/* Transfer detection banner */}
      <TransferBanner
        pairs={pendingPairs}
        compteById={compteById}
        onConfirm={(p) => confirmTransferPair(p.outId, p.inId, p.suggestedFlowType)}
        onConfirmAll={() => { for (const p of pendingPairs) confirmTransferPair(p.outId, p.inId, p.suggestedFlowType); }}
        onDismiss={(p) => dismissTransferPair(p.outId, p.inId)}
      />

      {/* Duplicate detection banner */}
      <DuplicateBanner
        groups={duplicateGroups}
        txById={txById}
        onCleanGroup={(ids) => deleteTransactions(ids)}
        onCleanAll={() => {
          const toDelete = duplicateGroups.flatMap((ids) => ids.slice(1));
          deleteTransactions(toDelete);
        }}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-ghost pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-7 pr-7 py-1.5 text-xs rounded-lg border border-border bg-surface text-ink placeholder:text-ink-ghost focus:outline-none focus:ring-1 focus:ring-accent w-48"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-ghost hover:text-ink">
              <X size={11} />
            </button>
          )}
        </div>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="all">Tous les mois</option>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>

        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-overlay border border-border">
          {(["all", "revenu", "depense"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirFilter(d)}
              className={cn("text-xs px-2.5 py-1 rounded-md transition-colors", dirFilter === d ? "bg-surface text-ink shadow-sm" : "text-ink-ghost hover:text-ink")}
            >
              {d === "all" ? "Tout" : d === "revenu" ? "Revenus" : "Dépenses"}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-ink-ghost">{rows.length} transaction{rows.length > 1 ? "s" : ""}</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Revenus",  value: fmt(totalRevenus),  color: "text-calm" },
          { label: "Dépenses", value: fmt(totalDepenses), color: "text-critique" },
          { label: "Net",      value: fmt(net),           color: net >= 0 ? "text-calm" : "text-critique" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface-elevated p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-1">{s.label}</p>
            <p className={cn("text-base font-semibold tabular-nums", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Propagation banner */}
      {propagation && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-accent/10 border border-accent/20 text-accent">
          <Sparkles size={11} />
          <span>
            <span className="font-semibold">{propagation.count}</span> autre{propagation.count > 1 ? "s" : ""} transaction{propagation.count > 1 ? "s" : ""} mise{propagation.count > 1 ? "s" : ""} à jour
            {" · "}<span className="opacity-70">« {propagation.label} »</span>
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-overlay">
              <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">
                <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-ink transition-colors">
                  Date <SortIcon active={sort.key === "date"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">
                <button onClick={() => toggleSort("label")} className="flex items-center gap-1 hover:text-ink transition-colors">
                  Libellé <SortIcon active={sort.key === "label"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Compte</th>
              <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">
                <button onClick={() => toggleSort("categorie")} className="flex items-center gap-1 hover:text-ink transition-colors">
                  Catégorie <SortIcon active={sort.key === "categorie"} dir={sort.dir} />
                </button>
              </th>
              <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Récurrent</th>
              <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Type</th>
              <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Dir.</th>
              <th className="text-right px-3 py-2.5 text-ink-ghost font-medium">
                <button onClick={() => toggleSort("montant")} className="flex items-center gap-1 ml-auto hover:text-ink transition-colors">
                  Montant <SortIcon active={sort.key === "montant"} dir={sort.dir} />
                </button>
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const excluded    = t.excludedFromAnalytics === true;
              const compteLabel = t.compteId ? compteById.get(t.compteId) : null;
              const linkedItem  = t.reconciledItemId ? itemById.get(t.reconciledItemId) : null;
              const isDuplicate = duplicateGroups.some((ids) => ids.includes(t.id) && ids[0] !== t.id);
              return (
                <tr
                  key={t.id}
                  className={cn(
                    "border-t border-border transition-colors hover:bg-surface-overlay/30 group",
                    excluded && "opacity-40",
                    isDuplicate && "bg-critique/5"
                  )}
                >
                  <td className="px-3 py-2 text-ink-ghost tabular-nums whitespace-nowrap font-mono">{fmtDate(t.date)}</td>
                  <td className="px-3 py-2 text-ink max-w-[180px] truncate" title={t.label}>
                    {excluded ? <s className="text-ink-ghost">{t.label}</s> : t.label}
                    {isDuplicate && <span className="ml-1 text-[10px] text-critique">doublon</span>}
                  </td>
                  <td className="px-3 py-2">
                    {compteLabel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay border border-border text-ink-ghost whitespace-nowrap">
                        {compteLabel}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {!excluded ? (
                      <select
                        value={t.categorie}
                        onChange={(e) => handleCategorieChange(t, e.target.value)}
                        className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {CATEGORY_OPTGROUPS.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.items.map((c) => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <span className="text-ink-ghost">{t.categorie}</span>
                    )}
                  </td>
                  {/* Lien base financière */}
                  <td className="px-2 py-1.5">
                    {linkedItem ? (
                      <button
                        onClick={() => handleLinkItem(t, "")}
                        className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent hover:bg-critique/10 hover:border-critique/20 hover:text-critique transition-colors max-w-[120px]"
                        title="Cliquer pour délier"
                      >
                        <Link2 size={9} className="shrink-0" />
                        <span className="truncate">{linkedItem.label}</span>
                      </button>
                    ) : (
                      <select
                        value=""
                        onChange={(e) => handleLinkItem(t, e.target.value)}
                        className="text-[10px] border border-transparent rounded px-1 py-0.5 bg-transparent text-ink-ghost hover:border-border hover:bg-surface focus:outline-none focus:ring-1 focus:ring-accent focus:border-border focus:bg-surface transition-colors"
                      >
                        <option value="">+ Lier</option>
                        <optgroup label="Dépenses">
                          {activeItems.filter((i) => i.direction === "depense").map((i) => (
                            <option key={i.id} value={i.id}>{i.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Revenus">
                          {activeItems.filter((i) => i.direction === "revenu").map((i) => (
                            <option key={i.id} value={i.id}>{i.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    )}
                  </td>
                  {/* Type (flowType) */}
                  <td className="px-2 py-1.5">
                    <select
                      value={t.flowType ?? ""}
                      onChange={(e) => {
                        const ft = e.target.value as FlowType | "";
                        const excl = ft === "transfer" || ft === "credit_payment";
                        updateTransaction(t.id, {
                          flowType: ft || undefined,
                          excludedFromAnalytics: ft ? excl : false,
                        });
                      }}
                      className={cn(
                        "text-[10px] border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent",
                        t.flowType
                          ? "border-border bg-surface text-ink"
                          : "border-transparent bg-transparent text-ink-ghost hover:border-border hover:bg-surface"
                      )}
                    >
                      <option value="">—</option>
                      <option value="transfer">Transfert interne</option>
                      <option value="credit_payment">Paiement carte</option>
                      <option value="refund">Remboursement</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono", t.direction === "revenu" ? "bg-calm/10 text-calm" : "bg-critique/10 text-critique")}>
                      {t.direction === "revenu" ? "rev." : "dép."}
                    </span>
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-mono whitespace-nowrap font-medium", t.direction === "revenu" ? "text-calm" : "text-ink")}>
                    {t.direction === "revenu" ? "+" : "−"}{fmt(t.montant)}
                  </td>
                  {/* Delete */}
                  <td className="px-2 py-2 text-center">
                    {confirmDelete === t.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { deleteTransaction(t.id); setConfirmDelete(null); }} className="text-[10px] text-critique hover:underline">Oui</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-[10px] text-ink-ghost hover:text-ink">Non</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-critique/10 text-ink-ghost hover:text-critique"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-ink-ghost">Aucune transaction dans ce filtre.</div>
        )}
      </div>
    </div>
  );
}
