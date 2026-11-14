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
  Gift,
  Info,
  Loader2,
  Lock,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { formatTrialEnd } from "@/hooks/useMySubscription";
import { formatBillingPeriod, formatPricingAmount, type PricingPlan } from "@/services/pricing";
import { consumePlanBundleIntent } from "@/lib/checkoutIntent";
import {
  getCheckoutSuggestion,
  type PlanBundleSuggestion,
} from "@/services/billing";
import { trackCheckoutEvent } from "@/services/analytics";
import {
  getReferralEligibility,
  validateReferralCode,
  type ReferralValidationReason,
} from "@/services/referrals";
import type { PurchasePhase } from "./credits/OrderSummaryDialog";
import { QS_DIALOG_PANEL } from "./credits/styles";

export interface PlanPurchaseReceipt {
  transactionId: string;
  orderId: string;
  planName: string;
  credits: number;
  newBalance: number;
  expiresAt: string | null;
  referralCredits?: number;
}

// Result-state body. Mobile text is kept at 12px minimum for legibility.
function PhaseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
      {children}
    </div>
  );
}

function PlanCreditCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className={className}>
      <circle cx="15" cy="15" r="13.5" fill="#f6bf2f" stroke="#b87408" strokeWidth="1.5" />
      <path
        d="M15 7.5l2 4.7 5 .5-3.8 3.3 1.2 5-4.4-2.7-4.4 2.7 1.2-5L8 12.7l5-.5z"
        fill="#fff4c9"
        stroke="#c98410"
        strokeWidth=".8"
      />
    </svg>
  );
}

function PlanOrderSummaryCard({ plan, balance }: { plan: PricingPlan; balance: number }) {
  const credits = Math.max(0, plan.credits);
  const periodLabel = formatBillingPeriod(plan.billingPeriod ?? "monthly", plan.customDays);
  const period = periodLabel.toLowerCase();
  const balanceAfter = balance + credits;
  const addedPercent = balanceAfter > 0 ? (credits / balanceAfter) * 100 : 0;
  const currentPercent = Math.max(0, 100 - addedPercent);
  const features = [
    `${credits.toLocaleString("en-IN")} AI credits every month`,
    ...plan.features.filter((feature) => !/trial/i.test(feature)),
    "Activates immediately",
  ].slice(0, 5);

  return (
    <article className="rounded-[20px] border-2 border-[var(--qs-ink)] bg-[linear-gradient(160deg,var(--qs-surface),var(--qs-bg)_160%)] p-4 shadow-[0_18px_40px_-18px_rgba(124,92,255,0.35)] sm:rounded-[24px] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[20px] font-extrabold tracking-[-0.01em] sm:text-[22px]">Order summary</h3>
        <span className="rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--qs-muted)]">
          Current balance · <b className="text-[var(--qs-ink)]">{balance.toLocaleString("en-IN")}</b> credits
        </span>
      </div>

      <div className="mt-4 flex items-start gap-3 sm:mt-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] border border-[#f6bf2f]/45 bg-[#f6bf2f]/15">
          <Zap className="h-6 w-6 text-[#c98410]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[22px] font-extrabold tracking-[-0.01em] sm:text-[24px]">{plan.name}</h4>
            <span className="rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
              {periodLabel}
            </span>
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--qs-muted)]">
            {plan.description ?? plan.tagline}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <span className="rounded-full bg-[#6ee7b7]/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#047857]">
          {plan.offer?.trim() || "Flexible monthly billing"}
        </span>
        <p className="mt-2 text-[44px] font-black leading-none tracking-[-0.03em] sm:text-[54px]">
          {formatPricingAmount(plan.price, plan.currency)}
          <span className="ml-2 text-[12px] font-medium tracking-normal text-[var(--qs-muted)] sm:text-[13px]">
            / {period}
          </span>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-[#f0d28a] bg-[#fff3d1] px-3.5 py-3">
        <PlanCreditCoin className="h-8 w-8 shrink-0 drop-shadow-[0_2px_8px_rgba(246,191,47,0.45)]" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a35f00]">Included credits</p>
          <p className="text-[14px] font-bold leading-snug text-[#5a3b00]">
            {credits.toLocaleString("en-IN")} AI credits / month
          </p>
        </div>
      </div>

      <hr className="my-4 border-0 border-t-2 border-dashed border-[var(--qs-line)] sm:my-5" />

      <div className="rounded-[14px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-[#4a2fd8]">Balance after activation</span>
          <span className="text-[12px] font-bold tabular-nums text-[#4a2fd8]">
            {balanceAfter.toLocaleString("en-IN")} credits
          </span>
        </div>
        <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-[var(--qs-bg)]">
          <i className="block h-full bg-[#c9bff5]" style={{ width: `${currentPercent}%` }} />
          <i
            className="block h-full bg-[linear-gradient(90deg,#7c5cff,#4a2fd8)]"
            style={{ width: `${addedPercent}%` }}
          />
        </div>
      </div>

      <hr className="my-4 border-0 border-t-2 border-dashed border-[var(--qs-line)] sm:my-5" />

      <ul className="grid list-none gap-2.5 p-0">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-[13px] font-semibold">
            <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[#4a2fd8] !text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PlanPaymentCard({
  plan,
  onPay,
}: {
  plan: PricingPlan;
  onPay: () => void;
}) {
  const credits = Math.max(0, plan.credits);
  const periodLabel = formatBillingPeriod(plan.billingPeriod ?? "monthly", plan.customDays);

  return (
    <aside className="rounded-[20px] border-2 border-[var(--qs-ink)] bg-[linear-gradient(160deg,var(--qs-surface),var(--qs-bg)_160%)] p-4 shadow-[0_18px_40px_-18px_rgba(124,92,255,0.35)] sm:rounded-[24px] sm:p-6">
      <h3 className="text-[20px] font-extrabold tracking-[-0.01em] sm:text-[22px]">Payment</h3>

      <div className="mt-4 grid gap-2.5 text-[13px] text-[var(--qs-muted)]">
        <div className="flex items-center justify-between gap-3">
          <span>Plan</span>
          <b className="text-[var(--qs-ink)]">{plan.name}</b>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Credits</span>
          <b className="text-[var(--qs-ink)]">+{credits.toLocaleString("en-IN")} / month</b>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Billing</span>
          <b className="text-[var(--qs-ink)]">{periodLabel}</b>
        </div>
        <hr className="my-1 border-0 border-t-2 border-dashed border-[var(--qs-line)]" />
        <div className="flex items-center justify-between gap-3 text-[16px] font-bold text-[var(--qs-ink)]">
          <span>Total</span>
          <span>{formatPricingAmount(plan.price, plan.currency)}</span>
        </div>
      </div>

      <hr className="my-4 border-0 border-t-2 border-dashed border-[var(--qs-line)]" />

      <button
        type="button"
        onClick={onPay}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-[linear-gradient(90deg,#7c5cff,#4a2fd8)] px-4 py-4 text-[15px] font-bold !text-white shadow-[0_12px_24px_-10px_#4a2fd8] transition-[filter] hover:brightness-110"
      >
        <Lock className="h-[18px] w-[18px]" />
        Pay {formatPricingAmount(plan.price, plan.currency)}
      </button>

      <p className="mt-3 flex gap-2 text-[11.5px] leading-relaxed text-[var(--qs-muted)]">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#4a2fd8]" />
          <span>
            Your plan activates immediately and stays active for its billing period.
          </span>
      </p>
    </aside>
  );
}

function PlanBundleSuggestionCard({
  suggestion,
  plan,
  balance,
  onAccept,
}: {
  suggestion: PlanBundleSuggestion;
  plan: PricingPlan;
  balance: number;
  onAccept: () => void;
}) {
  const bundleCreditsAfter = balance + suggestion.credits;
  const bundleCreditMultiple = plan.credits > 0 ? suggestion.credits / plan.credits : 0;
  const extraAmount = Math.max(0, suggestion.amountPaise - plan.price * 100) / 100;
  const regularRatePaise =
    suggestion.credits > 0 ? suggestion.compareAtPaise / suggestion.credits : 0;

  return (
    <article className="relative rounded-[20px] border-2 border-[var(--qs-ink)] bg-[linear-gradient(155deg,#34268a_0%,#231a66_45%,#1b1740_100%)] p-4 !text-white shadow-[0_24px_55px_-20px_rgba(40,25,120,0.65)] sm:rounded-[24px] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f6bf2f] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#3b2400]">
            <Sparkles className="h-3 w-3" />
            {suggestion.badge}
          </span>
          <h3 className="mt-2 text-[20px] font-extrabold !text-white sm:text-[22px]">{suggestion.title}</h3>
          <p className="mt-1 max-w-lg text-[13px] leading-relaxed !text-white/80">{suggestion.description}</p>
        </div>
        <div className="text-right">
          <p className="text-[28px] font-black leading-none !text-white sm:text-[34px]">
            {formatPricingAmount(suggestion.amountPaise / 100, plan.currency)}
          </p>
          <p className="mt-1 text-[12px] font-semibold !text-white/60">
            <s>{formatPricingAmount(suggestion.compareAtPaise / 100, plan.currency)}</s> · save{" "}
            {formatPricingAmount(suggestion.savingsPaise / 100, plan.currency)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-[12.5px] font-semibold !text-white sm:grid-cols-3">
        <span className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#6ee7b7] !text-[#053d2c]">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {bundleCreditsAfter.toLocaleString("en-IN")} credits after purchase
          {bundleCreditMultiple > 1 ? ` · ${Number(bundleCreditMultiple.toFixed(1))}× more` : ""}
        </span>
        <span className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#6ee7b7] !text-[#053d2c]">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {plan.name} plan + {suggestion.pack.name}
        </span>
        <span className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#6ee7b7] !text-[#053d2c]">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          {formatPricingAmount(suggestion.perCreditPaise / 100, plan.currency)} per credit
          {regularRatePaise > 0 ? `, not ${formatPricingAmount(regularRatePaise / 100, plan.currency)}` : ""}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t-2 border-dashed border-white/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] font-semibold !text-white/75">
          Just{" "}
          <b className="font-extrabold !text-[#f6bf2f]">
            {formatPricingAmount(extraAmount, plan.currency)}
          </b>{" "}
          more than {plan.name} to add the {suggestion.pack.name}
        </p>
        <button
          type="button"
          onClick={onAccept}
          className="flex items-center justify-center gap-2 rounded-[13px] border-0 bg-[#f6bf2f] px-5 py-3 text-[14px] font-bold text-[#3b2400] transition-[filter] hover:brightness-105"
        >
          Buy bundle · {formatPricingAmount(suggestion.amountPaise / 100, plan.currency)}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

type ReferralUiStatus = "idle" | "checking" | "applied" | "error" | "unavailable";

const REFERRAL_ERROR_COPY: Record<ReferralValidationReason, string> = {
  missing_code: "Enter a referral code to continue.",
  invalid_code: "That referral code is not valid.",
  self_referral: "You cannot use your own referral code.",
  already_used: "A referral code has already been used on this account.",
};

function ReferralCodeCard({
  draft,
  status,
  message,
  rewardCredits,
  disabled,
  onChange,
  onApply,
  onClear,
}: {
  draft: string;
  status: ReferralUiStatus;
  message: string | null;
  rewardCredits: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const unavailable = status === "unavailable";
  const applied = status === "applied";

  return (
    <section className="rounded-[20px] border-2 border-[var(--qs-ink)] bg-[linear-gradient(160deg,#fffdf4,#fff7dd_170%)] p-4 shadow-[0_4px_0_#f0d78a] sm:rounded-[24px] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#3b2400]">
          <Gift className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold text-[var(--qs-ink)]">
            Referral code
          </h3>
          <p className="mt-0.5 text-[12px] leading-5 text-[var(--qs-muted)]">
            Have a friend&rsquo;s code? You both get{" "}
            <b className="text-[var(--qs-ink)]">{rewardCredits} AI credits</b>,
            valid for 6 months.
          </p>

          {unavailable ? (
            <p className="mt-3 rounded-[12px] border border-[var(--qs-line)] bg-white/70 px-3 py-2 text-[12px] font-semibold text-[var(--qs-muted)]">
              {message ?? REFERRAL_ERROR_COPY.already_used}
            </p>
          ) : (
            <>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => onChange(event.target.value)}
                  disabled={disabled || status === "checking" || applied}
                  maxLength={20}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Referral code"
                  placeholder="Enter code"
                  className="h-11 min-w-0 flex-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-white px-3 text-[14px] font-bold uppercase tracking-[0.04em] text-[var(--qs-ink)] outline-none transition-[border-color,box-shadow] placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)] focus:ring-4 focus:ring-[var(--qs-brand)]/12 disabled:opacity-70"
                />
                {applied ? (
                  <button
                    type="button"
                    onClick={onClear}
                    disabled={disabled}
                    className="h-11 shrink-0 rounded-[12px] border-2 border-[var(--qs-line)] bg-white px-4 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-ink)]"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onApply}
                    disabled={disabled || status === "checking" || !draft.trim()}
                    className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[12px] bg-[var(--qs-ink)] px-4 text-[13px] font-bold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {status === "checking" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                )}
              </div>
              {message && (
                <p
                  className={cn(
                    "mt-2 text-[12px] font-semibold",
                    status === "error"
                      ? "text-[var(--qs-bad)]"
                      : "text-[var(--qs-ok)]"
                  )}
                  aria-live="polite"
                >
                  {message}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
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
  onPay: (selection: {
    mode: "plan" | "bundle";
    bundleId?: number;
    referralCode?: string;
  }) => void;
  onBack: () => void;
  onViewInvoice?: (orderId: string) => void;
}) {
  const busy = phase === "processing";
  const [suggestion, setSuggestion] = useState<PlanBundleSuggestion | null>(null);
  const [selection, setSelection] = useState<"plan" | "bundle">("plan");
  const [referralDraft, setReferralDraft] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<{
    code: string;
    displayName: string;
  } | null>(null);
  const [referralStatus, setReferralStatus] =
    useState<ReferralUiStatus>("idle");
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [referralReward, setReferralReward] = useState(50);

  useEffect(() => {
    let active = true;
    getReferralEligibility()
      .then((eligibility) => {
        if (!active) return;
        setReferralReward(eligibility.rewardCredits);
        if (!eligibility.canUse) {
          setReferralStatus("unavailable");
          setReferralMessage(
            REFERRAL_ERROR_COPY[eligibility.reason ?? "already_used"]
          );
        }
      })
      .catch(() => {
        // Applying a code still validates it server-side.
      });
    return () => {
      active = false;
    };
  }, []);

  const applyReferral = async () => {
    const code = referralDraft.trim();
    if (!code || busy || referralStatus === "checking") return;
    setReferralStatus("checking");
    setReferralMessage(null);
    try {
      const result = await validateReferralCode(code);
      if (!result.valid || !result.code) {
        setReferralStatus("error");
        setReferralMessage(
          REFERRAL_ERROR_COPY[result.reason ?? "invalid_code"]
        );
        return;
      }
      const displayName = result.referrer?.displayName ?? "your friend";
      setReferralDraft(result.code);
      setAppliedReferral({ code: result.code, displayName });
      setReferralReward(result.rewardCredits);
      setReferralStatus("applied");
      setReferralMessage(
        `Code applied — you and ${displayName} each get ${result.rewardCredits} credits, valid for 6 months.`
      );
    } catch {
      setReferralStatus("error");
      setReferralMessage("We could not check that code. Please try again.");
    }
  };

  const clearReferral = () => {
    setAppliedReferral(null);
    setReferralDraft("");
    setReferralStatus("idle");
    setReferralMessage(null);
  };

  useEffect(() => {
    if (plan.billingPeriod && plan.billingPeriod !== "monthly") return;
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
  }, [plan.billingPeriod, plan.slug]);

  // Escape closes the dialog like the other subscription modals, but never mid-payment.
  useEffect(() => {
    if (busy) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const activeBundle = selection === "bundle" ? suggestion : null;
  const validTill = receipt ? formatTrialEnd(receipt.expiresAt) : null;
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
    onPay({ mode: "plan", referralCode: appliedReferral?.code });
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
    onPay({
      mode: "bundle",
      bundleId: suggestion.bundleId,
      referralCode: appliedReferral?.code,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[70] flex overflow-y-auto bg-[rgba(26,16,51,0.62)] p-4 backdrop-blur-sm"
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
        className={cn(
          QS_DIALOG_PANEL,
          "qs-ui m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
        )}
        style={phase === "summary" ? { maxWidth: 980 } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3 sm:gap-3">
          <h2 className="text-[18px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-[26px]">
            {phase === "success" ? "Plan activated" : "Checkout"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="b b-close b-ghost"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </header>

        {phase === "summary" && (
          <>
            <div className="mt-3 grid gap-3 sm:mt-5 sm:grid-cols-[1.15fr_0.85fr] sm:items-start sm:gap-4">
              <PlanOrderSummaryCard plan={plan} balance={balance} />
              <PlanPaymentCard
                plan={plan}
                onPay={choosePlan}
              />
            </div>

            <div className="mt-3">
              <ReferralCodeCard
                draft={referralDraft}
                status={referralStatus}
                message={referralMessage}
                rewardCredits={referralReward}
                disabled={busy}
                onChange={setReferralDraft}
                onApply={() => void applyReferral()}
                onClear={clearReferral}
              />
            </div>

            {suggestion && (
              <div className="mt-3">
                <PlanBundleSuggestionCard
                  suggestion={suggestion}
                  plan={plan}
                  balance={balance}
                  onAccept={chooseBundle}
                />
              </div>
            )}
          </>
        )}

        {phase === "processing" && (
          <PhaseShell>
            <Loader2 className="h-8 w-8 animate-spin text-[var(--qs-brand)]" />
            <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">{processingNote}</p>
            <p className="mt-1 text-[12px] text-[var(--qs-muted)]">Do not close this window.</p>
          </PhaseShell>
        )}

        {phase === "success" && receipt && (
          <PhaseShell>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-extrabold text-[var(--qs-ink)]">{receipt.planName} is now active</p>
            <p className="mt-1 text-[12px] text-[var(--qs-muted)]">
              {receipt.credits.toLocaleString("en-IN")} credits added
              {validTill ? ` · valid till ${validTill}` : ""}
            </p>
            {receipt.referralCredits ? (
              <p className="mt-1 rounded-full bg-[#fff3c4] px-3 py-1 text-[11.5px] font-bold text-[#6b4a00]">
                +{receipt.referralCredits} referral credits added to both accounts
              </p>
            ) : null}
            <p className="mt-1 text-[12px] tabular-nums text-[var(--qs-muted)]">
              Transaction {receipt.transactionId} · Balance {receipt.newBalance.toLocaleString("en-IN")}
            </p>
            {onViewInvoice && (
              <button
                type="button"
                onClick={() => onViewInvoice(receipt.orderId)}
                className="b b-full mt-3"
              >
                <FileText className="h-4 w-4" />
                View invoice
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="b b-pri lg b-full mt-2.5"
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
            <p className="mt-3 text-sm font-extrabold text-[var(--qs-ink)]">Payment failed</p>
            <p className="mt-1 max-w-xs text-[12px] leading-5 text-[var(--qs-muted)]">{phaseError}</p>
            <div className="mt-5 flex w-full gap-2">
              <button type="button" onClick={onBack} className="b flex-1">
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  onPay({
                    mode: activeBundle ? "bundle" : "plan",
                    bundleId: activeBundle?.bundleId,
                    referralCode: appliedReferral?.code,
                  })
                }
                className="b b-pri flex-1"
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
            <p className="mt-3 text-sm font-extrabold text-[var(--qs-ink)]">Payment cancelled</p>
            <p className="mt-1 max-w-xs text-[12px] leading-5 text-[var(--qs-muted)]">
              No amount was charged. You can resume whenever you are ready.
            </p>
            <div className="mt-5 flex w-full gap-2">
              <button type="button" onClick={onClose} className="b flex-1">
                Close
              </button>
              <button type="button" onClick={onBack} className="b b-pri flex-1">
                Resume
              </button>
            </div>
          </PhaseShell>
        )}
      </motion.div>
    </motion.div>
  );
}
