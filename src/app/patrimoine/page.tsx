import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { PatrimoineView } from "@/modules/patrimoine/PatrimoineView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export default function PatrimoinePage() {
  return (
    <AppShell
      title="Patrimoine"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <PatrimoineView />
    </AppShell>
  );
}
