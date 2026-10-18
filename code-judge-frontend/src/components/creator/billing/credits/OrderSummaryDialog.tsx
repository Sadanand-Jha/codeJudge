"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, BadgeCheck, Info, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { PackOrderSummary } from "@/services/aiCredits";
import { QS_DIALOG_PANEL, QS_ROW, QS_ROW_LABEL, QS_SQ_BTN } from "./styles";

export type PurchasePhase = "summary" | "processing" | "success" | "failed" | "cancelled";

export interface PurchaseReceipt {
  transactionId: string;
  packName: string;
  credits: number;
  newBalance: number;
}

const METHODS = [
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "netbanking", label: "Net Banking" },
] as const;

function PhaseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
      {children}
    </div>
  );
}

export function OrderSummaryDialog({
  summary,
  balance,
  phase,
  phaseError,
  processingNote,
  receipt,
  onClose,
  onPay,
  onBack,
}: {
  summary: PackOrderSummary;
  balance: number;
  phase: PurchasePhase;
  phaseError: string | null;
  processingNote: string;
  receipt: PurchaseReceipt | null;
  onClose: () => void;
  onPay: (method: string) => void;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("upi");
  const busy = phase === "processing";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#1A1240]/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Buy ${summary.pack.name}`}
        className={QS_DIALOG_PANEL}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[26px] font-black tracking-tight">
            {phase === "success" ? "Payment successful" : "Order summary"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className={cn(QS_SQ_BTN, "disabled:opacity-40")}
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </header>

        {phase === "summary" && (
          <>
            <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
              <div>
                <b className="block text-[15px] font-extrabold">{summary.pack.name}</b>
                <small className="text-sm text-[var(--qs-muted)]">{summary.credits} credits</small>
              </div>
              <strong className="text-[24px] font-black tabular-nums">
                ₹{summary.total}
              </strong>
            </div>
            <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
              <span className={QS_ROW_LABEL}>Current balance</span>
              <span className="font-bold tabular-nums">{balance} credits</span>
            </div>
            <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
              <span className="text-sm font-bold">New balance</span>
              <b className="text-[22px] font-black tabular-nums text-[var(--qs-ok)]">
                {balance + summary.credits}
              </b>
            </div>

            <p className="mt-2 mb-3 text-sm font-bold">Pay with</p>
            <div className="mb-[18px] flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={method === m.id}
                  onClick={() => setMethod(m.id)}
                  className={cn(
                    "rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors",
                    method === m.id
                      ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onPay(method)}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-[15px] text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              <Lock className="h-4 w-4" /> Pay ₹{summary.total}
            </button>
            <p className="mt-3.5 text-center text-xs font-medium text-[var(--qs-muted)]">
              Secure payments via UPI, Cards &amp; Net Banking
            </p>
          </>
        )}

        {phase === "processing" && (
          <PhaseShell>
            <Loader2 className="h-8 w-8 animate-spin text-[var(--qs-brand)]" />
            <p className="mt-3 text-sm font-bold">{processingNote}</p>
            <p className="mt-1 text-xs text-[var(--qs-muted)]">Do not close this window.</p>
          </PhaseShell>
        )}

        {phase === "success" && receipt && (
          <PhaseShell>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">
              {receipt.credits} credits added to your balance
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--qs-muted)]">
              Transaction {receipt.transactionId} · Balance {receipt.newBalance}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-[15px] text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              Done
            </button>
          </PhaseShell>
        )}

        {phase === "failed" && (
          <PhaseShell>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--qs-badbg)] text-[var(--qs-bad)]">
              <AlertCircle className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">Payment failed</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--qs-muted)]">{phaseError}</p>
            <div className="mt-5 flex w-full gap-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-3 text-sm font-bold transition-colors hover:border-[var(--qs-brand)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => onPay(method)}
                className="flex-1 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-3 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
              >
                Try again
              </button>
            </div>
          </PhaseShell>
        )}

        {phase === "cancelled" && (
          <PhaseShell>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--qs-line)] text-[var(--qs-muted)]">
              <Info className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-bold">Payment cancelled</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--qs-muted)]">
              No amount was charged. Your order summary is still here if you want to continue.
            </p>
            <div className="mt-5 flex w-full gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-3 text-sm font-bold transition-colors hover:border-[var(--qs-brand)]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-3 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
              >
                Resume
              </button>
            </div>
          </PhaseShell>
        )}

        {phase !== "processing" && phase !== "success" && (
          <p className="mt-4 flex items-center justify-center gap-1.5 border-t-2 border-[var(--qs-line)] pt-3 text-[11px] font-medium text-[var(--qs-muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Credits are added only after backend payment verification
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
