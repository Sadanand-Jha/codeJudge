"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import RegistrationForm from "@/components/forms/RegistrationForm";
import { AuthLoader } from "@/components/auth/AuthThemeChrome";

export default function RegisterPage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace(user?.role?.toLowerCase() === "teacher" ? "/creator/quizzes" : "/quiz");
    }
  }, [hasHydrated, isAuthenticated, router, user?.role]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <AuthLoader />
      </div>
    );
  }

  return <RegistrationForm />;
}
