"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ROUTES: Record<string, string> = {
  "1": "/dashboard",
  "2": "/timeline",
  "3": "/budget",
  "4": "/base-financiere",
  "5": "/analyse",
  "6": "/patrimoine",
};

export function GlobalShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const route = ROUTES[e.key];
      if (!route) return;
      e.preventDefault();
      router.push(route);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return null;
}
