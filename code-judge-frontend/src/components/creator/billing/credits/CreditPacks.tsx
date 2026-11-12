"use client";

import Link from "next/link";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { BASIC_TRIAL_CREDITS } from "@/lib/constants";
import { formatTrialEnd, getTrialState, useMySubscription } from "@/hooks/useMySubscription";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { formatPricingAmount, type PricingPlan } from "@/services/pricing";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import type { CreditPurchasePack } from "@/services/aiCredits";

function packFeatures(pack: CreditPurchasePack): string[] {
  const months = pack.validityMonths;
  return [
    "Generate MCQ, short & long questions",
    "Export to PDF / Word",
    `Valid for ${months} month${months === 1 ? "" : "s"}`,
  ];
}

function savingsPercent(pack: CreditPurchasePack, base?: CreditPurchasePack): number {
  if (!base || base.credits === 0 || pack.credits === 0) return 0;
  const baseRate = base.price / base.credits;
  const rate = pack.price / pack.credits;
  return Math.max(0, Math.round((1 - rate / baseRate) * 100));
}


function CurrentPlanCard({ plan }: { plan: PricingPlan }) {
  const included = plan.credits > 0;
  const features = included
    ? [
        `Up to ${plan.quizzes} quiz creations`,
        `${plan.credits} AI credits every month`,
        "Top up anytime when you need more",
      ]
    : [
        "Platform access",
        "Pay only for the credits you use",
        "Buy a top-up whenever you need AI",
      ];

  return (
    <article
      aria-current="true"
      aria-label={`${plan.name} plan — current plan`}
      className="relative flex flex-col rounded-[26px] border border-[var(--qs-line)] border-b-[5px] border-b-[var(--qs-sun)] bg-[var(--qs-surface)] px-5 pb-5 pt-[22px] text-[var(--qs-ink)] shadow-[0_12px_28px_rgba(27,24,64,0.12)] max-[900px]:order-first sm:rounded-[26px] sm:border-2 sm:border-[var(--qs-ink)] sm:border-b-2 sm:px-[26px] sm:pb-7 sm:pt-7 sm:shadow-none"
    >
      <span className="absolute -top-4 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--qs-ok)] px-4 py-[5px] text-[13px] font-extrabold text-white sm:flex">
        <Sparkles className="h-3 w-3" />
        Current plan
      </span>

      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-[24px] font-extrabold leading-[1.2] tracking-tight sm:text-[20px] sm:font-extrabold">{plan.name}</h3>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--qs-ok)] px-2 py-0.5 text-[9px] font-bold text-white sm:hidden">
            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            Current plan
          </span>
        </div>
        <span className="flex h-[30px] shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--qs-okbg)] px-3 text-[13px] font-extrabold tracking-wide text-[var(--qs-ok)] sm:px-[11px] sm:text-[12px] sm:font-extrabold">
          Active
        </span>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2 sm:mt-0 sm:block">
        <p className="my-2 text-[44px] font-extrabold leading-none tracking-[-0.02em] sm:my-5 sm:mb-2.5 sm:text-[64px] sm:font-black sm:leading-none">
          {formatPricingAmount(plan.price, plan.currency)}
          <span className="ml-1.5 text-[16px] font-semibold text-[var(--qs-muted)] sm:ml-2 sm:text-base sm:font-bold">/ month</span>
        </p>
        <p className="text-[14px] font-extrabold sm:text-base sm:font-bold">
          {included ? `${plan.credits} AI credits included` : "No monthly credits"}
        </p>
      </div>
      <p className="mb-0 mt-3.5 text-[15px] font-medium leading-[1.45] text-[var(--qs-muted)] sm:mb-[18px] sm:mt-3 sm:min-h-[46px] sm:text-base sm:leading-normal">
        {included
          ? "Your plan includes credits every month. Add a pack only when you need extra."
          : "Your current plan. Buy a credit pack only when you need AI credits."}
      </p>

      <ul className="m-0 mb-0 mt-4 flex flex-1 list-none flex-col gap-3 border-t-[1.5px] border-dashed border-[var(--qs-line)] pb-5 pt-4 sm:mb-[26px] sm:gap-[11px] sm:border-t-2 sm:pt-[18px]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 sm:gap-2.5">
            <span className="mt-px grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)] sm:h-5 sm:w-5">
              <Check className="h-[13px] w-[13px] sm:h-3 sm:w-3" strokeWidth={3.4} />
            </span>
            <span className="text-[15px] font-semibold leading-[1.4] sm:text-sm sm:leading-5">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/creator/billing/plans"
        className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[16px] font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none sm:mt-0 sm:h-auto sm:gap-2 sm:rounded-[14px] sm:border-2 sm:py-[15px] sm:text-base sm:font-extrabold sm:shadow-[3px_3px_0_var(--qs-sun)]"
      >
        Compare monthly plans
        <ArrowRight className="h-4 w-4 sm:h-4 sm:w-4" />
      </Link>
    </article>
  );
}

export function CreditPackCard({
  pack,
  basePack,
  onSelect,
}: {
  pack: CreditPurchasePack;
  basePack?: CreditPurchasePack;
  onSelect: (pack: CreditPurchasePack) => void;
}) {
  const save = pack.id === basePack?.id ? 0 : savingsPercent(pack, basePack);
  const hot = Boolean(pack.popular);
  const features = packFeatures(pack);

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-[26px] border border-[var(--qs-line)] px-5 pb-5 shadow-[0_12px_28px_rgba(27,24,64,0.12)] sm:rounded-[26px] sm:border-2 sm:border-[var(--qs-ink)] sm:px-[26px] sm:pb-7 sm:shadow-none",
        hot
          ? "border-[1.5px] border-[var(--qs-ink)] border-b-[5px] border-b-[var(--qs-sun)] bg-[var(--qs-brand)] pt-[22px] text-[var(--qs-on-brand)] max-[900px]:-order-1 sm:pt-10 sm:shadow-[10px_10px_0_var(--qs-sun)]"
          : "bg-[var(--qs-surface)] pt-[22px] text-[var(--qs-ink)] sm:pt-7"
      )}
    >
      {hot && (
        <span className="absolute -top-[15px] left-1/2 flex h-[30px] -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-[var(--qs-ink)] px-3.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-bg)] sm:-top-4 sm:h-auto sm:px-4 sm:py-[5px] sm:text-[13px] sm:normal-case sm:tracking-normal">
          ★ Limited Offer
        </span>
      )}

      <div className="flex items-center justify-between gap-2.5">
        <h3 className="truncate text-[24px] font-extrabold leading-[1.2] tracking-tight sm:text-[20px] sm:font-extrabold">{pack.name}</h3>
        {save > 0 && (
          <span className="flex h-[30px] shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--qs-sun)] px-3 text-[13px] font-extrabold tracking-wide text-[#1A1240] sm:px-[11px] sm:text-[12px] sm:font-extrabold">
            Save {save}%
          </span>
        )}
      </div>

      <div className="mt-1 sm:mt-0 sm:block">
        <p className="my-2 text-[44px] font-extrabold leading-none tracking-[-0.02em] sm:my-5 sm:mb-2.5 sm:text-[64px] sm:font-black sm:leading-none">
          {formatPricingAmount(pack.price, "INR")}
          <span className="ml-1.5 text-[16px] font-semibold sm:hidden">{pack.credits} credits</span>
        </p>
        <p className="hidden text-base font-bold sm:block">
          {pack.credits} credits
        </p>
      </div>
      <p
        className={cn(
          "mb-0 mt-3.5 text-[15px] font-medium leading-[1.45] sm:mb-[18px] sm:mt-3 sm:min-h-[46px] sm:text-base sm:leading-normal",
          hot ? "opacity-[0.88]" : "text-[var(--qs-muted)]"
        )}
      >
        {pack.blurb}
      </p>

      <ul
        className={cn(
          "m-0 mb-0 mt-4 flex flex-1 list-none flex-col content-start gap-3 border-t-[1.5px] border-dashed pb-5 pt-4 sm:mb-[26px] sm:gap-[11px] sm:border-t-2 sm:pt-[18px]",
          hot ? "border-white/35" : "border-[var(--qs-line)]"
        )}
      >
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 sm:gap-2.5">
            <span
              className={cn(
                "mt-px grid h-[22px] w-[22px] flex-none place-items-center rounded-full sm:h-5 sm:w-5",
                hot ? "bg-[var(--qs-sun)] text-[#1A1240]" : "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
              )}
            >
              <Check className="h-[13px] w-[13px] sm:h-3 sm:w-3" strokeWidth={3.4} />
            </span>
            <span className="text-[15px] font-semibold leading-[1.4] sm:text-sm sm:leading-5">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(pack)}
        className={cn(
          "mt-5 flex h-[54px] w-full items-center justify-center rounded-[16px] border-[1.5px] border-[var(--qs-ink)] text-[16px] font-extrabold transition-colors sm:mt-0 sm:h-auto sm:rounded-[14px] sm:border-2 sm:py-[15px] sm:text-base sm:font-extrabold",
          hot
            ? "bg-[var(--qs-sun)] text-[#1A1240] hover:brightness-105"
            : "bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:bg-[var(--qs-ink)] hover:text-[var(--qs-bg)]"
        )}
      >
        {pack.cta}
      </button>
    </article>
  );
}

export function CreditPacks({
  packs,
  onSelect,
}: {
  packs: CreditPurchasePack[];
  onSelect: (pack: CreditPurchasePack) => void;
}) {
  const balance = useAICreditsStore((state) => state.balance);
  const { subscription } = useMySubscription();
  const { catalog } = usePricingCatalog();
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const trialLabel = trialPlan ? `${trialPlan.name} trial` : "Trial";
  const trialState = getTrialState(subscription);
  const isTrial = trialState === "active" || (!subscription && balance.planId === "free");
  const activePlanId = subscription?.planSlug ?? balance.planId;
  const trialEndsOn = formatTrialEnd(subscription?.trialEnd ?? null);
  const currentPlan = catalog.plans.find((plan) => plan.slug === activePlanId);
  const displayPlan = currentPlan;
  const basePack = packs.reduce<CreditPurchasePack | undefined>(
    (highest, pack) =>
      !highest || pack.price / pack.credits > highest.price / highest.credits ? pack : highest,
    undefined
  );
  // The trial has no paid plan card. Keep this page focused on purchasable
  // packs and show the trial state in the heading instead.
  const showCurrentPlan = !isTrial && Boolean(currentPlan);

  return (
    <div>
      <p className="mb-3 mt-0 text-[14px] font-medium leading-[1.45] text-[var(--qs-muted)] sm:mb-6 sm:mt-2 sm:text-[14px] sm:leading-normal">
        {trialState === "active" ? (
          `${trialLabel} · ${BASIC_TRIAL_CREDITS} AI credits${trialEndsOn ? ` · ends ${trialEndsOn}` : ""}.`
        ) : trialState === "expired" ? (
          `${trialLabel} expired · no monthly AI credits. Add a one-time pack when you need credits.`
        ) : (
          <>
            {displayPlan?.name ?? (subscription?.status === "free" ? "Free plan" : "Current plan")}
            {displayPlan && displayPlan.credits > 0
              ? ` · ${displayPlan.credits} credits/month · add a pack anytime.`
              : " · buy a one-time pack when you need credits."}
          </>
        )}
      </p>

      <div
        className={cn(
          "grid items-start gap-[18px] sm:gap-6",
          showCurrentPlan && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"
        )}
      >
        {showCurrentPlan && currentPlan && (
          <section aria-labelledby="monthly-plan-heading">
            <h3
              id="monthly-plan-heading"
              className="mb-4 hidden text-[18px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:block"
            >
              Monthly plan
            </h3>
            <CurrentPlanCard plan={currentPlan} />
          </section>
        )}

        <section aria-label="AI credit packs">
          <div className="grid items-stretch gap-[18px] sm:grid-cols-2 sm:gap-6 lg:grid-cols-2">
            {packs.map((pack) => (
              <CreditPackCard key={pack.id} pack={pack} basePack={basePack} onSelect={onSelect} />
            ))}
          </div>
        </section>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--qs-muted)] sm:mt-7 sm:text-[13px]">
        <Lock className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
        Secure payments via UPI, Cards &amp; Net Banking
      </p>
    </div>
  );
}
