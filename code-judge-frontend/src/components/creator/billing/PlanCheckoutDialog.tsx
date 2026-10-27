"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  CalendarClock,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { formatTrialEnd } from "@/hooks/useMySubscription";
import { formatPricingAmount, type PricingPlan } from "@/services/pricing";
import type { PurchasePhase } from "./credits/OrderSummaryDialog";
import { QS_DIALOG_PANEL, QS_ROW, QS_ROW_LABEL, QS_SQ_BTN } from "./credits/styles";

export interface PlanPurchaseReceipt {
  transactionId: string;
  planName: string;
  credits: number;
  newBalance: number;
  expiresAt: string | null;
}

function PhaseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
      {children}
    </div>
  );
}

export function PlanCheckoutDialog({
  plan,
  balance,
  phase,
  phaseError,
  processingNote,
  receipt,
  onClose,
  onPay,
  onBack,
}: {
  plan: PricingPlan;
  balance: number;
  phase: PurchasePhase;
  phaseError: string | null;
  processingNote: string;
  receipt: PlanPurchaseReceipt | null;
  onClose: () => void;
  onPay: () => void;
  onBack: () => void;
}) {
  const busy = phase === "processing";
  const price = formatPricingAmount(plan.price, plan.currency);
  const validTill = receipt ? formatTrialEnd(receipt.expiresAt) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[70] flex overflow-y-auto bg-[#1A1240]/60 p-4 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Upgrade to ${plan.name}`}
        className={cn(QS_DIALOG_PANEL, "m-auto")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[26px] font-black tracking-tight">
            {phase === "success" ? "Plan activated" : "Confirm plan"}
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
                <b className="block text-[15px] font-extrabold">{plan.name}</b>
                <small className="text-sm text-[var(--qs-muted)]">Monthly plan</small>
              </div>
              <strong className="text-[24px] font-black tabular-nums">{price}</strong>
            </div>
            <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--qs-muted)]">
                <Sparkles className="h-4 w-4" />
                Monthly credits
              </span>
              <span className="font-bold tabular-nums">{plan.credits.toLocaleString("en-IN")}</span>
            </div>
            <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
              <span className={QS_ROW_LABEL}>Current balance</span>
              <span className="font-bold tabular-nums">{balance.toLocaleString("en-IN")} credits</span>
            </div>
            <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
              <span className="text-sm font-bold">Balance after activation</span>
              <b className="text-[22px] font-black tabular-nums text-[var(--qs-ok)]">
                {(balance + plan.credits).toLocaleString("en-IN")}
              </b>
            </div>

            <p className="mt-2 mb-3 flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2.5 text-xs font-semibold text-[var(--qs-muted)]">
              <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
              Your plan activates immediately and stays active for its billing period.
            </p>

            <button
              type="button"
              onClick={onPay}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-[15px] text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
            >
              <Lock className="h-4 w-4" /> Pay {price}
            </button>
            <p className="mt-3.5 text-center text-xs font-medium text-[var(--qs-muted)]">
              Secure payments via Razorpay
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
            <p className="mt-3 text-sm font-bold">{receipt.planName} is now active</p>
            <p className="mt-1 text-xs text-[var(--qs-muted)]">
              {receipt.credits.toLocaleString("en-IN")} credits added
              {validTill ? ` · valid till ${validTill}` : ""}
            </p>
            <p className="mt-1 text-xs tabular-nums text-[var(--qs-muted)]">
              Transaction {receipt.transactionId} · Balance {receipt.newBalance.toLocaleString("en-IN")}
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
                onClick={onPay}
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
              No amount was charged. You can resume whenever you are ready.
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
            Plans and credits are activated only after backend payment verification
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
