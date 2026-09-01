"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus, Trash2, TrendingUp, Target,
  Building2, Wallet, Car, PiggyBank, Check, X, CheckCircle, RotateCcw,
} from "lucide-react";
import {
  usePatrimoineStore,
  ACTIF_TYPE_LABELS, PASSIF_TYPE_LABELS, PASSIF_STATUT_LABELS, PASSIF_STATUT_COLOR, OBJECTIF_COLORS,
  type ActifType, type PassifType, type PassifStatut, type ObjectifType,
  type Actif, type Passif,
} from "@/store/patrimoine";
import { useComptesStore } from "@/store/comptes";
import { useEngagementsStore } from "@/store/engagements";
import { cn } from "@/lib/cn";

// ── Tokens ────────────────────────────────────────────────────────────────────
const GB  = "1px solid rgba(255,255,255,0.07)";
const GBF = "1px solid rgba(255,255,255,0.10)";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtMonth(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" });
}

function restantMois(p: Passif): number | null {
  if (!p.dateOctroi || !p.dureeMois) return null;
  const d = new Date(p.dateOctroi);
  const now = new Date();
  const elapsed = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  return Math.max(0, p.dureeMois - elapsed);
}

function finTheorique(p: Passif): string {
  if (!p.dateOctroi || !p.dureeMois) return "—";
  const d = new Date(p.dateOctroi);
  d.setMonth(d.getMonth() + p.dureeMois);
  return fmtMonth(d.toISOString());
}

function evolPct(a: Actif): number | null {
  if (!a.valeurAcquisition || a.valeurAcquisition === 0) return null;
  return ((a.valeur - a.valeurAcquisition) / a.valeurAcquisition) * 100;
}

// ── Shared input style ────────────────────────────────────────────────────────
const iCls = "w-full text-xs rounded px-2 py-1.5 text-ink focus:outline-none focus:border-accent/60 bg-black/20";
const iStyle = { border: GB };

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-wide text-ink-ghost mb-0.5">{label}</p>
      {children}
    </div>
  );
}

// ── Actif icon ────────────────────────────────────────────────────────────────
function ActifIcon({ type }: { type: ActifType }) {
  const props = { size: 13, className: "shrink-0" };
  switch (type) {
    case "immobilier": return <Building2 {...props} />;
    case "financier":  return <TrendingUp {...props} />;
    case "liquidités": return <Wallet {...props} />;
    case "véhicule":   return <Car {...props} />;
    default:           return <PiggyBank {...props} />;
  }
}

// ── Column templates ──────────────────────────────────────────────────────────
// Actifs: Type | Libellé | Valeur act. | Valeur achat | Évol | Date acq. | Actions
const ACTIF_COLS = "90px minmax(0,1fr) 110px 110px 76px 96px 48px";
// Passifs: Type | Organisme | Statut | Capital | Init. | Mensualité | Prélèv. | Octroi | Durée | Restant | Fin théo. | Actions
const PASSIF_COLS = "88px minmax(0,1fr) 118px 100px 100px 90px 52px 90px 54px 68px 96px 48px";

// ── Net Worth Hero ────────────────────────────────────────────────────────────
function NetWorthHero({ totalActifs, totalPassifs }: { totalActifs: number; totalPassifs: number }) {
  const net = totalActifs - totalPassifs;
  const tx  = totalActifs > 0 ? pct(totalPassifs, totalActifs) : 0;
  const netColor = net >= 0 ? "var(--calm)" : "var(--critique)";
  const txColor  = tx > 50 ? "var(--critique)" : tx > 30 ? "var(--attention)" : "var(--calm)";
  const txLabel  = tx > 50 ? "Élevé" : tx > 30 ? "Modéré" : "Sain";

  return (
    <div className="rounded-xl p-5" style={{ border: GBF, background: "rgba(255,255,255,0.02)" }}>
      <div className="grid grid-cols-4 gap-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-2">Patrimoine Net</p>
          <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: netColor }}>
            {net >= 0 ? "+" : ""}{fmt(net)}
          </p>
          <p className="text-[10px] text-ink-ghost mt-1">actifs − passifs</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-1">Total Actifs</p>
          <p className="text-xl font-bold tabular-nums text-calm">{fmt(totalActifs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-1">Total Passifs</p>
          <p className="text-xl font-bold tabular-nums text-critique">{fmt(totalPassifs)}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-1">Taux d'endettement</p>
          <p className="text-xl font-bold tabular-nums" style={{ color: txColor }}>{tx}%</p>
          <p className="text-[10px] mt-0.5" style={{ color: txColor }}>{txLabel}</p>
        </div>
      </div>
      {(totalActifs > 0 || totalPassifs > 0) && (
        <div className="mt-4">
          <div className="flex justify-between text-[10px] text-ink-ghost mb-1">
            <span>Actifs {fmt(totalActifs)}</span>
            <span>Passifs {fmt(totalPassifs)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(239,68,68,0.3)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${totalActifs + totalPassifs > 0 ? pct(totalActifs, totalActifs + totalPassifs) : 50}%`,
                background: "var(--calm)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Table section wrapper ─────────────────────────────────────────────────────
function TableSection({
  title, badge, right, children,
}: { title: string; badge?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: GBF, background: "rgba(255,255,255,0.015)" }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: GB }}>
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">{title}</p>
          {badge && <span className="text-xs font-bold tabular-nums" style={{ color: badge.startsWith("+") || !badge.startsWith("-") ? "var(--calm)" : "var(--critique)" }}>{badge}</span>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

// ── Actif row ─────────────────────────────────────────────────────────────────
function ActifRow({
  a, isEditing, onEdit, onSave, onCancel, onDelete,
}: {
  a: Actif; isEditing: boolean;
  onEdit: () => void; onSave: (p: Partial<Omit<Actif, "id">>) => void;
  onCancel: () => void; onDelete: () => void;
}) {
  const [label, setLabel] = useState(a.label);
  const [type,  setType]  = useState<ActifType>(a.type);
  const [valeur, setValeur] = useState(String(a.valeur));
  const [valAcq, setValAcq] = useState(a.valeurAcquisition != null ? String(a.valeurAcquisition) : "");
  const [dateAcq, setDateAcq] = useState(a.dateAcquisition ?? "");
  useEffect(() => { setLabel(a.label); setType(a.type); setValeur(String(a.valeur)); setValAcq(a.valeurAcquisition != null ? String(a.valeurAcquisition) : ""); setDateAcq(a.dateAcquisition ?? ""); }, [a]);

  const evol = evolPct(a);

  function handleSave() {
    const v = parseFloat(valeur);
    const va = parseFloat(valAcq);
    if (!label.trim() || isNaN(v)) return;
    onSave({ label: label.trim(), type, valeur: v, valeurAcquisition: isNaN(va) ? undefined : va, dateAcquisition: dateAcq || undefined });
  }

  return (
    <>
      <div
        className="grid items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.02] transition-colors text-xs cursor-pointer"
        style={{ gridTemplateColumns: ACTIF_COLS, borderBottom: GB }}
        onClick={() => { if (!isEditing) onEdit(); }}
      >
        <div className="flex items-center gap-1.5" style={{ color: "#22c55e" }}>
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
            <ActifIcon type={a.type} />
          </div>
          <span className="text-ink-ghost text-[10px]">{ACTIF_TYPE_LABELS[a.type]}</span>
        </div>
        <span className="text-ink font-medium truncate">{a.label}</span>
        <span className="tabular-nums text-calm font-semibold text-right">{fmt(a.valeur)}</span>
        <span className="tabular-nums text-ink-ghost text-right">{a.valeurAcquisition != null ? fmt(a.valeurAcquisition) : "—"}</span>
        <span className={cn("tabular-nums text-right font-medium", evol == null ? "text-ink-ghost" : evol >= 0 ? "text-calm" : "text-critique")}>
          {evol != null ? `${evol >= 0 ? "+" : ""}${evol.toFixed(1)}%` : "—"}
        </span>
        <span className="text-ink-ghost tabular-nums">{fmtDate(a.dateAcquisition)}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-ink-ghost hover:text-critique transition-colors"><Trash2 size={11} /></button>
        </div>
      </div>
      {isEditing && (
        <div className="px-4 py-3" style={{ borderBottom: GB, background: "rgba(0,0,0,0.15)" }}>
          <div className="grid grid-cols-5 gap-2 mb-2">
            <LabeledField label="Libellé">
              <input className={iCls} style={iStyle} value={label} onChange={(e) => setLabel(e.target.value)} />
            </LabeledField>
            <LabeledField label="Type">
              <select className={iCls} style={iStyle} value={type} onChange={(e) => setType(e.target.value as ActifType)}>
                {(Object.keys(ACTIF_TYPE_LABELS) as ActifType[]).map((t) => <option key={t} value={t}>{ACTIF_TYPE_LABELS[t]}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Valeur actuelle €">
              <input className={iCls} style={iStyle} type="number" value={valeur} onChange={(e) => setValeur(e.target.value)} />
            </LabeledField>
            <LabeledField label="Valeur d'achat €">
              <input className={iCls} style={iStyle} type="number" value={valAcq} onChange={(e) => setValAcq(e.target.value)} />
            </LabeledField>
            <LabeledField label="Date d'acquisition">
              <input className={iCls} style={iStyle} type="date" value={dateAcq} onChange={(e) => setDateAcq(e.target.value)} />
            </LabeledField>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="text-xs text-ink-ghost hover:text-ink transition-colors px-2 py-1">Annuler</button>
            <button onClick={handleSave} className="text-xs text-accent hover:text-accent/80 transition-colors px-2 py-1 flex items-center gap-1">
              <Check size={11} />Enregistrer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Passif row ────────────────────────────────────────────────────────────────
function PassifRow({
  p, isEditing, isPaying, creditComptes, onEdit, onSave, onCancel, onDelete, onStartPay, onConfirmPay, onCancelPay,
}: {
  p: Passif; isEditing: boolean; isPaying: boolean;
  creditComptes: { id: string; label: string }[];
  onEdit: () => void; onSave: (patch: Partial<Omit<Passif, "id">>) => void;
  onCancel: () => void; onDelete: () => void;
  onStartPay: () => void; onConfirmPay: (date: string) => void; onCancelPay: () => void;
}) {
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [label, setLabel]         = useState(p.label);
  const [type, setType]           = useState<PassifType>(p.type);
  const [statut, setStatut]       = useState<PassifStatut>(p.statut ?? "actif");
  const [capital, setCapital]     = useState(String(p.capital));
  const [init, setInit]           = useState(p.montantInitial != null ? String(p.montantInitial) : "");
  const [mens, setMens]           = useState(p.mensualite != null ? String(p.mensualite) : "");
  const [billingDay, setBillingDay] = useState(p.billingDay != null ? String(p.billingDay) : "");
  const [octroi, setOctroi]       = useState(p.dateOctroi ?? "");
  const [duree, setDuree]         = useState(p.dureeMois != null ? String(p.dureeMois) : "");
  const [compteId, setCompteId]   = useState(p.compteId ?? "");
  useEffect(() => {
    setLabel(p.label); setType(p.type); setStatut(p.statut ?? "actif");
    setCapital(String(p.capital)); setInit(p.montantInitial != null ? String(p.montantInitial) : "");
    setMens(p.mensualite != null ? String(p.mensualite) : "");
    setBillingDay(p.billingDay != null ? String(p.billingDay) : "");
    setOctroi(p.dateOctroi ?? ""); setDuree(p.dureeMois != null ? String(p.dureeMois) : "");
    setCompteId(p.compteId ?? "");
  }, [p]);

  function handleSave() {
    const c = parseFloat(capital);
    if (!label.trim() || isNaN(c)) return;
    const mi = parseFloat(init); const m = parseFloat(mens); const d = parseInt(duree, 10);
    const bd = parseInt(billingDay, 10);
    onSave({
      label: label.trim(), type, statut,
      capital: c,
      montantInitial: isNaN(mi) ? undefined : mi,
      mensualite:     isNaN(m)  ? undefined : m,
      billingDay:     isNaN(bd) ? undefined : Math.min(31, Math.max(1, bd)),
      dateOctroi:     octroi || undefined,
      dureeMois:      isNaN(d)  ? undefined : d,
      compteId:       compteId || undefined,
    });
  }

  const statutInfo = p.statut ? PASSIF_STATUT_COLOR[p.statut] : null;
  const rm = restantMois(p);
  const fin = finTheorique(p);

  return (
    <>
      <div
        className="grid items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.02] transition-colors text-xs cursor-pointer"
        style={{ gridTemplateColumns: PASSIF_COLS, borderBottom: GB }}
        onClick={() => { if (!isEditing) onEdit(); }}
      >
        {/* Type */}
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-center truncate"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--ink-soft)" }}>
          {PASSIF_TYPE_LABELS[p.type]}
        </span>
        {/* Organisme */}
        <span className="text-ink font-medium truncate">{p.label}</span>
        {/* Statut */}
        {statutInfo
          ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate"
              style={{ color: statutInfo.text, background: statutInfo.bg }}>
              {PASSIF_STATUT_LABELS[p.statut!]}
            </span>
          : <span className="text-ink-ghost">—</span>
        }
        {/* Capital restant */}
        <span className="tabular-nums text-critique font-semibold text-right">{fmt(p.capital)}</span>
        {/* Montant initial */}
        <span className="tabular-nums text-ink-ghost text-right">{p.montantInitial != null ? fmt(p.montantInitial) : "—"}</span>
        {/* Mensualité */}
        <span className="tabular-nums text-right">
          {p.mensualite != null && p.mensualite > 0
            ? <span className="text-attention">{fmt(p.mensualite)}</span>
            : (p.statut === "actif" || !p.statut)
              ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ color: "var(--critique)", background: "var(--critique-soft)" }}
                  title="Mensualité manquante — ce passif n'est pas inclus dans la Base Financière">
                  ⚠ manquant
                </span>
              : <span className="text-ink-ghost">—</span>
          }
        </span>
        {/* Jour de prélèvement */}
        <span className="tabular-nums text-ink-ghost text-center">
          {p.billingDay != null ? `j.${p.billingDay}` : "—"}
        </span>
        {/* Date d'octroi */}
        <span className="tabular-nums text-ink-ghost">{fmtDate(p.dateOctroi)}</span>
        {/* Durée */}
        <span className="tabular-nums text-ink-ghost text-center">{p.dureeMois ?? "—"}</span>
        {/* Restant mois */}
        <span className="tabular-nums text-ink-ghost text-center">{rm ?? "—"}</span>
        {/* Fin théorique */}
        <span className="tabular-nums text-ink-ghost">{fin}</span>
        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onStartPay(); }}
            className="p-1 text-ink-ghost hover:text-calm transition-colors" title="Marquer comme payé">
            <CheckCircle size={11} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-ink-ghost hover:text-critique transition-colors" title="Supprimer">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {isPaying && (
        <div className="px-4 py-3 flex items-end gap-3" style={{ borderBottom: GB, background: "rgba(0,0,0,0.15)" }}>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wide text-ink-ghost mb-0.5">Date de paiement</p>
            <input className={iCls} style={{ ...iStyle, width: 148 }} type="date"
              value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <button onClick={onCancelPay} className="text-xs text-ink-ghost hover:text-ink px-2 py-1.5">Annuler</button>
          <button onClick={() => onConfirmPay(payDate)}
            className="text-xs text-calm hover:text-calm/80 px-2 py-1.5 flex items-center gap-1">
            <Check size={11} />Confirmer payé
          </button>
        </div>
      )}

      {isEditing && (
        <div className="px-4 py-3" style={{ borderBottom: GB, background: "rgba(0,0,0,0.15)" }}>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <LabeledField label="Organisme">
              <input className={iCls} style={iStyle} value={label} onChange={(e) => setLabel(e.target.value)} />
            </LabeledField>
            <LabeledField label="Type de dette">
              <select className={iCls} style={iStyle} value={type} onChange={(e) => setType(e.target.value as PassifType)}>
                {(Object.keys(PASSIF_TYPE_LABELS) as PassifType[]).map((t) => <option key={t} value={t}>{PASSIF_TYPE_LABELS[t]}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Statut">
              <select className={iCls} style={iStyle} value={statut} onChange={(e) => setStatut(e.target.value as PassifStatut)}>
                {(Object.keys(PASSIF_STATUT_LABELS) as PassifStatut[]).map((s) => <option key={s} value={s}>{PASSIF_STATUT_LABELS[s]}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Capital restant €">
              <input className={iCls} style={iStyle} type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />
            </LabeledField>
            <LabeledField label="Montant initial €">
              <input className={iCls} style={iStyle} type="number" value={init} onChange={(e) => setInit(e.target.value)} />
            </LabeledField>
            <LabeledField label="Mensualité €">
              <input className={iCls} style={iStyle} type="number" value={mens} onChange={(e) => setMens(e.target.value)} />
            </LabeledField>
            <LabeledField label="Jour prélèvement">
              <input className={iCls} style={iStyle} type="number" min="1" max="31" placeholder="1–31"
                value={billingDay} onChange={(e) => setBillingDay(e.target.value)} />
            </LabeledField>
            <LabeledField label="Date d'octroi">
              <input className={iCls} style={iStyle} type="date" value={octroi} onChange={(e) => setOctroi(e.target.value)} />
            </LabeledField>
            <LabeledField label="Durée (mois)">
              <input className={iCls} style={iStyle} type="number" value={duree} onChange={(e) => setDuree(e.target.value)} />
            </LabeledField>
            {creditComptes.length > 0 && (
              <LabeledField label="Compte crédit lié">
                <select className={iCls} style={iStyle} value={compteId} onChange={(e) => setCompteId(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {creditComptes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </LabeledField>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="text-xs text-ink-ghost hover:text-ink transition-colors px-2 py-1">Annuler</button>
            <button onClick={handleSave} className="text-xs text-accent hover:text-accent/80 transition-colors px-2 py-1 flex items-center gap-1">
              <Check size={11} />Enregistrer
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Add forms ─────────────────────────────────────────────────────────────────
function AddActifForm({ onDone }: { onDone: () => void }) {
  const { addActif } = usePatrimoineStore();
  const [label, setLabel] = useState(""); const [type, setType] = useState<ActifType>("financier");
  const [valeur, setValeur] = useState(""); const [valAcq, setValAcq] = useState(""); const [dateAcq, setDateAcq] = useState("");

  function submit() {
    const v = parseFloat(valeur); if (!label.trim() || isNaN(v)) return;
    const va = parseFloat(valAcq);
    addActif({ label: label.trim(), type, valeur: v, valeurAcquisition: isNaN(va) ? undefined : va, dateAcquisition: dateAcq || undefined });
    setLabel(""); setValeur(""); setValAcq(""); setDateAcq(""); onDone();
  }

  return (
    <div className="px-4 py-3" style={{ borderTop: GB, background: "rgba(0,0,0,0.12)" }}>
      <div className="grid grid-cols-5 gap-2 mb-2">
        <LabeledField label="Libellé"><input className={iCls} style={iStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Appartement" /></LabeledField>
        <LabeledField label="Type">
          <select className={iCls} style={iStyle} value={type} onChange={(e) => setType(e.target.value as ActifType)}>
            {(Object.keys(ACTIF_TYPE_LABELS) as ActifType[]).map((t) => <option key={t} value={t}>{ACTIF_TYPE_LABELS[t]}</option>)}
          </select>
        </LabeledField>
        <LabeledField label="Valeur actuelle €"><input className={iCls} style={iStyle} type="number" value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder="0" /></LabeledField>
        <LabeledField label="Valeur d'achat €"><input className={iCls} style={iStyle} type="number" value={valAcq} onChange={(e) => setValAcq(e.target.value)} placeholder="0" /></LabeledField>
        <LabeledField label="Date d'acquisition"><input className={iCls} style={iStyle} type="date" value={dateAcq} onChange={(e) => setDateAcq(e.target.value)} /></LabeledField>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="text-xs text-ink-ghost hover:text-ink px-2 py-1 flex items-center gap-1"><X size={11} />Annuler</button>
        <button onClick={submit} disabled={!label.trim() || !valeur} className="text-xs text-accent hover:text-accent/80 px-2 py-1 flex items-center gap-1 disabled:opacity-40">
          <Check size={11} />Ajouter
        </button>
      </div>
    </div>
  );
}

function AddPassifForm({ onDone, creditComptes }: { onDone: () => void; creditComptes: { id: string; label: string }[] }) {
  const { addPassif } = usePatrimoineStore();
  const [label, setLabel]       = useState(""); const [type, setType]   = useState<PassifType>("crédit conso");
  const [statut, setStatut]     = useState<PassifStatut>("actif");
  const [capital, setCapital]   = useState(""); const [init, setInit]   = useState("");
  const [mens, setMens]         = useState(""); const [billingDay, setBillingDay] = useState("");
  const [octroi, setOctroi]     = useState("");
  const [duree, setDuree]       = useState("");
  const [compteId, setCompteId] = useState("");

  function submit() {
    const c = parseFloat(capital); if (!label.trim() || isNaN(c)) return;
    const mi = parseFloat(init); const m = parseFloat(mens); const d = parseInt(duree, 10);
    const bd = parseInt(billingDay, 10);
    addPassif({ label: label.trim(), type, statut, capital: c, montantInitial: isNaN(mi) ? undefined : mi, mensualite: isNaN(m) ? undefined : m, billingDay: isNaN(bd) ? undefined : Math.min(31, Math.max(1, bd)), dateOctroi: octroi || undefined, dureeMois: isNaN(d) ? undefined : d, compteId: compteId || undefined });
    setLabel(""); setCapital(""); setInit(""); setMens(""); setBillingDay(""); setOctroi(""); setDuree(""); setCompteId(""); onDone();
  }

  return (
    <div className="px-4 py-3" style={{ borderTop: GB, background: "rgba(0,0,0,0.12)" }}>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <LabeledField label="Organisme"><input className={iCls} style={iStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Cofidis" /></LabeledField>
        <LabeledField label="Type de dette">
          <select className={iCls} style={iStyle} value={type} onChange={(e) => setType(e.target.value as PassifType)}>
            {(Object.keys(PASSIF_TYPE_LABELS) as PassifType[]).map((t) => <option key={t} value={t}>{PASSIF_TYPE_LABELS[t]}</option>)}
          </select>
        </LabeledField>
        <LabeledField label="Statut">
          <select className={iCls} style={iStyle} value={statut} onChange={(e) => setStatut(e.target.value as PassifStatut)}>
            {(["actif", "on_hold", "gele_bdf", "negociation", "rembourse"] as PassifStatut[]).map((s) => <option key={s} value={s}>{PASSIF_STATUT_LABELS[s]}</option>)}
          </select>
        </LabeledField>
        <LabeledField label="Capital restant €"><input className={iCls} style={iStyle} type="number" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="0" /></LabeledField>
        <LabeledField label="Montant initial €"><input className={iCls} style={iStyle} type="number" value={init} onChange={(e) => setInit(e.target.value)} placeholder="0" /></LabeledField>
        <LabeledField label="Mensualité €"><input className={iCls} style={iStyle} type="number" value={mens} onChange={(e) => setMens(e.target.value)} placeholder="0" /></LabeledField>
        <LabeledField label="Jour prélèvement"><input className={iCls} style={iStyle} type="number" min="1" max="31" value={billingDay} onChange={(e) => setBillingDay(e.target.value)} placeholder="1–31" /></LabeledField>
        <LabeledField label="Date d'octroi"><input className={iCls} style={iStyle} type="date" value={octroi} onChange={(e) => setOctroi(e.target.value)} /></LabeledField>
        <LabeledField label="Durée (mois)"><input className={iCls} style={iStyle} type="number" value={duree} onChange={(e) => setDuree(e.target.value)} placeholder="24" /></LabeledField>
        {creditComptes.length > 0 && (
          <LabeledField label="Compte crédit lié">
            <select className={iCls} style={iStyle} value={compteId} onChange={(e) => setCompteId(e.target.value)}>
              <option value="">— Aucun —</option>
              {creditComptes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </LabeledField>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onDone} className="text-xs text-ink-ghost hover:text-ink px-2 py-1 flex items-center gap-1"><X size={11} />Annuler</button>
        <button onClick={submit} disabled={!label.trim() || !capital} className="text-xs text-accent hover:text-accent/80 px-2 py-1 flex items-center gap-1 disabled:opacity-40">
          <Check size={11} />Ajouter
        </button>
      </div>
    </div>
  );
}

// ── Add objectif form ─────────────────────────────────────────────────────────
function AddObjectifForm({ onDone }: { onDone: () => void }) {
  const { addObjectif, objectifs } = usePatrimoineStore();
  const [label, setLabel] = useState(""); const [type, setType] = useState<ObjectifType>("épargne");
  const [cible, setCible] = useState(""); const [actuel, setActuel] = useState(""); const [date, setDate] = useState("");

  function submit() {
    const c = parseFloat(cible); if (!label.trim() || isNaN(c)) return;
    const a = parseFloat(actuel);
    addObjectif({ label: label.trim(), type, cible: c, actuel: isNaN(a) ? 0 : a, dateButoir: date || undefined, color: OBJECTIF_COLORS[objectifs.length % OBJECTIF_COLORS.length] });
    setLabel(""); setCible(""); setActuel(""); setDate(""); onDone();
  }

  return (
    <div className="rounded-xl p-4 mb-4" style={{ border: GB, background: "rgba(255,255,255,0.02)" }}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-3">Nouvel objectif</p>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <LabeledField label="Libellé"><input className={iCls} style={iStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Épargne urgence" /></LabeledField>
        <LabeledField label="Type">
          <select className={iCls} style={iStyle} value={type} onChange={(e) => setType(e.target.value as ObjectifType)}>
            <option value="épargne">Épargne</option><option value="remboursement">Remboursement</option><option value="acquisition">Acquisition</option>
          </select>
        </LabeledField>
        <LabeledField label="Actuel €"><input className={iCls} style={iStyle} type="number" value={actuel} onChange={(e) => setActuel(e.target.value)} placeholder="0" /></LabeledField>
        <LabeledField label="Cible €"><input className={iCls} style={iStyle} type="number" value={cible} onChange={(e) => setCible(e.target.value)} placeholder="0" /></LabeledField>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1"><LabeledField label="Échéance"><input className={iCls} style={iStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></LabeledField></div>
        <button onClick={onDone} className="text-xs text-ink-ghost hover:text-ink px-2 py-1 flex items-center gap-1 mb-0.5"><X size={11} />Annuler</button>
        <button onClick={submit} disabled={!label.trim() || !cible} className="text-xs text-accent hover:text-accent/80 px-2 py-1 flex items-center gap-1 disabled:opacity-40 mb-0.5">
          <Check size={11} />Créer
        </button>
      </div>
    </div>
  );
}

// ── Table col header row ──────────────────────────────────────────────────────
function TableHead({ cols, template }: { cols: string[]; template: string }) {
  return (
    <div className="grid gap-3 px-4 py-2" style={{ gridTemplateColumns: template, borderBottom: GB, background: "rgba(0,0,0,0.1)" }}>
      {cols.map((c, i) => (
        <span key={i} className="text-[9px] font-mono uppercase tracking-widest text-ink-ghost truncate">{c}</span>
      ))}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export function PatrimoineView() {
  const { actifs, passifs, objectifs, deleteActif, updateActif, deletePassif, updatePassif, deleteObjectif, updateObjectif, seedFromEngagements } = usePatrimoineStore();
  const { engagements } = useEngagementsStore();
  const comptes       = useComptesStore((s) => s.comptes);
  const creditComptes = useMemo(() => comptes.filter((c) => c.type === "credit"), [comptes]);

  const [showAddActif,    setShowAddActif]    = useState(false);
  const [showAddPassif,   setShowAddPassif]   = useState(false);
  const [showAddObjectif, setShowAddObjectif] = useState(false);
  const [editingActifId,  setEditingActifId]  = useState<string | null>(null);
  const [editingPassifId, setEditingPassifId] = useState<string | null>(null);
  const [payingPassifId,  setPayingPassifId]  = useState<string | null>(null);
  const [showRembourses,  setShowRembourses]  = useState(false);

  // Seed on first mount once store is hydrated (dep on count handles async hydration)
  useEffect(() => {
    if (engagements.length > 0) seedFromEngagements(engagements);
  }, [engagements.length]);

  const activePassifs    = useMemo(() => passifs.filter((p) => p.statut !== "rembourse"), [passifs]);
  const remboursesPassifs = useMemo(() => passifs.filter((p) => p.statut === "rembourse"), [passifs]);

  const totalActifs      = useMemo(() => actifs.reduce((s, a) => s + a.valeur, 0), [actifs]);
  const totalPassifs     = useMemo(() => activePassifs.reduce((s, p) => s + p.capital, 0), [activePassifs]);
  const totalMensualites = useMemo(() => activePassifs.reduce((s, p) => s + (p.mensualite ?? 0), 0), [activePassifs]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5 px-6" style={{ height: 56, borderBottom: GB }}>
        <p className="text-sm font-semibold text-ink">Patrimoine</p>
        <span className="text-[10px] text-ink-ghost">Actifs · Passifs · Objectifs</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <NetWorthHero totalActifs={totalActifs} totalPassifs={totalPassifs} />

        {/* ── Actifs ─────────────────────────────────────────────────────── */}
        <TableSection
          title="Actifs"
          badge={fmt(totalActifs)}
          right={
            <button onClick={() => setShowAddActif((v) => !v)}
              className="flex items-center gap-1 text-xs text-accent hover:underline">
              <Plus size={11} />Ajouter
            </button>
          }
        >
          <TableHead
            template={ACTIF_COLS}
            cols={["Type", "Libellé", "Valeur actuelle", "Valeur d'achat", "Évol.", "Date acq.", ""]}
          />
          {actifs.length === 0 && !showAddActif && (
            <div className="px-4 py-5 text-center text-xs text-ink-ghost">
              Aucun actif.{" "}
              <button onClick={() => setShowAddActif(true)} className="text-accent hover:underline">Ajouter</button>
            </div>
          )}
          {actifs.map((a) => (
            <ActifRow key={a.id} a={a}
              isEditing={editingActifId === a.id}
              onEdit={() => setEditingActifId(a.id)}
              onSave={(patch) => { updateActif(a.id, patch); setEditingActifId(null); }}
              onCancel={() => setEditingActifId(null)}
              onDelete={() => deleteActif(a.id)}
            />
          ))}
          {showAddActif && <AddActifForm onDone={() => setShowAddActif(false)} />}
        </TableSection>

        {/* ── Passifs ────────────────────────────────────────────────────── */}
        <TableSection
          title="Passifs"
          badge={fmt(totalPassifs)}
          right={
            <div className="flex items-center gap-3">
              {totalMensualites > 0 && (
                <span className="text-[10px] text-attention tabular-nums">{fmt(totalMensualites)}/mois</span>
              )}
              <button onClick={() => setShowAddPassif((v) => !v)}
                className="flex items-center gap-1 text-xs text-accent hover:underline">
                <Plus size={11} />Ajouter
              </button>
            </div>
          }
        >
          <TableHead
            template={PASSIF_COLS}
            cols={["Type de dette", "Organisme", "Statut", "Capital restant", "Montant initial", "Mensualité", "Prélèv.", "Date d'octroi", "Durée", "Restant", "Fin théorique", ""]}
          />
          {activePassifs.length === 0 && !showAddPassif && (
            <div className="px-4 py-5 text-center text-xs text-ink-ghost">
              Aucun passif actif.{" "}
              <button onClick={() => setShowAddPassif(true)} className="text-accent hover:underline">Ajouter</button>
            </div>
          )}
          {activePassifs.map((p) => (
            <PassifRow key={p.id} p={p}
              isEditing={editingPassifId === p.id}
              isPaying={payingPassifId === p.id}
              creditComptes={creditComptes}
              onEdit={() => { setEditingPassifId(p.id); setPayingPassifId(null); }}
              onSave={(patch) => { updatePassif(p.id, patch); setEditingPassifId(null); }}
              onCancel={() => setEditingPassifId(null)}
              onDelete={() => deletePassif(p.id)}
              onStartPay={() => { setPayingPassifId(p.id); setEditingPassifId(null); }}
              onConfirmPay={(date) => {
                updatePassif(p.id, { statut: "rembourse", datePaiement: date });
                setPayingPassifId(null);
              }}
              onCancelPay={() => setPayingPassifId(null)}
            />
          ))}
          {showAddPassif && <AddPassifForm onDone={() => setShowAddPassif(false)} creditComptes={creditComptes} />}
        </TableSection>

        {/* ── Remboursés / Payés ─────────────────────────────────────────── */}
        {remboursesPassifs.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: GBF, background: "rgba(255,255,255,0.01)" }}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
              style={{ borderBottom: showRembourses ? GB : "none" }}
              onClick={() => setShowRembourses((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Remboursés / Payés</p>
                <span className="text-[10px] font-bold tabular-nums text-calm">{remboursesPassifs.length}</span>
              </div>
              <span className="text-[10px] text-ink-ghost">{showRembourses ? "▲" : "▼"}</span>
            </button>
            {showRembourses && (
              <>
                <TableHead
                  template={PASSIF_COLS}
                  cols={["Type de dette", "Organisme", "Payé le", "Capital initial", "—", "—", "—", "—", "—", "—", "—", ""]}
                />
                {remboursesPassifs.map((p) => {
                  const statutInfo = PASSIF_STATUT_COLOR["rembourse"];
                  return (
                    <div
                      key={p.id}
                      className="grid items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.02] transition-colors text-xs"
                      style={{ gridTemplateColumns: PASSIF_COLS, borderBottom: GB }}
                    >
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-center truncate"
                        style={{ background: "rgba(255,255,255,0.04)", color: "var(--ink-ghost)" }}>
                        {PASSIF_TYPE_LABELS[p.type]}
                      </span>
                      <span className="text-ink-ghost font-medium truncate line-through">{p.label}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate"
                        style={{ color: statutInfo.text, background: statutInfo.bg }}>
                        {p.datePaiement ? fmtDate(p.datePaiement) : "Remboursé"}
                      </span>
                      <span className="tabular-nums text-ink-ghost text-right">{p.montantInitial != null ? fmt(p.montantInitial) : fmt(p.capital)}</span>
                      <span className="text-ink-ghost">—</span>
                      <span className="text-ink-ghost">—</span>
                      <span className="text-ink-ghost">—</span>
                      <span className="text-ink-ghost">—</span>
                      <span className="text-ink-ghost">—</span>
                      <span className="text-ink-ghost">—</span>
                      <span className="text-ink-ghost">—</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => updatePassif(p.id, { statut: "actif", datePaiement: undefined })}
                          className="p-1 text-ink-ghost hover:text-accent transition-colors" title="Réactiver">
                          <RotateCcw size={11} />
                        </button>
                        <button onClick={() => deletePassif(p.id)}
                          className="p-1 text-ink-ghost hover:text-critique transition-colors" title="Supprimer">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── Objectifs ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Objectifs</p>
            <button onClick={() => setShowAddObjectif((v) => !v)} className="flex items-center gap-1 text-xs text-accent hover:underline">
              <Plus size={11} />Nouvel objectif
            </button>
          </div>
          {showAddObjectif && <AddObjectifForm onDone={() => setShowAddObjectif(false)} />}

          {objectifs.length === 0 && !showAddObjectif ? (
            <div className="rounded-xl px-4 py-8 text-center" style={{ border: GB }}>
              <Target size={18} className="text-ink-ghost mx-auto mb-2" />
              <p className="text-xs text-ink-ghost">Aucun objectif défini</p>
              <button onClick={() => setShowAddObjectif(true)} className="text-xs text-accent mt-1 hover:underline">Créer un objectif</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {objectifs.map((obj) => {
                const progress = obj.cible > 0 ? Math.min(100, Math.round((obj.actuel / obj.cible) * 100)) : 0;
                const color = obj.color ?? "#6366f1";
                const daysLeft = obj.dateButoir
                  ? Math.ceil((new Date(obj.dateButoir).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={obj.id} className="rounded-xl p-4 group" style={{ border: GB, background: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{obj.label}</p>
                        <p className="text-[10px] text-ink-ghost capitalize mt-0.5">{obj.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tabular-nums" style={{ color }}>{progress}%</span>
                        <button onClick={() => deleteObjectif(obj.id)} className="opacity-0 group-hover:opacity-100 text-ink-ghost hover:text-critique transition-all"><Trash2 size={11} /></button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: color }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-ink-ghost mb-3">
                      <span><span className="font-medium" style={{ color }}>{fmt(obj.actuel)}</span> sur <span className="font-medium text-ink">{fmt(obj.cible)}</span></span>
                      <span className="text-ink-soft">Restant : {fmt(Math.max(0, obj.cible - obj.actuel))}</span>
                    </div>
                    {daysLeft !== null && (
                      <p className={cn("text-[10px]", daysLeft < 0 ? "text-critique" : daysLeft < 30 ? "text-attention" : "text-ink-ghost")}>
                        {daysLeft < 0 ? `Échéance dépassée de ${Math.abs(daysLeft)}j` : `${daysLeft} jours restants`}
                      </p>
                    )}
                    <div className="mt-3">
                      <input type="number" defaultValue={obj.actuel}
                        onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateObjectif(obj.id, { actuel: v }); }}
                        className="w-full text-[10px] rounded px-2 py-1 text-ink focus:outline-none focus:border-accent/60 bg-black/20"
                        style={{ border: GB }}
                        placeholder="Montant actuel"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
