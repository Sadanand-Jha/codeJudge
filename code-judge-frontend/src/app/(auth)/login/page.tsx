"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, AtSign, BrainCircuit, Eye, EyeOff, KeyRound, Lock, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { login } from "@/services/auth";
import { toast } from "@/lib/toast";
import AuthBackground from "@/components/auth/AuthBackground";
import { AuthBrandMark, AuthLoader, AuthThemeControls } from "@/components/auth/AuthThemeChrome";
import { getApiErrorMessage } from "@/lib/apiError";
import type { UserProfile } from "@/store/authStore";

function safeNextPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  // Backslashes are treated as slashes by some browsers, which would turn
  // "/\evil.com" into an external navigation.
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  // Read ?next= once on the client. Only same-origin paths are accepted so
  // this cannot become an open redirect.
  const [nextPath] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : safeNextPath(new URLSearchParams(window.location.search).get("next"))
  );
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
      router.replace(nextPath || (currentUser?.role?.toLowerCase() === "teacher" ? "/creator" : "/quiz"));
    }
  }, [currentUser?.role, hasHydrated, isAuthenticated, nextPath, router]);

  if (!hasHydrated) {
    return (
      <div className="qs-ui flex min-h-screen items-center justify-center">
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
        router.push(nextPath || (user.role?.toLowerCase() === "teacher" ? "/creator" : "/quiz"));
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
    <div className="qs-ui relative flex min-h-dvh items-center justify-center overflow-x-hidden px-4 pb-12 pt-24 sm:px-6 lg:px-8 lg:py-8">
      <AuthBackground />
      <AuthThemeControls />
      {/* Brand — page top-left corner */}
      <div className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
        <AuthBrandMark />
      </div>
      <div className="relative z-10 flex w-full max-w-md justify-center">
      <div className="mx-auto w-full max-w-md">
        {/* Card */}
        <div className="qs-shadow">
        <div className="qs-card p-6 sm:p-7">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--qs-brand)]">
              <BrainCircuit className="h-3 w-3" />
              Your AI learning workspace
            </span>
            <h1 className="qs-display mt-3 text-2xl text-[var(--qs-ink)]">Welcome back</h1>
            <p className="mt-1.5 text-xs text-[var(--qs-muted)]">Your quizzes, progress, and AI workspace are ready.</p>
          </div>

          <form className="space-y-4" onSubmit={submit} autoComplete="off">
            <div>
              <label htmlFor="login-identifier" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--qs-muted)]">Email or username</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
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
                  className="w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-3 pl-10 pr-3 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                  placeholder="email@example.com or username"
                />
              </div>
            </div>
            <div>
              <label htmlFor="login-password" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--qs-muted)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
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
                  className="w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-3 pl-10 pr-11 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-brand)]/10 hover:text-[var(--qs-ink)] focus-visible:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3.5 py-3 text-xs font-semibold leading-relaxed text-[var(--qs-bad)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="qs-btn group min-h-12 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading && <AuthLoader className="h-4 w-4 text-current" />}
              <span>{loading ? "Signing in…" : "Continue to QuizSupport"}</span>
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-1 gap-2.5 border-t-2 border-[var(--qs-line)] pt-5 min-[420px]:grid-cols-2">
            <Link href="/forgot-password" className="b b-full group">
              <KeyRound className="h-3.5 w-3.5 transition-transform group-hover:-rotate-6" /> Reset password
            </Link>
            <Link href="/register" className="b b-full group">
              <UserPlus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" /> Create account
            </Link>
          </div>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
