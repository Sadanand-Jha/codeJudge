"use client";

import Link from "next/link";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { CREATOR_PLANS, getCreatorPlan, type CreatorPlan } from "@/config/creatorPlans";
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


function CurrentPlanCard({ plan }: { plan: CreatorPlan }) {
  const included = plan.credits > 0;
  const features = included
    ? [
        `Up to ${plan.quizzes} quiz creations`,
        `${plan.credits} AI credits every month`,
        "Top up anytime when you need more",
      ]
    : [
        "Basic platform access",
        "Pay only for the credits you use",
        "Buy a top-up whenever you need AI",
      ];

  return (
    <article
      aria-current="true"
      aria-label={`${plan.name} plan — current plan`}
      className="relative flex flex-col rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-[26px] pb-7 pt-7 text-[var(--qs-ink)] max-[900px]:order-first"
    >
      <span className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--qs-ok)] px-4 py-[5px] text-[13px] font-extrabold text-white">
        <Sparkles className="h-3 w-3" />
        Current plan
      </span>

      <div className="flex items-center justify-between gap-2.5">
        <h3 className="text-[20px] font-extrabold tracking-tight">{plan.name}</h3>
        <span className="whitespace-nowrap rounded-full bg-[var(--qs-okbg)] px-[11px] py-0.5 text-[12px] font-extrabold tracking-wide text-[var(--qs-ok)]">
          Active
        </span>
      </div>

      <p className="my-5 mb-2.5 text-[64px] font-black leading-none tracking-tight">
        ₹{plan.price}
        {plan.price > 0 && (
          <span className="ml-2 text-base font-bold text-[var(--qs-muted)]">/ month</span>
        )}
      </p>
      <p className="text-base font-bold">
        {included ? `${plan.credits} AI credits included` : "No monthly credits"}
      </p>
      <p className="mt-3 mb-[18px] min-h-[46px] text-[var(--qs-muted)]">
        {included
          ? "Your plan includes credits every month. Add a pack only when you need extra."
          : "Your current plan. Buy a credit pack only when you need AI credits."}
      </p>

      <ul className="m-0 mb-[26px] flex flex-1 list-none flex-col gap-[11px] border-t-2 border-dashed border-[var(--qs-line)] pt-[18px]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            <span className="text-sm font-medium leading-5">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/pricing"
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] py-[15px] text-base font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
      >
        View monthly plans
        <ArrowRight className="h-4 w-4" />
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
        "relative flex flex-col rounded-[26px] border-2 border-[var(--qs-ink)] px-[26px] pb-7",
        hot
          ? "bg-[var(--qs-brand)] pt-10 text-[var(--qs-on-brand)] shadow-[10px_10px_0_var(--qs-sun)] max-[900px]:-order-1"
          : "bg-[var(--qs-surface)] pt-7 text-[var(--qs-ink)]"
      )}
    >
      {hot && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--qs-ink)] px-4 py-[5px] text-[13px] font-extrabold text-[var(--qs-bg)]">
          ★ Most Popular
        </span>
      )}

      <div className="flex items-center justify-between gap-2.5">
        <h3 className="text-[20px] font-extrabold tracking-tight">{pack.name}</h3>
        {save > 0 && (
          <span className="whitespace-nowrap rounded-full bg-[var(--qs-sun)] px-[11px] py-0.5 text-[12px] font-extrabold tracking-wide text-[#1A1240]">
            Save {save}%
          </span>
        )}
      </div>

      <p className="my-5 mb-2.5 text-[64px] font-black leading-none tracking-tight">
        ₹{pack.price}
      </p>
      <p className="text-base font-bold">
        {pack.credits} credits{" "}
        <span className={cn("font-medium", hot ? "opacity-[0.88]" : "text-[var(--qs-muted)]")}>
          · ₹{(pack.price / pack.credits).toFixed(2)} / credit
        </span>
      </p>
      <p
        className={cn(
          "mt-3 mb-[18px] min-h-[46px]",
          hot ? "opacity-[0.88]" : "text-[var(--qs-muted)]"
        )}
      >
        {pack.blurb}
      </p>

      <ul
        className={cn(
          "m-0 mb-[26px] flex flex-1 list-none flex-col content-start gap-[11px] border-t-2 border-dashed pt-[18px]",
          hot ? "border-white/35" : "border-[var(--qs-line)]"
        )}
      >
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-px grid h-5 w-5 flex-none place-items-center rounded-full",
                hot ? "bg-[var(--qs-sun)] text-[#1A1240]" : "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            <span className="text-sm font-medium leading-5">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onSelect(pack)}
        className={cn(
          "w-full rounded-[14px] border-2 border-[var(--qs-ink)] py-[15px] text-base font-extrabold transition-colors",
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
  const currentPlan = getCreatorPlan(balance.planId) ?? CREATOR_PLANS[0];
  const basePack = packs.reduce<CreditPurchasePack | undefined>(
    (highest, pack) =>
      !highest || pack.price / pack.credits > highest.price / highest.credits ? pack : highest,
    undefined
  );

  return (
    <div>
      <div className="mb-6 mt-2 max-w-2xl">
        <h2 className="qs-display text-[26px] font-extrabold tracking-tight text-[var(--qs-ink)]">
          Plans &amp; credits
        </h2>
        <p className="mt-1 text-[14px] text-[var(--qs-muted)]">
          You&apos;re on the {currentPlan.name} plan.{" "}
          {currentPlan.credits > 0
            ? `${currentPlan.credits} AI credits are included each month; add a pack when you need more.`
            : "Buy a one-time pack when you need AI credits."}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <section aria-labelledby="monthly-plan-heading">
          <div className="mb-4">
            <h3
              id="monthly-plan-heading"
              className="text-[18px] font-extrabold tracking-tight text-[var(--qs-ink)]"
            >
              Monthly plan
            </h3>
            <p className="mt-1 text-[13px] font-medium text-[var(--qs-muted)]">
              Your current subscription and monthly AI allowance.
            </p>
          </div>
          <CurrentPlanCard plan={currentPlan} />
        </section>

        <section aria-labelledby="ai-credits-heading">
          <div className="mb-4">
            <h3
              id="ai-credits-heading"
              className="text-[18px] font-extrabold tracking-tight text-[var(--qs-ink)]"
            >
              AI credits
            </h3>
            <p className="mt-1 text-[13px] font-medium text-[var(--qs-muted)]">
              One-time top-up packs. No subscription required.
            </p>
          </div>
          <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {packs.map((pack) => (
              <CreditPackCard key={pack.id} pack={pack} basePack={basePack} onSelect={onSelect} />
            ))}
          </div>
        </section>
      </div>

      <p className="mt-7 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--qs-muted)]">
        <Lock className="h-3.5 w-3.5" />
        Secure payments via UPI, Cards &amp; Net Banking
      </p>
    </div>
  );
}
