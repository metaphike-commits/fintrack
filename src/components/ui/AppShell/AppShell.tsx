"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { MobileTopBar } from "@/components/ui/MobileTopBar";
import { cn } from "@/lib/cn";
import { animate } from "animejs";

export interface AppShellProps {
  sidebar: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}

function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: -220,
          top: "15%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
          filter: "blur(90px)",
          opacity: 0.07,
          animation: "ambient-1 28s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          right: -150,
          top: "5%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          filter: "blur(80px)",
          opacity: 0.05,
          animation: "ambient-2 35s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          left: "45%",
          bottom: -80,
          borderRadius: "50%",
          background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
          filter: "blur(70px)",
          opacity: 0.04,
          animation: "ambient-3 22s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function AppShell({ sidebar, title = "Fintrack", children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  // Page entrance animation on route change
  useEffect(() => {
    if (!mainRef.current) return;
    const anim = animate(mainRef.current, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 320,
      ease: "outQuart",
    });
    return () => { anim.pause(); };
  }, [pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface" style={{ position: "relative" }}>
      <AmbientBackground />

      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0 h-full" style={{ position: "relative", zIndex: 2 }}>
        {sidebar}
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
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

      {/* Main column */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden"
        style={{ position: "relative", zIndex: 1 }}
      >
        <div className="md:hidden shrink-0">
          <MobileTopBar title={title} onMenuOpen={() => setDrawerOpen(true)} />
        </div>
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
