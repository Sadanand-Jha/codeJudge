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
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatTrialEnd, getTrialState, useMySubscription } from "@/hooks/useMySubscription";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { useToast } from "@/hooks/useToast";
import {
  openRazorpayCheckout,
  RazorpayCheckoutDismissedError,
  type RazorpayPaymentPayload,
} from "@/services/aiCredits";
import { createPlanOrder, verifyPlanPayment } from "@/services/billing";
import { formatPricingAmount, getPlanDiscount, type PricingPlan } from "@/services/pricing";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { PlanCheckoutDialog, type PlanPurchaseReceipt } from "./PlanCheckoutDialog";
import type { PurchasePhase } from "./credits/OrderSummaryDialog";
import { PageHeader } from "./ui";

const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
const PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.08em]";

function PlanCard({
  plan,
  currentPlanId,
  trialAvailable,
  onSelect,
}: {
  plan: PricingPlan;
  currentPlanId: string;
  trialAvailable: boolean;
  onSelect: (plan: PricingPlan) => void;
}) {
  const isCurrent = plan.slug === currentPlanId;
  const isHot = plan.featured && !isCurrent;
  const includedCredits = plan.credits > 0;
  const discount = getPlanDiscount(plan);
  const showTrialCta = Boolean(plan.trialDays) && trialAvailable;
  const features = plan.features.filter(
    (feature) => trialAvailable || !/trial/i.test(feature)
  );

  return (
    <article
      aria-labelledby={`studio-plan-${plan.slug}`}
      className={cn(
        "relative flex flex-col rounded-[26px] border-2 border-[var(--qs-ink)] p-6",
        isHot
          ? "bg-[var(--qs-brand)] pb-7 pt-9 text-[var(--qs-on-brand)] shadow-[8px_8px_0_var(--qs-sun)]"
          : "bg-[var(--qs-surface)] text-[var(--qs-ink)]",
        isCurrent && "shadow-[6px_6px_0_var(--qs-sun)]"
      )}
    >
      {isCurrent && (
        <span className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--qs-ok)] px-4 py-[5px] text-[12px] font-extrabold text-white">
          <Check className="h-3 w-3" strokeWidth={3.5} />
          Current plan
        </span>
      )}
      {isHot && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--qs-ink)] px-4 py-[5px] text-[12px] font-extrabold text-[var(--qs-bg)]">
          Most popular
        </span>
      )}

      <div className="flex items-center justify-between gap-2.5">
        <h2
          id={`studio-plan-${plan.slug}`}
          className="text-[22px] font-extrabold tracking-tight"
        >
          {plan.name}
        </h2>
        <span
          className={cn(
            "whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide",
            isHot
              ? "bg-[var(--qs-sun)] text-[#1A1240]"
              : "bg-[var(--qs-bg)] text-[var(--qs-muted)]"
          )}
        >
          {showTrialCta
            ? `${plan.trialDays}-day trial`
            : plan.discountBadge || (discount > 0 ? `${discount}% off` : "Monthly")}
        </span>
      </div>

      <p
        className={cn(
          "mt-1.5 min-h-[42px] text-[14px] leading-6",
          isHot ? "text-[var(--qs-on-brand)]/85" : "text-[var(--qs-muted)]"
        )}
      >
        {plan.tagline}
      </p>
      {plan.offer && (
        <p
          className={cn(
            "mt-1 text-[12px] font-bold",
            isHot ? "text-[var(--qs-sun)]" : "text-[var(--qs-brand)]"
          )}
        >
          {plan.offer}
        </p>
      )}

      <p className="mt-4 text-[44px] font-black leading-none tracking-tight">
        {formatPricingAmount(plan.price, plan.currency)}
        {discount > 0 && plan.originalPrice && (
          <s
            className={cn(
              "ml-2 align-middle text-[16px] font-bold tracking-normal",
              isHot ? "text-[var(--qs-on-brand)]/70" : "text-[var(--qs-muted)]"
            )}
          >
            {formatPricingAmount(plan.originalPrice, plan.currency)}
          </s>
        )}
        <span
          className={cn(
            "ml-1.5 align-middle text-[13px] font-bold tracking-normal",
            isHot ? "text-[var(--qs-on-brand)]/80" : "text-[var(--qs-muted)]"
          )}
        >
          / month
        </span>
      </p>

      <p
        className={cn(
          "mt-3 flex items-center gap-1.5 text-[13px] font-bold",
          includedCredits
            ? isHot
              ? "text-[var(--qs-sun)]"
              : "text-[var(--qs-brand)]"
            : isHot
              ? "text-[var(--qs-on-brand)]/70"
              : "text-[var(--qs-muted)]"
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        {includedCredits
          ? `Includes ${plan.credits} AI credits / month`
          : "AI credits sold separately"}
      </p>

      <ul
        className={cn(
          "m-0 mb-6 mt-5 flex flex-1 list-none flex-col gap-[11px] border-t-2 border-dashed pt-[18px]",
          isHot ? "border-white/35" : "border-[var(--qs-line)]"
        )}
      >
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-px grid h-5 w-5 flex-none place-items-center rounded-full",
                isHot
                  ? "bg-[var(--qs-sun)] text-[#1A1240]"
                  : "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            <span className="text-[14px] font-medium leading-5">{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <span
          aria-disabled="true"
          className="flex w-full cursor-default items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] py-[13px] text-[14px] font-extrabold text-[var(--qs-muted)]"
        >
          <Check className="h-4 w-4" />
          Current plan
        </span>
      ) : showTrialCta ? (
        <Link
          href="/register"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] py-[13px] text-[14px] font-extrabold transition-all",
            isHot
              ? "bg-[var(--qs-sun)] text-[#1A1240] hover:brightness-105"
              : "bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:bg-[var(--qs-ink)] hover:text-[var(--qs-bg)]"
          )}
        >
          {plan.cta || `Start ${plan.trialDays}-day free trial`}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(plan)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] py-[13px] text-[14px] font-extrabold transition-all",
            isHot
              ? "bg-[var(--qs-sun)] text-[#1A1240] hover:brightness-105"
              : "bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:bg-[var(--qs-ink)] hover:text-[var(--qs-bg)]"
          )}
        >
          {plan.cta || `Upgrade to ${plan.name}`}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}

export function MonthlyPlansPage() {
  const balance = useAICreditsStore((state) => state.balance);
  const refreshCredits = useAICreditsStore((state) => state.refresh);
  const { subscription, isLoading, refresh: refreshSubscription } = useMySubscription();
  const { catalog, isLoading: catalogLoading, error: catalogError, refresh: refreshCatalog } = usePricingCatalog();
  const toast = useToast();
  const [checkoutPlan, setCheckoutPlan] = useState<PricingPlan | null>(null);
  const [phase, setPhase] = useState<PurchasePhase>("summary");
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [processingNote, setProcessingNote] = useState("Creating your order…");
  const [receipt, setReceipt] = useState<PlanPurchaseReceipt | null>(null);

  useEffect(() => {
    void refreshCredits();
  }, [refreshCredits]);

  const trialState = getTrialState(subscription);
  const isTrialActive = trialState === "active";
  const isTrialExpired = trialState === "expired";
  const isTrial = isTrialActive || (!subscription && balance.planId === "free");
  const activePlanId = subscription?.planSlug ?? balance.planId;
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const currentPlan = catalog.plans.find((plan) => plan.slug === activePlanId);
  const displayPlan = currentPlan;
  const trialPlanName = currentPlan?.name ?? trialPlan?.name;
  const currentPlanName = isTrialActive
    ? trialPlanName
      ? `${trialPlanName} trial`
      : "Trial"
    : isTrialExpired
      ? trialPlanName
        ? `${trialPlanName} trial expired`
        : "Trial expired"
      : displayPlan?.name ?? "Free plan";
  const trialEndsOn = formatTrialEnd(subscription?.trialEnd ?? null);
  const trialAvailable = !isLoading && !subscription;
  const isFreePlan = !isLoading && !isTrialActive && !isTrialExpired && !displayPlan;

  const closeCheckout = () => {
    if (phase === "processing") return;
    setCheckoutPlan(null);
    setPhase("summary");
    setPhaseError(null);
    setReceipt(null);
  };

  const startCheckout = (plan: PricingPlan) => {
    if (phase === "processing") return;
    setCheckoutPlan(plan);
    setPhase("summary");
    setPhaseError(null);
    setReceipt(null);
  };

  const runPlanPurchase = async () => {
    const plan = checkoutPlan;
    if (!plan || phase === "processing") return;

    setPhase("processing");
    setPhaseError(null);
    setReceipt(null);
    try {
      setProcessingNote("Creating your order…");
      const order = await createPlanOrder({ planId: plan.id, planSlug: plan.slug });

      setProcessingNote("Waiting for payment…");
      const payment: RazorpayPaymentPayload | null = await openRazorpayCheckout({
        order,
        itemName: `${plan.name} monthly plan`,
        notes: { plan_id: String(plan.id) },
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

      setReceipt({
        transactionId: verified.transactionId,
        planName: verified.planName ?? plan.name,
        credits: verified.credits,
        newBalance: verified.newBalance,
        expiresAt: verified.expiresAt,
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
    <div className="space-y-5 pb-2">
      <PageHeader
        title="Monthly plans"
        subtitle={
          isTrialActive && trialPlan
            ? `Your ${trialPlan.trialDays}-day ${trialPlan.name} trial is active. Paid plans include monthly AI credits.`
            : isTrialExpired && trialPlan
              ? `Your ${trialPlan.name} trial has ended. Upgrade to keep creating quizzes without limits.`
              : "Paid plans include monthly AI credits."
        }
        actions={
          <Link href="/creator/billing/credits" className={OUTLINE_BTN}>
            <Coins className="h-4 w-4" />
            Buy AI credits
          </Link>
        }
      />

      <section
        aria-label="Current monthly plan"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className={cn(PILL, "text-[var(--qs-brand)]")}>
              Current plan
            </span>
            <p className="mt-1.5 truncate text-[15px] font-extrabold text-[var(--qs-ink)]">
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
                !isTrial &&
                displayPlan &&
                displayPlan.price > 0 && (
                  <span className="ml-1.5 font-semibold text-[var(--qs-muted)]">
                    · {formatPricingAmount(displayPlan.price, displayPlan.currency)} / month
                  </span>
                )
              )}
            </p>
          </div>
        </div>

        {isFreePlan ? (
          <Link
            href="#studio-plans"
            className="inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)]"
          >
            Buy a plan to get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-[var(--qs-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
              {isTrialActive
                ? "Quizzes only · no AI credits"
                : isTrialExpired
                  ? "Trial ended · upgrade for AI credits"
                  : displayPlan && displayPlan.credits > 0
                    ? `${displayPlan.credits.toLocaleString("en-IN")} AI credits / month`
                    : "No monthly credits"}
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
        )}
      </section>

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
      ) : catalog.plans.length === 0 ? (
        <div className="mx-auto w-full max-w-4xl rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-8 text-center">
          <p className="text-lg font-extrabold text-[var(--qs-ink)]">No monthly plans available</p>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">Plans are configured by the administrator. Please check back later.</p>
        </div>
      ) : (
        <div
          id="studio-plans"
          className="mx-auto grid w-full max-w-4xl items-stretch gap-6 lg:grid-cols-2"
        >
          {catalog.plans.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              currentPlanId={isTrialActive ? "" : activePlanId}
              trialAvailable={trialAvailable}
              onSelect={startCheckout}
            />
          ))}
        </div>
      )}

      <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[12.5px] font-medium text-[var(--qs-muted)]">
        <CalendarClock className="h-3.5 w-3.5" />
        Prices include GST. Plans activate immediately after payment.
      </p>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 py-5 text-[var(--qs-on-brand)] shadow-[5px_5px_0_var(--qs-sun)]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--qs-sun)] text-[#1A1240]">
            <Coins className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[18px] font-extrabold">Need extra AI credits?</h2>
            <p className="mt-0.5 text-[13px] text-[var(--qs-on-brand)]/85">
              One-time packs work with every plan and stack on top of your
              monthly allowance.
            </p>
          </div>
        </div>
        <Link
          href="/creator/billing/credits"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-2.5 text-[13px] font-extrabold text-[#1A1240]"
        >
          Explore AI credits
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <AnimatePresence>
        {checkoutPlan && (
          <PlanCheckoutDialog
            plan={checkoutPlan}
            balance={balance.totalRemaining}
            phase={phase}
            phaseError={phaseError}
            processingNote={processingNote}
            receipt={receipt}
            onClose={closeCheckout}
            onPay={() => void runPlanPurchase()}
            onBack={() => {
              setPhase("summary");
              setPhaseError(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
