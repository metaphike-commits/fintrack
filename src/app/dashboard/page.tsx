import { LayoutDashboard, Database, GitBranch, CalendarDays, Sparkles, BarChart3, Landmark } from "lucide-react";
import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { CockpitView } from "@/modules/cockpit/CockpitView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import type { SidebarNavItem } from "@/components/ui/Sidebar";

const NAV: SidebarNavItem[] = [
  { href: "/dashboard", label: "Cockpit", icon: <LayoutDashboard size={16} /> },
  { href: "/base-financiere", label: "Base Financière", icon: <Database size={16} /> },
  { href: "/scenarios", label: "Scénarios", icon: <GitBranch size={16} /> },
  { href: "/timeline", label: "Timeline", icon: <CalendarDays size={16} /> },
  { href: "/import", label: "Import IA", icon: <Sparkles size={16} /> },
  { href: "/analyse",        label: "Analyse",         icon: <BarChart3 size={16} /> },
  { href: "/patrimoine",     label: "Patrimoine",      icon: <Landmark size={16} /> },
];

function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">F</span>
      </div>
      <span className="text-sm font-semibold text-ink">Fintrack</span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell
      title="Cockpit"
      sidebar={
        <Sidebar
          items={NAV}
          logo={<AppLogo />}
          footer={<AppSidebarFooter />}
        />
      }
    >
      <CockpitView />
    </AppShell>
  );
}
