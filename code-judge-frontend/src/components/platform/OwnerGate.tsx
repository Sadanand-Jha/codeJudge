"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ownerSendOtp, ownerVerifyOtp, ownerLogout } from "@/services/auth";
import { platformApi } from "@/services/platform";
import { PLATFORM_SESSION_INVALID_EVENT, setPlatformSession, clearPlatformSession } from "@/lib/platformToken";

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
    const handleInvalid = (event: Event) => {
      const status = (event as CustomEvent<{ status?: number }>).detail?.status;
      setGate(status === 403 ? "denied" : "otp");
    };
    window.addEventListener(PLATFORM_SESSION_INVALID_EVENT, handleInvalid);
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
    return () => {
      cancelled = true;
      window.removeEventListener(PLATFORM_SESSION_INVALID_EVENT, handleInvalid);
    };
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
    if (!/^\S+@\S+\.\S+$/.test(v)) {
      setError("Enter a valid owner email address.");
      return;
    }
    setBusy(true);
    setError(null);
    ownerSendOtp({ email: v })
      .then((r) => {
        setStep("code");
        setCode("");
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
      const d = (r.data ?? r) as { user?: { email?: string } };
      // The credential is an HttpOnly cookie; JavaScript stores only the
      // non-sensitive display email, then proves the cookie against the API.
      setPlatformSession(d.user?.email ?? v);
      try {
        await platformApi.session();
      } catch {
        clearPlatformSession();
        setStep("email");
        setCode("");
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
    clearPlatformSession();
    setStep("email");
    setCode("");
    setError(null);
    setInfo(null);
    setBusy(false);
  };

  return (
    <div className="platform-shell qs-ui relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10">
      <div className="relative w-full max-w-[390px]">
      <div className="qs-offset">
      <div className="relative rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6">
        <div className="flex items-center gap-2">
          <img src="/logos/mark.png" alt="QuizSupport" width={32} height={30} className="h-8 w-auto rounded-[9px] border-2 border-[var(--qs-ink)] object-contain" />
          <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-brand)]">QuizSupport / Platform</span>
        </div>
        <h1 className="mt-5 font-extrabold leading-[1.05] tracking-tight text-[var(--qs-ink)]" style={{ fontSize: "clamp(28px,4vw,34px)" }}>Owner sign in</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--qs-muted)]">
          {mode === "denied"
            ? "This platform session is not authorized for owner access. Sign in again with the owner email to continue."
            : mode === "unavailable"
              ? "The authorization service is temporarily unavailable. Retry when the API connection is restored."
            : "Restricted area. Sign in with a one-time code — password login is disabled here."}
        </p>
        <div className="qs-pill sun mt-3">
          PRIVATE · OWNER
        </div>

        {mode === "unavailable" ? (
          <div className="mt-5 space-y-2.5">
            <button
              onClick={() => window.location.reload()}
              className="b w-full"
            >
              Retry authorization
            </button>
            <button onClick={switchAccount} disabled={busy} className="b b-ghost sm w-full">
              Sign in with a different account
            </button>
          </div>
        ) : step === "email" ? (
          <div className="mt-4 space-y-2.5">
            <label className="block text-[14px] font-bold text-[var(--qs-ink)]" htmlFor="owner-email">Owner email</label>
            <input
              id="owner-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="owner@example.com"
              className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-field)] px-3.5 text-[14px] font-medium text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)]"
            />
            {error && <p role="alert" aria-live="polite" className="text-[12px] font-bold text-[var(--qs-bad)]">{error}</p>}
            <button
              onClick={send}
              disabled={busy || !email.trim()}
              className="b b-pri w-full"
            >
              {busy ? "Sending…" : "Send one-time code"}
            </button>
            {mode === "denied" && (
              <button onClick={switchAccount} className="b b-ghost sm w-full">
                Use a different account
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            <label className="block text-[14px] font-bold text-[var(--qs-ink)]" htmlFor="owner-otp">
              6-digit code <span className="font-medium text-[var(--qs-muted)]">sent to {email.trim().toLowerCase()}</span>
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
              className="h-12 w-full rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-field)] px-3 text-center text-[16px] font-bold tracking-[0.4em] text-[var(--qs-ink)] placeholder:text-[var(--qs-muted)]"
            />
            {info && <p role="status" aria-live="polite" className="text-[12px] text-[var(--qs-muted)]">{info}</p>}
            {error && <p role="alert" aria-live="polite" className="text-[12px] font-bold text-[var(--qs-bad)]">{error}</p>}
            <button
              onClick={verify}
              disabled={busy || code.trim().length !== 6}
              className="b b-pri w-full"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <div className="flex items-center justify-between text-[12px]">
              <button
                onClick={send}
                disabled={busy || cooldown > 0}
                className="b b-ghost sm disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
              <button onClick={() => { setStep("email"); setCode(""); setInfo(null); setError(null); }} className="b b-ghost sm">
                Change email
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      <p className="mt-4 text-center text-[12px] font-extrabold uppercase tracking-[0.08em] leading-relaxed text-[var(--qs-muted)]">Owner access only · Passwordless OTP · Server-side authorization</p>
      </div>
    </div>
  );
}
