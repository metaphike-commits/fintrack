"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { MobileTopBar } from "@/components/ui/MobileTopBar";
import { cn } from "@/lib/cn";
import { animate } from "animejs";
import { usePreferencesStore } from "@/store/preferences";
import { THEME_REGISTRY, themeToCSS } from "@/lib/themes";
import { FinanceSyncProvider } from "@/components/FinanceSyncProvider";

export interface AppShellProps {
  sidebar: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}

function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      <div style={{
        position: "absolute", width: 900, height: 900,
        left: -220, top: "15%", borderRadius: "50%",
        background: "radial-gradient(circle, var(--ambient-orb1) 0%, transparent 70%)",
        filter: "blur(90px)",
        opacity: "var(--ambient-orb1-opacity)" as unknown as number,
        animation: "ambient-1 28s ease-in-out infinite",
        transition: "opacity 280ms ease",
      }} />
      <div style={{
        position: "absolute", width: 700, height: 700,
        right: -150, top: "5%", borderRadius: "50%",
        background: "radial-gradient(circle, var(--ambient-orb2) 0%, transparent 70%)",
        filter: "blur(80px)",
        opacity: "var(--ambient-orb2-opacity)" as unknown as number,
        animation: "ambient-2 35s ease-in-out infinite",
        transition: "opacity 280ms ease",
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500,
        left: "45%", bottom: -80, borderRadius: "50%",
        background: "radial-gradient(circle, var(--ambient-orb3) 0%, transparent 70%)",
        filter: "blur(70px)",
        opacity: "var(--ambient-orb3-opacity)" as unknown as number,
        animation: "ambient-3 22s ease-in-out infinite",
        transition: "opacity 280ms ease",
      }} />
    </div>
  );
}

export function AppShell({ sidebar, title = "Fintrack", children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname  = usePathname();
  const mainRef   = useRef<HTMLElement>(null);
  const shellRef  = useRef<HTMLDivElement>(null);
  const themeId   = usePreferencesStore((s) => s.theme);
  const prevTheme = useRef(themeId);

  // Inject full CSS token set on mount and theme change
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const theme = THEME_REGISTRY[themeId] ?? THEME_REGISTRY["midnight"];
    const vars  = themeToCSS(theme);
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));

    // Also set color-scheme for Sky (light) theme
    el.style.colorScheme = theme.isDark ? "dark" : "light";
  }, [themeId]);

  // Flash when theme changes (skip initial mount)
  useEffect(() => {
    if (prevTheme.current === themeId) return;
    prevTheme.current = themeId;
    const el = shellRef.current;
    if (!el) return;
    animate(el, { opacity: [0.6, 1], duration: 260, ease: "outQuart" });
  }, [themeId]);

  // Page entrance animation
  useEffect(() => {
    if (!mainRef.current) return;
    const anim = animate(mainRef.current, {
      opacity: [0, 1], translateY: [12, 0], duration: 320, ease: "outQuart",
    });
    return () => { anim.pause(); };
  }, [pathname]);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div
      ref={shellRef}
      data-theme={themeId}
      className="flex h-screen overflow-hidden bg-surface"
      style={{ position: "relative" }}
    >
      <AmbientBackground />

      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0 h-full" style={{ position: "relative", zIndex: 2 }}>
        {sidebar}
      </div>

      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-300",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ willChange: "transform" }}
      >
        <div className="flex items-center justify-end px-3 py-2 bg-surface-elevated border-b border-border">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-surface-overlay transition-colors"
            aria-label="Fermer le menu"
          >
            <X size={16} />
          </button>
        </div>
        {sidebar}
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ position: "relative", zIndex: 1 }}>
        <div className="md:hidden shrink-0">
          <MobileTopBar title={title} onMenuOpen={() => setDrawerOpen(true)} />
        </div>
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <FinanceSyncProvider>{children}</FinanceSyncProvider>
        </main>
      </div>
    </div>
  );
}
