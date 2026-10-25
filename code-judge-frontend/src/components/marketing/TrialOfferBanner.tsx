"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { getPlanDiscount } from "@/services/pricing";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import { useAuthStore } from "@/store/authStore";

interface TrialOfferBannerProps {
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
  showBasicOffer?: boolean;
}

export function TrialOfferBanner({
  className,
  ctaHref = "/register",
  ctaLabel = "Start quiz-only trial",
  showBasicOffer = false,
}: TrialOfferBannerProps) {
  const { catalog } = usePricingCatalog();
  const basicPlan = catalog.plans.find((plan) => plan.slug === "basic");
  const basicDiscount = basicPlan ? getPlanDiscount(basicPlan) : 0;
  const user = useAuthStore((state) => state.user);
  const balance = useAICreditsStore((state) => state.balance);
  const purchases = useAICreditsStore((state) => state.purchases);

  const [now] = useState(() => Date.now());
  const createdAt = user?.createdAt ? Date.parse(user.createdAt) : NaN;
  const trialDays = basicPlan?.trialDays ?? 7;
  const isNewAccount =
    Number.isFinite(createdAt) &&
    now - createdAt < trialDays * 24 * 60 * 60 * 1000;
  const hasNoPurchases =
    purchases.length === 0 &&
    balance.purchasedCredits === 0 &&
    balance.purchasedCreditsConsumed === 0;
  const isTrialEligible =
    isNewAccount &&
    hasNoPurchases &&
    balance.planId === "free" &&
    !balance.hasActiveSubscription;

  if (!isTrialEligible) return null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] p-5 text-[#1a1240] shadow-[8px_8px_0_var(--qs-ink)] sm:p-7",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full border-[22px] border-[#1a1240]/10"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full border-[18px] border-[#1a1240]/10"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1a1240] bg-[#1a1240] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--qs-sun)]">
            <Sparkles className="h-3 w-3" />
            New account offer
          </span>
          <p className="qs-display mt-3 text-[clamp(34px,6vw,62px)] font-extrabold leading-[0.92] tracking-[-0.04em]">
            7-day free trial
          </p>
          <p className="mt-2 text-[clamp(16px,2vw,21px)] font-extrabold">
            Quiz-only trial. No AI credits. No card required.
          </p>
          {showBasicOffer && basicPlan && basicDiscount > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] font-bold">
              <span className="rounded-full bg-[#1a1240] px-2.5 py-1 text-[var(--qs-sun)]">
                Basic {basicDiscount}% off
              </span>
              <span>
                ₹{basicPlan.price}/month{" "}
                <s className="opacity-60">₹{basicPlan.originalPrice}</s> — limited
                period.
              </span>
            </p>
          )}
        </div>
        <Link
          href={ctaHref}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[14px] border-2 border-[#1a1240] bg-[#1a1240] px-6 py-4 text-[15px] font-extrabold text-[var(--qs-sun)] shadow-[4px_4px_0_rgba(26,18,64,0.25)] transition-transform hover:-translate-y-0.5"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
