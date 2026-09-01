import type { ThemeTokens } from "./types";

export const mint: ThemeTokens = {
  id: "mint", label: "Mint Pulse", preview: "#00e5b0", isDark: true,

  surface:         "#020f08",
  surfaceElevated: "#061410",
  surfaceGlass:    "rgba(6,20,16,0.85)",
  surfaceOverlay:  "rgba(2,15,8,0.97)",

  accent:      "#00e5b0",
  accentSoft:  "rgba(0,229,176,0.12)",
  accentHover: "#00c99a",
  accentGlow:  "rgba(0,229,176,0.30)",

  calm:         "#00e5b0",
  calmSoft:     "rgba(0,229,176,0.10)",
  calmGlow:     "rgba(0,229,176,0.28)",
  attention:    "#ffb347",
  attentionSoft:"rgba(255,179,71,0.10)",
  attentionGlow:"rgba(255,179,71,0.25)",
  critique:     "#ff6b6b",
  critiqueSoft: "rgba(255,107,107,0.10)",
  critiqueGlow: "rgba(255,107,107,0.25)",

  ink:      "rgba(220,255,245,0.90)",
  inkSoft:  "rgba(160,230,210,0.55)",
  inkGhost: "rgba(100,200,170,0.28)",

  border:       "rgba(0,229,176,0.10)",
  borderStrong: "rgba(0,229,176,0.20)",
  borderAccent: "rgba(0,229,176,0.32)",
  muted:        "rgba(100,200,170,0.30)",

  shadowSm: "0 1px 3px rgba(0,5,3,0.50)",
  shadowMd: "0 4px 20px rgba(0,5,3,0.60), 0 1px 4px rgba(0,5,3,0.50)",
  shadowLg: "0 24px 48px rgba(0,5,3,0.70), 0 4px 16px rgba(0,5,3,0.60)",

  graphLine:          "#00e5b0",
  graphLineGlow:      "rgba(0,229,176,0.40)",
  graphAreaPosTop:    "rgba(0,229,176,0.22)",
  graphAreaPosBottom: "rgba(0,229,176,0.02)",
  graphAreaNegTop:    "rgba(255,107,107,0.02)",
  graphAreaNegBottom: "rgba(255,107,107,0.25)",
  graphGrid:          "rgba(0,229,176,0.06)",
  graphPointBas:      "#ff6b6b",
  graphPointBasGlow:  "rgba(255,107,107,0.45)",
  graphToday:         "rgba(0,229,176,0.12)",
  graphTodayDot:      "#00e5b0",
  graphCriticalZone:  "rgba(255,107,107,0.04)",
  graphConfortLine:   "#ffb347",
  graphPastShade:     "rgba(0,229,176,0.03)",
  graphVariableNeg:   "#b91c1c",

  ambientOrb1:        "#00e5b0",
  ambientOrb2:        "#00b894",
  ambientOrb3:        "#ffb347",
  ambientOrb1Opacity: 0.08,
  ambientOrb2Opacity: 0.05,
  ambientOrb3Opacity: 0.04,

  sidebarBg:     "rgba(2,10,6,0.98)",
  sidebarBorder: "rgba(0,229,176,0.10)",

  focusSurface:         "#010805",
  focusSurfaceElevated: "#030e09",
  focusGlow:            "rgba(0,229,176,0.18)",

  calRevenus:     "#00e5b0",
  calFixes:       "#38bdf8",
  calVariables:   "#ffb347",
  calEpargne:     "#a78bfa",
  calEngagements: "#ff6b6b",
  calToday:       "rgba(0,229,176,0.06)",
  calMonthBorder: "rgba(0,229,176,0.18)",
};
