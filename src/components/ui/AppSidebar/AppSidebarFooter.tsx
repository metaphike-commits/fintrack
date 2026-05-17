"use client";

import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { CommandPaletteTrigger } from "@/components/ui/CommandPalette/CommandPalette";
import { cn } from "@/lib/cn";

export function AppSidebarFooter() {
  const pathname = usePathname();
  const isSettings = pathname === "/settings";

  return (
    <div className="space-y-0.5">
      <CommandPaletteTrigger />
      <a
        href="/settings"
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          isSettings
            ? "bg-surface-overlay text-ink font-medium"
            : "text-ink-soft hover:bg-surface-overlay hover:text-ink"
        )}
      >
        <Settings size={16} className={isSettings ? "text-accent" : "text-ink-ghost"} />
        Paramètres
      </a>
    </div>
  );
}
