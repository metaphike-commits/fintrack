import type { ThemeTokens } from "./types";

export const midnight: ThemeTokens = {
  id: "midnight", label: "Midnight", preview: "#1d8cf8", isDark: true,

  surface:         "#020a18",
  surfaceElevated: "#060f23",
  surfaceGlass:    "rgba(6,15,35,0.85)",
  surfaceOverlay:  "rgba(2,10,24,0.97)",

  accent:      "#1d8cf8",
  accentSoft:  "rgba(29,140,248,0.12)",
  accentHover: "#0d7de8",
  accentGlow:  "rgba(29,140,248,0.30)",

  calm:         "#00d4a8",
  calmSoft:     "rgba(0,212,168,0.10)",
  calmGlow:     "rgba(0,212,168,0.25)",
  attention:    "#ff9f43",
  attentionSoft:"rgba(255,159,67,0.10)",
  attentionGlow:"rgba(255,159,67,0.25)",
  critique:     "#ff5f7e",
  critiqueSoft: "rgba(255,95,126,0.10)",
  critiqueGlow: "rgba(255,95,126,0.25)",

  ink:      "rgba(210,230,255,0.92)",
  inkSoft:  "rgba(160,195,240,0.55)",
  inkGhost: "rgba(100,150,210,0.28)",

  border:       "rgba(29,140,248,0.12)",
  borderStrong: "rgba(29,140,248,0.22)",
  borderAccent: "rgba(29,140,248,0.35)",
  muted:        "rgba(100,150,210,0.30)",

  shadowSm: "0 1px 3px rgba(0,5,20,0.50)",
  shadowMd: "0 4px 20px rgba(0,5,20,0.60), 0 1px 4px rgba(0,5,20,0.50)",
  shadowLg: "0 24px 48px rgba(0,5,20,0.70), 0 4px 16px rgba(0,5,20,0.60)",

  graphLine:          "#1d8cf8",
  graphLineGlow:      "rgba(29,140,248,0.35)",
  graphAreaPosTop:    "rgba(29,140,248,0.25)",
  graphAreaPosBottom: "rgba(29,140,248,0.02)",
  graphAreaNegTop:    "rgba(255,95,126,0.02)",
  graphAreaNegBottom: "rgba(255,95,126,0.25)",
  graphGrid:          "rgba(29,140,248,0.07)",
  graphPointBas:      "#ff5f7e",
  graphPointBasGlow:  "rgba(255,95,126,0.45)",
  graphToday:         "rgba(29,140,248,0.22)",
  graphTodayDot:      "#1d8cf8",
  graphCriticalZone:  "rgba(255,95,126,0.04)",
  graphConfortLine:   "#ff9f43",
  graphPastShade:     "rgba(29,140,248,0.03)",
  graphVariableNeg:   "#b91c1c",

  ambientOrb1:        "#1d8cf8",
  ambientOrb2:        "#00d4a8",
  ambientOrb3:        "#ff9f43",
  ambientOrb1Opacity: 0.08,
  ambientOrb2Opacity: 0.05,
  ambientOrb3Opacity: 0.04,

  sidebarBg:     "rgba(2,8,18,0.98)",
  sidebarBorder: "rgba(29,140,248,0.10)",

  focusSurface:         "#010610",
  focusSurfaceElevated: "#03091a",
  focusGlow:            "rgba(29,140,248,0.20)",

  calRevenus:     "#00d4a8",
  calFixes:       "#1d8cf8",
  calVariables:   "#ff9f43",
  calEpargne:     "#a78bfa",
  calEngagements: "#ff5f7e",
  calToday:       "rgba(29,140,248,0.06)",
  calMonthBorder: "rgba(29,140,248,0.18)",
};
