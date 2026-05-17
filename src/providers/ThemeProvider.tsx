"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AppTheme } from "@/types";

const STORAGE_KEY = "fts-theme";
const DEFAULT_THEME: AppTheme = "dark";

const THEME_CLASSES: Record<AppTheme, string> = {
  light: "",
  dark: "dark",
  focus: "focus-mode",
};

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.classList.remove("dark", "focus-mode");
  const cls = THEME_CLASSES[theme];
  if (cls) root.classList.add(cls);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    const initial = stored ?? DEFAULT_THEME;
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  function setTheme(t: AppTheme) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
