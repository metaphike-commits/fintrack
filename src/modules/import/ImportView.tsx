"use client";

import { useState } from "react";
import {
  CheckCircle2, ArrowRight, RotateCcw, ExternalLink,
  Sparkles, Clock, TrendingUp, TrendingDown, Minus,
  Link2, Link2Off,
} from "lucide-react";
import Link from "next/link";
import { useImportStore, normalizeLabel, type CategorizedRow } from "@/store/importIA";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useTransactionsStore } from "@/store/transactions";
import { usePreferencesStore } from "@/store/preferences";
import { parseFile } from "@/lib/csvParser";
import { findMatch } from "@/lib/reconcile";
import { DropZone } from "./DropZone";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

const CATEGORY_GROUPS = [
  { group: "Revenus",       items: ["salaire", "freelance", "remboursement", "allocation"] },
  { group: "Logement",      items: ["loyer", "électricité", "eau", "internet"] },
  { group: "Transport",     items: ["transport", "stationnement", "carburant"] },
  { group: "Vie courante",  items: ["alimentation", "restauration", "santé", "loisirs", "vêtements"] },
  { group: "Financier",     items: ["abonnements", "assurance", "épargne", "crédit", "impôts", "amende"] },
  { group: "Autre",         items: ["autre"] },
] as const;


const STEPS = ["Fichier", "Prévisualisation", "Validation", "Importé"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                done ? "bg-calm text-white" : active ? "bg-accent text-white" : "bg-surface-overlay text-ink-ghost"
              )}>
                {done ? <CheckCircle2 size={11} /> : i + 1}
              </div>
              <span className={cn("text-xs", active ? "text-ink font-medium" : "text-ink-ghost")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <ArrowRight size={12} className="mx-2 text-ink-ghost shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" }); }
  catch { return s; }
}

type FilterTab = "all" | "revenus" | "depenses" | "non-reconciliees";

function SummaryBar({ rows }: { rows: CategorizedRow[] }) {
  const included = rows.filter((r) => r.include);
  const revenus = included.filter((r) => r.direction === "revenu").reduce((s, r) => s + r.montant, 0);
  const depenses = included.filter((r) => r.direction === "depense").reduce((s, r) => s + r.montant, 0);
  const net = revenus - depenses;
  const reconciled = included.filter((r) => r.reconciled).length;

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: "Revenus", value: fmt(revenus), icon: <TrendingUp size={12} />, color: "text-calm" },
        { label: "Dépenses", value: fmt(depenses), icon: <TrendingDown size={12} />, color: "text-critique" },
        {
          label: "Net",
          value: fmt(net),
          icon: <Minus size={12} />,
          color: net >= 0 ? "text-calm" : "text-critique",
        },
        { label: "Réconciliées", value: `${reconciled} / ${included.length}`, icon: <Link2 size={12} />, color: "text-ink-soft" },
      ].map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border bg-surface-elevated p-3">
          <div className={cn("flex items-center gap-1.5 mb-1", stat.color)}>
            {stat.icon}
            <p className="text-[10px] font-mono uppercase tracking-widest">{stat.label}</p>
          </div>
          <p className={cn("text-base font-semibold tabular-nums", stat.color)}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export function ImportView() {
  const store = useImportStore();
  const { items: baseItems } = useBaseFinanciereStore();
  const { addTransactions, addImportSession, importSessions } = useTransactionsStore();
  const { reconciliationAmountTol } = usePreferencesStore();
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [propagation, setPropagation] = useState<{ label: string; count: number } | null>(null);

  function handleCategorieChange(row: CategorizedRow, newCategorie: string) {
    const count = store.updateCategorieBySimilarLabel(row.id, newCategorie);
    if (count > 0) {
      const norm = normalizeLabel(row.label);
      setPropagation({ label: norm.trim() || row.label, count });
      setTimeout(() => setPropagation(null), 3500);
    }
  }

  const stepIndex =
    store.step === "upload" ? 0
    : store.step === "preview" ? 1
    : store.step === "categorizing" ? 1
    : store.step === "validation" ? 2
    : 3;

  async function handleFile(file: File) {
    setError(null);
    setParsing(true);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) { setError("Aucune transaction détectée. Vérifiez le format du fichier."); return; }
      store.setFile(file.name, rows);
      await handleCategorize(rows); // auto-categorize immediately — skip manual button
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de lire ce fichier.");
    } finally {
      setParsing(false);
    }
  }

  async function handleCategorize(rawRows?: import("@/lib/csvParser").ParsedRow[]) {
    const toProcess = rawRows ?? store.rawRows;
    store.setStep("categorizing");
    const activeItems = baseItems.filter((i) => !i.archived);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: toProcess }),
      });
      const data = await res.json();
      const catMap = new Map<string, string>(
        (data.rows as { id: string; categorie: string }[]).map((r) => [r.id, r.categorie])
      );
      store.setRows(
        toProcess.map((r) => {
          const match = findMatch(r, activeItems, reconciliationAmountTol);
          return { ...r, categorie: catMap.get(r.id) ?? "autre", include: true, reconciled: false, matchedItemId: match?.item.id, matchedItemLabel: match?.item.label };
        })
      );
    } catch {
      store.setRows(
        toProcess.map((r) => {
          const match = findMatch(r, activeItems, reconciliationAmountTol);
          return { ...r, categorie: r.direction === "revenu" ? "salaire" : "autre", include: true, reconciled: false, matchedItemId: match?.item.id, matchedItemLabel: match?.item.label };
        })
      );
    } finally {
      store.setStep("validation");
    }
  }

  function handleImport() {
    const toImport = store.rows.filter((r) => r.include);
    const reconciledCount = toImport.filter((r) => r.reconciled).length;
    addTransactions(toImport.map((r) => ({
      id: r.id, date: r.date, label: r.label, montant: r.montant, direction: r.direction,
      categorie: r.categorie, reconciledItemId: r.reconciled ? r.matchedItemId : undefined,
    })));
    addImportSession({ fileName: store.fileName, transactionCount: toImport.length, reconciledCount });
    store.setImportedCount(toImport.length);
    store.setStep("done");
  }

  const selectedCount = store.rows.filter((r) => r.include).length;
  const allSelected = store.rows.length > 0 && selectedCount === store.rows.length;

  const filteredRows = store.rows.filter((r) => {
    if (filter === "revenus") return r.direction === "revenu";
    if (filter === "depenses") return r.direction === "depense";
    if (filter === "non-reconciliees") return r.matchedItemLabel && !r.reconciled;
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 56, borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} className="text-ink-ghost" />
          <h1 className="text-sm font-semibold text-ink">Import IA</h1>
        </div>
        <StepBar current={stepIndex} />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* ── Upload ── */}
          {store.step === "upload" && (
            <div className="space-y-6">
              {parsing ? (
                <div className="flex flex-col items-center justify-center gap-5 py-20">
                  <div className="relative">
                    <Spinner size="lg" />
                    <Sparkles size={14} className="absolute -top-1 -right-1 text-accent" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-ink">Lecture du PDF en cours…</p>
                    <p className="text-xs text-ink-ghost">L'IA extrait les transactions de votre relevé</p>
                  </div>
                </div>
              ) : (
                <DropZone onFile={handleFile} />
              )}
              {error && (
                <p className="text-sm text-critique">{error}</p>
              )}

              {importSessions.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost flex items-center gap-1.5 mb-3">
                    <Clock size={10} />Historique d'imports
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    {importSessions.slice(0, 6).map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0">
                        <div>
                          <p className="text-sm text-ink font-medium truncate max-w-[260px]">{s.fileName}</p>
                          <p className="text-xs text-ink-ghost">
                            {new Date(s.importedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-ink">{s.transactionCount} transactions</p>
                          {s.reconciledCount > 0 && (
                            <p className="text-xs text-calm">{s.reconciledCount} réconciliées</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* preview is transitional — immediately overridden by categorizing */}
          {store.step === "preview" && (
            <div className="flex flex-col items-center justify-center gap-5 py-20">
              <Spinner size="lg" />
              <p className="text-sm text-ink-ghost">Préparation…</p>
            </div>
          )}

          {/* ── Categorizing ── */}
          {store.step === "categorizing" && (
            <div className="flex flex-col items-center justify-center gap-5 py-20">
              <div className="relative">
                <Spinner size="lg" />
                <Sparkles size={14} className="absolute -top-1 -right-1 text-accent" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-ink">Catégorisation en cours…</p>
                <p className="text-xs text-ink-ghost">L'IA analyse {store.rawRows.length} transactions</p>
              </div>
            </div>
          )}

          {/* ── Validation ── */}
          {store.step === "validation" && (
            <div className="space-y-4">
              {/* Summary stats */}
              <SummaryBar rows={store.rows} />

              {/* Toolbar */}
              <div className="flex items-center gap-3">
                {/* Filter pills */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-overlay border border-border">
                  {(["all", "revenus", "depenses", "non-reconciliees"] as FilterTab[]).map((f) => {
                    const label = f === "all" ? "Tout" : f === "revenus" ? "Revenus" : f === "depenses" ? "Dépenses" : "À rapprocher";
                    return (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-md transition-colors",
                          filter === f ? "bg-surface text-ink shadow-sm" : "text-ink-ghost hover:text-ink"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <span className="flex-1" />
                <button onClick={() => store.setRows(store.rows.map((r) => ({ ...r, include: !allSelected })))} className="text-xs text-accent hover:underline">
                  {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
                <p className="text-xs text-ink-soft">
                  <span className="font-medium text-ink">{selectedCount}</span> / {store.rows.length} sélectionnées
                </p>
              </div>

              {/* Propagation banner */}
              {propagation && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-accent/10 border border-accent/20 text-accent animate-fade-in">
                  <Sparkles size={11} />
                  <span><span className="font-semibold">{propagation.count}</span> autre{propagation.count > 1 ? "s" : ""} occurrence{propagation.count > 1 ? "s" : ""} mise{propagation.count > 1 ? "s" : ""} à jour automatiquement · <span className="opacity-70">« {propagation.label} »</span></span>
                </div>
              )}

              {/* Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-overlay">
                      <th className="px-3 py-2.5 w-8" />
                      <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Date</th>
                      <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Libellé</th>
                      <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Catégorie</th>
                      <th className="text-left px-3 py-2.5 text-ink-ghost font-medium">Dir.</th>
                      <th className="text-right px-3 py-2.5 text-ink-ghost font-medium">Montant</th>
                      <th className="px-3 py-2.5 text-ink-ghost font-medium w-36">Rapprochement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr
                        key={r.id}
                        className={cn(
                          "border-t border-border transition-colors hover:bg-surface-overlay/30",
                          r.include ? "" : "opacity-40"
                        )}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={r.include}
                            onChange={() => store.toggleInclude(r.id)}
                            className="accent-accent"
                          />
                        </td>
                        <td className="px-3 py-2 text-ink-ghost tabular-nums whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-3 py-2 text-ink max-w-[180px] truncate">{r.label}</td>
                        <td className="px-2 py-1.5">
                          <select
                            value={r.categorie}
                            onChange={(e) => handleCategorieChange(r, e.target.value)}
                            className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            {CATEGORY_GROUPS.map((g) => (
                              <optgroup key={g.group} label={g.group}>
                                {g.items.map((c) => <option key={c} value={c}>{c}</option>)}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={r.direction}
                            onChange={(e) => store.updateRow(r.id, { direction: e.target.value as "revenu" | "depense" })}
                            className="text-xs border border-border rounded px-1.5 py-0.5 bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <option value="revenu">revenu</option>
                            <option value="depense">dépense</option>
                          </select>
                        </td>
                        <td className={cn("px-3 py-2 text-right tabular-nums font-mono whitespace-nowrap", r.direction === "revenu" ? "text-calm" : "text-ink")}>
                          {r.direction === "revenu" ? "+" : "-"}{fmt(r.montant)}
                        </td>
                        <td className="px-3 py-2">
                          {r.matchedItemLabel && (
                            <button
                              onClick={() => store.setReconciled(r.id, !r.reconciled)}
                              className={cn(
                                "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors max-w-[130px]",
                                r.reconciled
                                  ? "text-calm bg-calm-soft"
                                  : "text-attention bg-attention-soft hover:text-calm hover:bg-calm-soft"
                              )}
                            >
                              {r.reconciled ? <Link2 size={9} className="shrink-0" /> : <Link2Off size={9} className="shrink-0" />}
                              <span className="truncate">{r.matchedItemLabel}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-ink-ghost">
                    Aucune transaction dans ce filtre.
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleImport} disabled={selectedCount === 0} className="flex-1">
                  Importer {selectedCount > 0 ? `${selectedCount} transaction${selectedCount > 1 ? "s" : ""}` : ""}
                </Button>
                <Button variant="secondary" onClick={() => store.reset()}>Annuler</Button>
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {store.step === "done" && (
            <div className="flex flex-col items-center gap-6 py-16">
              <div className="w-16 h-16 rounded-full bg-calm-soft flex items-center justify-center">
                <CheckCircle2 size={32} className="text-calm" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-lg font-semibold text-ink">
                  {store.importedCount} transaction{store.importedCount > 1 ? "s" : ""} importée{store.importedCount > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-ink-soft">
                  Les transactions sont disponibles dans l'onglet Analyse.
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/analyse">
                  <Button rightIcon={<ExternalLink size={13} />}>Voir l'Analyse</Button>
                </Link>
                <Button variant="secondary" leftIcon={<RotateCcw size={13} />} onClick={() => store.reset()}>
                  Nouvel import
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
