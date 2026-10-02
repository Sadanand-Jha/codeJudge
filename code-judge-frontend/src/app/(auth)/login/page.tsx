"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, AtSign, Eye, EyeOff, KeyRound, Lock, Sparkles, UserPlus } from "lucide-react";
import { QuizLoader } from "@/components/quiz/live/StudentQuizShell";
import { useAuthStore } from "@/store/authStore";
import { login } from "@/services/auth";
import { toast } from "@/lib/toast";
import AuthBackground from "@/components/auth/AuthBackground";
import { AuthBottomStrip, AuthBrandMark, AuthShowcasePanel, AuthThemeControls } from "@/components/auth/AuthThemeChrome";
import { getApiErrorMessage } from "@/lib/apiError";
import type { UserProfile } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentUser = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace(currentUser?.role?.toLowerCase() === "teacher" ? "/creator/quizzes" : "/quiz");
    }
  }, [currentUser?.role, hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <QuizLoader />
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      const message = "Please enter your email or username and password.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await login({ identifier: identifier.trim().toLowerCase(), password });
      if (res.success && res.data) {
        const { token, user } = res.data as { token?: string; user?: UserProfile };
        // The backend authenticates via an httpOnly cookie; the body carries no
        // token, so store a sentinel to keep the session local.
        if (!user) throw new Error("Login response did not include a user profile");
        setAuth(token || "session", user);
        toast.success("Logged in successfully");
        router.push(user.role?.toLowerCase() === "teacher" ? "/creator/quizzes" : "/quiz");
      } else {
        const message = res.message || "We couldn't sign you in. Please check your details.";
        setErrorMessage(message);
        toast.error(message);
      }
    } catch (err: unknown) {
      const message = getApiErrorMessage(err, "Unable to sign in right now. Please try again.");
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-x-hidden bg-[#FFF9F1] px-4 py-12 dark:bg-[#050510] sm:px-6 lg:px-8 lg:py-8">
      <AuthBackground />
      <AuthThemeControls />
      <AuthBottomStrip />
      <div className="relative z-10 grid w-full max-w-[1160px] items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.72fr)]">
        <AuthShowcasePanel mode="login" />
      <div className="mx-auto w-full max-w-md">
        {/* Logo */}
        <div className="mb-7 flex justify-center">
          <AuthBrandMark />
        </div>

        {/* Card */}
        <div className="rounded-[30px] border border-pink-200/80 bg-white/84 p-6 shadow-[0_30px_80px_-42px_rgba(244,114,182,.75)] backdrop-blur-2xl dark:border-violet-300/15 dark:bg-[#0E1323]/90 dark:shadow-[0_30px_90px_-40px_rgba(91,69,196,.8)] sm:p-7">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-600 dark:border-violet-300/15 dark:bg-violet-500/10 dark:text-violet-200">
              <Sparkles className="h-3 w-3" /> Intelligent learning, resumed
            </span>
            <h1 className="mt-3 text-xl font-black tracking-tight text-text-primary">Welcome back</h1>
            <p className="mt-1.5 text-xs text-text-secondary">Sign in and pick up exactly where you left off.</p>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label htmlFor="login-identifier" className="block text-[11px] font-medium text-text-secondary mb-2">Email or username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value.toLowerCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  className="w-full rounded-xl bg-input-bg border border-input-border pl-10 pr-3 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
                  placeholder="email@example.com or username"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="block text-[11px] font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-input-bg border border-input-border pl-10 pr-11 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-accent transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:hover:bg-white/5"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-4 text-sm font-bold text-white shadow-[0_16px_32px_-18px_rgba(236,72,153,.9),inset_0_1px_0_rgba(255,255,255,.28)] transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 dark:from-violet-600 dark:via-indigo-500 dark:to-blue-600 dark:shadow-[0_16px_34px_-18px_rgba(124,92,255,.95),inset_0_1px_0_rgba(255,255,255,.2)]"
            >
              {loading && <QuizLoader className="h-4 w-4 text-white" />}
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-input-border/70 pt-5">
            <Link href="/forgot-password" className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input-border bg-input-bg/60 px-3 text-xs font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/[0.06] hover:text-accent active:translate-y-0">
              <KeyRound className="h-3.5 w-3.5 transition-transform group-hover:-rotate-6" /> Reset password
            </Link>
            <Link href="/register" className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input-border bg-input-bg/60 px-3 text-xs font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/[0.06] hover:text-accent active:translate-y-0">
              <UserPlus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" /> Create account
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
