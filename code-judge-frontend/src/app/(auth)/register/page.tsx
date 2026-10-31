"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import RegistrationForm from "@/components/forms/RegistrationForm";
import {
  AuthLoader,
  AuthShowcasePanel,
} from "@/components/auth/AuthThemeChrome";
import { AuthShell } from "@/components/auth/AuthShell";
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
      <div className="qs-ui flex min-h-screen items-center justify-center">
        <AuthLoader />
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="START FREE"
      title={
        <>
          Create your
          <br />
          account.
        </>
      }
      description="Start with your email, verify it, then set up your workspace in a few quick steps."
      showcase={<AuthShowcasePanel mode="register" />}
      align="end"
      stretchCard={false}
    >
      <RegistrationForm nextPath={nextPath} embedded />
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="qs-ui flex min-h-screen items-center justify-center">
          <AuthLoader />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
