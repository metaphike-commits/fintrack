// Single source of truth for design tokens.
// CSS custom properties in globals.css mirror these values.
// Use this file when a token value is needed in JS (e.g. SVG charts).

export const colors = {
  light: {
    surface: "#f7f7f8",
    surfaceElevated: "#ffffff",
    surfaceOverlay: "rgba(255,255,255,0.80)",
    accent: "#3b82f6",
    accentSoft: "#dbeafe",
    accentHover: "#2563eb",
    calm: "#22c55e",
    calmSoft: "#dcfce7",
    attention: "#f59e0b",
    attentionSoft: "#fef3c7",
    critique: "#ef4444",
    critiqueSoft: "#fee2e2",
    ink: "#111827",
    inkSoft: "#6b7280",
    inkGhost: "#d1d5db",
    border: "#e5e7eb",
    borderStrong: "#9ca3af",
    muted: "#9ca3af",
  },
  dark: {
    surface: "#0f0f14",
    surfaceElevated: "#1a1a24",
    surfaceOverlay: "rgba(26,26,36,0.93)",
    accent: "#60a5fa",
    accentSoft: "#1e3a5f",
    accentHover: "#93c5fd",
    calm: "#4ade80",
    calmSoft: "#14532d",
    attention: "#fbbf24",
    attentionSoft: "#451a03",
    critique: "#f87171",
    critiqueSoft: "#3d1212",
    ink: "#f1f5f9",
    inkSoft: "#94a3b8",
    inkGhost: "#374151",
    border: "#2a2a38",
    borderStrong: "#4b5563",
    muted: "#6b7280",
  },
  focus: {
    surface: "#06060a",
    surfaceElevated: "#0d0d14",
    surfaceOverlay: "rgba(13,13,20,0.95)",
    accent: "#60a5fa",
    accentSoft: "#0f1e33",
    accentHover: "#93c5fd",
    calm: "#4ade80",
    calmSoft: "#0a2e1a",
    attention: "#fbbf24",
    attentionSoft: "#2c1a08",
    critique: "#fb923c",
    critiqueSoft: "#2c1a08",
    ink: "#e2e8f0",
    inkSoft: "#64748b",
    inkGhost: "#1f2937",
    border: "#1a1a28",
    borderStrong: "#374151",
    muted: "#4b5563",
  },
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.06)",
  lg: "0 10px 15px rgba(0,0,0,0.10), 0 4px 6px rgba(0,0,0,0.05)",
} as const;

export const transitions = {
  fast: "100ms ease",
  default: "150ms ease",
  slow: "250ms ease",
} as const;

export type AppTheme = "light" | "dark" | "focus";
export type TensionLevel = "calm" | "attention" | "critique";
