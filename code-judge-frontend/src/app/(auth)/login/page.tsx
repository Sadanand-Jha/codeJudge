"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, AtSign, Crown, Eye, EyeOff, KeyRound, Lock, Shield, Sparkles, Swords, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { login } from "@/services/auth";
import { toast } from "@/lib/toast";
import AuthBackground from "@/components/auth/AuthBackground";
import { AuthBrandMark, AuthLoader, AuthThemeControls } from "@/components/auth/AuthThemeChrome";
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
        <AuthLoader />
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
      <div className="pointer-events-none fixed inset-0 z-[1] hidden overflow-hidden lg:block" aria-hidden="true">
        <Image
          src="/images/auth/login_page_img.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2A160D]/10 via-transparent to-[#1D1110]/12 dark:from-[#050510]/38 dark:via-[#080814]/24 dark:to-[#050510]/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#24140E]/18 dark:to-[#050510]/42" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,transparent_0%,rgba(20,12,18,.03)_62%,rgba(20,12,18,.18)_100%)] dark:bg-[radial-gradient(circle_at_65%_45%,transparent_0%,rgba(5,5,16,.08)_62%,rgba(5,5,16,.32)_100%)]" />
      </div>
      <AuthThemeControls fantasyDesktop />
      <div className="relative z-10 flex w-full max-w-md justify-center">
      <div className="mx-auto w-full max-w-md">
        {/* Logo */}
        <div className="mb-7 flex justify-center">
          <AuthBrandMark className="lg:hidden" />
          <div className="hidden items-center gap-3 lg:flex">
            <span className="relative grid h-11 w-11 place-items-center rounded-full border border-amber-300/45 bg-gradient-to-br from-amber-300 via-amber-500 to-orange-800 text-[#241307] shadow-[0_0_28px_rgba(245,158,11,.28),inset_0_1px_0_rgba(255,255,255,.55)]">
              <Shield className="h-5 w-5" fill="currentColor" />
              <Crown className="absolute -top-2 h-3.5 w-3.5 text-amber-300" />
            </span>
            <span className="text-left leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,.8)]">
              <span className="block font-serif text-lg font-black tracking-wide text-amber-50">ByteClash</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.22em] text-amber-300/85">
                <Swords className="h-2.5 w-2.5" /> The Quiz Kingdom
              </span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-[30px] border border-pink-200/80 bg-white/84 p-6 shadow-[0_30px_80px_-42px_rgba(244,114,182,.75)] backdrop-blur-2xl dark:border-violet-300/15 dark:bg-[#0E1323]/90 dark:shadow-[0_30px_90px_-40px_rgba(91,69,196,.8)] sm:p-7 lg:rounded-[26px] lg:border-amber-300/25 lg:bg-[linear-gradient(145deg,rgba(20,18,19,.94),rgba(30,24,24,.9))] lg:shadow-[0_34px_90px_-34px_rgba(0,0,0,.92),0_0_45px_-24px_rgba(245,158,11,.38),inset_0_1px_0_rgba(255,232,183,.12)] lg:backdrop-blur-xl dark:lg:border-amber-300/25 dark:lg:bg-[linear-gradient(145deg,rgba(20,18,19,.94),rgba(30,24,24,.9))]">
          <div className="pointer-events-none absolute inset-x-8 top-0 hidden h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-14 -top-14 hidden h-32 w-32 rounded-full bg-amber-400/[0.07] blur-3xl lg:block" aria-hidden="true" />
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-600 dark:border-violet-300/15 dark:bg-violet-500/10 dark:text-violet-200 lg:border-amber-300/25 lg:bg-amber-300/[0.07] lg:text-amber-200 dark:lg:border-amber-300/25 dark:lg:bg-amber-300/[0.07] dark:lg:text-amber-200">
              <Sparkles className="h-3 w-3 lg:hidden" />
              <Swords className="hidden h-3 w-3 lg:block" />
              <span className="lg:hidden">Intelligent learning, resumed</span>
              <span className="hidden lg:inline">The gates await</span>
            </span>
            <h1 className="mt-3 text-xl font-black tracking-tight text-text-primary lg:font-serif lg:text-2xl lg:text-amber-50">
              <span className="lg:hidden">Welcome back</span>
              <span className="hidden lg:inline">Welcome back, challenger.</span>
            </h1>
            <p className="mt-1.5 text-xs text-text-secondary lg:text-amber-100/55">
              <span className="lg:hidden">Sign in and pick up exactly where you left off.</span>
              <span className="hidden lg:inline">Your next quest—and your classroom—are waiting.</span>
            </p>
          </div>

          <form className="space-y-4" onSubmit={submit} autoComplete="off">
            <div>
              <label htmlFor="login-identifier" className="mb-2 block text-[11px] font-medium text-text-secondary lg:text-amber-100/65">Email or username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted lg:text-amber-200/45" />
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
                  autoComplete="off"
                  name="login-identifier"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="w-full rounded-xl border border-input-border bg-input-bg py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent lg:border-amber-200/10 lg:bg-black/35 lg:text-amber-50 lg:placeholder:text-amber-100/25 lg:focus:border-amber-400/55 lg:focus:ring-2 lg:focus:ring-amber-400/10 dark:lg:border-amber-200/10 dark:lg:bg-black/35"
                  placeholder="email@example.com or username"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="mb-2 block text-[11px] font-medium text-text-secondary lg:text-amber-100/65">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted lg:text-amber-200/45" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="new-password"
                  name="login-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="w-full rounded-xl border border-input-border bg-input-bg py-2.5 pl-10 pr-11 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent lg:border-amber-200/10 lg:bg-black/35 lg:text-amber-50 lg:placeholder:text-amber-100/25 lg:focus:border-amber-400/55 lg:focus:ring-2 lg:focus:ring-amber-400/10 dark:lg:border-amber-200/10 dark:lg:bg-black/35"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:hover:bg-white/5 lg:text-amber-100/40 lg:hover:bg-amber-300/10 lg:hover:text-amber-200 lg:focus-visible:ring-amber-400/40"
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
              className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/30 bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-4 text-sm font-bold text-white shadow-[0_16px_32px_-18px_rgba(236,72,153,.9),inset_0_1px_0_rgba(255,255,255,.28)] transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 dark:from-violet-600 dark:via-indigo-500 dark:to-blue-600 dark:shadow-[0_16px_34px_-18px_rgba(124,92,255,.95),inset_0_1px_0_rgba(255,255,255,.2)] lg:border-amber-200/45 lg:from-[#7C2D12] lg:via-[#D97706] lg:to-[#FBBF24] lg:text-[#251304] lg:shadow-[0_16px_34px_-16px_rgba(217,119,6,.7),inset_0_1px_0_rgba(255,248,220,.5)] dark:lg:from-[#7C2D12] dark:lg:via-[#D97706] dark:lg:to-[#FBBF24] dark:lg:text-[#251304] dark:lg:shadow-[0_16px_34px_-16px_rgba(217,119,6,.7),inset_0_1px_0_rgba(255,248,220,.5)]"
            >
              {loading && <AuthLoader className="h-4 w-4 text-current" />}
              <span className="lg:hidden">{loading ? "Signing in..." : "Sign in"}</span>
              <span className="hidden lg:inline">{loading ? "Opening the gates..." : "Enter the realm"}</span>
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-input-border/70 pt-5 lg:border-amber-200/10">
            <Link href="/forgot-password" className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input-border bg-input-bg/60 px-3 text-xs font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/[0.06] hover:text-accent active:translate-y-0 lg:border-amber-200/10 lg:bg-black/25 lg:text-amber-100/60 lg:hover:border-amber-400/35 lg:hover:bg-amber-300/[0.07] lg:hover:text-amber-200 dark:lg:border-amber-200/10 dark:lg:bg-black/25">
              <KeyRound className="h-3.5 w-3.5 transition-transform group-hover:-rotate-6" /> Reset password
            </Link>
            <Link href="/register" className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input-border bg-input-bg/60 px-3 text-xs font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent/[0.06] hover:text-accent active:translate-y-0 lg:border-amber-200/10 lg:bg-black/25 lg:text-amber-100/60 lg:hover:border-amber-400/35 lg:hover:bg-amber-300/[0.07] lg:hover:text-amber-200 dark:lg:border-amber-200/10 dark:lg:bg-black/25">
              <UserPlus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" /> Create account
            </Link>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
