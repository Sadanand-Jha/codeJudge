"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Coins,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  CREATOR_PLANS,
  getCreatorPlan,
  type CreatorPlan,
} from "@/config/creatorPlans";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { PageHeader } from "./ui";

const OUTLINE_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)]";
const PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.08em]";

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function PlanCard({
  plan,
  currentPlanId,
}: {
  plan: CreatorPlan;
  currentPlanId: string;
}) {
  const isCurrent = plan.id === currentPlanId;
  const isHot = plan.featured && !isCurrent;
  const includedCredits = plan.credits > 0;

  return (
    <article
      aria-labelledby={`studio-plan-${plan.id}`}
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
          id={`studio-plan-${plan.id}`}
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
          {plan.price === 0 ? "Free forever" : "Monthly"}
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

      <p className="mt-4 text-[44px] font-black leading-none tracking-tight">
        {inr(plan.price)}
        {plan.price > 0 && (
          <span
            className={cn(
              "ml-1.5 align-middle text-[13px] font-bold tracking-normal",
              isHot ? "text-[var(--qs-on-brand)]/80" : "text-[var(--qs-muted)]"
            )}
          >
            / month
          </span>
        )}
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
        {plan.features.map((feature) => (
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
      ) : (
        <Link
          href="/pricing#plans"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] py-[13px] text-[14px] font-extrabold transition-all",
            isHot
              ? "bg-[var(--qs-sun)] text-[#1A1240] hover:brightness-105"
              : "bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:bg-[var(--qs-ink)] hover:text-[var(--qs-bg)]"
          )}
        >
          {plan.price === 0 ? "Switch to Free" : `Upgrade to ${plan.name}`}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </article>
  );
}

export function MonthlyPlansPage() {
  const balance = useAICreditsStore((state) => state.balance);
  const currentPlan = getCreatorPlan(balance.planId) ?? CREATOR_PLANS[0];

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        title="Monthly plans"
        subtitle="Pick the plan that matches how often you run quizzes. Paid plans include monthly AI credits."
        actions={
          <>
            <Link href="/creator/billing/credits" className={OUTLINE_BTN}>
              <Coins className="h-4 w-4" />
              Buy AI credits
            </Link>
            <Link href="/pricing#plans" className={PRIMARY_BTN}>
              Compare on pricing
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
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
              {currentPlan.name}
              {currentPlan.price > 0 && (
                <span className="ml-1.5 font-semibold text-[var(--qs-muted)]">
                  · {inr(currentPlan.price)} / month
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] font-semibold text-[var(--qs-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
            {currentPlan.credits > 0
              ? `${currentPlan.credits.toLocaleString("en-IN")} AI credits / month`
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
      </section>

      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {CREATOR_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} currentPlanId={currentPlan.id} />
        ))}
      </div>

      <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-[12.5px] font-medium text-[var(--qs-muted)]">
        <CalendarClock className="h-3.5 w-3.5" />
        Prices include GST. Plan changes take effect from the next billing cycle.
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
    </div>
  );
}
