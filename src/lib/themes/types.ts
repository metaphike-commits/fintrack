export interface ThemeTokens {
  id: string;
  label: string;
  preview: string;
  isDark: boolean;

  // Surfaces
  surface: string;
  surfaceElevated: string;
  surfaceGlass: string;
  surfaceOverlay: string;

  // Accent
  accent: string;
  accentSoft: string;
  accentHover: string;
  accentGlow: string;

  // Semantic
  calm: string;
  calmSoft: string;
  calmGlow: string;
  attention: string;
  attentionSoft: string;
  attentionGlow: string;
  critique: string;
  critiqueSoft: string;
  critiqueGlow: string;

  // Typography
  ink: string;
  inkSoft: string;
  inkGhost: string;

  // Borders
  border: string;
  borderStrong: string;
  borderAccent: string;
  muted: string;

  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;

  // Graph / chart tokens
  graphLine: string;
  graphLineGlow: string;
  graphAreaPosTop: string;
  graphAreaPosBottom: string;
  graphAreaNegTop: string;
  graphAreaNegBottom: string;
  graphGrid: string;
  graphPointBas: string;
  graphPointBasGlow: string;
  graphToday: string;
  graphTodayDot: string;
  graphCriticalZone: string;
  graphConfortLine: string;
  graphPastShade: string;
  /** Below-zero color for the "avec dépenses variables" overlay curve —
   *  deliberately distinct from graphPointBas so the two scenarios never
   *  read as the same danger signal. */
  graphVariableNeg: string;

  // Ambient background orbs
  ambientOrb1: string;
  ambientOrb2: string;
  ambientOrb3: string;
  ambientOrb1Opacity: number;
  ambientOrb2Opacity: number;
  ambientOrb3Opacity: number;

  // Sidebar
  sidebarBg: string;
  sidebarBorder: string;

  // Focus mode
  focusSurface: string;
  focusSurfaceElevated: string;
  focusGlow: string;

  // Timeline calendar groups
  calRevenus: string;
  calFixes: string;
  calVariables: string;
  calEpargne: string;
  calEngagements: string;
  calToday: string;
  calMonthBorder: string;
}
