import type { ThemeTokens } from "./types";

export const sky: ThemeTokens = {
  id: "sky", label: "Sky Glass", preview: "#0062ff", isDark: false,

  surface:         "#edf2f7",
  surfaceElevated: "#ffffff",
  surfaceGlass:    "rgba(255,255,255,0.82)",
  surfaceOverlay:  "rgba(237,242,247,0.95)",

  accent:      "#0062ff",
  accentSoft:  "rgba(0,98,255,0.09)",
  accentHover: "#0051d4",
  accentGlow:  "rgba(0,98,255,0.20)",

  calm:         "#00b894",
  calmSoft:     "rgba(0,184,148,0.10)",
  calmGlow:     "rgba(0,184,148,0.20)",
  attention:    "#e67e22",
  attentionSoft:"rgba(230,126,34,0.10)",
  attentionGlow:"rgba(230,126,34,0.20)",
  critique:     "#e74c3c",
  critiqueSoft: "rgba(231,76,60,0.10)",
  critiqueGlow: "rgba(231,76,60,0.18)",

  ink:      "rgba(15,25,50,0.90)",
  inkSoft:  "rgba(50,80,130,0.60)",
  inkGhost: "rgba(80,110,160,0.40)",

  border:       "rgba(0,30,80,0.10)",
  borderStrong: "rgba(0,30,80,0.18)",
  borderAccent: "rgba(0,98,255,0.25)",
  muted:        "rgba(80,110,160,0.40)",

  shadowSm: "0 1px 3px rgba(0,30,80,0.10)",
  shadowMd: "0 4px 16px rgba(0,30,80,0.12), 0 1px 4px rgba(0,30,80,0.08)",
  shadowLg: "0 20px 40px rgba(0,30,80,0.14), 0 4px 12px rgba(0,30,80,0.10)",

  graphLine:          "#0062ff",
  graphLineGlow:      "rgba(0,98,255,0.22)",
  graphAreaPosTop:    "rgba(0,98,255,0.16)",
  graphAreaPosBottom: "rgba(0,98,255,0.01)",
  graphAreaNegTop:    "rgba(231,76,60,0.01)",
  graphAreaNegBottom: "rgba(231,76,60,0.16)",
  graphGrid:          "rgba(0,30,80,0.06)",
  graphPointBas:      "#e74c3c",
  graphPointBasGlow:  "rgba(231,76,60,0.30)",
  graphToday:         "rgba(0,98,255,0.10)",
  graphTodayDot:      "#0062ff",
  graphCriticalZone:  "rgba(231,76,60,0.04)",
  graphConfortLine:   "#e67e22",
  graphPastShade:     "rgba(0,30,80,0.03)",
  graphVariableNeg:   "#9f1239",

  ambientOrb1:        "#0062ff",
  ambientOrb2:        "#00b894",
  ambientOrb3:        "#e67e22",
  ambientOrb1Opacity: 0.05,
  ambientOrb2Opacity: 0.04,
  ambientOrb3Opacity: 0.03,

  sidebarBg:     "rgba(240,245,252,0.98)",
  sidebarBorder: "rgba(0,30,80,0.08)",

  focusSurface:         "#e4ecf5",
  focusSurfaceElevated: "#f2f6fc",
  focusGlow:            "rgba(0,98,255,0.10)",

  calRevenus:     "#00b894",
  calFixes:       "#0062ff",
  calVariables:   "#e67e22",
  calEpargne:     "#8b5cf6",
  calEngagements: "#e74c3c",
  calToday:       "rgba(0,98,255,0.06)",
  calMonthBorder: "rgba(0,30,80,0.12)",
};
