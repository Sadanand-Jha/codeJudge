"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/store/authStore";
import { needsOAuthProfileSetup } from "@/utils/profileCompletion";

const AUTH_REQUIRED_PREFIXES = ["/quiz", "/profile", "/settings"];

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const user = useAuthStore((s) => s.user);

  const needsAuth = AUTH_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
  const needsProfileSetup =
    hasHydrated && isAuthenticated && needsOAuthProfileSetup(user);

  useEffect(() => {
    if (!hasHydrated) return;

    if (needsAuth && !isAuthenticated) {
      const search = typeof window === "undefined" ? "" : window.location.search;
      const nextPath = `${pathname}${search}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (isAuthenticated && needsOAuthProfileSetup(user)) {
      const search = typeof window === "undefined" ? "" : window.location.search;
      const nextPath = `${pathname}${search}`;
      router.replace(`/complete-profile?next=${encodeURIComponent(nextPath)}`);
    }
  }, [hasHydrated, isAuthenticated, needsAuth, pathname, router, user]);

  if (!hasHydrated || (needsAuth && !isAuthenticated) || needsProfileSetup) {
    return <AppLayout>{null}</AppLayout>;
  }

  return (
    <AppLayout>
      <div className={pathname.startsWith("/quiz") ? "student-quiz-theme contents" : "contents"}>
        {children}
      </div>
    </AppLayout>
  );
}
