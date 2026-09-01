import { AppShell } from "@/components/ui/AppShell";
import { Sidebar } from "@/components/ui/Sidebar";
import { BudgetView } from "@/modules/budget/BudgetView";
import { AppSidebarFooter } from "@/components/ui/AppSidebar/AppSidebarFooter";
import { NAV, AppLogo } from "@/lib/nav";

export default function BudgetPage() {
  return (
    <AppShell
      title="Budget"
      sidebar={<Sidebar items={NAV} logo={<AppLogo />} footer={<AppSidebarFooter />} />}
    >
      <BudgetView />
    </AppShell>
  );
}
