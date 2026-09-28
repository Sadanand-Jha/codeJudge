"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { logout as logoutSession, ownerSendOtp, ownerVerifyOtp, ownerLogout } from "@/services/auth";
import { platformApi } from "@/services/platform";
import { getPlatformToken, setPlatformSession, clearPlatformSession } from "@/lib/platformToken";
import ThemeToggle from "@/components/ui/ThemeToggle";

export type GateState = "checking" | "otp" | "denied" | "unavailable" | "open";

/**
 * Single entry point for the private /platform control center.
 * - Only role_id = 2 (owner/admin) accounts may pass.
 * - Every sign-in here is OTP-based and mints a DEDICATED platform token,
 *   kept fully separate from the regular user session (which is never read,
 *   written, or sent by this page). Password login cannot open this gate.
 */
export function usePlatformGate(): { gate: GateState; setGate: (g: GateState) => void } {
  const [gate, setGate] = useState<GateState>("checking");

  useEffect(() => {
    let cancelled = false;
    if (!getPlatformToken()) {
      queueMicrotask(() => { if (!cancelled) setGate("otp"); });
      return () => { cancelled = true; };
    }
    platformApi
      .session()
      .then(() => { if (!cancelled) setGate("open"); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          clearPlatformSession();
          setGate("otp");
        } else if (status === 403) {
          setGate("denied");
        } else {
          setGate("unavailable");
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { gate, setGate };
}

function errMsg(e: unknown): string {
  const r = (e as { response?: { data?: { message?: string }; status?: number } })?.response;
  if (r?.data?.message) return r.data.message;
  if (r?.status === 429) return "Too many requests. Please wait before retrying.";
  return "Something went wrong. Please try again.";
}

export function OwnerGate({ mode, onOpen }: { mode: "otp" | "denied" | "unavailable"; onOpen: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = () => {
    const v = email.trim().toLowerCase();
    if (!v) return;
    setBusy(true);
    setError(null);
    ownerSendOtp({ email: v })
      .then((r) => {
        setStep("code");
        setInfo(r.message || "If an owner account exists for this email, an OTP has been sent.");
        setCooldown(60);
      })
      .catch((e: unknown) => setError(errMsg(e)))
      .finally(() => setBusy(false));
  };

  const verify = async () => {
    const v = email.trim().toLowerCase();
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await ownerVerifyOtp({ email: v, otp: code.trim() });
      const d = (r.data ?? r) as { user?: { email?: string }; platform_token?: string };
      const platformToken = d.platform_token;
      if (!platformToken) {
        setError("Login succeeded but no platform session was returned. Please try again.");
        return;
      }
      // Persist the dedicated platform token (isolated from regular auth),
      // then prove it against the server before opening the gate.
      setPlatformSession(platformToken, d.user?.email ?? v);
      try {
        await platformApi.session();
      } catch {
        clearPlatformSession();
        setError("Platform authorization failed for this session. Please try again.");
        return;
      }
      onOpen();
    } catch (e: unknown) {
      clearPlatformSession();
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const switchAccount = async () => {
    setBusy(true);
    try {
      await ownerLogout();
    } catch {
      // Clear local credentials even if the server session already expired.
    }
    try {
      // Also end any regular user session so no credential lingers.
      await logoutSession();
    } catch {
      // ignore
    }
    clearPlatformSession();
    setStep("email");
    setCode("");
    setError(null);
    setInfo(null);
    setBusy(false);
  };

  return (
    <div className="platform-shell pf-grid relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-10 text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(236,72,153,.08),transparent_36%)]" aria-hidden="true" />
      <ThemeToggle className="absolute right-4 top-4 z-10 md:right-6 md:top-6" />
      <div className="relative w-full max-w-[390px]">
      <div className="pf-card rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_24px_80px_rgba(0,0,0,.35)]">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] border border-[var(--border)] bg-[var(--platform-soft)]"><ShieldCheck size={15} className="text-[#EC4899]" /></span>
          <span className="text-[11px] font-semibold tracking-widest text-[var(--text-secondary)]">CODEJUDGE / PLATFORM</span>
        </div>
        <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">Owner sign in</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {mode === "denied"
            ? "This platform session is not authorized for owner access. Sign in again with the owner email to continue."
            : mode === "unavailable"
              ? "The authorization service is temporarily unavailable. Retry when the API connection is restored."
            : "Restricted area. Sign in with a one-time code — password login is disabled here."}
        </p>
        <div className="mt-3 inline-block rounded border border-[var(--danger)]/25 bg-[var(--danger)]/8 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.15em] text-[var(--danger)]">
          PRIVATE · OWNER
        </div>

        {mode === "unavailable" ? (
          <div className="mt-5 space-y-2.5">
            <button
              onClick={() => window.location.reload()}
              className="pf-focus h-10 w-full rounded-[9px] border border-[var(--border)] bg-[var(--platform-soft)] px-3 text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--card-hover)]"
            >
              Retry authorization
            </button>
            <button onClick={switchAccount} disabled={busy} className="w-full py-1 text-center text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50">
              Sign in with a different account
            </button>
          </div>
        ) : step === "email" ? (
          <div className="mt-4 space-y-2.5">
            <label className="block text-[12px] text-[var(--text-secondary)]" htmlFor="owner-email">Owner email</label>
            <input
              id="owner-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="owner@example.com"
              className="pf-focus h-10 w-full rounded-[9px] border border-[var(--border)] bg-[var(--platform-input)] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
            <button
              onClick={send}
              disabled={busy || !email.trim()}
              className="pf-focus h-10 w-full rounded-[9px] bg-[#EC4899] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#DB2777] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Sending…" : "Send one-time code"}
            </button>
            {mode === "denied" && (
              <button onClick={switchAccount} className="w-full py-1 text-center text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Use a different account
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            <label className="block text-[12px] text-[var(--text-secondary)]" htmlFor="owner-otp">
              6-digit code <span className="text-[var(--text-muted)]">sent to {email.trim().toLowerCase()}</span>
            </label>
            <input
              id="owner-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
              placeholder="••••••"
              className="pf-focus h-11 w-full rounded-[9px] border border-[var(--border)] bg-[var(--platform-input)] px-3 text-center text-[16px] tracking-[0.4em] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            {info && <p className="text-[12px] text-[var(--text-secondary)]">{info}</p>}
            {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
            <button
              onClick={verify}
              disabled={busy || code.trim().length !== 6}
              className="pf-focus h-10 w-full rounded-[9px] bg-[#EC4899] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#DB2777] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <div className="flex items-center justify-between text-[12px]">
              <button
                onClick={send}
                disabled={busy || cooldown > 0}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button onClick={() => { setStep("email"); setError(null); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Change email
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--text-muted)]">Owner access only · Passwordless OTP authentication · Server-side authorization</p>
      </div>
    </div>
  );
}
