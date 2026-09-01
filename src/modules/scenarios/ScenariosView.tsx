"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ArrowUpRight, GitBranch } from "lucide-react";
import { useBaseFinanciereStore } from "@/store/baseFinanciere";
import { usePreferencesStore } from "@/store/preferences";
import { useSoldeEffectif } from "@/hooks/useSoldeEffectif";
import { useScenariosStore, SCENARIO_COLORS, type Scenario } from "@/store/scenarios";
import {
  computeBaseNet,
  computeScenarioNet,
  projectDailyBalance,
  projectBalance,
  getMonthLabels,
  runwayDays,
  getPointBas,
  toMensuel,
} from "@/lib/projection";
import { computeTensionScore, runwayColor } from "@/lib/tensionScore";
import { ScenarioPanel } from "./ScenarioPanel";
import { ScenarioParser } from "./ScenarioParser";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { BaseItem } from "@/store/baseFinanciere";
import type { ScenarioItem } from "@/store/scenarios";
import type { DayProjection } from "@/lib/projection";

const PROJ_DAYS = 90;
const BASE_COLOR = "#94a3b8";

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function scenarioItemsAsBase(items: ScenarioItem[]): BaseItem[] {
  return items.map((si) => ({
    ...si,
    archived: false,
    dateDebut: undefined,
    dateFin: undefined,
    billingDay: undefined,
    compteId: undefined,
  }));
}

// ── 90-day SVG chart ────────────────────────────────────────────────────────

interface ChartLine {
  id: string;
  color: string;
  dashed: boolean;
  values: DayProjection[];
}

function Proj90Chart({
  lines,
  confortThreshold,
}: {
  lines: ChartLine[];
  confortThreshold: number;
}) {
  const W = 720, H = 200;
  const PL = 56, PR = 12, PT = 12, PB = 30;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const allVals = lines.flatMap((l) => l.values.map((d) => d.solde));
  if (allVals.length === 0) return null;

  const rawMin = Math.min(...allVals, confortThreshold, 0);
  const rawMax = Math.max(...allVals);
  const pad = Math.max((rawMax - rawMin) * 0.08, 500);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;
  const yRange = yMax - yMin;

  function xOf(i: number) { return PL + (i / (PROJ_DAYS - 1)) * cW; }
  function yOf(v: number) { return PT + (1 - (v - yMin) / yRange) * cH; }
  function toPath(vals: DayProjection[]) {
    return vals.map((d, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(d.solde).toFixed(1)}`).join(" ");
  }

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const v = yMin + (yRange / (tickCount - 1)) * i;
    return { v, y: yOf(v) };
  });

  const today = new Date();
  const monthBoundaries: { x: number; label: string }[] = [];
  for (let m = 1; m <= 3; m++) {
    const d = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const dayIdx = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (dayIdx > 0 && dayIdx < PROJ_DAYS) {
      monthBoundaries.push({ x: xOf(dayIdx), label: d.toLocaleDateString("fr-FR", { month: "short" }) });
    }
  }

  const confortY = yOf(confortThreshold);
  const zeroY = yOf(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PL - 4} y1={t.y} x2={W - PR} y2={t.y} stroke="var(--border)" strokeWidth={0.5} />
          <text x={PL - 7} y={t.y + 3.5} fontSize={9} fill="var(--ink-ghost)" textAnchor="end" fontFamily="monospace">
            {Math.abs(t.v) >= 1000 ? `${(t.v / 1000).toFixed(0)}k` : Math.round(t.v)}
          </text>
        </g>
      ))}

      {zeroY >= PT && zeroY <= PT + cH && (
        <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
      )}

      {monthBoundaries.map((mb, i) => (
        <g key={i}>
          <line x1={mb.x} y1={PT} x2={mb.x} y2={PT + cH} stroke="var(--border)" strokeWidth={0.7} strokeDasharray="4 3" />
          <text x={mb.x + 3} y={PT + cH + 11} fontSize={9} fill="var(--ink-ghost)" fontFamily="monospace">{mb.label}</text>
        </g>
      ))}

      {confortY >= PT && confortY <= PT + cH && (
        <line x1={PL} y1={confortY} x2={W - PR} y2={confortY} stroke="var(--attention)" strokeWidth={1} strokeDasharray="5 3" opacity={0.6} />
      )}

      {/* Base area fill */}
      {lines.length > 0 && (() => {
        const base = lines[0];
        const d = toPath(base.values) + ` L ${xOf(PROJ_DAYS - 1).toFixed(1)} ${PT + cH} L ${xOf(0).toFixed(1)} ${PT + cH} Z`;
        return <path d={d} fill={base.color} opacity={0.06} />;
      })()}

      {lines.map((line) => {
        const pb = getPointBas(line.values);
        return (
          <g key={line.id}>
            <path
              d={toPath(line.values)}
              fill="none"
              stroke={line.color}
              strokeWidth={line.dashed ? 1.5 : 2}
              strokeDasharray={line.dashed ? "5 3" : undefined}
              opacity={line.dashed ? 0.85 : 1}
            />
            {pb && (
              <circle
                cx={xOf(pb.dayIndex)}
                cy={yOf(pb.solde)}
                r={3}
                fill={line.color}
                stroke="var(--surface)"
                strokeWidth={1.5}
              />
            )}
          </g>
        );
      })}

      <line x1={PL} y1={PT} x2={PL} y2={PT + cH} stroke="var(--accent)" strokeWidth={1} opacity={0.35} />
    </svg>
  );
}

// ── Mini tension arc ─────────────────────────────────────────────────────────

function MiniGauge({ score, color }: { score: number; color: string }) {
  const r = 13, cx = 19, cy = 19;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ * 0.75;
  return (
    <svg width={38} height={38} viewBox="0 0 38 38">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={3}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        transform={`rotate(135 ${cx} ${cy})`} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${filled} ${circ - filled}`}
        transform={`rotate(135 ${cx} ${cy})`} strokeLinecap="round" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fill={color} fontWeight="700" fontFamily="monospace">
        {score}
      </text>
    </svg>
  );
}

// ── 6-month comparison table ─────────────────────────────────────────────────

function ComparisonTable({
  scenarios,
  baseNet,
  solde,
}: {
  scenarios: Scenario[];
  baseNet: number;
  solde: number;
}) {
  const labels = useMemo(() => getMonthLabels(6), []);
  const base6 = useMemo(() => projectBalance(solde, baseNet, 6), [solde, baseNet]);
  const scenProjs = useMemo(
    () =>
      scenarios.map((sc) => {
        const delta = sc.items.reduce(
          (s, i) => s + (i.direction === "revenu" ? 1 : -1) * toMensuel(i),
          0
        );
        return projectBalance(solde, baseNet + delta, 6);
      }),
    [scenarios, solde, baseNet]
  );

  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          <th className="text-left py-2 px-3 font-mono uppercase tracking-widest text-ink-ghost text-[10px] font-normal">Mois</th>
          <th className="text-right py-2 px-3 font-mono uppercase tracking-widest text-ink-ghost text-[10px] font-normal">Base</th>
          {scenarios.map((sc) => (
            <th key={sc.id} className="text-right py-2 px-3 text-[10px] font-mono uppercase tracking-widest font-normal" style={{ color: sc.color }}>
              {sc.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {labels.map((label, i) => {
          const bv = base6[i];
          return (
            <tr key={i} className="border-t border-border/40 hover:bg-surface-overlay/30 transition-colors">
              <td className="py-1.5 px-3 text-ink-soft">{label}</td>
              <td className={cn("py-1.5 px-3 text-right tabular-nums font-medium", bv >= 0 ? "text-calm" : "text-critique")}>
                {fmt(bv)}
              </td>
              {scenProjs.map((proj, si) => {
                const v = proj[i];
                const delta = v - bv;
                return (
                  <td key={scenarios[si].id} className="py-1.5 px-3 text-right tabular-nums">
                    <div className={cn("font-medium", v >= 0 ? "text-calm" : "text-critique")}>{fmt(v)}</div>
                    <div className={cn("text-[10px] opacity-70", delta >= 0 ? "text-calm" : "text-critique")}>
                      {delta >= 0 ? "+" : ""}{fmt(delta)}
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function ScenarioCard({
  scenario,
  baseItems,
  baseNet,
  baseJours,
  solde,
  confortThreshold,
  onEdit,
  onDelete,
  onPromote,
}: {
  scenario: Scenario;
  baseItems: BaseItem[];
  baseNet: number;
  baseJours: number | null;
  solde: number;
  confortThreshold: number;
  onEdit: () => void;
  onDelete: () => void;
  onPromote: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);

  const scenNet = useMemo(() => computeScenarioNet(baseItems, scenario.items), [baseItems, scenario.items]);
  const delta = scenNet - baseNet;
  const scenJours = runwayDays(solde, scenNet);

  const scenProj = useMemo(
    () => projectDailyBalance(solde, [...baseItems.filter((i) => !i.archived), ...scenarioItemsAsBase(scenario.items)], PROJ_DAYS),
    [solde, baseItems, scenario.items]
  );
  const pb = useMemo(() => getPointBas(scenProj), [scenProj]);
  const tension = useMemo(
    () => computeTensionScore(scenJours, pb?.solde ?? null, confortThreshold, scenNet),
    [scenJours, pb, confortThreshold, scenNet]
  );

  const baseTension = useMemo(
    () => computeTensionScore(baseJours, null, confortThreshold, baseNet),
    [baseJours, confortThreshold, baseNet]
  );
  const tensionDelta = tension.score - baseTension.score;

  const rColor = runwayColor(scenJours);

  return (
    <div
      className="rounded-lg border bg-surface-elevated overflow-hidden"
      style={{ borderColor: `${scenario.color}30` }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50" style={{ borderLeftColor: scenario.color, borderLeftWidth: 3 }}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: scenario.color }} />
        <p className="text-sm font-semibold text-ink flex-1 truncate">{scenario.name}</p>
        <button onClick={onEdit} className="text-ink-ghost hover:text-ink transition-colors p-0.5" aria-label="Modifier">
          <Pencil size={12} />
        </button>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40">
        <div className="flex flex-col gap-0.5 flex-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Net mensuel</p>
          <p className={cn("text-base font-semibold tabular-nums", scenNet >= 0 ? "text-calm" : "text-critique")}>
            {fmt(scenNet)}
          </p>
          <p className={cn("text-[10px]", delta >= 0 ? "text-calm" : "text-critique")}>
            {delta >= 0 ? "+" : ""}{fmt(delta)} vs base
          </p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-0.5">Tension</p>
          <MiniGauge score={tension.score} color={tension.color} />
          <p className={cn("text-[10px]", tensionDelta > 0 ? "text-critique" : "text-calm")}>
            {tensionDelta > 0 ? "+" : ""}{tensionDelta} pts
          </p>
        </div>
        <div className="flex flex-col gap-0.5 min-w-[64px]">
          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">Runway</p>
          <p className="text-base font-semibold tabular-nums" style={{ color: rColor }}>
            {scenJours === null ? "∞" : `${scenJours}j`}
          </p>
          {scenJours !== null && baseJours !== null && (
            <p className={cn("text-[10px]", scenJours >= baseJours ? "text-calm" : "text-critique")}>
              {scenJours >= baseJours ? "+" : ""}{scenJours - baseJours}j
            </p>
          )}
        </div>
      </div>

      {/* Items chips */}
      {scenario.items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-border/40">
          {scenario.items.map((item) => (
            <span
              key={item.id}
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: `${scenario.color}15`,
                color: scenario.color,
                border: `1px solid ${scenario.color}30`,
              }}
            >
              {item.direction === "revenu" ? "+" : "−"}{fmt(item.montant)} {item.label}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-2.5 flex items-center gap-2">
        {confirmPromote ? (
          <div className="flex items-center gap-2 w-full">
            <p className="text-[11px] text-attention flex-1">Intégrer {scenario.items.length} flux à la base ?</p>
            <button onClick={onPromote} className="text-[11px] font-medium text-calm hover:underline">Confirmer</button>
            <button onClick={() => setConfirmPromote(false)} className="text-[11px] text-ink-ghost hover:text-ink">Annuler</button>
          </div>
        ) : confirmDelete ? (
          <div className="flex items-center gap-2 w-full">
            <p className="text-[11px] text-critique flex-1">Supprimer définitivement ?</p>
            <button onClick={onDelete} className="text-[11px] font-medium text-critique hover:underline">Supprimer</button>
            <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-ink-ghost hover:text-ink">Annuler</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setConfirmPromote(true)}
              className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink transition-colors"
              title="Intégrer ce scénario à la Base Financière"
            >
              <ArrowUpRight size={11} />
              Promouvoir en base
            </button>
            <span className="flex-1" />
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-ink-ghost hover:text-critique transition-colors p-0.5"
              aria-label="Supprimer"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export function ScenariosView() {
  const { items: baseItems, addItem: addBaseItem } = useBaseFinanciereStore();
  // `?? 0` preservé : contrairement aux autres vues, Scénarios n'a pas d'état
  // "pas de données" — elle affiche toujours des chiffres, même à 0.
  const soldeEffectif = useSoldeEffectif() ?? 0;
  const { confortThreshold } = usePreferencesStore();
  const { scenarios, deleteScenario } = useScenariosStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | undefined>();

  const active = useMemo(() => baseItems.filter((i) => !i.archived), [baseItems]);
  const baseNet = useMemo(() => computeBaseNet(active, new Date()), [active]);
  const baseJours = runwayDays(soldeEffectif, baseNet);

  const baseProj90 = useMemo(
    () => projectDailyBalance(soldeEffectif, active, PROJ_DAYS),
    [soldeEffectif, active]
  );

  const scenProj90s = useMemo(
    () =>
      scenarios.map((sc) => ({
        id: sc.id,
        color: sc.color,
        dashed: true,
        values: projectDailyBalance(
          soldeEffectif,
          [...active, ...scenarioItemsAsBase(sc.items)],
          PROJ_DAYS
        ),
      })),
    [scenarios, soldeEffectif, active]
  );

  const chartLines: ChartLine[] = useMemo(
    () => [{ id: "base", color: BASE_COLOR, dashed: false, values: baseProj90 }, ...scenProj90s],
    [baseProj90, scenProj90s]
  );

  const hasBase = active.length > 0;
  const nextColor = SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length];

  function openNew() { setEditingScenario(undefined); setPanelOpen(true); }
  function openEdit(sc: Scenario) { setEditingScenario(sc); setPanelOpen(true); }

  function promoteScenario(sc: Scenario) {
    for (const item of sc.items) {
      addBaseItem({
        label: item.label,
        montant: item.montant,
        direction: item.direction,
        categorie: item.categorie,
        frequence: item.frequence,
      });
    }
    deleteScenario(sc.id);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 shrink-0"
        style={{ height: 56, borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <GitBranch size={15} className="text-ink-ghost" />
          <h1 className="text-sm font-semibold text-ink">Scénarios</h1>
          {scenarios.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-overlay text-ink-soft font-mono">
              {scenarios.length}
            </span>
          )}
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono ml-1"
            style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
          >
            Simulation
          </span>
        </div>
        {hasBase && (
          <Button size="sm" leftIcon={<Plus size={13} />} onClick={openNew}>
            Nouveau scénario
          </Button>
        )}
      </div>

      {!hasBase ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="Base financière vide"
            description="Complétez votre Base Financière avant de simuler des scénarios."
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[1fr_304px] min-h-full divide-x divide-border">
            {/* ── Left: chart + table ──────────────────────────────────────── */}
            <div className="flex flex-col gap-6 p-6">
              {/* Legend */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-ink-ghost">
                  <span className="w-5 h-px bg-[#94a3b8] inline-block" />
                  Base
                </span>
                {scenarios.map((sc) => (
                  <span key={sc.id} className="flex items-center gap-1.5 text-xs text-ink-ghost">
                    <span className="w-5 inline-block" style={{ borderTop: `2px dashed ${sc.color}` }} />
                    {sc.name}
                  </span>
                ))}
                {confortThreshold > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-ink-ghost">
                    <span className="w-5 inline-block" style={{ borderTop: "1px dashed var(--attention)" }} />
                    Confort
                  </span>
                )}
                <span className="ml-auto text-[10px] text-ink-ghost font-mono">90 jours</span>
              </div>

              {/* Chart */}
              <div className="rounded-lg border border-border bg-surface-elevated p-3">
                {baseProj90.length > 0 ? (
                  <Proj90Chart lines={chartLines} confortThreshold={confortThreshold} />
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-ink-ghost">
                    Aucune donnée — renseignez votre solde et vos postes.
                  </div>
                )}
              </div>

              {/* AI parser */}
              <ScenarioParser baseNet={baseNet} nextColor={nextColor} />

              {/* Comparison table */}
              {scenarios.length > 0 && (
                <div className="rounded-lg border border-border bg-surface-elevated overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/50">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost">
                      Projection 6 mois · comparaison
                    </p>
                  </div>
                  <ComparisonTable
                    scenarios={scenarios}
                    baseNet={baseNet}
                    solde={soldeEffectif}
                  />
                </div>
              )}
            </div>

            {/* ── Right: scenario cards ─────────────────────────────────────── */}
            <div className="flex flex-col gap-0 overflow-y-auto">
              {scenarios.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-surface-overlay flex items-center justify-center">
                    <GitBranch size={18} className="text-ink-ghost" />
                  </div>
                  <p className="text-sm text-ink-soft">Aucun scénario</p>
                  <p className="text-xs text-ink-ghost">
                    Utilisez le parser IA ci-contre ou créez un scénario manuellement.
                  </p>
                  <Button size="sm" leftIcon={<Plus size={13} />} onClick={openNew}>
                    Premier scénario
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4">
                  {/* Base reference card */}
                  <div className="rounded-lg border border-border bg-surface-elevated p-4">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-2">Référence · Base</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-ink-soft">Net mensuel</p>
                        <p className={cn("text-sm font-semibold tabular-nums", baseNet >= 0 ? "text-calm" : "text-critique")}>
                          {fmt(baseNet)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-soft">Runway</p>
                        <p className="text-sm font-semibold" style={{ color: runwayColor(baseJours) }}>
                          {baseJours === null ? "∞" : `${baseJours}j`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {scenarios.map((sc) => (
                    <ScenarioCard
                      key={sc.id}
                      scenario={sc}
                      baseItems={active}
                      baseNet={baseNet}
                      baseJours={baseJours}
                      solde={soldeEffectif}
                      confortThreshold={confortThreshold}
                      onEdit={() => openEdit(sc)}
                      onDelete={() => deleteScenario(sc.id)}
                      onPromote={() => promoteScenario(sc)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ScenarioPanel
        open={panelOpen}
        scenario={editingScenario}
        nextColor={nextColor}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
