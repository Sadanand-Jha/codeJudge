"use client";

/* IMPORTANT LIMITATION — read before going live:
   A frontend-generated UPI QR cannot tell the app whether the customer
   actually paid. For production, replace the static QR below with a dynamic
   QR / order created by a payment gateway (Razorpay, Cashfree, PhonePe PG,
   Paytm PG), and confirm payment on the server via webhook before adding
   credits. The merchant VPA must be a business/merchant UPI ID, not a
   personal one. The polling mock inside this file is DEMO ONLY. */

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  AlertCircle,
  RefreshCw,
  Smartphone,
  Timer,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/helpers";

export const UPI_CONFIG = {
  /** Demo merchant VPA — replace with a real business/merchant UPI ID. */
  MERCHANT_VPA: "yourshop@okhdfcbank",
  MERCHANT_NAME: "QuizSupport",
  /** QR + payment attempt lifetime. */
  QR_TTL_SECONDS: 300,
  /** Status poll cadence. */
  POLL_INTERVAL_MS: 3000,
};

export function buildUpiLink({ vpa, name, amount, note, orderId }: {
  vpa: string;
  name: string;
  amount: number;
  note: string;
  orderId: string;
}): string {
  const q = encodeURIComponent;
  return (
    `upi://pay?pa=${q(vpa)}&pn=${q(name)}` +
    `&am=${amount.toFixed(2)}&cu=INR&tn=${q(note)}&tr=${q(orderId)}`
  );
}

export type UpiPaymentStatus = "pending" | "success" | "failed" | "expired";

export interface UpiPollResult {
  status: Exclude<UpiPaymentStatus, "pending">;
  reason?: string;
}

/**
 * Single polling function for a UPI payment attempt.
 * Resolves once the payment reaches a terminal state or the TTL expires.
 * Pass an AbortSignal to stop polling (unmount / cancel) — it never
 * resolves after abort so no credits can be granted from a dead poll.
 */
export function pollPaymentStatus(
  orderId: string,
  opts?: { signal?: AbortSignal; onRetry?: () => void }
): Promise<UpiPollResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (timer !== undefined) clearTimeout(timer);
    };
    opts?.signal?.addEventListener("abort", stop, { once: true });

    const tick = async () => {
      if (opts?.signal?.aborted) return;
      if (Date.now() - started >= UPI_CONFIG.QR_TTL_SECONDS * 1000) {
        return resolve({ status: "expired" });
      }
      try {
        // DEMO ONLY: replace with a real call to your server. The server must
        // confirm payment through the gateway webhook, never from the browser.
        // const res = await fetch(`/api/payments/${encodeURIComponent(orderId)}/status`);
        // if (!res.ok) throw new Error("status check failed");
        // const data = (await res.json()) as { status: UpiPaymentStatus; reason?: string };
        // if (data.status !== "pending") return resolve({ status: data.status, reason: data.reason });
        await new Promise((r) => setTimeout(r, 400)); // DEMO ONLY: simulated latency
        if (Date.now() - started >= 8000) return resolve({ status: "success" }); // DEMO ONLY
      } catch {
        // Network error — keep polling until the timeout, tell the UI to
        // show a small "Checking again..." note.
        opts?.onRetry?.();
      }
      timer = setTimeout(tick, UPI_CONFIG.POLL_INTERVAL_MS);
    };
    timer = setTimeout(tick, UPI_CONFIG.POLL_INTERVAL_MS);
  });
}

export interface UpiPaymentProps {
  /** Final payable total (after discount) — same value as the order summary. */
  total: number;
  packName: string;
  packCredits?: number;
  /** Called with the confirmed orderId. Parent shows success + adds credits. */
  onSuccess: (orderId: string) => void;
  /** Fired when the waiting state starts/ends so the parent can lock tabs. */
  onWaitingChange?: (waiting: boolean) => void;
  /** Start polling as soon as the QR is ready (dynamic-QR behaviour). */
  autoStart?: boolean;
}

type Phase = "idle" | "waiting" | "failed" | "expired";

const UPI_APPS = ["GPay", "PhonePe", "Paytm", "BHIM"];

const FOCUS =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--qs-brand)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--qs-surface)]";

const BRAND_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

const VPA_RE = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/;

function fmtClock(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function inr(n: number): string {
  return `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

export function UpiPayment({ total, packName, packCredits, onSuccess, onWaitingChange, autoStart = false }: UpiPaymentProps) {
  const note = packCredits !== undefined ? `${packName} - ${packCredits} credits` : packName;
  const amountLabel = inr(total);

  const [attempt, setAttempt] = useState(() => makeAttempt());
  const [qr, setQr] = useState<{ status: "loading" | "ready" | "error"; url?: string }>({ status: "loading" });
  const [secondsLeft, setSecondsLeft] = useState(UPI_CONFIG.QR_TTL_SECONDS);
  // QR expiry is derived — no extra state, no cascading renders.
  const qrExpired = secondsLeft <= 0;
  const [announced, setAnnounced] = useState("QR valid for 5 minutes.");
  const secondsRef = useRef(secondsLeft);
  secondsRef.current = secondsLeft;

  const [vpa, setVpa] = useState("");
  const [vpaState, setVpaState] = useState<"idle" | "ok" | "err">("idle");
  const [vpaMsg, setVpaMsg] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [failReason, setFailReason] = useState("");
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [showQrMobile, setShowQrMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const autoPollRef = useRef(autoStart);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onWaitingChangeRef = useRef(onWaitingChange);
  onWaitingChangeRef.current = onWaitingChange;

  function makeAttempt() {
    const orderId = `AIC${Date.now()}`;
    return {
      orderId,
      link: buildUpiLink({
        vpa: UPI_CONFIG.MERCHANT_VPA,
        name: UPI_CONFIG.MERCHANT_NAME,
        amount: total,
        note,
        orderId,
      }),
    };
  }

  const regenerate = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    autoPollRef.current = autoStart;
    setAttempt(makeAttempt());
    setQr({ status: "loading" });
    setSecondsLeft(UPI_CONFIG.QR_TTL_SECONDS);
    setAnnounced("QR valid for 5 minutes.");
    setPhase("idle");
    setFailReason("");
    setCheckingAgain(false);
    onWaitingChangeRef.current?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, packName, packCredits, autoStart]);

  // Note: the parent remounts this component (key = pack + total) whenever
  // the pack or coupon changes, so the initial attempt below is always fresh.
  // Render the QR off the deep link (client-side only).
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(attempt.link, {
      errorCorrectionLevel: "M",
      width: 480,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQr({ status: "ready", url });
      })
      .catch(() => {
        if (!cancelled) setQr({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // QR countdown — ticks down, expiry is derived from secondsLeft.
  useEffect(() => {
    if (phaseRef.current !== "idle" && phaseRef.current !== "waiting") return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Polite countdown announcements — at most every 30s, plus at expiry.
  useEffect(() => {
    const t = setInterval(() => {
      const s = secondsRef.current;
      if (s <= 0) {
        setAnnounced("QR code expired. Generate a new QR to continue.");
      } else if (phaseRef.current === "idle") {
        setAnnounced(`QR valid for about ${Math.max(1, Math.ceil(s / 60))} minutes.`);
      }
    }, 30000);
    return () => clearInterval(t);
  }, [attempt.orderId]);

  // Mobile detection: coarse pointer + small viewport, with UA fallback.
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse) and (max-width: 767px)");
    const uaMobile = /Android|webOS|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent);
    const update = () => setIsMobile(mq.matches || uaMobile);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Warn before leaving mid-payment; abort polling on unmount.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (phaseRef.current === "waiting") e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      abortRef.current?.abort();
    };
  }, []);

  const beginWaiting = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    const orderId = attempt.orderId;
    setPhase("waiting");
    setCheckingAgain(false);
    onWaitingChangeRef.current?.(true);
    const controller = new AbortController();
    abortRef.current = controller;
    void pollPaymentStatus(orderId, {
      signal: controller.signal,
      onRetry: () => setCheckingAgain(true),
    }).then((result) => {
      if (controller.signal.aborted) return;
      abortRef.current = null;
      onWaitingChangeRef.current?.(false);
      if (result.status === "success") {
        // Credits are granted by the parent (server-verified in production).
        onSuccessRef.current(orderId);
      } else if (result.status === "failed") {
        setFailReason(result.reason ?? "The payment failed. No amount was charged.");
        setPhase("failed");
      } else {
        setPhase("expired");
      }
    });
  }, [attempt.orderId]);

  // Dynamic-QR behaviour: watch for the payment as soon as the QR is ready.
  useEffect(() => {
    if (!autoStart) return;
    if (qr.status !== "ready") return;
    if (phaseRef.current !== "idle") return;
    if (!autoPollRef.current) return;
    const t = setTimeout(() => beginWaiting(), 500);
    return () => clearTimeout(t);
  }, [autoStart, qr.status, beginWaiting]);

  const cancelWaiting = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    autoPollRef.current = false;
    setPhase("idle");
    setCheckingAgain(false);
    onWaitingChangeRef.current?.(false);
  };

  const verifyVpa = () => {
    const ok = VPA_RE.test(vpa.trim());
    setVpaState(ok ? "ok" : "err");
    setVpaMsg(
      ok
        ? "UPI ID verified. Send the payment request when ready."
        : "UPI ID is not valid. Format: name@bank"
    );
    return ok;
  };

  const waiting = phase === "waiting";

  const qrFrame = (
    <div className="relative rounded-[20px] border-2 border-[var(--qs-ink)] bg-white p-2.5 shadow-[4px_4px_0_var(--qs-sun)]">
      <span aria-hidden="true" className="pointer-events-none absolute -left-[3px] -top-[3px] h-5 w-5 rounded-tl-[12px] border-l-4 border-t-4 border-[var(--qs-brand)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-[3px] -top-[3px] h-5 w-5 rounded-tr-[12px] border-r-4 border-t-4 border-[var(--qs-brand)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-[3px] -left-[3px] h-5 w-5 rounded-bl-[12px] border-b-4 border-l-4 border-[var(--qs-brand)]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-[3px] -right-[3px] h-5 w-5 rounded-br-[12px] border-b-4 border-r-4 border-[var(--qs-brand)]" />

      {qr.status === "loading" ? (
        <div
          className="grid h-[200px] w-[200px] place-items-center rounded-[12px] bg-[var(--qs-bg)]"
          role="status"
          aria-label="Generating QR code"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-[var(--qs-muted)]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Generating QR…
          </span>
        </div>
      ) : qr.status === "error" || !qr.url ? (
        <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-3 rounded-[12px] bg-[var(--qs-badbg)] px-5 text-center">
          <AlertCircle className="h-6 w-6 text-[var(--qs-bad)]" aria-hidden="true" />
          <p className="text-[13px] font-bold leading-5 text-[var(--qs-bad)]">
            Could not generate the QR. Try the UPI ID option or retry.
          </p>
          <button
            type="button"
            onClick={regenerate}
            className={cn(BRAND_BTN, "px-4 py-2 text-sm", FOCUS)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* data-URL QR: next/image cannot optimize it, plain img is correct */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr.url}
            alt=""
            role="img"
            aria-label={`UPI payment QR code for ${amountLabel}`}
            width={200}
            height={200}
            className={cn("h-[200px] w-[200px]", qrExpired && "opacity-30 blur-[3px]")}
          />
          {qrExpired && !waiting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <p className="text-sm font-extrabold text-[var(--qs-ink)]">QR expired</p>
              <button
                type="button"
                onClick={regenerate}
                className={cn(BRAND_BTN, "px-4 py-2 text-sm", FOCUS)}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Generate new QR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const qrCard = (
    <section className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
          Scan &amp; pay
        </p>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-extrabold tabular-nums",
              qrExpired
                ? "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
                : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-ink)]"
            )}
          >
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            {fmtClock(secondsLeft)}
          </span>
          {!waiting && qr.status === "ready" && (
            <button
              type="button"
              onClick={regenerate}
              aria-label="Generate a new QR code"
              className={cn(
                "grid h-[26px] w-[26px] place-items-center rounded-full border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]",
                FOCUS
              )}
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center">{qrFrame}</div>

      <p className="mt-4 text-center text-[40px] font-black leading-none tracking-tight tabular-nums">
        {amountLabel}
      </p>
      <p className="mt-2 text-center text-sm font-bold">
        {packName}
        {packCredits !== undefined && (
          <span className="font-medium text-[var(--qs-muted)]"> · {packCredits} credits</span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {UPI_APPS.map((app) => (
          <span
            key={app}
            className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[11px] font-bold"
          >
            {app}
          </span>
        ))}
      </div>

      <p className="mt-3.5 text-center text-xs leading-5 text-[var(--qs-muted)]">
        Pay to {UPI_CONFIG.MERCHANT_NAME} · {UPI_CONFIG.MERCHANT_VPA}
        <br />
        Credits land in your balance the moment the payment succeeds.
      </p>

      {qr.status !== "error" && (
        <p className="sr-only" role="status" aria-live="polite">
          {qrExpired ? "QR code expired. Generate a new QR to continue." : announced}
        </p>
      )}
    </section>
  );

  const vpaCard = (
    <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <h3 className="text-base font-extrabold">Pay with UPI ID</h3>
      <p className="mt-0.5 text-sm text-[var(--qs-muted)]">
        We&rsquo;ll send a collect request to your UPI app.
      </p>
      <label
        htmlFor="upi-vpa"
        className="mt-4 mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]"
      >
        UPI ID
      </label>
      <div className="flex gap-2">
        <input
          id="upi-vpa"
          value={vpa}
          onChange={(e) => {
            setVpa(e.target.value);
            setVpaState("idle");
            setVpaMsg("");
          }}
          placeholder="name@okhdfcbank"
          autoComplete="off"
          inputMode="email"
          autoCapitalize="off"
          disabled={waiting}
          className={cn(
            "min-h-[46px] w-full min-w-0 rounded-[12px] border-2 bg-[var(--qs-surface)] px-3.5 text-[15px] font-semibold placeholder:font-medium placeholder:text-[var(--qs-muted)]/70 disabled:opacity-60",
            vpaState === "err"
              ? "border-[var(--qs-bad)]"
              : "border-[var(--qs-line)] focus:border-[var(--qs-brand)]",
            FOCUS
          )}
        />
        <button
          type="button"
          onClick={verifyVpa}
          disabled={waiting}
          className={cn(
            "min-h-[46px] flex-none rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 text-sm font-extrabold transition-colors hover:bg-[var(--qs-ink)] hover:text-[var(--qs-bg)] disabled:cursor-not-allowed disabled:opacity-50",
            FOCUS
          )}
        >
          Verify
        </button>
      </div>
      <p
        className={cn(
          "mt-2 min-h-[18px] text-xs font-semibold",
          vpaState === "err"
            ? "text-[var(--qs-bad)]"
            : vpaState === "ok"
              ? "text-[var(--qs-ok)]"
              : "text-[var(--qs-muted)]"
        )}
        aria-live="polite"
      >
        {vpaMsg}
      </p>
      {vpaState === "ok" && (
        <button
          type="button"
          onClick={beginWaiting}
          disabled={waiting}
          className={cn(BRAND_BTN, "min-h-[48px] w-full", FOCUS)}
        >
          Send payment request · {amountLabel}
        </button>
      )}
    </section>
  );

  const waitingStrip = (
    <div
      role="status"
      aria-label={`Waiting for UPI payment of ${amountLabel}`}
      className="flex items-center gap-3 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3"
    >
      <span className="relative grid h-9 w-9 flex-none place-items-center" aria-hidden="true">
        <span className="absolute h-9 w-9 animate-ping rounded-full bg-[var(--qs-brand)]/20 motion-reduce:animate-none" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-brand)]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">Waiting for payment confirmation…</p>
        <p className="truncate text-xs text-[var(--qs-muted)]">
          Order {attempt.orderId} · approve the request in your UPI app
          {checkingAgain ? " · checking again…" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={cancelWaiting}
        className={cn(
          "flex-none rounded-full px-2 py-1 text-xs font-extrabold text-[var(--qs-muted)] underline underline-offset-2 transition-colors hover:text-[var(--qs-ink)]",
          FOCUS
        )}
      >
        Cancel
      </button>
    </div>
  );

  if (phase === "failed") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-6 py-8 text-center shadow-[6px_6px_0_var(--qs-sun)]"
      >
        <span
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
          aria-hidden="true"
        >
          <XCircle className="h-7 w-7" />
        </span>
        <p className="mt-4 text-lg font-extrabold">Payment failed</p>
        <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-[var(--qs-muted)]">{failReason}</p>
        <button type="button" onClick={regenerate} className={cn(BRAND_BTN, "mt-5 px-5 py-2.5 text-sm", FOCUS)}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-6 py-8 text-center shadow-[6px_6px_0_var(--qs-sun)]"
      >
        <span
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-[#f0c94a] bg-[#fff3d6] text-[#a85d00]"
          aria-hidden="true"
        >
          <Timer className="h-7 w-7" />
        </span>
        <p className="mt-4 text-lg font-extrabold">Payment window timed out</p>
        <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-[var(--qs-muted)]">
          No amount was charged. If money was deducted, it will be refunded in 5 to 7 days.
        </p>
        <button type="button" onClick={regenerate} className={cn(BRAND_BTN, "mt-5 px-5 py-2.5 text-sm", FOCUS)}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          disabled={waiting}
          onClick={() => {
            window.location.href = attempt.link;
            beginWaiting();
          }}
          className={cn(BRAND_BTN, "min-h-[52px] w-full text-[15px]", FOCUS)}
        >
          <Smartphone className="h-5 w-5" aria-hidden="true" />
          Pay {amountLabel} with UPI app
        </button>
        <div className="flex items-center gap-3 text-xs font-bold text-[var(--qs-muted)]">
          <span aria-hidden="true" className="h-0 flex-1 border-t-2 border-dashed border-[var(--qs-line)]" />
          or enter your UPI ID
          <span aria-hidden="true" className="h-0 flex-1 border-t-2 border-dashed border-[var(--qs-line)]" />
        </div>
        {vpaCard}
        {waiting && waitingStrip}
        {!waiting && (
          <button
            type="button"
            onClick={() => setShowQrMobile((s) => !s)}
            aria-expanded={showQrMobile}
            className={cn(
              "mx-auto block rounded-full px-2 py-1 text-xs font-extrabold text-[var(--qs-brand)] underline underline-offset-2",
              FOCUS
            )}
          >
            {showQrMobile ? "Hide QR code" : "Show QR instead"}
          </button>
        )}
        {showQrMobile && !waiting && qrCard}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {qrCard}
      {vpaCard}
      {waiting && waitingStrip}
    </div>
  );
}

export default UpiPayment;
