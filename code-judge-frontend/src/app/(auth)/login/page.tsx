"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, AtSign, Eye, EyeOff, KeyRound, Lock, Plus, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { login } from "@/services/auth";
import { toast } from "@/lib/toast";
import OAuthButtons from "@/components/auth/OAuthButtons";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthLoader } from "@/components/auth/AuthThemeChrome";
import { getApiErrorMessage } from "@/lib/apiError";
import type { UserProfile } from "@/store/authStore";
import { safeNextPath } from "@/lib/safeNext";

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

const INPUT_CLASS =
  "h-[50px] w-full rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] pl-11 pr-4 text-[15px] font-medium text-[var(--qs-ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[#8b86a8] focus:border-[var(--qs-brand)] focus:ring-4 focus:ring-[var(--qs-brand)]/15";

const LABEL_CLASS =
  "mb-2 block text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]";

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
    <AuthShell
      eyebrow="TEACHER WORKSPACE"
      title={
        <>
          Welcome back,
          <br />
          teacher.
        </>
      }
      description="Sign in to pick up your quizzes, question bank and papers right where you left them."
      miniCards={[
        {
          icon: <Plus className="h-5 w-5" strokeWidth={2.4} />,
          title: "New quiz",
          description: "Build one by hand, encrypted as you save.",
        },
        {
          icon: <Lock className="h-[18px] w-[18px]" strokeWidth={2.2} />,
          title: "Encrypted vault",
          description: "Your key never leaves this device.",
          tone: "dark",
        },
      ]}
    >
      <span className="mx-auto flex w-max items-center gap-2 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-3.5 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">
        <Sparkles className="h-3.5 w-3.5" />
        Your AI learning workspace
      </span>
      <h2 className="mb-1 mt-4 text-center text-[30px] font-extrabold tracking-[-0.035em] text-[var(--qs-ink)]">
        Welcome back
      </h2>
      <p className="mb-6 text-center text-sm text-[var(--qs-muted)]">
        Your quizzes, progress, and AI workspace are ready.
      </p>

      <form onSubmit={submit} autoComplete="off">
        <label htmlFor="login-identifier" className={LABEL_CLASS}>
          Email or username
        </label>
        <div className="relative mb-[18px]">
          <AtSign className="pointer-events-none absolute left-[15px] top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--qs-muted)]" />
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
            className={INPUT_CLASS}
            placeholder="email@example.com or username"
          />
        </div>

        <label htmlFor="login-password" className={LABEL_CLASS}>
          Password
        </label>
        <div className="relative mb-[18px]">
          <Lock className="pointer-events-none absolute left-[15px] top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--qs-muted)]" />
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
            className={`${INPUT_CLASS} pr-12`}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[10px] text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-brand)] focus-visible:outline-none"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 flex items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3.5 py-3 text-xs font-semibold leading-relaxed text-[var(--qs-bad)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="b b-pri b-lg b-full group disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading && <AuthLoader className="h-4 w-4 text-current" />}
          <span>{loading ? "Signing in…" : "Continue to QuizSupport"}</span>
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <OAuthButtons nextPath={nextPath} disabled={loading} />

      <div className="my-5 h-0.5 bg-[var(--qs-line)]" />

      <div className="grid gap-2.5 min-[420px]:grid-cols-2">
        <Link href="/forgot-password" className="b b-full group min-h-[46px] text-[14px]">
          <KeyRound className="h-4 w-4 transition-transform group-hover:-rotate-6" /> Reset password
        </Link>
        <Link
          href={
            nextPath
              ? `/register?next=${encodeURIComponent(nextPath)}`
              : "/register"
          }
          className="b b-full group min-h-[46px] text-[14px]"
        >
          <UserPlus className="h-4 w-4 transition-transform group-hover:scale-110" /> Create account
        </Link>
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-[12.5px] leading-relaxed text-[var(--qs-muted)]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--qs-ok)]" />
        Questions are encrypted in your browser before they reach our servers.
      </p>
    </AuthShell>
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
