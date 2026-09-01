import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { SettingsView } from "@/modules/settings/SettingsView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export default function SettingsPage() {
  return (
    <AppShell
      title="Paramètres"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <SettingsView />
    </AppShell>
  );
}
