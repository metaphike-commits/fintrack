"use client";

import { THEME_LIST } from "@/lib/themes";
import type { ThemeId } from "@/lib/themes";
import { usePreferencesStore } from "@/store/preferences";

export function ThemePicker() {
  const theme    = usePreferencesStore((s) => s.theme);
  const setTheme = usePreferencesStore((s) => s.setTheme);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 4px 4px",
    }}>
      <span style={{
        fontSize: 7.5, fontFamily: "monospace", textTransform: "uppercase",
        letterSpacing: "0.12em", color: "var(--ink-ghost)",
        flexShrink: 0, marginRight: 2,
      }}>
        Thème
      </span>
      {THEME_LIST.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id as ThemeId)}
            title={t.label}
            style={{
              position: "relative",
              width:  active ? 18 : 12,
              height: active ? 18 : 12,
              borderRadius: "50%",
              background: t.preview,
              border: "none",
              outline: active ? `2px solid ${t.preview}` : "none",
              outlineOffset: 2,
              boxShadow: active
                ? `0 0 12px ${t.preview}90, 0 0 4px ${t.preview}60`
                : `0 0 0 1px ${t.preview}40`,
              cursor: "pointer",
              transition: "all 240ms cubic-bezier(0.34,1.56,0.64,1)",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}
