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

export function AppShell({ sidebar, title = "Fintrack", children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  // Page entrance animation on route change
  useEffect(() => {
    if (!mainRef.current) return;
    const anim = animate(mainRef.current, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 300,
      ease: "outQuart",
    });
    return () => { anim.pause(); };
  }, [pathname]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex shrink-0 h-full">{sidebar}</div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-250",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
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
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
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
