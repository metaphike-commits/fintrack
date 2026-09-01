import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { ReviewView } from "@/modules/review/ReviewView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export default function ReviewPage() {
  return (
    <AppShell
      title="Revue du mois"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <ReviewView />
    </AppShell>
  );
}
