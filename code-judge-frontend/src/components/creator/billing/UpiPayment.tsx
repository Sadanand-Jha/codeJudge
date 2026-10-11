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
  Loader2,
  RefreshCw,
  Smartphone,
  Timer,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/helpers";

export const UPI_CONFIG = {
  /** Demo merchant VPA — replace with a real business/merchant UPI ID. */
  MERCHANT_VPA: "yourshop@okhdfcbank",
  MERCHANT_NAME: "ByteClash",
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
}

type Phase = "idle" | "waiting" | "failed" | "expired";

const FOCUS =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-pink-300 focus-visible:ring-offset-2 dark:focus-visible:ring-pink-500/50 dark:focus-visible:ring-offset-transparent";

const INPUT =
  "min-h-[46px] w-full rounded-[10px] border-[1.5px] border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500";

const VPA_RE = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/;

function fmtClock(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function UpiPayment({ total, packName, packCredits, onSuccess, onWaitingChange }: UpiPaymentProps) {
  const note = packCredits !== undefined ? `${packName} - ${packCredits} credits` : packName;
  const amountLabel = `₹${total.toFixed(2)}`;

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

  const statusRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;

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
    setAttempt(makeAttempt());
    setQr({ status: "loading" });
    setSecondsLeft(UPI_CONFIG.QR_TTL_SECONDS);
    setAnnounced("QR valid for 5 minutes.");
    setPhase("idle");
    setFailReason("");
    setCheckingAgain(false);
    onWaitingChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, packName, packCredits]);

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
    if (phaseRef.current !== "idle") return;
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

  const beginWaiting = () => {
    if (phaseRef.current !== "idle") return;
    const orderId = attempt.orderId;
    setPhase("waiting");
    setCheckingAgain(false);
    onWaitingChange?.(true);
    requestAnimationFrame(() => statusRef.current?.focus());
    const controller = new AbortController();
    abortRef.current = controller;
    void pollPaymentStatus(orderId, {
      signal: controller.signal,
      onRetry: () => setCheckingAgain(true),
    }).then((result) => {
      if (controller.signal.aborted) return;
      abortRef.current = null;
      onWaitingChange?.(false);
      if (result.status === "success") {
        // Credits are granted by the parent (server-verified in production).
        onSuccess(orderId);
      } else if (result.status === "failed") {
        setFailReason(result.reason ?? "The payment failed. No amount was charged.");
        setPhase("failed");
      } else {
        setPhase("expired");
      }
    });
  };

  const cancelWaiting = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setCheckingAgain(false);
    onWaitingChange?.(false);
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

  const qrCard = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-white/[0.02]">
      <p className="text-sm font-bold text-slate-900 dark:text-white">Scan to pay</p>
      <p className="mt-1 text-[22px] font-extrabold tabular-nums text-slate-900 dark:text-white">
        Pay {amountLabel}
      </p>
      <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-3 shadow-sm">
        {qr.status === "loading" ? (
          <div className="grid h-[200px] w-[200px] place-items-center" role="status" aria-label="Generating QR code">
            <Loader2 className="h-8 w-8 animate-spin text-pink-600" aria-hidden="true" />
          </div>
        ) : qr.status === "error" || !qr.url ? (
          <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-[13px] font-semibold text-slate-900">
              Could not generate the QR. Try the UPI ID option.
            </p>
            <button
              type="button"
              onClick={regenerate}
              className={cn(
                "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-pink-600 px-4 text-sm font-bold text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-400",
                FOCUS
              )}
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
              className={cn("h-[200px] w-[200px]", qrExpired && "opacity-40 blur-[3px]")}
            />
            {qrExpired && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <p className="text-sm font-extrabold text-slate-900">QR expired</p>
                <button
                  type="button"
                  onClick={regenerate}
                  className={cn(
                    "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-pink-600 px-4 text-sm font-bold text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-400",
                    FOCUS
                  )}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Generate new QR
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {!qrExpired && qr.status !== "error" && (
        <>
          <p className="mt-3 text-[13px] font-semibold text-slate-900 dark:text-white">Scan with any UPI app</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">GPay, PhonePe, Paytm, BHIM and more</p>
          <p className="mt-2 text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
            <span aria-hidden="true">QR valid for {fmtClock(secondsLeft)}</span>
            <span className="sr-only" role="status" aria-live="polite">
              {qrExpired ? "QR code expired. Generate a new QR to continue." : announced}
            </span>
          </p>
        </>
      )}
    </div>
  );

  const vpaCard = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.02]">
      <p className="text-sm font-bold text-slate-900 dark:text-white">Pay with UPI ID</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        We’ll send a collect request to your UPI app.
      </p>
      <label htmlFor="upi-vpa" className="mb-1.5 mt-3 block text-[13px] font-semibold text-slate-900 dark:text-white">
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
          className={cn(INPUT, vpaState === "err" && "border-red-600", FOCUS)}
        />
        <button
          type="button"
          onClick={verifyVpa}
          disabled={waiting}
          className={cn(
            "w-auto min-h-[44px] flex-none cursor-pointer rounded-xl bg-pink-600 px-[18px] text-sm font-bold text-white hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-pink-500 dark:hover:bg-pink-400",
            FOCUS
          )}
        >
          Verify
        </button>
      </div>
      <div
        className={cn(
          "mt-1 min-h-[18px] text-xs",
          vpaState === "err" ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"
        )}
        aria-live="polite"
      >
        {vpaMsg}
      </div>
      {vpaState === "ok" && (
        <button
          type="button"
          onClick={beginWaiting}
          disabled={waiting}
          className={cn(
            "mt-2 inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-xl border-0 bg-pink-600 px-4 text-[15px] font-extrabold text-white hover:bg-pink-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-pink-500 dark:hover:bg-pink-400",
            FOCUS
          )}
        >
          Send payment request of {amountLabel}
        </button>
      )}
    </div>
  );

  if (phase === "waiting") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-label={`Waiting for UPI payment of ${amountLabel}`}
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-white/[0.02]",
          FOCUS
        )}
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400" aria-hidden="true">
          <Loader2 className="h-7 w-7 animate-spin" />
        </span>
        <p className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">Waiting for payment</p>
        <p className="mx-auto mt-1 max-w-xs text-[13px] text-slate-500 dark:text-slate-400">
          Complete the payment in your UPI app. Do not close this page.
        </p>
        <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{amountLabel}</p>
        <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">Order {attempt.orderId}</p>
        {checkingAgain && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
            Checking again…
          </p>
        )}
        <button
          type="button"
          onClick={cancelWaiting}
          className="mt-4 text-[13px] font-bold text-slate-500 underline underline-offset-2 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-pink-500/40 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="alert"
        className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-6 text-center"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-500/10 text-red-600 dark:text-red-300" aria-hidden="true">
          <XCircle className="h-7 w-7" />
        </span>
        <p className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">Payment failed</p>
        <p className="mx-auto mt-1 max-w-xs text-[13px] text-slate-500 dark:text-slate-400">{failReason}</p>
        <button
          type="button"
          onClick={regenerate}
          className={cn(
            "mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-pink-600 px-5 text-sm font-bold text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-400",
            FOCUS
          )}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="alert"
        className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6 text-center"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300" aria-hidden="true">
          <Timer className="h-7 w-7" />
        </span>
        <p className="mt-4 text-base font-extrabold text-slate-900 dark:text-white">Payment timed out</p>
        <p className="mx-auto mt-1 max-w-xs text-[13px] text-slate-500 dark:text-slate-400">
          If money was deducted, it will be refunded in 5 to 7 days.
        </p>
        <button
          type="button"
          onClick={regenerate}
          className={cn(
            "mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-pink-600 px-5 text-sm font-bold text-white hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-400",
            FOCUS
          )}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            window.location.href = attempt.link;
            beginWaiting();
          }}
          className={cn(
            "inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-pink-600 px-4 text-[15px] font-extrabold text-white hover:bg-pink-700 active:scale-[0.99] dark:bg-pink-500 dark:hover:bg-pink-400",
            FOCUS
          )}
        >
          <Smartphone className="h-5 w-5" aria-hidden="true" />
          Pay {amountLabel} with UPI app
        </button>
        <div className="my-3.5 flex items-center gap-2.5 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
          or enter your UPI ID
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
        </div>
        {vpaCard}
        <button
          type="button"
          onClick={() => setShowQrMobile((s) => !s)}
          aria-expanded={showQrMobile}
          className="mx-auto mt-3 block text-xs font-bold text-pink-600 underline underline-offset-2 hover:text-pink-700 focus-visible:ring-2 focus-visible:ring-pink-500/40 dark:text-pink-400"
        >
          {showQrMobile ? "Hide QR code" : "Show QR instead"}
        </button>
        {showQrMobile && <div className="mt-3">{qrCard}</div>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {qrCard}
      {vpaCard}
    </div>
  );
}

export default UpiPayment;
