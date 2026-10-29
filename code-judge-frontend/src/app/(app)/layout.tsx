"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/store/authStore";

const AUTH_REQUIRED_PREFIXES = ["/quiz", "/profile", "/settings"];

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const needsAuth = AUTH_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hasHydrated && needsAuth && !isAuthenticated) {
      const search = typeof window === "undefined" ? "" : window.location.search;
      const nextPath = `${pathname}${search}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [hasHydrated, needsAuth, isAuthenticated, pathname, router]);

  if (!hasHydrated || (needsAuth && !isAuthenticated)) {
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
