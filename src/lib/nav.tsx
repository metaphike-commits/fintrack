import { LayoutDashboard, Database, GitBranch, CalendarDays, Sparkles, BarChart3, Landmark, Wallet, ClipboardList } from "lucide-react";
import type { SidebarNavItem } from "@/components/ui/Sidebar";

export const NAV: SidebarNavItem[] = [
  { href: "/dashboard",       label: "Cockpit",         icon: <LayoutDashboard size={16} /> },
  { href: "/timeline",        label: "Timeline",        icon: <CalendarDays size={16} /> },
  { href: "/budget",          label: "Budget",          icon: <Wallet size={16} /> },
  { href: "/review",          label: "Revue",           icon: <ClipboardList size={16} /> },
  { divider: true },
  { href: "/base-financiere", label: "Base Financière", icon: <Database size={16} /> },
  { href: "/analyse",         label: "Analyse",         icon: <BarChart3 size={16} /> },
  { href: "/patrimoine",      label: "Patrimoine",      icon: <Landmark size={16} /> },
  { href: "/scenarios",       label: "Scénarios",       icon: <GitBranch size={16} /> },
  { divider: true },
  { href: "/import",          label: "Import IA",       icon: <Sparkles size={16} /> },
];

export function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">F</span>
      </div>
      <span className="text-sm font-semibold text-ink">Fintrack</span>
    </div>
  );
}
