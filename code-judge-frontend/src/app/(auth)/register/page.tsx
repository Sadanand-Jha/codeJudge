"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import RegistrationForm from "@/components/forms/RegistrationForm";
import { AuthLoader } from "@/components/auth/AuthThemeChrome";
import { safeNextPath } from "@/lib/safeNext";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams]
  );
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace(
        nextPath ||
          (user?.role?.toLowerCase() === "teacher" ? "/creator" : "/quiz")
      );
    }
  }, [hasHydrated, isAuthenticated, nextPath, router, user?.role]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuthLoader />
      </div>
    );
  }

  return <RegistrationForm nextPath={nextPath} />;
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <AuthLoader />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
