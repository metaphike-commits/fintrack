import type { ThemeTokens } from "./types";

export const sunset: ThemeTokens = {
  id: "sunset", label: "Sunset", preview: "#ff7b29", isDark: true,

  surface:         "#0f0804",
  surfaceElevated: "#1a1108",
  surfaceGlass:    "rgba(26,17,8,0.85)",
  surfaceOverlay:  "rgba(15,8,4,0.97)",

  accent:      "#ff7b29",
  accentSoft:  "rgba(255,123,41,0.12)",
  accentHover: "#e56a1e",
  accentGlow:  "rgba(255,123,41,0.30)",

  calm:         "#f9c74f",
  calmSoft:     "rgba(249,199,79,0.10)",
  calmGlow:     "rgba(249,199,79,0.25)",
  attention:    "#f4845f",
  attentionSoft:"rgba(244,132,95,0.10)",
  attentionGlow:"rgba(244,132,95,0.25)",
  critique:     "#e63946",
  critiqueSoft: "rgba(230,57,70,0.10)",
  critiqueGlow: "rgba(230,57,70,0.25)",

  ink:      "rgba(255,240,220,0.92)",
  inkSoft:  "rgba(230,200,165,0.55)",
  inkGhost: "rgba(200,165,120,0.28)",

  border:       "rgba(255,123,41,0.12)",
  borderStrong: "rgba(255,123,41,0.22)",
  borderAccent: "rgba(255,123,41,0.35)",
  muted:        "rgba(200,165,120,0.32)",

  shadowSm: "0 1px 3px rgba(20,5,0,0.50)",
  shadowMd: "0 4px 20px rgba(20,5,0,0.60), 0 1px 4px rgba(20,5,0,0.50)",
  shadowLg: "0 24px 48px rgba(20,5,0,0.70), 0 4px 16px rgba(20,5,0,0.60)",

  graphLine:          "#ff7b29",
  graphLineGlow:      "rgba(255,123,41,0.35)",
  graphAreaPosTop:    "rgba(249,199,79,0.22)",
  graphAreaPosBottom: "rgba(249,199,79,0.02)",
  graphAreaNegTop:    "rgba(230,57,70,0.02)",
  graphAreaNegBottom: "rgba(230,57,70,0.25)",
  graphGrid:          "rgba(255,123,41,0.07)",
  graphPointBas:      "#e63946",
  graphPointBasGlow:  "rgba(230,57,70,0.45)",
  graphToday:         "rgba(255,123,41,0.18)",
  graphTodayDot:      "#ff7b29",
  graphCriticalZone:  "rgba(230,57,70,0.04)",
  graphConfortLine:   "#f4845f",
  graphPastShade:     "rgba(255,123,41,0.03)",
  graphVariableNeg:   "#7f1d1d",

  ambientOrb1:        "#ff7b29",
  ambientOrb2:        "#f9c74f",
  ambientOrb3:        "#e63946",
  ambientOrb1Opacity: 0.08,
  ambientOrb2Opacity: 0.05,
  ambientOrb3Opacity: 0.035,

  sidebarBg:     "rgba(10,5,2,0.98)",
  sidebarBorder: "rgba(255,123,41,0.10)",

  focusSurface:         "#080402",
  focusSurfaceElevated: "#120a05",
  focusGlow:            "rgba(255,123,41,0.18)",

  calRevenus:     "#f9c74f",
  calFixes:       "#ff7b29",
  calVariables:   "#f4845f",
  calEpargne:     "#a78bfa",
  calEngagements: "#e63946",
  calToday:       "rgba(255,123,41,0.06)",
  calMonthBorder: "rgba(255,123,41,0.18)",
};
