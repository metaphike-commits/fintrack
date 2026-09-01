"use client";

import { useState, useMemo } from "react";
import { X, ChevronRight, Check, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBudgetStore, getMoisOrEmpty } from "@/store/budget";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { useTransactionsStore } from "@/store/transactions";
import { useEngagementsStore } from "@/store/engagements";
import { computeBudgetMetrics, RYTHME_COLOR, RYTHME_LABEL } from "@/lib/budget";
import { Button } from "@/components/ui/Button";
import type { BudgetEnvelope } from "@/store/budget";
import type { EnveloppeMetrics } from "@/lib/budget";

function fmt(n: number) {
  return Math.round(n).toLocaleString("fr-FR");
}

// Algorithmic suggestion for next month amount
function suggest(em: EnveloppeMetrics): number {
  const montantPrevu = em.envelope.montantPrevu;
  const { montantDepense, pctMoisEcoule } = em;
  if (pctMoisEcoule < 5 || montantDepense === 0) return montantPrevu;
  const projected = montantDepense / (pctMoisEcoule / 100);
  if (projected > montantPrevu * 1.1) return Math.ceil(projected * 1.05 / 5) * 5;
  if (projected < montantPrevu * 0.65) return Math.max(10, Math.ceil(projected * 1.2 / 5) * 5);
  return montantPrevu;
}

function nextMonthOf(year: number, month: number) {
  const nm = month === 11 ? 0 : month + 1;
  const ny = month === 11 ? year + 1 : year;
  const raw = new Date(ny, nm, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { year: ny, month: nm, label: raw.charAt(0).toUpperCase() + raw.slice(1) };
}

function currentMonthLabel(year: number, month: number) {
  const raw = new Date(year, month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

interface RituelPanelProps {
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
}

export function RituelPanel({ open, year, month, onClose }: RituelPanelProps) {
  const [step, setStep]             = useState(0);
  const [amounts, setAmounts]       = useState<Record<string, number>>({});

  const { mois, addEnvelope, updateEnvelope } = useBudgetStore();
  const baseItems    = useBaseFinanciereStore(s => s.items);
  const transactions = useTransactionsStore(s => s.transactions);
  const { engagements } = useEngagementsStore();

  const currentMois = useMemo(() => getMoisOrEmpty(mois, year, month), [mois, year, month]);
  const metrics     = useMemo(
    () => computeBudgetMetrics(currentMois, transactions, baseItems, engagements, year, month),
    [currentMois, transactions, baseItems, engagements, year, month]
  );

  const next     = useMemo(() => nextMonthOf(year, month), [year, month]);
  const nextMois = useMemo(() => getMoisOrEmpty(mois, next.year, next.month), [mois, next.year, next.month]);

  function goToStep1() {
    const s: Record<string, number> = {};
    for (const em of metrics.envelopes) s[em.envelope.id] = suggest(em);
    setAmounts(s);
    setStep(1);
  }

  function validate() {
    for (const em of metrics.envelopes) {
      const montantPrevu = amounts[em.envelope.id] ?? em.envelope.montantPrevu;
      const envData: Omit<BudgetEnvelope, "id"> = {
        label: em.envelope.label,
        categorie: em.envelope.categorie,
        categoriesAlias: em.envelope.categoriesAlias,
        montantPrevu,
        couleur: em.envelope.couleur,
        ordre: em.envelope.ordre,
        notes: em.envelope.notes,
      };
      const existing = nextMois.envelopes.find(e => e.label === em.envelope.label);
      if (existing) updateEnvelope(next.year, next.month, existing.id, envData);
      else          addEnvelope(next.year, next.month, envData);
    }
    setStep(2);
  }

  function handleClose() {
    setStep(0);
    setAmounts({});
    onClose();
  }

  const envelopes = metrics.envelopes;
  const totalPrevu    = envelopes.reduce((s, e) => s + e.envelope.montantPrevu, 0);
  const totalDepense  = envelopes.reduce((s, e) => s + e.montantDepense, 0);
  const globalEcart   = totalPrevu - totalDepense;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40" onClick={handleClose} aria-hidden="true" />
      )}

      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 flex flex-col bg-surface-elevated border-l border-border shadow-xl",
        "transition-transform duration-300 w-full max-w-md",
        open ? "translate-x-0" : "translate-x-full"
      )}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <h2 className="text-sm font-semibold text-ink">Rituel mensuel</h2>
            <span className="text-xs text-ink-ghost">· {currentMonthLabel(year, month)}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md text-ink-ghost hover:text-ink hover:bg-surface-overlay transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Step indicator ─────────────────────────────────────────────── */}
        <div className="flex items-center px-5 py-3 border-b border-border shrink-0 gap-1">
          {(["Bilan", "Préparer", "Validé"] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 9px", borderRadius: 6,
                background: i === step ? "rgba(129,140,248,0.14)" : "transparent",
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < step ? "#818cf8" : i === step ? "rgba(129,140,248,0.28)" : "rgba(255,255,255,0.07)",
                  flexShrink: 0,
                }}>
                  {i < step
                    ? <Check size={9} style={{ color: "white" }} />
                    : <span style={{ fontSize: 9, fontWeight: 700, color: i === step ? "#818cf8" : "rgba(255,255,255,0.22)" }}>{i + 1}</span>
                  }
                </div>
                <span style={{ fontSize: 10, fontWeight: i === step ? 600 : 400, color: i === step ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.28)" }}>
                  {label}
                </span>
              </div>
              {i < 2 && <ChevronRight size={10} style={{ color: "rgba(255,255,255,0.14)", flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Step 0 — Bilan */}
          {step === 0 && (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Global summary */}
              <div style={{
                display: "flex", gap: 8, padding: "10px 12px", borderRadius: 10,
                background: globalEcart >= 0 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                border: `1px solid ${globalEcart >= 0 ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)"}`,
              }}>
                {globalEcart >= 0
                  ? <TrendingDown size={13} style={{ color: "#22c55e", flexShrink: 0, marginTop: 1 }} />
                  : <TrendingUp size={13} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                }
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: globalEcart >= 0 ? "#22c55e" : "#ef4444" }}>
                    {globalEcart >= 0 ? `${fmt(globalEcart)}€ économisés` : `${fmt(Math.abs(globalEcart))}€ de dépassement`}
                  </p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginTop: 1 }}>
                    {fmt(totalDepense)}€ dépensés sur {fmt(totalPrevu)}€ alloués
                  </p>
                </div>
              </div>

              {envelopes.length === 0 ? (
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "40px 0" }}>
                  Aucune enveloppe ce mois.
                </p>
              ) : envelopes.map(em => {
                const rColor = RYTHME_COLOR[em.rythme];
                const ecart  = em.envelope.montantPrevu - em.montantDepense;
                return (
                  <div key={em.envelope.id} style={{
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10, padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: em.envelope.couleur ?? rColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>
                        {em.envelope.label}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                        color: rColor, background: `${rColor}16`, border: `1px solid ${rColor}25`,
                        padding: "2px 7px", borderRadius: 5,
                      }}>
                        {RYTHME_LABEL[em.rythme]}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 20 }}>
                      {[
                        { label: "Prévu",   value: `${fmt(em.envelope.montantPrevu)}€`, color: "rgba(255,255,255,0.5)" },
                        { label: "Dépensé", value: `${fmt(em.montantDepense)}€`,        color: rColor                 },
                        { label: "Écart",   value: `${ecart >= 0 ? "−" : "+"}${fmt(Math.abs(ecart))}€`,
                          color: ecart >= 0 ? "#22c55e" : "#ef4444" },
                      ].map(col => (
                        <div key={col.label}>
                          <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.24)", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 2 }}>{col.label}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: col.color, fontVariantNumeric: "tabular-nums" }}>{col.value}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, em.pctConsomme)}%`, background: rColor, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 1 — Suggestions */}
          {step === 1 && (
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.6, marginBottom: 4 }}>
                Montants suggérés pour <strong style={{ color: "rgba(255,255,255,0.7)" }}>{next.label}</strong> basés sur vos dépenses réelles. Ajustez avant de valider.
              </p>

              {envelopes.map(em => {
                const suggested = amounts[em.envelope.id] ?? em.envelope.montantPrevu;
                const diff      = suggested - em.envelope.montantPrevu;
                const DiffIcon  = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
                const diffColor = diff > 0 ? "#ef4444" : diff < 0 ? "#22c55e" : "rgba(255,255,255,0.2)";

                return (
                  <div key={em.envelope.id} style={{
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10, padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: em.envelope.couleur ?? "#818cf8", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.82)" }}>
                        {em.envelope.label}
                      </span>
                      {diff !== 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <DiffIcon size={10} style={{ color: diffColor }} />
                          <span style={{ fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: diffColor }}>
                            {diff > 0 ? "+" : ""}{Math.round(diff)}€
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.24)", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 2 }}>
                          Réel {currentMonthLabel(year, month).split(" ")[0]}
                        </p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.42)", fontVariantNumeric: "tabular-nums" }}>
                          {fmt(em.montantDepense)}€
                        </p>
                      </div>

                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 8.5, color: "rgba(255,255,255,0.24)", fontFamily: "monospace", textTransform: "uppercase", marginBottom: 4 }}>
                          Budget {next.label.split(" ")[0]}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            type="number"
                            min={0}
                            value={suggested}
                            onChange={e => setAmounts(a => ({ ...a, [em.envelope.id]: parseFloat(e.target.value) || 0 }))}
                            style={{
                              width: 90, padding: "5px 10px", borderRadius: 7,
                              fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)",
                              color: "white", outline: "none",
                            }}
                            onFocus={e => { e.target.style.borderColor = "rgba(129,140,248,0.5)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.14)"; }}
                          />
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Next month total */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.15)",
              }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Total alloué {next.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#818cf8" }}>
                  {fmt(Object.values(amounts).reduce((s, v) => s + v, 0))}€
                </span>
              </div>
            </div>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", gap: 16, padding: "40px 24px",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check size={22} style={{ color: "#22c55e" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.82)", marginBottom: 6 }}>
                  {next.label} est prêt
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.6 }}>
                  {envelopes.length} enveloppe{envelopes.length > 1 ? "s" : ""} configurée{envelopes.length > 1 ? "s" : ""}
                  {" "}· Total {fmt(Object.values(amounts).reduce((s, v) => s + v, 0))}€
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
          {step === 2 ? (
            <Button className="flex-1" onClick={handleClose}>Fermer</Button>
          ) : (
            <>
              <Button variant="secondary" className="flex-1" onClick={handleClose}>Fermer</Button>
              {step === 0 && envelopes.length > 0 && (
                <Button className="flex-1" onClick={goToStep1}>
                  Préparer {next.label.split(" ")[0]}
                  <ChevronRight size={13} style={{ marginLeft: 4 }} />
                </Button>
              )}
              {step === 1 && (
                <Button className="flex-1" onClick={validate}>
                  <Check size={13} style={{ marginRight: 4 }} />
                  Valider
                </Button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
