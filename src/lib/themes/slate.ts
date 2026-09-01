import type { ThemeTokens } from "./types";

export const slate: ThemeTokens = {
  id: "slate", label: "Slate", preview: "#6c8eef", isDark: true,

  surface:         "#0c0d10",
  surfaceElevated: "#111318",
  surfaceGlass:    "rgba(17,19,24,0.90)",
  surfaceOverlay:  "rgba(12,13,16,0.97)",

  accent:      "#6c8eef",
  accentSoft:  "rgba(108,142,239,0.10)",
  accentHover: "#5a7de0",
  accentGlow:  "rgba(108,142,239,0.20)",

  calm:         "#52c17f",
  calmSoft:     "rgba(82,193,127,0.10)",
  calmGlow:     "rgba(82,193,127,0.18)",
  attention:    "#e8a838",
  attentionSoft:"rgba(232,168,56,0.10)",
  attentionGlow:"rgba(232,168,56,0.18)",
  critique:     "#e05353",
  critiqueSoft: "rgba(224,83,83,0.10)",
  critiqueGlow: "rgba(224,83,83,0.18)",

  ink:      "rgba(225,230,240,0.88)",
  inkSoft:  "rgba(155,165,185,0.55)",
  inkGhost: "rgba(100,115,140,0.35)",

  border:       "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.10)",
  borderAccent: "rgba(108,142,239,0.25)",
  muted:        "rgba(100,115,140,0.35)",

  shadowSm: "0 1px 3px rgba(0,0,0,0.45)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.45)",
  shadowLg: "0 20px 40px rgba(0,0,0,0.65), 0 4px 12px rgba(0,0,0,0.55)",

  graphLine:          "#6c8eef",
  graphLineGlow:      "rgba(108,142,239,0.22)",
  graphAreaPosTop:    "rgba(108,142,239,0.16)",
  graphAreaPosBottom: "rgba(108,142,239,0.02)",
  graphAreaNegTop:    "rgba(224,83,83,0.02)",
  graphAreaNegBottom: "rgba(224,83,83,0.16)",
  graphGrid:          "rgba(255,255,255,0.04)",
  graphPointBas:      "#e05353",
  graphPointBasGlow:  "rgba(224,83,83,0.28)",
  graphToday:         "rgba(108,142,239,0.08)",
  graphTodayDot:      "#6c8eef",
  graphCriticalZone:  "rgba(224,83,83,0.03)",
  graphConfortLine:   "#e8a838",
  graphPastShade:     "rgba(255,255,255,0.008)",
  graphVariableNeg:   "#b91c1c",

  ambientOrb1:        "#6c8eef",
  ambientOrb2:        "#52c17f",
  ambientOrb3:        "#e8a838",
  ambientOrb1Opacity: 0.05,
  ambientOrb2Opacity: 0.03,
  ambientOrb3Opacity: 0.025,

  sidebarBg:     "rgba(8,9,12,0.99)",
  sidebarBorder: "rgba(255,255,255,0.05)",

  focusSurface:         "#080910",
  focusSurfaceElevated: "#0e0f14",
  focusGlow:            "rgba(108,142,239,0.12)",

  calRevenus:     "#52c17f",
  calFixes:       "#6c8eef",
  calVariables:   "#e8a838",
  calEpargne:     "#a78bfa",
  calEngagements: "#e05353",
  calToday:       "rgba(108,142,239,0.05)",
  calMonthBorder: "rgba(255,255,255,0.08)",
};
