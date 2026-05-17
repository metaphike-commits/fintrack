"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Database, GitBranch, CalendarDays, Sparkles,
  BarChart3, Landmark, Settings, Focus, Sun, Moon, Download,
  Search, ArrowRight, Command,
} from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import type { AppTheme } from "@/types";

// ── Context ──────────────────────────────────────────────────────────────────

interface CommandPaletteCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<CommandPaletteCtx>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export function useCommandPalette() {
  return useContext(Ctx);
}

// ── Command definition ────────────────────────────────────────────────────────

type CommandKind = "navigate" | "action" | "theme";

interface Command {
  id: string;
  label: string;
  sublabel?: string;
  keywords?: string;
  icon: React.ReactNode;
  section: "Navigation" | "Actions" | "Thème";
  kind: CommandKind;
  href?: string;
  theme?: AppTheme;
  action?: () => void;
}

const STORE_KEYS = [
  "fts-onboarding", "fts-base-financiere", "fts-compte", "fts-comptes",
  "fts-timeline", "fts-scenarios", "fts-transactions", "fts-preferences", "fts-patrimoine",
];

function exportData() {
  const data: Record<string, unknown> = {};
  for (const key of STORE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) { try { data[key] = JSON.parse(raw); } catch { data[key] = raw; } }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fintrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const NAV_COMMANDS: Omit<Command, "icon">[] = [
  { id: "cockpit", label: "Cockpit", sublabel: "Vue d'ensemble stratégique", keywords: "dashboard accueil today", section: "Navigation", kind: "navigate", href: "/dashboard" },
  { id: "base", label: "Base Financière", sublabel: "Postes récurrents", keywords: "revenus dépenses postes", section: "Navigation", kind: "navigate", href: "/base-financiere" },
  { id: "scenarios", label: "Scénarios", sublabel: "Simulations de trajectoire", keywords: "simulation what-if", section: "Navigation", kind: "navigate", href: "/scenarios" },
  { id: "timeline", label: "Timeline", sublabel: "Événements mensuels", keywords: "calendrier mois", section: "Navigation", kind: "navigate", href: "/timeline" },
  { id: "import", label: "Import IA", sublabel: "Importer un relevé bancaire", keywords: "csv pdf transactions", section: "Navigation", kind: "navigate", href: "/import" },
  { id: "analyse", label: "Analyse", sublabel: "Statistiques et tendances", keywords: "graphiques comportement", section: "Navigation", kind: "navigate", href: "/analyse" },
  { id: "patrimoine", label: "Patrimoine", sublabel: "Actifs, passifs, objectifs", keywords: "immobilier épargne objectifs", section: "Navigation", kind: "navigate", href: "/patrimoine" },
  { id: "focus", label: "Mode Focus", sublabel: "Projection plein écran", keywords: "courbe projection 90 jours", section: "Navigation", kind: "navigate", href: "/focus" },
  { id: "settings", label: "Paramètres", sublabel: "Thème, données, seuils", keywords: "options préférences", section: "Navigation", kind: "navigate", href: "/settings" },
];

// ── Palette overlay ───────────────────────────────────────────────────────────

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const NAV_ICONS: Record<string, React.ReactNode> = {
    cockpit: <LayoutDashboard size={15} />,
    base: <Database size={15} />,
    scenarios: <GitBranch size={15} />,
    timeline: <CalendarDays size={15} />,
    import: <Sparkles size={15} />,
    analyse: <BarChart3 size={15} />,
    patrimoine: <Landmark size={15} />,
    focus: <Focus size={15} />,
    settings: <Settings size={15} />,
  };

  const allCommands: Command[] = [
    ...NAV_COMMANDS.map((c) => ({ ...c, icon: NAV_ICONS[c.id] ?? <ArrowRight size={15} /> })),
    {
      id: "theme-light", label: "Thème clair", keywords: "light", section: "Thème", kind: "theme",
      icon: <Sun size={15} />, theme: "light",
    },
    {
      id: "theme-dark", label: "Thème sombre", keywords: "dark nuit", section: "Thème", kind: "theme",
      icon: <Moon size={15} />, theme: "dark",
    },
    {
      id: "theme-focus", label: "Thème focus", keywords: "focus zen minimal", section: "Thème", kind: "theme",
      icon: <Focus size={15} />, theme: "focus",
    },
    {
      id: "export", label: "Exporter les données", sublabel: "Télécharger un backup JSON", keywords: "backup save download", section: "Actions", kind: "action",
      icon: <Download size={15} />, action: exportData,
    },
  ];

  const q = query.toLowerCase().trim();
  const filtered = q
    ? allCommands.filter((c) =>
        c.label.toLowerCase().includes(q) ||
        (c.sublabel ?? "").toLowerCase().includes(q) ||
        (c.keywords ?? "").toLowerCase().includes(q)
      )
    : allCommands;

  const sections = Array.from(new Set(filtered.map((c) => c.section)));

  useEffect(() => { setActiveIdx(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function execute(cmd: Command) {
    if (cmd.kind === "navigate" && cmd.href) {
      router.push(cmd.href);
      onClose();
    } else if (cmd.kind === "theme" && cmd.theme) {
      setTheme(cmd.theme);
      onClose();
    } else if (cmd.kind === "action" && cmd.action) {
      cmd.action();
      onClose();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIdx]) execute(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  // Flat index across sections for arrow key tracking
  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[18vh]"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "var(--surface-elevated)", border: "1px solid var(--border-strong)" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKey}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
          <Search size={15} className="shrink-0" style={{ color: "var(--ink-ghost)" }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher une page, une action…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "var(--ink)" }}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
            style={{ border: "1px solid var(--border)", color: "var(--ink-ghost)", background: "var(--surface-overlay)" }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Search size={22} style={{ color: "var(--ink-ghost)", opacity: 0.4 }} />
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Aucun résultat pour « {query} »</p>
            </div>
          ) : (
            sections.map((section) => {
              const cmds = filtered.filter((c) => c.section === section);
              return (
                <div key={section}>
                  <p
                    className="text-[10px] font-mono uppercase tracking-widest px-4 pt-3 pb-1"
                    style={{ color: "var(--ink-ghost)" }}
                  >
                    {section}
                  </p>
                  {cmds.map((cmd) => {
                    const idx = flatIdx++;
                    const isActive = idx === activeIdx;
                    return (
                      <button
                        key={cmd.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{
                          background: isActive ? "var(--accent-soft)" : "transparent",
                          color: isActive ? "var(--accent)" : "var(--ink-soft)",
                        }}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => execute(cmd)}
                      >
                        <span
                          className="shrink-0"
                          style={{ color: isActive ? "var(--accent)" : "var(--ink-ghost)" }}
                        >
                          {cmd.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: isActive ? "var(--accent)" : "var(--ink)" }}>
                            {cmd.label}
                          </p>
                          {cmd.sublabel && (
                            <p className="text-xs truncate" style={{ color: "var(--ink-ghost)" }}>{cmd.sublabel}</p>
                          )}
                        </div>
                        {isActive && <ArrowRight size={13} className="shrink-0" style={{ color: "var(--accent)", opacity: 0.6 }} />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t text-[10px] font-mono"
          style={{ borderColor: "var(--border)", color: "var(--ink-ghost)" }}
        >
          <div className="flex items-center gap-3">
            <span>↑↓ Naviguer</span>
            <span>↵ Sélectionner</span>
            <span>Esc Fermer</span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={10} />
            <span>K pour ouvrir</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <Ctx.Provider value={{ open, setOpen, toggle }}>
      {children}
      {open && <Palette onClose={close} />}
    </Ctx.Provider>
  );
}

// ── Trigger button (for sidebar footer) ──────────────────────────────────────

export function CommandPaletteTrigger() {
  const { toggle } = useCommandPalette();
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors"
      style={{ color: "var(--ink-soft)" }}
      title="Ouvrir la palette de commandes (⌘K)"
    >
      <Search size={14} style={{ color: "var(--ink-ghost)" }} />
      <span className="flex-1 text-left">Rechercher…</span>
      <kbd
        className="text-[10px] px-1.5 py-0.5 rounded font-mono"
        style={{
          border: "1px solid var(--border)",
          color: "var(--ink-ghost)",
          background: "var(--surface-overlay)",
        }}
      >
        ⌘K
      </kbd>
    </button>
  );
}
