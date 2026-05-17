import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-overlay": "var(--surface-overlay)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-hover": "var(--accent-hover)",
        calm: "var(--calm)",
        "calm-soft": "var(--calm-soft)",
        attention: "var(--attention)",
        "attention-soft": "var(--attention-soft)",
        critique: "var(--critique)",
        "critique-soft": "var(--critique-soft)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-ghost": "var(--ink-ghost)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        muted: "var(--muted)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["11px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["15px", { lineHeight: "24px" }],
        lg: ["17px", { lineHeight: "26px" }],
        xl: ["20px", { lineHeight: "30px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["32px", { lineHeight: "40px" }],
        "4xl": ["48px", { lineHeight: "56px" }],
      },
      transitionDuration: {
        fast: "100ms",
        DEFAULT: "150ms",
        slow: "250ms",
      },
    },
  },
  plugins: [],
};

export default config;
