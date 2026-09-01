import { FocusView } from "@/modules/focus/FocusView";
import { FinanceSyncProvider } from "@/components/FinanceSyncProvider";

export default function FocusPage() {
  return (
    <FinanceSyncProvider>
      <FocusView />
    </FinanceSyncProvider>
  );
}
