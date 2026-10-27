"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useAICreditsStore } from "@/store/aiCreditsStore";

/**
 * Keeps the signed-in account's credit balance in sync on every route so the
 * navbar, dashboards and billing pages always read the same live value.
 */
export default function CreditsHydrator() {
  const pathname = usePathname();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    void useAICreditsStore.getState().refresh();
  }, [pathname, hasHydrated, isAuthenticated]);

  return null;
}
