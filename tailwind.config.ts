import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-glass": "var(--surface-glass)",
        "surface-overlay": "var(--surface-overlay)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-hover": "var(--accent-hover)",
        "accent-glow": "var(--accent-glow)",
        calm: "var(--calm)",
        "calm-soft": "var(--calm-soft)",
        "calm-glow": "var(--calm-glow)",
        attention: "var(--attention)",
        "attention-soft": "var(--attention-soft)",
        "attention-glow": "var(--attention-glow)",
        critique: "var(--critique)",
        "critique-soft": "var(--critique-soft)",
        "critique-glow": "var(--critique-glow)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-ghost": "var(--ink-ghost)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "border-accent": "var(--border-accent)",
        muted: "var(--muted)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
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
        xs:   ["11px", { lineHeight: "16px" }],
        sm:   ["13px", { lineHeight: "20px" }],
        base: ["15px", { lineHeight: "24px" }],
        lg:   ["17px", { lineHeight: "26px" }],
        xl:   ["20px", { lineHeight: "30px" }],
        "2xl":["24px", { lineHeight: "32px" }],
        "3xl":["32px", { lineHeight: "40px" }],
        "4xl":["48px", { lineHeight: "56px" }],
      },
      transitionDuration: {
        fast: "100ms",
        DEFAULT: "160ms",
        slow: "280ms",
      },
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "20px",
        xl: "32px",
      },
    },
  },
  plugins: [],
};

export default config;
