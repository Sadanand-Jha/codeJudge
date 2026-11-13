"use client";

import { useState } from "react";
import { Check, Zap } from "lucide-react";
import { CreditCoin } from "@/components/creator/billing/CreditCoin";
import { PublicPlanCta } from "@/components/pricing/PublicCheckoutCta";
import { formatBillingPeriod, formatPricingAmount } from "@/services/pricing";
import type { PricingPlan } from "@/types/pricing";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/helpers";

export function LandingPlanCard({
  plan,
  checkoutAvailable = true,
  countryName,
}: {
  plan: PricingPlan;
  checkoutAvailable?: boolean;
  countryName?: string;
}) {
  const defaultPrice =
    plan.prices.find((price) => price.billingPeriod === "monthly") ?? plan.prices[0];
  const [priceId, setPriceId] = useState(defaultPrice?.id ?? null);
  const selectedPrice = plan.prices.find((price) => price.id === priceId) ?? defaultPrice;
  const amount = selectedPrice?.amount ?? plan.price;
  const originalPrice = selectedPrice?.originalPrice ?? null;
  const discount =
    originalPrice && originalPrice > amount
      ? Math.round((1 - amount / originalPrice) * 100)
      : 0;
  const isFree = plan.price === 0;
  const features = (
    plan.features.length
      ? plan.features
      : [`${plan.quizzes} quiz creations`, `${plan.rooms} rooms`]
  )
    .filter((feature) => !/trial/i.test(feature))
    .slice(0, 5);

  if (isFree) {
    return (
      <article
        className="relative flex flex-col rounded-[24px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 text-[var(--qs-ink)] shadow-[0_2px_10px_rgba(27,24,64,0.06)]"
        aria-labelledby={`plan-${plan.id}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-[var(--qs-line)] bg-[var(--qs-poly-1)]">
              <Zap className="h-5 w-5 text-[var(--qs-brand)]" strokeWidth={2.2} />
            </span>
            <span className="truncate text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--qs-ink)]">
              {plan.name}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[var(--qs-poly-1)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
            Free plan
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-[38px] font-extrabold leading-none tracking-[-0.03em] text-[var(--qs-ink)]">
            Free
          </span>
        </div>

        <p className="mt-2 text-[12.5px] leading-5 text-[var(--qs-muted)]">
          {plan.description || plan.tagline}
        </p>

        {plan.trialDays > 0 ? (
          <p className="mt-2 w-fit rounded-full bg-[var(--qs-poly-1)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--qs-muted)]">
            {plan.trialDays}-day trial · approval required
          </p>
        ) : null}

        {countryName ? (
          <p className="mt-2 text-[10.5px] font-medium text-[var(--qs-muted)]">Pricing for {countryName}</p>
        ) : null}

        <ul className="mt-3 grid flex-1 gap-2 border-t border-dashed border-[var(--qs-line)] pt-3 text-[12.5px] text-[var(--qs-ink)]">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
                <Check className="h-3 w-3" strokeWidth={3.5} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <PublicPlanCta
          planSlug={plan.slug}
          priceId={selectedPrice?.id}
          skipSuggestion
          className="mt-4 flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-3 text-[12.5px] font-bold text-[var(--qs-brand)] transition-all hover:border-[var(--qs-brand)] active:translate-y-px"
          isFree
          label={plan.cta || "Start free"}
        />
      </article>
    );
  }

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-[24px] border-2 border-[#1b1740] bg-[linear-gradient(155deg,#34268a_0%,#231a66_45%,#1b1740_100%)] p-5 !text-white",
        plan.featured
          ? "border-[#f6bf2f]/70 shadow-[0_24px_55px_-20px_rgba(246,191,47,0.35)]"
          : "shadow-[0_24px_55px_-26px_rgba(40,25,120,0.65)]"
      )}
      aria-labelledby={`plan-${plan.id}`}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#f6bf2f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#3b2400]">
          Most popular
        </span>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-[#f6bf2f]/45 bg-[#f6bf2f]/15">
            <Zap className="h-5 w-5 text-[#f6bf2f]" strokeWidth={2.2} />
          </span>
          <span className="truncate text-[13px] font-bold uppercase tracking-[0.08em] !text-white/80">
            {plan.name}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] !text-white/75">
          {isFree ? "Free plan" : "Monthly"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[38px] font-extrabold leading-none tracking-[-0.03em] !text-white">
            {isFree ? "Free" : formatPricingAmount(amount, selectedPrice?.currency ?? plan.currency)}
          </span>
          {!isFree && originalPrice != null && originalPrice > amount ? (
            <s className="text-[13px] font-semibold !text-white/50">
              {formatPricingAmount(originalPrice, selectedPrice?.currency ?? plan.currency)}
            </s>
          ) : null}
          {!isFree && (
            <span className="text-[12px] font-semibold !text-white/65">
              / {selectedPrice ? formatBillingPeriod(selectedPrice.billingPeriod, selectedPrice.customDays).toLowerCase() : "month"}
            </span>
          )}
        </div>
        {plan.discountBadge || discount > 0 ? (
          <span className="rounded-full bg-[#f6bf2f] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#3b2400]">
            {plan.discountBadge || `${discount}% off`}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-[12.5px] leading-5 !text-white/70">
        {plan.description || plan.tagline}
      </p>

      {plan.offer ? (
        <p className="mt-2 w-fit rounded-full border border-[#f6bf2f]/40 bg-[#f6bf2f]/10 px-2.5 py-1 text-[10.5px] font-semibold !text-[#ffe6a8]">
          {plan.offer}
        </p>
      ) : null}
      {plan.trialDays > 0 ? (
        <p className="mt-2 w-fit rounded-full border border-[#6ee7b7]/35 bg-[#6ee7b7]/10 px-2.5 py-1 text-[10.5px] font-semibold !text-[#c7ffe9]">
          {plan.trialDays}-day trial · approval required
        </p>
      ) : null}

      {plan.credits > 0 ? (
        <span className="mt-3 flex items-center gap-2 rounded-[12px] border border-[#f6bf2f]/35 bg-[#f6bf2f]/10 px-2.5 py-2 text-[12.5px] font-semibold !text-white">
          <CreditCoin className="h-5 w-5 shrink-0" />
          {plan.credits.toLocaleString("en-IN")} AI credits / month
        </span>
      ) : null}

      {countryName ? (
        <p className="mt-2 text-[10.5px] font-medium !text-white/55">Pricing for {countryName}</p>
      ) : null}
      {plan.prices.length > 1 ? (
        <label className="mt-3 grid gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] !text-white/60">
          Billing period
          <Select
            value={selectedPrice?.id ?? ""}
            onChange={(event) => setPriceId(Number(event.target.value))}
            tone="dark"
            className="min-h-[38px] w-full rounded-[10px] border border-white/20 bg-white/10 px-2.5 text-[12px] font-semibold text-white transition-colors hover:border-white/40"
          >
            {plan.prices.map((price) => (
              <option key={price.id} value={price.id}>
                {formatBillingPeriod(price.billingPeriod, price.customDays)} ·{" "}
                {formatPricingAmount(price.amount, price.currency)}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      <ul className="mt-3 grid flex-1 gap-2 border-t-2 border-dashed border-white/20 pt-3 text-[12.5px] !text-white/85">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#22c55e] !text-white">
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <PublicPlanCta
        planSlug={plan.slug}
        priceId={selectedPrice?.id}
        skipSuggestion={selectedPrice?.billingPeriod !== "monthly"}
        className={cn(
          "mt-4 flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-[12px] border px-3 text-[12.5px] font-bold transition-all active:translate-y-px",
          isFree
            ? "border-[#6ee7b7]/40 bg-[#6ee7b7]/15 !text-[#d7fff1] hover:bg-[#6ee7b7]/25"
            : "border-white/20 bg-[linear-gradient(135deg,#8b6cff,#5b3fe8)] !text-white shadow-[0_12px_26px_-12px_rgba(123,92,255,0.9)] hover:brightness-110"
        )}
        isFree={isFree}
        disabled={!isFree && !checkoutAvailable}
        label={
          !isFree && !checkoutAvailable
            ? "Checkout unavailable"
            : plan.cta || (isFree ? "Start free" : `Choose ${plan.name}`)
        }
      />
      {!isFree && !checkoutAvailable ? (
        <p role="status" className="mt-2 text-center text-[10.5px] font-medium !text-white/55">
          Checkout in {selectedPrice?.currency ?? plan.currency} is not enabled yet.
        </p>
      ) : null}
    </article>
  );
}
