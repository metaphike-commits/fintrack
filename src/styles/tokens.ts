// Single source of truth for design tokens.
// CSS custom properties in globals.css mirror these values.
// Use this file when a token value is needed in JS (e.g. SVG charts).

export const colors = {
  light: {
    surface: "#f4f4f7",
    surfaceElevated: "#ffffff",
    surfaceGlass: "rgba(255,255,255,0.70)",
    surfaceOverlay: "rgba(255,255,255,0.90)",
    accent: "#7c3aed",
    accentSoft: "rgba(124,58,237,0.10)",
    accentHover: "#6d28d9",
    accentGlow: "rgba(124,58,237,0.20)",
    calm: "#059669",
    calmSoft: "rgba(5,150,105,0.10)",
    calmGlow: "rgba(5,150,105,0.20)",
    attention: "#d97706",
    attentionSoft: "rgba(217,119,6,0.10)",
    attentionGlow: "rgba(217,119,6,0.20)",
    critique: "#dc2626",
    critiqueSoft: "rgba(220,38,38,0.10)",
    critiqueGlow: "rgba(220,38,38,0.20)",
    ink: "#0f0f1a",
    inkSoft: "#52526b",
    inkGhost: "#a0a0b8",
    border: "rgba(0,0,0,0.08)",
    borderStrong: "rgba(0,0,0,0.16)",
    borderAccent: "rgba(124,58,237,0.30)",
    muted: "#a0a0b8",
  },
  dark: {
    surface: "#04040c",
    surfaceElevated: "#08081a",
    surfaceGlass: "rgba(255,255,255,0.04)",
    surfaceOverlay: "rgba(8,8,26,0.97)",
    accent: "#8b5cf6",
    accentSoft: "rgba(139,92,246,0.12)",
    accentHover: "#7c3aed",
    accentGlow: "rgba(139,92,246,0.28)",
    calm: "#10b981",
    calmSoft: "rgba(16,185,129,0.10)",
    calmGlow: "rgba(16,185,129,0.25)",
    attention: "#f59e0b",
    attentionSoft: "rgba(245,158,11,0.10)",
    attentionGlow: "rgba(245,158,11,0.25)",
    critique: "#ef4444",
    critiqueSoft: "rgba(239,68,68,0.10)",
    critiqueGlow: "rgba(239,68,68,0.25)",
    ink: "rgba(255,255,255,0.93)",
    inkSoft: "rgba(255,255,255,0.50)",
    inkGhost: "rgba(255,255,255,0.24)",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.16)",
    borderAccent: "rgba(139,92,246,0.35)",
    muted: "rgba(255,255,255,0.28)",
  },
  focus: {
    surface: "#020208",
    surfaceElevated: "#05050f",
    surfaceGlass: "rgba(255,255,255,0.03)",
    surfaceOverlay: "rgba(5,5,15,0.98)",
    accent: "#7c3aed",
    accentSoft: "rgba(124,58,237,0.10)",
    accentHover: "#6d28d9",
    accentGlow: "rgba(124,58,237,0.25)",
    calm: "#059669",
    calmSoft: "rgba(5,150,105,0.10)",
    calmGlow: "rgba(5,150,105,0.22)",
    attention: "#d97706",
    attentionSoft: "rgba(217,119,6,0.10)",
    attentionGlow: "rgba(217,119,6,0.22)",
    critique: "#ef4444",
    critiqueSoft: "rgba(239,68,68,0.10)",
    critiqueGlow: "rgba(239,68,68,0.22)",
    ink: "rgba(255,255,255,0.85)",
    inkSoft: "rgba(255,255,255,0.40)",
    inkGhost: "rgba(255,255,255,0.18)",
    border: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.12)",
    borderAccent: "rgba(124,58,237,0.30)",
    muted: "rgba(255,255,255,0.22)",
  },
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "18px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(0,0,0,0.40)",
  md: "0 4px 20px rgba(0,0,0,0.50), 0 1px 4px rgba(0,0,0,0.40)",
  lg: "0 24px 48px rgba(0,0,0,0.60), 0 4px 16px rgba(0,0,0,0.50)",
} as const;

export const transitions = {
  fast: "100ms ease",
  default: "160ms ease",
  slow: "280ms ease",
} as const;

export type AppTheme = "light" | "dark" | "focus";
export type TensionLevel = "calm" | "attention" | "critique";
