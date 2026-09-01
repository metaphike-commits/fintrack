import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { BaseFinanciereView } from "@/modules/base-financiere/BaseFinanciereView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export default function BaseFinancierePage() {
  return (
    <AppShell
      title="Base Financière"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <BaseFinanciereView />
    </AppShell>
  );
}
