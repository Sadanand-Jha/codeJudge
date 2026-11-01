"use client";

import { useState } from "react";
import { AuthLoader } from "@/components/auth/AuthThemeChrome";

type OAuthProvider = "google";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}


interface OAuthButtonsProps {
  nextPath: string | null;
  disabled?: boolean;
}

export default function OAuthButtons({ nextPath, disabled = false }: OAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  function start(provider: OAuthProvider) {
    setPending(provider);
    const params = new URLSearchParams();
    if (nextPath) params.set("next", nextPath);
    const query = params.toString();
    window.location.assign(`/api/auth/oauth/${provider}/start${query ? `?${query}` : ""}`);
  }

  const buttonClass =
    "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] hover:bg-[var(--qs-brand)]/5 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qs-brand)]";

  return (
    <div>
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-0.5 flex-1 bg-[var(--qs-line)]" />
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--qs-muted)]">Or continue with</span>
        <span className="h-0.5 flex-1 bg-[var(--qs-line)]" />
      </div>
      <button
        type="button"
        onClick={() => start("google")}
        disabled={disabled || pending !== null}
        aria-label="Continue with Google"
        className={buttonClass}
      >
        {pending === "google" ? <AuthLoader className="h-4 w-4 text-current" /> : <GoogleIcon />}
        <span>{pending === "google" ? "Redirecting…" : "Google"}</span>
      </button>
    </div>
  );
}
