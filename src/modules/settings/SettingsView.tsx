"use client";

import { useState, useRef, useMemo } from "react";
import {
  Sun, Moon, Focus, AlertTriangle, Download, Upload,
  Keyboard, Gauge, Settings2, Database, CheckCircle2, FileText, Bell, BellOff,
} from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { usePreferencesStore } from "@/store/preferences";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useComptesStore, getSoldeRunway } from "@/store/comptes";
import { usePatrimoineStore } from "@/store/patrimoine";
import { projectDailyBalance, getPointBas, toMensuel } from "@/lib/projection";
import { computeTensionScore, computeMomentum } from "@/lib/tensionScore";
import { printRapportPDF, buildActions } from "@/lib/exportPDF";
import type { RapportData } from "@/lib/exportPDF";
import { requestNotificationPermission, getNotificationPermission } from "@/lib/notifications";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { AppTheme } from "@/types";

const THEMES: { value: AppTheme; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Clair", desc: "Interface lumineuse", icon: <Sun size={18} /> },
  { value: "dark", label: "Sombre", desc: "Défaut — confort nocturne", icon: <Moon size={18} /> },
  { value: "focus", label: "Focus", desc: "Contraste réduit, lecture longue", icon: <Focus size={18} /> },
];

const STORE_KEYS = [
  "fts-onboarding",
  "fts-base-financiere",
  "fts-compte",
  "fts-comptes",
  "fts-timeline",
  "fts-scenarios",
  "fts-transactions",
  "fts-preferences",
  "fts-patrimoine",
  "fts-engagements",
  "fts-coups-durs",
  "fts-budget",
];

const SHORTCUTS = [
  { keys: ["Esc"], label: "Quitter le mode Focus" },
  { keys: ["Alt", "1"], label: "Cockpit" },
  { keys: ["Alt", "2"], label: "Timeline" },
  { keys: ["Alt", "3"], label: "Budget" },
  { keys: ["Alt", "4"], label: "Base Financière" },
  { keys: ["Alt", "5"], label: "Analyse" },
  { keys: ["Alt", "6"], label: "Patrimoine" },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
      style={{
        border: "1px solid var(--border-strong)",
        background: "var(--surface-overlay)",
        color: "var(--ink-soft)",
      }}
    >
      {children}
    </kbd>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-ink-ghost">{icon}</span>
      <p className="text-xs font-mono uppercase tracking-widest text-ink-ghost">{title}</p>
    </div>
  );
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [confirmReset, setConfirmReset] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [pdfDone, setPdfDone] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" ? getNotificationPermission() : "unsupported"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    confortThreshold, setConfortThreshold,
    budgetReviewDay, setBudgetReviewDay,
    reconciliationAmountTol, setReconciliationAmountTol,
    notificationsEnabled, setNotificationsEnabled,
    notificationRunwayThreshold, setNotificationRunwayThreshold,
  } = usePreferencesStore();

  const { items: baseItems } = useBaseFinanciereStore();
  const { comptes } = useComptesStore();
  const { actifs, passifs, objectifs } = usePatrimoineStore();

  const activeItems = useMemo(() => baseItems.filter((i) => !i.archived), [baseItems]);

  const solde = useMemo(() => getSoldeRunway(comptes), [comptes]);

  const projection90 = useMemo(
    () => solde !== null ? projectDailyBalance(solde, activeItems, 90) : [],
    [solde, activeItems]
  );

  const pointBas = useMemo(() => getPointBas(projection90), [projection90]);

  const revenus = useMemo(
    () => activeItems.filter((i) => i.direction === "revenu").reduce((s, i) => s + toMensuel(i), 0),
    [activeItems]
  );

  const depenses = useMemo(
    () => activeItems.filter((i) => i.direction === "depense").reduce((s, i) => s + toMensuel(i), 0),
    [activeItems]
  );

  const monthlyNet = revenus - depenses;

  const runwayJours = useMemo(() => {
    if (solde === null || depenses <= 0) return null;
    const dailyBurn = depenses / 30;
    return Math.floor(solde / dailyBurn);
  }, [solde, depenses]);

  const tension = useMemo(
    () => computeTensionScore(runwayJours, pointBas?.solde ?? null, confortThreshold, monthlyNet),
    [runwayJours, pointBas, confortThreshold, monthlyNet]
  );

  const momentum = useMemo(
    () => computeMomentum(monthlyNet, depenses),
    [monthlyNet, depenses]
  );

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeItems.filter((i) => i.direction === "depense")) {
      map.set(item.categorie, (map.get(item.categorie) ?? 0) + toMensuel(item));
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, montant]) => ({
        label,
        montant: Math.round(montant),
        pct: total > 0 ? Math.round((montant / total) * 1000) / 10 : 0,
      }));
  }, [activeItems]);

  const totalActifs = useMemo(() => actifs.reduce((s, a) => s + a.valeur, 0), [actifs]);
  const totalPassifs = useMemo(() => passifs.reduce((s, p) => s + p.capital, 0), [passifs]);

  function handleReset() {
    STORE_KEYS.forEach((k) => localStorage.removeItem(k));
    window.location.href = "/onboarding";
  }

  function handleExport() {
    const data: Record<string, unknown> = {};
    for (const key of STORE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fintrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2500);
  }

  // Selecting a file only stages it — nothing is written until the user
  // explicitly confirms below (H1 fiabilisation : plus de remplacement
  // silencieux au simple choix de fichier).
  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportStatus("idle");
    setPendingImportFile(file);
  }

  function handleCancelImport() {
    setPendingImportFile(null);
  }

  function handleConfirmImport() {
    const file = pendingImportFile;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        const recognizedKeys = Object.keys(data).filter((k) => STORE_KEYS.includes(k));
        if (recognizedKeys.length === 0) {
          throw new Error("Aucune clé Fintrack reconnue dans ce fichier.");
        }
        for (const key of recognizedKeys) {
          localStorage.setItem(key, JSON.stringify(data[key]));
        }
        setPendingImportFile(null);
        setImportStatus("success");
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportStatus("error");
        setTimeout(() => setImportStatus("idle"), 3000);
      }
    };
    reader.readAsText(file);
  }

  async function handleRequestPermission() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === "granted") setNotificationsEnabled(true);
  }

  function handleExportPDF() {
    const now = new Date();
    const generatedAt = now.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const pdfObjectifs = objectifs.map((o) => ({
      label: o.label,
      actuel: o.actuel,
      cible: o.cible,
      pct: o.cible > 0 ? Math.round((o.actuel / o.cible) * 100) : 0,
    }));

    const partial: Omit<RapportData, "actions"> = {
      generatedAt,
      solde,
      runwayJours,
      pointBas: pointBas
        ? {
            solde: pointBas.solde,
            dateStr: pointBas.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
          }
        : null,
      tensionScore: tension.score,
      tensionLevel: tension.level,
      momentum,
      confortThreshold,
      revenus: Math.round(revenus),
      depenses: Math.round(depenses),
      net: Math.round(monthlyNet),
      categories,
      actifs: Math.round(totalActifs),
      passifs: Math.round(totalPassifs),
      netWorth: Math.round(totalActifs - totalPassifs),
      objectifs: pdfObjectifs,
    };

    const data: RapportData = { ...partial, actions: buildActions(partial) };
    printRapportPDF(data);

    setPdfDone(true);
    setTimeout(() => setPdfDone(false), 3000);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-6 shrink-0"
        style={{ height: 56, borderBottom: "1px solid var(--border)" }}
      >
        <Settings2 size={15} className="text-ink-ghost" />
        <h1 className="text-sm font-semibold text-ink">Paramètres</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[1fr_280px] divide-x divide-border min-h-full">

          {/* ── Left column ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-8 p-6">

            {/* Apparence */}
            <section>
              <SectionHeading icon={<Sun size={13} />} title="Apparence" />
              <div className="grid grid-cols-3 gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-2.5 p-4 rounded-lg border-2 transition-colors text-center",
                      theme === t.value
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border bg-surface-elevated text-ink-soft hover:border-border-strong hover:text-ink"
                    )}
                  >
                    {t.icon}
                    <div>
                      <p className="text-xs font-medium">{t.label}</p>
                      <p className="text-[10px] opacity-60 leading-tight mt-0.5">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Seuils & calculs */}
            <section>
              <SectionHeading icon={<Gauge size={13} />} title="Seuils & calculs" />
              <div className="rounded-lg border border-border bg-surface-elevated divide-y divide-border">
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink mb-0.5">Seuil de confort</p>
                    <p className="text-xs text-ink-soft">
                      Solde en dessous duquel une alerte est déclenchée. Utilisé par le Cockpit, le Focus et le score de tension.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      label=""
                      type="number"
                      value={String(confortThreshold)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0) setConfortThreshold(v);
                      }}
                      className="w-28"
                    />
                    <span className="text-xs text-ink-soft mt-1">€</span>
                  </div>
                </div>

                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink mb-0.5">Jour de revue budgétaire</p>
                    <p className="text-xs text-ink-soft">
                      Jour du mois utilisé comme point d'ancrage pour le calcul du budget du mois suivant (solde projeté à cette date).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      label=""
                      type="number"
                      value={String(budgetReviewDay)}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) setBudgetReviewDay(v);
                      }}
                      className="w-28"
                    />
                    <span className="text-xs text-ink-soft mt-1">/ mois</span>
                  </div>
                </div>

                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink mb-0.5">Tolérance de rapprochement</p>
                    <p className="text-xs text-ink-soft">
                      Écart maximal entre une transaction importée et un poste de la Base pour proposer un rapprochement automatique.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      label=""
                      type="number"
                      value={String(reconciliationAmountTol)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0) setReconciliationAmountTol(v);
                      }}
                      className="w-28"
                    />
                    <span className="text-xs text-ink-soft mt-1">€</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section>
              <SectionHeading icon={<Bell size={13} />} title="Notifications" />
              <div className="rounded-lg border border-border bg-surface-elevated divide-y divide-border">

                {/* Permission banner */}
                {notifPermission === "unsupported" && (
                  <div className="p-4">
                    <p className="text-xs text-ink-soft">Les notifications ne sont pas supportées par ce navigateur.</p>
                  </div>
                )}

                {notifPermission === "denied" && (
                  <div className="p-4 flex items-start gap-3">
                    <BellOff size={14} className="text-critique shrink-0 mt-0.5" />
                    <p className="text-xs text-ink-soft">
                      Les notifications sont bloquées par le navigateur. Autorisez-les dans les paramètres du site pour les activer.
                    </p>
                  </div>
                )}

                {notifPermission === "default" && (
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink mb-0.5">Activer les alertes</p>
                      <p className="text-xs text-ink-soft">Autorisez les notifications pour recevoir des alertes de trésorerie.</p>
                    </div>
                    <Button size="sm" variant="secondary" leftIcon={<Bell size={13} />} onClick={handleRequestPermission}>
                      Autoriser
                    </Button>
                  </div>
                )}

                {notifPermission === "granted" && (
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink mb-0.5">Alertes actives</p>
                      <p className="text-xs text-ink-soft">Runway critique, point bas sous le seuil, flux mensuel négatif.</p>
                    </div>
                    <button
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                        notificationsEnabled ? "bg-accent" : "bg-border"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                          notificationsEnabled ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                )}

                {notifPermission === "granted" && notificationsEnabled && (
                  <div className="p-4 flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink mb-0.5">Seuil runway</p>
                      <p className="text-xs text-ink-soft">
                        Alerte si le runway descend sous ce nombre de jours.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        label=""
                        type="number"
                        value={String(notificationRunwayThreshold)}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v > 0) setNotificationRunwayThreshold(v);
                        }}
                        className="w-20"
                      />
                      <span className="text-xs text-ink-soft mt-1">jours</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Export / Import */}
            <section>
              <SectionHeading icon={<Database size={13} />} title="Sauvegarde des données" />
              <div className="rounded-lg border border-border bg-surface-elevated divide-y divide-border">

                {/* PDF export */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink mb-0.5">Rapport PDF mensuel</p>
                    <p className="text-xs text-ink-soft">
                      Génère un rapport imprimable : solde, runway, projection, dépenses, patrimoine et recommandations.
                    </p>
                    {pdfDone && (
                      <p className="text-xs text-calm mt-1">Rapport ouvert — utilisez Fichier › Imprimer pour enregistrer en PDF.</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={pdfDone ? <CheckCircle2 size={13} className="text-calm" /> : <FileText size={13} />}
                    onClick={handleExportPDF}
                  >
                    {pdfDone ? "Ouvert !" : "Exporter PDF"}
                  </Button>
                </div>

                {/* JSON export */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-ink mb-0.5">Sauvegarde JSON</p>
                    <p className="text-xs text-ink-soft">
                      Télécharge l'intégralité de vos données locales au format JSON.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={exportDone ? <CheckCircle2 size={13} className="text-calm" /> : <Download size={13} />}
                    onClick={handleExport}
                  >
                    {exportDone ? "Exporté !" : "Exporter JSON"}
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink mb-0.5">Importer</p>
                      <p className="text-xs text-ink-soft">
                        Restaure une sauvegarde JSON. Remplace toutes les données actuelles.
                      </p>
                      {importStatus === "success" && (
                        <p className="text-xs text-calm mt-1">Importé — rechargement en cours…</p>
                      )}
                      {importStatus === "error" && (
                        <p className="text-xs text-critique mt-1">Fichier invalide, corrompu, ou sans données Fintrack reconnues.</p>
                      )}
                    </div>
                    {!pendingImportFile && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleImportFile}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Upload size={13} />}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Restaurer
                        </Button>
                      </div>
                    )}
                  </div>

                  {pendingImportFile && (
                    <div className="rounded-lg border border-critique/30 bg-surface p-3 space-y-3">
                      <div className="flex items-start gap-2 text-sm text-critique">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>
                          « {pendingImportFile.name} » va remplacer toutes vos données actuelles — action irréversible.
                          Exportez une sauvegarde de l&apos;état actuel avant de continuer si vous n&apos;en avez pas déjà une.
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={exportDone ? <CheckCircle2 size={13} className="text-calm" /> : <Download size={13} />}
                          onClick={handleExport}
                        >
                          {exportDone ? "Exporté !" : "Sauvegarder l'état actuel d'abord"}
                        </Button>
                        <Button variant="danger" size="sm" onClick={handleConfirmImport}>
                          Confirmer le remplacement
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleCancelImport}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Réinitialisation */}
            <section>
              <SectionHeading icon={<AlertTriangle size={13} />} title="Zone de danger" />
              <div className="rounded-lg border border-critique/30 bg-surface-elevated p-4 space-y-3">
                <p className="text-sm text-ink-soft">
                  Supprime toutes les données locales et redirige vers l'onboarding.
                </p>
                {!confirmReset ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>
                    Réinitialiser toutes les données
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-critique">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>Action irréversible — toutes les données seront perdues.</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="danger" size="sm" onClick={handleReset}>
                        Confirmer
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmReset(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Right column ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6 p-6">

            {/* Shortcuts */}
            <section>
              <SectionHeading icon={<Keyboard size={13} />} title="Raccourcis clavier" />
              <div className="rounded-lg border border-border bg-surface-elevated divide-y divide-border">
                {SHORTCUTS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-xs text-ink-soft">{s.label}</p>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* About */}
            <section>
              <SectionHeading icon={<Settings2 size={13} />} title="À propos" />
              <div className="rounded-lg border border-border bg-surface-elevated p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-soft">Version</p>
                  <span className="text-xs font-mono text-ink px-2 py-0.5 rounded bg-surface-overlay border border-border">
                    V3.0
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-soft">Stockage</p>
                  <p className="text-xs text-ink font-mono">localStorage</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-soft">Données</p>
                  <p className="text-xs text-ink font-mono">100 % local</p>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-ink-ghost leading-relaxed">
                    Fintrack stocke toutes vos données exclusivement dans le navigateur. Aucune donnée n'est transmise à un serveur tiers sans votre action explicite (Import IA).
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
