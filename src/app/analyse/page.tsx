import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { AnalyseView } from "@/modules/analyse/AnalyseView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default function AnalysePage() {
  return (
    <AppShell
      title="Analyse"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <AnalyseView />
    </AppShell>
  );
}
