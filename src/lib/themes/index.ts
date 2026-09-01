export type { ThemeTokens } from "./types";
export { midnight } from "./midnight";
export { sky }      from "./sky";
export { mint }     from "./mint";
export { sunset }   from "./sunset";
export { slate }    from "./slate";

import { midnight } from "./midnight";
import { sky }      from "./sky";
import { mint }     from "./mint";
import { sunset }   from "./sunset";
import { slate }    from "./slate";
import type { ThemeTokens } from "./types";

export const THEME_REGISTRY: Record<string, ThemeTokens> = {
  midnight,
  sky,
  mint,
  sunset,
  slate,
};

export type ThemeId = keyof typeof THEME_REGISTRY;

export const THEME_LIST = [midnight, sky, mint, sunset, slate];

// Converts a theme token object into a flat CSS custom-property map.
// Applied via element.style.setProperty() in AppShell for zero-overhead injection.
export function themeToCSS(t: ThemeTokens): Record<string, string> {
  return {
    "--surface":          t.surface,
    "--surface-elevated": t.surfaceElevated,
    "--surface-glass":    t.surfaceGlass,
    "--surface-overlay":  t.surfaceOverlay,

    "--accent":       t.accent,
    "--accent-soft":  t.accentSoft,
    "--accent-hover": t.accentHover,
    "--accent-glow":  t.accentGlow,

    "--calm":          t.calm,
    "--calm-soft":     t.calmSoft,
    "--calm-glow":     t.calmGlow,
    "--attention":     t.attention,
    "--attention-soft":t.attentionSoft,
    "--attention-glow":t.attentionGlow,
    "--critique":      t.critique,
    "--critique-soft": t.critiqueSoft,
    "--critique-glow": t.critiqueGlow,

    "--ink":       t.ink,
    "--ink-soft":  t.inkSoft,
    "--ink-ghost": t.inkGhost,

    "--border":        t.border,
    "--border-strong": t.borderStrong,
    "--border-accent": t.borderAccent,
    "--muted":         t.muted,

    "--shadow-sm": t.shadowSm,
    "--shadow-md": t.shadowMd,
    "--shadow-lg": t.shadowLg,

    "--graph-line":            t.graphLine,
    "--graph-line-glow":       t.graphLineGlow,
    "--graph-area-pos-top":    t.graphAreaPosTop,
    "--graph-area-pos-bottom": t.graphAreaPosBottom,
    "--graph-area-neg-top":    t.graphAreaNegTop,
    "--graph-area-neg-bottom": t.graphAreaNegBottom,
    "--graph-grid":            t.graphGrid,
    "--graph-point-bas":       t.graphPointBas,
    "--graph-point-bas-glow":  t.graphPointBasGlow,
    "--graph-today":           t.graphToday,
    "--graph-today-dot":       t.graphTodayDot,
    "--graph-critical-zone":   t.graphCriticalZone,
    "--graph-confort-line":    t.graphConfortLine,
    "--graph-past-shade":      t.graphPastShade,
    "--graph-variable-neg":    t.graphVariableNeg,

    "--ambient-orb1":         t.ambientOrb1,
    "--ambient-orb2":         t.ambientOrb2,
    "--ambient-orb3":         t.ambientOrb3,
    "--ambient-orb1-opacity": String(t.ambientOrb1Opacity),
    "--ambient-orb2-opacity": String(t.ambientOrb2Opacity),
    "--ambient-orb3-opacity": String(t.ambientOrb3Opacity),

    "--sidebar-bg":     t.sidebarBg,
    "--sidebar-border": t.sidebarBorder,

    "--focus-surface":          t.focusSurface,
    "--focus-surface-elevated": t.focusSurfaceElevated,
    "--focus-glow":             t.focusGlow,

    "--cal-revenus":      t.calRevenus,
    "--cal-fixes":        t.calFixes,
    "--cal-variables":    t.calVariables,
    "--cal-epargne":      t.calEpargne,
    "--cal-engagements":  t.calEngagements,
    "--cal-today":        t.calToday,
    "--cal-month-border": t.calMonthBorder,
  };
}
