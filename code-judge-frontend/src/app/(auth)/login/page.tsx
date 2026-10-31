"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, AtSign, BrainCircuit, Eye, EyeOff, KeyRound, Lock, ShieldCheck, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { login } from "@/services/auth";
import { toast } from "@/lib/toast";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthLoader } from "@/components/auth/AuthThemeChrome";
import { getApiErrorMessage } from "@/lib/apiError";
import type { UserProfile } from "@/store/authStore";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled. You can try again whenever you're ready.",
  provider_error: "The provider couldn't complete sign-in. Please try again.",
  invalid_state: "That sign-in link expired or was already used. Please start again.",
  invalid_provider: "That sign-in provider isn't supported.",
  provider_not_configured: "This sign-in provider isn't available right now.",
  provider_unavailable: "We couldn't reach the sign-in provider. Please try again.",
  token_exchange_failed: "We couldn't complete sign-in with the provider. Please try again.",
  profile_fetch_failed: "We couldn't read your profile from the provider. Please try again.",
  email_unavailable: "The provider didn't share a verified email address for your account.",
  email_not_verified: "Please verify your email with the provider, then try again.",
  account_error: "We couldn't sign you in to your account. Please try again.",
  session_failed: "Sign-in succeeded, but we couldn't start your session. Please try again.",
  server_error: "Something went wrong on our side. Please try again.",
};

const AUTH_PAGE_PATHS = ["/login", "/register", "/forgot-password"];

function safeNextPath(value: string | null): string | null {
  if (!value || value.length > 512 || !value.startsWith("/") || value.startsWith("//")) return null;
  // Backslashes are treated as slashes by some browsers, which would turn
  // "/\evil.com" into an external navigation.
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;

  const path = value.split(/[?#]/, 1)[0];
  if (AUTH_PAGE_PATHS.some((authPath) => path === authPath || path.startsWith(`${authPath}/`))) {
    return null;
  }
  return value;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-origin ?next= paths are accepted, so this cannot become an open
  // redirect. The page is wrapped in Suspense because useSearchParams opts the
  // client subtree out of static prerendering.
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);
  const oauthError = searchParams.get("oauth_error");
  const setAuth = useAuthStore((s) => s.setAuth);
  const currentUser = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    oauthError
      ? OAUTH_ERROR_MESSAGES[oauthError] || "We couldn't complete that sign-in. Please try again."
      : null
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("oauth_error") && !params.has("oauth")) return;
    // Remove the one-time result from the URL so a refresh doesn't repeat the
    // message. Keep ?next= so retrying still returns to the intended page.
    const url = new URL(window.location.href);
    url.searchParams.delete("oauth_error");
    url.searchParams.delete("oauth");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

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
        const { user } = res.data as { user?: UserProfile };
        // The backend authenticates via an httpOnly cookie; the response never
        // carries a session token for the browser to persist.
        if (!user) throw new Error("Login response did not include a user profile");
        setAuth("session", user);
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

          <OAuthButtons nextPath={nextPath} disabled={loading} />

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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="qs-ui flex min-h-screen items-center justify-center">
          <AuthLoader />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
