"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PublicPlanCta } from "@/components/pricing/PublicCheckoutCta";
import { formatBillingPeriod, formatPricingAmount } from "@/services/pricing";
import type { PricingPlan } from "@/types/pricing";
import Select from "@/components/ui/Select";

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
  const isFree = amount === 0;
  const features = (
    plan.features.length
      ? plan.features
      : [`${plan.quizzes} quiz creations`, `${plan.rooms} rooms`]
  )
    .filter((feature) => !/trial/i.test(feature))
    .slice(0, 6);

  return (
    <article
      className={`landing-plan-card pricing-plan-card${plan.featured ? " is-featured" : ""}`}
      aria-labelledby={`plan-${plan.id}`}
    >
      <div className="landing-plan-top">
        <span>
          {plan.featured ? "MOST POPULAR" : plan.price === 0 ? "FREE PLAN" : "MONTHLY PLAN"}
        </span>
        {plan.featured ? <i aria-hidden /> : null}
      </div>
      <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
      <p className="landing-plan-description">{plan.description || plan.tagline}</p>
      {plan.offer ? <p className="pricing-plan-offer">{plan.offer}</p> : null}
      {plan.trialDays > 0 ? (
        <p className="pricing-plan-trial">
          {plan.trialDays}-day trial available · approval required
        </p>
      ) : null}

      <div className="pricing-plan-price-row">
        <div className="landing-plan-price">
          <b>{isFree ? "Free" : formatPricingAmount(amount, selectedPrice?.currency ?? plan.currency)}</b>
          {!isFree && originalPrice != null && originalPrice > amount ? (
            <s>{formatPricingAmount(originalPrice, selectedPrice?.currency ?? plan.currency)}</s>
          ) : null}
          <span>
            {isFree
              ? "forever"
              : `/ ${selectedPrice ? formatBillingPeriod(selectedPrice.billingPeriod, selectedPrice.customDays).toLowerCase() : "month"}`}
          </span>
        </div>
        {plan.discountBadge || discount > 0 ? (
          <span className="pricing-plan-badge">{plan.discountBadge || `${discount}% off`}</span>
        ) : null}
      </div>
      {countryName ? <p className="pricing-plan-country">Pricing for {countryName}</p> : null}
      {plan.prices.length > 1 ? (
        <label className="pricing-plan-billing">
          Billing period
          <Select
            value={selectedPrice?.id ?? ""}
            onChange={(event) => setPriceId(Number(event.target.value))}
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

      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <Check size={15} aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <PublicPlanCta
        planSlug={plan.slug}
        priceId={selectedPrice?.id}
        skipSuggestion={selectedPrice?.billingPeriod !== "monthly"}
        className="landing-plan-link pricing-plan-cta"
        isFree={isFree}
        disabled={!isFree && !checkoutAvailable}
        label={
          !isFree && !checkoutAvailable
            ? "Checkout unavailable"
            : plan.cta || (isFree ? "Start free" : `Choose ${plan.name}`)
        }
      />
      {!isFree && !checkoutAvailable ? (
        <p role="status" className="pricing-plan-note">
          Checkout in {selectedPrice?.currency ?? plan.currency} is not enabled yet.
        </p>
      ) : null}
    </article>
  );
}
