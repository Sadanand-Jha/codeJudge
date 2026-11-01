"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  FileText,
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
import { consumePlanBundleIntent } from "@/lib/checkoutIntent";
import {
  getCheckoutSuggestion,
  type PlanBundleSuggestion,
} from "@/services/billing";
import { trackCheckoutEvent } from "@/services/analytics";
import type { PurchasePhase } from "./credits/OrderSummaryDialog";
import { QS_DIALOG_PANEL, QS_ROW, QS_SQ_BTN } from "./credits/styles";

function formatCreditRate(paise: number, currency: string): string {
  const amount = paise / 100;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export interface PlanPurchaseReceipt {
  transactionId: string;
  orderId: string;
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
  onViewInvoice,
}: {
  plan: PricingPlan;
  balance: number;
  phase: PurchasePhase;
  phaseError: string | null;
  processingNote: string;
  receipt: PlanPurchaseReceipt | null;
  onClose: () => void;
  onPay: (selection: { mode: "plan" | "bundle"; bundleId?: number }) => void;
  onBack: () => void;
  onViewInvoice?: (orderId: string) => void;
}) {
  const busy = phase === "processing";
  const [suggestion, setSuggestion] = useState<PlanBundleSuggestion | null>(null);
  const [selection, setSelection] = useState<"plan" | "bundle">("plan");

  useEffect(() => {
    let active = true;
    consumePlanBundleIntent(plan.slug);
    getCheckoutSuggestion({ planSlug: plan.slug })
      .then((response) => {
        if (!active || response.suggestion?.kind !== "plan_bundle") return;
        setSuggestion(response.suggestion);
        trackCheckoutEvent({
          event: "suggestion_shown",
          suggestionType: response.suggestion.suggestionType,
          sourceProductId: response.suggestion.sourceProductId,
          productId: response.suggestion.productId,
          planCode: response.planCode ?? plan.slug,
        });
      })
      .catch(() => {
        // The checkout still works without a suggestion.
      });
    return () => {
      active = false;
    };
  }, [plan.slug]);

  const activeBundle = selection === "bundle" ? suggestion : null;
  const validTill = receipt ? formatTrialEnd(receipt.expiresAt) : null;
  const planCredits = Math.max(0, plan.credits);
  const bundleCreditsAfter = suggestion
    ? balance + suggestion.credits
    : balance + planCredits;
  const bundleCreditMultiple =
    suggestion && planCredits > 0 ? suggestion.credits / planCredits : 0;
  const planFillPercent =
    suggestion && suggestion.credits > 0
      ? Math.max(
          8,
          Math.min(100, Math.round((planCredits / suggestion.credits) * 100))
        )
      : 100;
  const bundleExtraRupees = suggestion
    ? Math.max(0, suggestion.amountPaise - plan.price * 100) / 100
    : 0;
  const bundleRegularRatePaise =
    suggestion && suggestion.credits > 0
      ? suggestion.compareAtPaise / suggestion.credits
      : 0;

  const choosePlan = () => {
    setSelection("plan");
    if (suggestion) {
      trackCheckoutEvent({
        event: "suggestion_declined",
        suggestionType: suggestion.suggestionType,
        sourceProductId: suggestion.sourceProductId,
        productId: suggestion.productId,
        planCode: plan.slug,
      });
    }
    onPay({ mode: "plan" });
  };

  const chooseBundle = () => {
    if (!suggestion) return;
    setSelection("bundle");
    trackCheckoutEvent({
      event: "suggestion_accepted",
      suggestionType: suggestion.suggestionType,
      sourceProductId: suggestion.sourceProductId,
      productId: suggestion.productId,
      planCode: plan.slug,
    });
    onPay({ mode: "bundle", bundleId: suggestion.bundleId });
  };

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
        style={
          suggestion && phase === "summary" ? { maxWidth: 780 } : undefined
        }
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between gap-3">
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
            <div className="mt-3 flex items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-2.5 text-sm">
              <span className="font-semibold text-[var(--qs-muted)]">Current balance</span>
              <strong className="text-base font-extrabold tabular-nums">
                {balance.toLocaleString("en-IN")} credits
              </strong>
            </div>

            {suggestion ? (
              <>
                <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1.18fr] sm:items-stretch">
                  <article className="flex flex-col rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[20px] font-extrabold leading-tight tracking-[-0.015em]">
                        {plan.name}
                      </h3>
                      <span className="whitespace-nowrap rounded-full bg-[var(--qs-bg)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--qs-muted)]">
                        Monthly
                      </span>
                    </div>
                    {(plan.description ?? plan.tagline) && (
                      <p className="mt-1.5 text-[13.5px] font-medium leading-[1.4] text-[var(--qs-muted)]">
                        {plan.description ?? plan.tagline}
                      </p>
                    )}
                    {plan.offer && (
                      <p className="mt-3 text-[12px] font-bold text-[var(--qs-brand)]">
                        {plan.offer}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span className="text-[38px] font-extrabold leading-none tracking-[-0.03em]">
                        {formatPricingAmount(plan.price, plan.currency)}
                      </span>
                      <span className="text-[13px] font-bold text-[var(--qs-muted)]">
                        / month
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between gap-2 text-[12px] font-bold text-[var(--qs-brand)]">
                        <span>Balance after</span>
                        <span className="tabular-nums">
                          {(balance + planCredits).toLocaleString("en-IN")} credits
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--qs-line)]">
                        <div
                          className="h-full rounded-full bg-[var(--qs-brand)]"
                          style={{ width: `${planFillPercent}%` }}
                        />
                      </div>
                    </div>
                    <hr className="my-3 border-0 border-t-2 border-dashed border-[var(--qs-line)]" />
                    <ul className="grid gap-2 text-[13.5px] font-semibold">
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                          <Check className="h-3 w-3" strokeWidth={2.6} />
                        </span>
                        {planCredits.toLocaleString("en-IN")} AI credits every month
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                          <Check className="h-3 w-3" strokeWidth={2.6} />
                        </span>
                        Activates immediately
                      </li>
                    </ul>
                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={choosePlan}
                        className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 py-3 text-[15px] font-extrabold text-[var(--qs-ink)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-0.5 active:shadow-none"
                      >
                        Continue with monthly
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>

                  <article className="relative order-first flex flex-col rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-4 text-[var(--qs-on-brand)] shadow-[6px_6px_0_var(--qs-sun)] sm:order-none">
                    <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--qs-ink)] px-3.5 py-[5px] text-[12px] font-extrabold text-[var(--qs-sun)]">
                      <Sparkles className="h-3 w-3" />
                      {suggestion.badge}
                    </span>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-[20px] font-extrabold leading-tight tracking-[-0.015em]">
                        {suggestion.title}
                      </h3>
                      <span className="whitespace-nowrap rounded-full bg-[var(--qs-sun)] px-2.5 py-1 text-[11px] font-extrabold text-[#1A1240]">
                        Save {formatPricingAmount(suggestion.savingsPaise / 100, plan.currency)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13.5px] font-medium leading-[1.4] text-white/80">
                      {suggestion.description}
                    </p>
                    {plan.offer && (
                      <p className="mt-3 text-[12px] font-bold text-[var(--qs-sun)]">
                        {plan.offer}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span className="text-[38px] font-extrabold leading-none tracking-[-0.03em]">
                        {formatPricingAmount(suggestion.amountPaise / 100, plan.currency)}
                      </span>
                      <s className="text-[15px] font-bold text-[var(--qs-sun)]">
                        {formatPricingAmount(suggestion.compareAtPaise / 100, plan.currency)}
                      </s>
                      <span className="text-[13px] font-bold text-white/80">today</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between gap-2 text-[12px] font-bold text-[var(--qs-sun)]">
                        <span>Balance after</span>
                        <span className="text-right tabular-nums">
                          {bundleCreditsAfter.toLocaleString("en-IN")} credits
                          {bundleCreditMultiple > 1
                            ? ` · ${Number(bundleCreditMultiple.toFixed(1))}× more`
                            : ""}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
                        <div className="h-full w-full rounded-full bg-[var(--qs-sun)]" />
                      </div>
                    </div>
                    <hr className="my-3 border-0 border-t-2 border-dashed border-white/35" />
                    <ul className="grid gap-2 text-[13.5px] font-semibold">
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
                          <Check className="h-3 w-3" strokeWidth={2.6} />
                        </span>
                        {plan.name} plan with{" "}
                        {suggestion.planCredits.toLocaleString("en-IN")} credits / month
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
                          <Check className="h-3 w-3" strokeWidth={2.6} />
                        </span>
                        {suggestion.pack.name} —{" "}
                        {suggestion.pack.credits.toLocaleString("en-IN")} AI credits, valid{" "}
                        {suggestion.pack.validityDays} days
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
                          <Check className="h-3 w-3" strokeWidth={2.6} />
                        </span>
                        {formatCreditRate(suggestion.perCreditPaise, plan.currency)} per
                        credit, not{" "}
                        {formatCreditRate(bundleRegularRatePaise, plan.currency)}
                      </li>
                    </ul>
                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={chooseBundle}
                        className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3 text-[15px] font-extrabold text-[#1A1240] shadow-[0_4px_0_var(--qs-ink)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--qs-ink)] active:translate-y-0.5 active:shadow-none"
                      >
                        Buy bundle ·{" "}
                        {formatPricingAmount(suggestion.amountPaise / 100, plan.currency)}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      <p className="mt-2 text-center text-[12px] font-semibold text-white/85">
                        Just{" "}
                        <b className="font-extrabold text-[var(--qs-sun)]">
                          {formatPricingAmount(bundleExtraRupees, plan.currency)}
                        </b>{" "}
                        more than {plan.name} to add the {suggestion.pack.name}
                      </p>
                    </div>
                  </article>
                </div>
                <p className="mt-4 flex items-center justify-center gap-2.5 text-center text-[12.5px] font-semibold text-[var(--qs-muted)]">
                  <CalendarClock className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
                  Your plan activates immediately; the credit pack keeps its own validity.
                </p>
                <p className="mt-1.5 text-center text-xs font-medium text-[var(--qs-muted)]">
                  Secure payments via Razorpay
                </p>
              </>
            ) : (
              <>
                <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
                  <div>
                    <b className="block text-[15px] font-extrabold">{plan.name}</b>
                    <small className="text-sm text-[var(--qs-muted)]">Monthly plan</small>
                  </div>
                  <strong className="text-[24px] font-black tabular-nums">
                    {formatPricingAmount(plan.price, plan.currency)}
                  </strong>
                </div>
                <div className={cn(QS_ROW, "border-t-2 border-[var(--qs-line)]")}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--qs-muted)]">
                    <Sparkles className="h-4 w-4" />
                    Monthly credits
                  </span>
                  <span className="font-bold tabular-nums">
                    {plan.credits.toLocaleString("en-IN")}
                  </span>
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
                  onClick={choosePlan}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-[15px] text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
                >
                  <Lock className="h-4 w-4" /> Pay {formatPricingAmount(plan.price, plan.currency)}
                </button>
                <p className="mt-3.5 text-center text-xs font-medium text-[var(--qs-muted)]">
                  Secure payments via Razorpay
                </p>
              </>
            )}
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
            {onViewInvoice && (
              <button
                type="button"
                onClick={() => onViewInvoice(receipt.orderId)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-3 text-sm font-bold transition-colors hover:border-[var(--qs-brand)]"
              >
                <FileText className="h-4 w-4" />
                View invoice
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-[15px] text-base font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
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
                onClick={() =>
                  onPay({
                    mode: activeBundle ? "bundle" : "plan",
                    bundleId: activeBundle?.bundleId,
                  })
                }
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
          <p className="mt-3 flex items-center justify-center gap-1.5 border-t-2 border-[var(--qs-line)] pt-3 text-[11px] font-medium text-[var(--qs-muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Plans and credits are activated only after backend payment verification
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
