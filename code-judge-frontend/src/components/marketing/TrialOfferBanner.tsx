"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/helpers";
import { BASIC_TRIAL_CREDITS } from "@/lib/constants";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { formatPricingAmount, getPlanDiscount } from "@/services/pricing";

interface TrialOfferBannerProps {
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
  showBasicOffer?: boolean;
}

function TrialCoin({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)]",
        inverted ? "bg-white" : "bg-[var(--qs-sun)]"
      )}
    >
      <Star className="h-6 w-6 fill-[var(--qs-ink)] text-[var(--qs-ink)]" />
    </span>
  );
}

export function TrialOfferBanner({
  className,
  ctaHref = "/creator/billing/plans#trial-request",
  ctaLabel = "Request free trial",
  showBasicOffer = false,
}: TrialOfferBannerProps) {
  const { catalog } = usePricingCatalog();
  const basicPlan = catalog.plans.find((plan) => plan.slug === "basic");
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const basicDiscount = basicPlan ? getPlanDiscount(basicPlan) : 0;
  const { status: trialStatus, isLoading: trialLoading } = useTrialStatus();
  const trialDays = trialPlan?.trialDays ?? 0;
  const planName = trialPlan?.name ?? "Basic";
  const trialCredits = BASIC_TRIAL_CREDITS;

  // Wait for the backend check before deciding to show the offer. Rendering
  // while status is still unknown causes the banner to flash for users who
  // are already subscribed or have already used the trial.
  if (trialLoading || !trialStatus || !trialStatus.eligible) return null;

  return (
    <section
      aria-label="Free trial offer"
      className={cn(
        "relative grid gap-7 overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-6 text-[var(--qs-on-brand)] shadow-[8px_8px_0_var(--qs-sun)] sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:items-center",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[60px] -top-[80px] h-[260px] w-[260px] rounded-full bg-white/[0.08]"
      />

      <div className="relative min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-ink)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-sun)]">
          <Sparkles className="h-3 w-3 fill-current" />
          Free trial
        </span>

        <h2 className="mt-4 mb-3 text-[38px] font-extrabold leading-none tracking-[-0.035em] sm:text-[46px]">
          Try everything,
          <br />
          <em className="not-italic text-[var(--qs-sun)]">
            {trialDays > 0 ? `free for ${trialDays} days` : "free to start"}
          </em>
        </h2>

        <p className="max-w-[440px] text-[15.5px] font-medium leading-relaxed text-white/[0.88]">
          Request the {planName} trial and get {trialCredits} AI credits. Owner approval
          required — no card, no lock-in.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-2 text-[13px] font-extrabold text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-ink)] transition-transform hover:-translate-y-0.5 active:translate-y-px active:shadow-none"
          >
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ink)]/20 bg-white/80 px-3.5 py-2 text-[12.5px] font-bold text-[var(--qs-ink)]">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
            Owner approval · no card required
          </span>
        </div>

        {showBasicOffer && basicPlan && basicDiscount > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-[14px] font-bold">
            <span className="rounded-full bg-[var(--qs-ink)] px-2.5 py-1 text-[var(--qs-sun)]">
              {basicPlan.name} {basicPlan.discountBadge || `${basicDiscount}% off`}
            </span>
            <span>
              {formatPricingAmount(basicPlan.price, basicPlan.currency)}/month{" "}
              {basicPlan.originalPrice ? (
                <s className="opacity-60">
                  {formatPricingAmount(basicPlan.originalPrice, basicPlan.currency)}
                </s>
              ) : null}{" "}
              {basicPlan.offer ? `— ${basicPlan.offer}` : "— limited period."}
            </span>
          </p>
        )}
      </div>

      <div className="relative grid gap-3.5">
        <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)]">
          <TrialCoin />
          <div className="min-w-0">
            <small className="block text-[12px] font-bold text-[var(--qs-muted)]">
              You get during the trial
            </small>
            <b className="block text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em]">
              {trialCredits}{" "}
              <span className="text-[14px] font-bold tracking-normal">AI credits</span>
            </b>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] p-4 text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)] sm:ml-[22px]">
          <TrialCoin inverted />
          <div className="min-w-0">
            <small className="block text-[12px] font-bold text-[#5b4a10]">
              You unlock on approval
            </small>
            <b className="block text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em]">
              Full {planName} access
            </b>
          </div>
        </div>
      </div>
    </section>
  );
}
