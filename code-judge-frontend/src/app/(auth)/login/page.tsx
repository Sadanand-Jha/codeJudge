"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { login } from "@/services/auth";
import { toast } from "@/lib/toast";
import AuthBackground from "@/components/auth/AuthBackground";
import { AuthBrandMark, AuthThemeControls } from "@/components/auth/AuthThemeChrome";
import { getApiErrorMessage } from "@/lib/apiError";
import type { UserProfile } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/quiz");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res.success && res.data) {
        const { token, user } = res.data as { token?: string; user?: UserProfile };
        // The backend authenticates via an httpOnly cookie; the body carries no
        // token, so store a sentinel to keep the session local.
        if (!user) throw new Error("Login response did not include a user profile");
        setAuth(token || "session", user);
        toast.success("Logged in successfully");
        router.push("/quiz");
      } else {
        toast.error(res.data?.message || "Login failed");
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FFF9F1] px-6 py-20 dark:bg-[#050510]">
      <AuthBackground />
      <AuthThemeControls />
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-7 flex justify-center">
          <AuthBrandMark />
        </div>

        {/* Card */}
        <div className="rounded-[28px] border border-pink-200/80 bg-white/82 p-6 shadow-[0_30px_80px_-42px_rgba(244,114,182,.75)] backdrop-blur-2xl dark:border-violet-300/15 dark:bg-[#0E1323]/88 dark:shadow-[0_30px_90px_-40px_rgba(91,69,196,.8)]">
          <h1 className="text-lg font-bold text-text-primary text-center mb-1">Welcome back</h1>
          <p className="text-xs text-text-secondary text-center mb-6"><span className="dark:hidden">Your colorful quiz party is waiting!</span><span className="hidden dark:inline">Your next space mission is waiting.</span></p>

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-input-bg border border-input-border pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-input-bg border border-input-border pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(244,114,182,.8)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:from-violet-600 dark:via-indigo-500 dark:to-blue-600 dark:shadow-[0_12px_28px_-16px_rgba(124,92,255,.8)]"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-text-muted">
            <Link href="/forgot-password" className="text-accent hover:underline">Forgot password?</Link>
            <span className="mx-1.5">·</span>
            <Link href="/register" className="text-accent hover:underline">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
