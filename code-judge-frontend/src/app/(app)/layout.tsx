"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/store/authStore";

const AUTH_REQUIRED_PREFIXES = ["/quiz"];

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const needsAuth = AUTH_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hasHydrated && needsAuth && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, needsAuth, isAuthenticated, router]);

  if (!hasHydrated || (needsAuth && !isAuthenticated)) {
    return <AppLayout>{null}</AppLayout>;
  }

  return <AppLayout>{children}</AppLayout>;
}
