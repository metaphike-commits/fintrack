import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { ScenariosView } from "@/modules/scenarios/ScenariosView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export default function ScenariosPage() {
  return (
    <AppShell
      title="Scénarios"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <ScenariosView />
    </AppShell>
  );
}
