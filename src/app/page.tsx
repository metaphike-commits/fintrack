"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/store/onboarding";
import { Spinner } from "@/components/ui/Spinner";

export default function RootPage() {
  const router = useRouter();
  const completed = useOnboardingStore((s) => s.completed);

  useEffect(() => {
    if (completed) {
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [completed, router]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Spinner size="lg" className="text-accent" />
    </div>
  );
}
