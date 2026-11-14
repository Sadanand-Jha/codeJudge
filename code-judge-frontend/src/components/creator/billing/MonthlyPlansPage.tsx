"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Coins,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { BASIC_TRIAL_CREDITS } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/apiError";
import { getTrialState, useMySubscription } from "@/hooks/useMySubscription";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { useToast } from "@/hooks/useToast";
import {
  openRazorpayCheckout,
  RazorpayCheckoutDismissedError,
  type RazorpayPaymentPayload,
} from "@/services/aiCredits";
import {
  createBundleOrder,
  createPlanOrder,
  verifyBundlePayment,
  verifyPlanPayment,
} from "@/services/billing";
import { trackCheckoutEvent } from "@/services/analytics";
import { formatBillingPeriod, formatPricingAmount, type PricingPlan } from "@/services/pricing";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { PlanCheckoutDialog, type PlanPurchaseReceipt } from "./PlanCheckoutDialog";
import { InvoiceV2Dialog } from "./InvoiceV2Dialog";
import { TrialRequestPanel } from "./TrialRequestPanel";
import type { PurchasePhase } from "./credits/OrderSummaryDialog";
import Select from "@/components/ui/Select";

const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
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

function FreePlanCard({
  plan,
  isCurrent,
}: {
  plan: PricingPlan;
  isCurrent: boolean;
}) {
  const features = (
    plan.features.length
      ? plan.features
      : [`${plan.quizzes} quiz creations`, `${plan.rooms} rooms`]
  )
    .filter((feature) => !/trial/i.test(feature))
    .slice(0, 6);

  return (
    <article
      aria-labelledby={`studio-plan-${plan.slug}`}
      aria-current={isCurrent ? "true" : undefined}
      className="relative flex min-h-[540px] flex-col rounded-[26px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 text-[var(--qs-ink)] shadow-[0_2px_10px_rgba(27,24,64,0.06)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-[var(--qs-line)] bg-[var(--qs-poly-1)]">
            <Zap className="h-6 w-6 text-[var(--qs-brand)]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2
              id={`studio-plan-${plan.slug}`}
              className="truncate text-[28px] font-extrabold tracking-[-0.01em] sm:text-[30px]"
            >
              {plan.name}
            </h2>
            <p className="mt-0.5 text-[13px] font-semibold text-[var(--qs-muted)]">Free plan</p>
          </div>
        </div>
        {isCurrent ? (
          <span className="shrink-0 rounded-full bg-[var(--qs-poly-1)] px-3 py-1.5 text-[12px] font-bold text-[var(--qs-brand)]">
            Current plan
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-[var(--qs-muted)]">{plan.tagline}</p>

      <div className="mt-5 flex items-end gap-2.5">
        <span className="text-[58px] font-extrabold leading-[0.9] tracking-[-0.03em] sm:text-[68px]">
          Free
        </span>
      </div>

      {plan.credits > 0 ? (
        <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-[14px] border border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-3 py-2 text-[13px] font-semibold text-[var(--qs-ink)]">
          <PlanCreditCoin className="h-5 w-5 shrink-0" />
          {plan.credits.toLocaleString("en-IN")} AI credits / month
        </span>
      ) : null}

      <div className="my-5 border-t border-dashed border-[var(--qs-line)]" />

      <ul className="flex flex-1 list-none flex-col gap-3.5 p-0">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-[14px] font-medium text-[var(--qs-ink)]">
            <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled
        className="mt-6 flex min-h-[56px] w-full cursor-default items-center justify-center gap-2.5 rounded-[16px] border border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[16px] font-bold text-[var(--qs-muted)]"
      >
        <Check className="h-[18px] w-[18px] text-[var(--qs-brand)]" strokeWidth={3} />
        {isCurrent ? "Current plan" : "Free plan"}
      </button>
    </article>
  );
}

function PlanCard({
  plan,
  currentPlanId,
  onSelect,
}: {
  plan: PricingPlan;
  currentPlanId: string;
  onSelect: (plan: PricingPlan, priceId: number) => void;
}) {
  const defaultPrice = plan.prices.find((price) => price.billingPeriod === "monthly") ?? plan.prices[0];
  const [selectedPriceId, setSelectedPriceId] = useState(defaultPrice?.id ?? 0);
  const selectedPrice = plan.prices.find((price) => price.id === selectedPriceId) ?? defaultPrice;
  const amount = selectedPrice?.amount ?? plan.price;
  const originalPrice = selectedPrice?.originalPrice ?? null;
  const discount = originalPrice && originalPrice > amount
    ? Math.round((1 - amount / originalPrice) * 100)
    : 0;
  const billingPeriod = selectedPrice
    ? formatBillingPeriod(selectedPrice.billingPeriod, selectedPrice.customDays)
    : "Monthly";
  const isCurrent = plan.slug === currentPlanId;
  const isHot = plan.featured && !isCurrent;
  const includedCredits = plan.credits > 0;
  const features = plan.features.filter((feature) => !/trial/i.test(feature));
  const offerLabel =
    plan.offer?.trim() ||
    (isCurrent
      ? "Current monthly plan"
      : discount > 0
        ? `${discount}% off`
        : "Flexible monthly billing");

  return (
    <article
      aria-labelledby={`studio-plan-${plan.slug}`}
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "relative flex min-h-[540px] flex-col overflow-hidden rounded-[26px] border-2 border-[#1b1740] bg-[linear-gradient(155deg,#34268a_0%,#231a66_45%,#1b1740_100%)] !text-white shadow-[0_30px_70px_-18px_rgba(40,25,120,0.7)]",
        isHot && "border-[#f6bf2f]/70 shadow-[0_34px_80px_-18px_rgba(246,191,47,0.32)]"
      )}
    >
      {isCurrent ? (
        <span className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-b-[14px] bg-[#6ee7b7] px-4 py-2 text-[12px] font-bold text-[#053d2c]">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Current plan
        </span>
      ) : isHot ? (
        <span className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-b-[14px] bg-[#f6bf2f] px-4 py-2 text-[12px] font-bold text-[#3b2400]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
          Most popular
        </span>
      ) : null}

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border border-white/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full border border-white/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-10 h-56 w-56 rounded-full bg-[#7a5cff] opacity-40 blur-3xl"
      />
      {isHot && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#f6bf2f] opacity-15 blur-3xl"
        />
      )}

      <div className="relative z-10 flex h-full flex-col px-5 pb-5 pt-10 sm:px-7 sm:pb-7 sm:pt-11">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-[#f6bf2f]/45 bg-[#f6bf2f]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
              <Zap className="h-6 w-6 text-[#f6bf2f] drop-shadow-[0_2px_8px_rgba(246,191,47,0.45)]" strokeWidth={2} />
            </span>
            <h2
              id={`studio-plan-${plan.slug}`}
              className="truncate !text-white text-[28px] font-extrabold tracking-[-0.01em] sm:text-[30px]"
            >
              {plan.name}
            </h2>
          </div>
          <span className="shrink-0 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 !text-white text-[12px] font-bold">
            {billingPeriod}
          </span>
        </div>

        <p className="mt-4 !text-white/85 text-[15px] leading-relaxed">{plan.tagline}</p>

        {plan.prices.length > 1 && (
          <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.08em] !text-white/65">
            Billing period
            <Select
              className="mt-1.5 w-full rounded-[12px] border border-white/25 bg-[#2a1f73] px-3 py-2 text-sm font-semibold !text-white"
              value={selectedPrice?.id ?? ""}
              onChange={(event) => setSelectedPriceId(Number(event.target.value))}
            >
              {plan.prices.map((price) => (
                <option key={price.id} value={price.id}>
                  {formatBillingPeriod(price.billingPeriod, price.customDays)} · {formatPricingAmount(price.amount, price.currency)}
                </option>
              ))}
            </Select>
          </label>
        )}

        <div className="mt-5 flex flex-col gap-1.5">
          <span className="self-start rounded-full bg-[#6ee7b7]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6ee7b7]">
            {offerLabel}
          </span>
          <div className="mt-1 flex flex-wrap items-end gap-2.5">
            <span className="!text-white text-[58px] font-extrabold leading-[0.9] tracking-[-0.03em] sm:text-[68px]">
              {amount === 0 ? "Free" : formatPricingAmount(amount, selectedPrice?.currency ?? plan.currency)}
            </span>
            {amount > 0 && (
              <span className="pb-2 !text-white/80 text-[15px] font-semibold">/ {billingPeriod.toLowerCase()}</span>
            )}
            {discount > 0 && originalPrice && (
              <span className="mb-2 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-bold !text-white/60 line-through">
                {formatPricingAmount(originalPrice, selectedPrice?.currency ?? plan.currency)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-[16px] border border-[#f6bf2f]/35 bg-[linear-gradient(135deg,rgba(246,191,47,0.18),rgba(255,255,255,0.07))] px-4 py-3 backdrop-blur-md">
          <PlanCreditCoin className="h-8 w-8 shrink-0 drop-shadow-[0_2px_8px_rgba(246,191,47,0.45)]" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f6bf2f]">
              {includedCredits ? "Included credits" : "AI credits"}
            </p>
            <p className="!text-white text-[15px] font-bold leading-snug">
              {includedCredits
                ? `${plan.credits.toLocaleString("en-IN")} AI credits / month`
                : "No monthly credits included"}
            </p>
          </div>
        </div>

        <div className="my-5 border-t-2 border-dashed border-white/20" />

        <ul className="flex flex-1 list-none flex-col gap-3.5 p-0">
          {features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex items-center gap-3 !text-white text-[14px] font-semibold">
              <span className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[#22c55e] !text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={isCurrent || !selectedPrice || amount <= 0}
          onClick={() => selectedPrice && onSelect(plan, selectedPrice.id)}
          className={cn(
            "mt-6 flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[16px] text-[16px] font-bold transition-all",
            isCurrent
              ? "cursor-default border border-white/35 bg-white/15 !text-white"
              : "border border-white/25 bg-[linear-gradient(135deg,#8b6cff,#5b3fe8)] !text-white shadow-[0_14px_30px_-12px_rgba(123,92,255,0.9)] hover:brightness-110 active:translate-y-px"
          )}
        >
          {isCurrent ? (
            <>
              <Check className="h-[18px] w-[18px] text-[#6ee7b7]" strokeWidth={3} />
              Current plan
            </>
          ) : (
            <>
              {plan.cta || `Choose ${plan.name}`}
              <ArrowRight className="h-[18px] w-[18px]" />
            </>
          )}
        </button>
      </div>
    </article>
  );
}

export function MonthlyPlansPage({
  initialPlanSlug = null,
  initialPriceId = null,
}: {
  /** Deep link from the upgrade modal — opens this plan's checkout. */
  initialPlanSlug?: string | null;
  initialPriceId?: number | null;
}) {
  const balance = useAICreditsStore((state) => state.balance);
  const refreshCredits = useAICreditsStore((state) => state.refresh);
  const { subscription, refresh: refreshSubscription } = useMySubscription();
  const { catalog, isLoading: catalogLoading, error: catalogError, refresh: refreshCatalog } = usePricingCatalog();
  const toast = useToast();
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
  const [checkoutPriceId, setCheckoutPriceId] = useState<number | null>(null);
  const [phase, setPhase] = useState<PurchasePhase>("summary");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [processingNote, setProcessingNote] = useState("Creating your order…");
  const [receipt, setReceipt] = useState<PlanPurchaseReceipt | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [dismissedInitialPlan, setDismissedInitialPlan] = useState(false);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  const trialState = getTrialState(subscription);
  const isTrialActive = trialState === "active";
  const isTrialExpired = trialState === "expired";
  const activePlanId = subscription?.planSlug ?? balance.planId;
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const visiblePlans = catalog.plans.filter(
    (plan) => plan.price > 0 || plan.slug === activePlanId
  );

  const plansSubtitle =
    isTrialActive && trialPlan
      ? `Your ${trialPlan.trialDays}-day ${trialPlan.name} trial is active with ${BASIC_TRIAL_CREDITS} AI credits. Paid plans include monthly credits.`
      : isTrialExpired && trialPlan
        ? `Your ${trialPlan.name} trial has ended. Upgrade to keep creating quizzes without limits.`
        : "Paid plans include monthly AI credits.";


  const deepLinkPlan =
    !dismissedInitialPlan && initialPlanSlug
      ? catalog.plans.find((plan) => plan.slug === initialPlanSlug && plan.price > 0) ?? null
      : null;
  const activeCheckoutPlan = checkoutPlan ?? deepLinkPlan;
  const activeCheckoutPrice = activeCheckoutPlan
    ? activeCheckoutPlan.prices.find((price) => price.id === (checkoutPriceId ?? initialPriceId)) ??
      activeCheckoutPlan.prices.find((price) => price.billingPeriod === "monthly") ??
      activeCheckoutPlan.prices[0]
    : null;
  const checkoutPlanDetails = activeCheckoutPlan && activeCheckoutPrice
    ? {
        ...activeCheckoutPlan,
        price: activeCheckoutPrice.amount,
        originalPrice: activeCheckoutPrice.originalPrice,
        currency: activeCheckoutPrice.currency,
        billingPeriod: activeCheckoutPrice.billingPeriod,
        customDays: activeCheckoutPrice.customDays,
      }
    : activeCheckoutPlan;

  const closeCheckout = () => {
    if (phase === "processing") return;
    setDismissedInitialPlan(true);
    setCheckoutPlan(null);
    setCheckoutPriceId(null);
    setPhase("summary");
    setPhaseError(null);
    setReceipt(null);
  };

  const startCheckout = (plan: PricingPlan, priceId: number) => {
    const price = plan.prices.find((item) => item.id === priceId);
    if (phase === "processing" || !price || price.amount <= 0) return;
    setCheckoutPlan(plan);
    setCheckoutPriceId(priceId);
    setPhase("summary");
    setPhaseError(null);
    setReceipt(null);
  };

  const runPlanPurchase = async (selection: {
    mode: "plan" | "bundle";
    bundleId?: number;
    referralCode?: string;
  }) => {
    const plan = activeCheckoutPlan;
    if (!plan || phase === "processing") return;

    setPhase("processing");
    setPhaseError(null);
    setReceipt(null);
    try {
      setProcessingNote("Creating your order…");
      if (selection.mode === "bundle") {
        if (!selection.bundleId) {
          throw new Error("The bundle selection expired. Close this window and try again.");
        }
        const order = await createBundleOrder({
          bundleId: selection.bundleId,
          referralCode: selection.referralCode,
        });
        setProcessingNote("Waiting for payment…");
        const payment: RazorpayPaymentPayload | null = await openRazorpayCheckout({
          order,
          itemName: `${order.planName} + ${order.packCredits} AI credits`,
          notes: {
            bundle_id: String(order.bundleId),
            plan_id: String(order.planId),
            pack_id: String(order.packId),
          },
        }).catch((error: unknown) => {
          if (error instanceof RazorpayCheckoutDismissedError) return null;
          throw error;
        });
        if (!payment) {
          setPhase("cancelled");
          return;
        }

        setProcessingNote("Activating your plan and credits…");
        const verified = await verifyBundlePayment(order, payment);
        await Promise.allSettled([refreshSubscription(), refreshCredits()]);
        trackCheckoutEvent({
          event: "purchase_completed",
          suggestionType: "A",
          sourceProductId: `plan:${order.planId}`,
          productId: `bundle:${order.bundleId}`,
          planCode: order.planSlug,
        });
        setReceipt({
          transactionId: verified.transactionId,
          orderId: verified.orderId,
          planName: `${verified.planName ?? order.planName} + ${verified.packName ?? order.packName}`,
          credits: verified.credits,
          newBalance: verified.newBalance,
          expiresAt: verified.expiresAt,
          referralCredits: verified.referralCredits,
        });
        setPhase("success");
        toast.success({
          title: "Bundle activated",
          description: `${verified.planName ?? order.planName} and ${verified.credits} AI credits are ready.`,
        });
        return;
      }

      if (!activeCheckoutPrice) throw new Error("Please choose an available billing period.");
      const order = await createPlanOrder({
        planId: plan.id,
        planSlug: plan.slug,
        priceId: activeCheckoutPrice.id,
        referralCode: selection.referralCode,
      });
      setProcessingNote("Waiting for payment…");
      const payment: RazorpayPaymentPayload | null = await openRazorpayCheckout({
        order,
        itemName: `${plan.name} ${formatBillingPeriod(activeCheckoutPrice.billingPeriod, activeCheckoutPrice.customDays).toLowerCase()} plan`,
        notes: { plan_id: String(plan.id), price_id: String(activeCheckoutPrice.id) },
      }).catch((error: unknown) => {
        if (error instanceof RazorpayCheckoutDismissedError) return null;
        throw error;
      });

      if (!payment) {
        setPhase("cancelled");
        return;
      }

      setProcessingNote("Activating your plan…");
      const verified = await verifyPlanPayment(order, payment);
      await Promise.allSettled([refreshSubscription(), refreshCredits()]);
      trackCheckoutEvent({
        event: "purchase_completed",
        productId: `plan:${plan.slug}`,
        planCode: plan.slug,
      });

      setReceipt({
        transactionId: verified.transactionId,
        orderId: verified.orderId,
        planName: verified.planName ?? plan.name,
        credits: verified.credits,
        newBalance: verified.newBalance,
        expiresAt: verified.expiresAt,
        referralCredits: verified.referralCredits,
      });
      setPhase("success");
      toast.success({
        title: "Plan activated",
        description: `${verified.planName ?? plan.name} is now active.`,
      });
    } catch (error) {
      setPhaseError(
        getApiErrorMessage(error, "We could not complete this purchase. Please try again.")
      );
      setPhase("failed");
    }
  };

  return (
    <div className="space-y-3 pb-2 sm:space-y-5">
      <div className="hidden items-center justify-between gap-4 sm:flex">
        <p className="text-[14px] text-[var(--qs-muted)] sm:text-[15px]">{plansSubtitle}</p>
        <Link href="/creator/billing/credits" className={OUTLINE_BTN}>
          <PlanCreditCoin className="h-5 w-5" />
          Buy AI credits
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3 sm:hidden">
        <p className="min-w-0 text-[15px] font-medium leading-normal text-[var(--qs-muted)]">{plansSubtitle}</p>
        <Link
          href="/creator/billing/credits"
          className="flex h-11 shrink-0 items-center gap-2 rounded-[14px] border-[1.5px] border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-[14px] font-extrabold text-[var(--qs-ink)]"
        >
          <PlanCreditCoin className="h-[18px] w-[18px]" />
          Buy AI credits
        </Link>
      </div>

      {/* OLD (disabled): current plan summary strip. The current plan is
          rendered by the Elevate-style plan card in the grid instead.
      <section
        aria-label="Current plan"
        className="flex items-center gap-3 rounded-[20px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 sm:flex-wrap sm:justify-between sm:gap-4 sm:rounded-[22px] sm:border-2 sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[var(--qs-sun)] text-[#1A1240] sm:h-11 sm:w-11 sm:rounded-full sm:border-2 sm:border-[var(--qs-ink)]">
            <CalendarClock className="h-[22px] w-[22px] sm:h-5 sm:w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <span className={cn(PILL, "text-[var(--qs-brand)] sm:gap-1.5 sm:rounded-full sm:border-2 sm:border-current sm:px-2.5 sm:py-[3px] sm:text-[10px] sm:font-black sm:tracking-[0.08em]")}>
              Current plan
            </span>
            <b className="block truncate text-[18px] font-extrabold leading-[1.2] text-[var(--qs-ink)] sm:hidden">{currentPlanName}</b>
            <p className="mt-px truncate text-[13px] font-semibold text-[var(--qs-muted)] sm:hidden">
              {planCreditsLabel} · {balance.purchasedCredits.toLocaleString("en-IN")} purchased credits
            </p>
            <p className="mt-1.5 hidden truncate text-[15px] font-extrabold text-[var(--qs-ink)] sm:block">
              {currentPlanName}
              {isTrial && trialEndsOn ? (
                <span className="ml-1.5 font-semibold text-[var(--qs-muted)]">
                  · ends {trialEndsOn}
                </span>
              ) : isTrialExpired && trialEndsOn ? (
                <span className="ml-1.5 font-semibold text-[var(--qs-muted)]">
                  · ended {trialEndsOn}
                </span>
              ) : (
                null
              )}
            </p>
          </div>
        </div>

        {isFreePlan ? (
          <Link
            href="#studio-plans"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-[14px] font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:brightness-110 sm:h-auto sm:rounded-[12px] sm:border-2 sm:px-4 sm:py-2.5 sm:text-[13px] sm:font-extrabold sm:shadow-[3px_3px_0_var(--qs-sun)]"
          >
            Buy a plan
            <ArrowRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </Link>
        ) : (
          <>
            <Link
              href="/creator/billing/credits"
              className="flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-[14px] bg-[var(--qs-poly-1)] px-3.5 text-[14px] font-extrabold text-[var(--qs-brand)] sm:hidden"
            >
              Top up
              <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-[var(--qs-muted)] sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                {planCreditsLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                {balance.purchasedCredits.toLocaleString("en-IN")} purchased credits
              </span>
              <Link
                href="/creator/billing/credits"
                className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[var(--qs-brand)] hover:underline"
              >
                Top up credits
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}
      </section>
      */}

      <TrialRequestPanel />

      {catalogLoading ? (
        <div className="mx-auto grid w-full max-w-4xl items-stretch gap-6 lg:grid-cols-2" aria-label="Loading plans">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="h-[430px] animate-pulse rounded-[26px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
            />
          ))}
        </div>
      ) : catalogError ? (
        <div className="mx-auto w-full max-w-4xl rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-8 text-center">
          <p className="text-lg font-extrabold text-[var(--qs-ink)]">Plans could not be loaded.</p>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">{catalogError}</p>
          <button
            type="button"
            onClick={() => void refreshCatalog()}
            className="mt-4 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-extrabold text-[var(--qs-on-brand)]"
          >
            Try again
          </button>
        </div>
      ) : visiblePlans.length === 0 ? (
        <div className="mx-auto w-full max-w-4xl rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-8 text-center">
          <p className="text-lg font-extrabold text-[var(--qs-ink)]">No monthly plans available</p>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">Plans are configured by the administrator. Please check back later.</p>
        </div>
      ) : (
        <div
          id="studio-plans"
          className={cn(
            "mx-auto grid w-full items-stretch gap-3 sm:gap-6",
            visiblePlans.length === 1 ? "max-w-[436px]" : "max-w-4xl lg:grid-cols-2"
          )}
        >
          {visiblePlans.map((plan) =>
            plan.price === 0 ? (
              <FreePlanCard
                key={plan.slug}
                plan={plan}
                isCurrent={!isTrialActive && plan.slug === activePlanId}
              />
            ) : (
              <PlanCard
                key={plan.slug}
                plan={plan}
                currentPlanId={isTrialActive ? "" : activePlanId}
                onSelect={startCheckout}
              />
            )
          )}
        </div>
      )}

      <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[14px] font-semibold text-[var(--qs-muted)] sm:text-[12.5px]">
        <CalendarClock className="hidden h-3.5 w-3.5 sm:block" />
        Plans activate immediately after payment.
      </p>

      <section className="relative flex flex-col gap-2.5 overflow-hidden rounded-[26px] border-[1.5px] border-[var(--qs-ink)] border-b-[5px] border-b-[var(--qs-sun)] bg-[linear-gradient(150deg,#4a28b5,#6a3cf0)] px-5 py-5 text-white sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:rounded-[22px] sm:border-2 sm:px-5 sm:py-5 sm:shadow-[5px_5px_0_var(--qs-sun)]">
        <span aria-hidden="true" className="pointer-events-none absolute -right-[50px] -top-[50px] h-[150px] w-[150px] rounded-full bg-white/[0.08] max-sm:hidden" />
        <div className="relative z-[1] flex min-w-0 items-start gap-3 sm:gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[var(--qs-sun)] text-[#1A1240] sm:h-10 sm:w-10 sm:rounded-full sm:border-0">
            <Coins className="h-[22px] w-[22px] sm:h-4 sm:w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="!text-white text-[18px] font-extrabold leading-[1.25] sm:text-[18px] sm:font-extrabold">Need extra AI credits?</h2>
            <p className="mt-1 text-[14px] font-medium leading-[1.5] !text-white/85 sm:text-[13px]">
              One-time packs work with every plan and stack on top of your
              monthly allowance.
            </p>
          </div>
        </div>
        <Link
          href="/creator/billing/credits"
          className="relative z-[1] inline-flex h-[50px] shrink-0 items-center justify-center gap-2 self-start rounded-[14px] bg-[var(--qs-sun)] px-5 text-[15px] font-extrabold text-[#1A1240] shadow-[0_3px_0_#c99a12] sm:h-auto sm:rounded-[12px] sm:border-2 sm:px-4 sm:py-2.5 sm:text-[13px] sm:font-extrabold"
        >
          Explore AI credits
          <ArrowRight className="h-[18px] w-[18px]" />
        </Link>
      </section>

      <AnimatePresence>
        {activeCheckoutPlan && checkoutPlanDetails && (
          <PlanCheckoutDialog
            key={`${activeCheckoutPlan.slug}-${activeCheckoutPrice?.id ?? "default"}`}
            plan={checkoutPlanDetails}
            balance={balance.totalRemaining}
            phase={phase}
            phaseError={phaseError}
            processingNote={processingNote}
            receipt={receipt}
            onClose={closeCheckout}
            onPay={(selection) => void runPlanPurchase(selection)}
            onViewInvoice={setInvoiceOrderId}
            onBack={() => {
              setPhase("summary");
              setPhaseError(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {invoiceOrderId && (
          <InvoiceV2Dialog
            orderId={invoiceOrderId}
            onClose={() => setInvoiceOrderId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
