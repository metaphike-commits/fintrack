import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { CockpitView } from "@/modules/cockpit/CockpitView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export default function DashboardPage() {
  return (
    <AppShell
      title="Cockpit"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <CockpitView />
    </AppShell>
  );
}
