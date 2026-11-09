"use client";

import { useState } from "react";
import { PublicPlanCta } from "@/components/pricing/PublicCheckoutCta";
import type { PricingPlan } from "@/types/pricing";
import { formatBillingPeriod, formatPricingAmount } from "@/services/pricing";
import Select from "@/components/ui/Select";

export function PublicPlanBuyOption({
  plan,
  label,
  checkoutAvailable = true,
  countryName,
}: {
  plan: PricingPlan;
  label: string;
  checkoutAvailable?: boolean;
  countryName?: string;
}) {
  const defaultPrice =
    plan.prices.find((price) => price.billingPeriod === "monthly") ?? plan.prices[0];
  const [priceId, setPriceId] = useState(defaultPrice?.id ?? null);
  const selectedPrice = plan.prices.find((price) => price.id === priceId) ?? defaultPrice;
  const amount = selectedPrice?.amount ?? plan.price;
  const originalPrice = selectedPrice?.originalPrice ?? null;
  const discount = originalPrice && originalPrice > amount
    ? Math.round((1 - amount / originalPrice) * 100)
    : 0;
  const isFree = amount === 0;

  return (
    <>
      <div className="qp-price">
        <b>{isFree ? "Free" : formatPricingAmount(amount, selectedPrice?.currency ?? plan.currency)}</b>
        {discount > 0 && originalPrice != null && <s>{formatPricingAmount(originalPrice, selectedPrice?.currency ?? plan.currency)}</s>}
        <span>{isFree ? "forever" : `/ ${selectedPrice ? formatBillingPeriod(selectedPrice.billingPeriod, selectedPrice.customDays).toLowerCase() : "month"}`}</span>
      </div>
      {countryName && (
        <p className="mt-1 text-[11px] font-semibold text-[var(--qs-muted)]">
          Pricing for {countryName}
        </p>
      )}
      {plan.prices.length > 1 && (
        <label className="mt-2 block text-xs font-semibold text-[var(--qs-muted)]">
          Billing period
          <Select
            className="mt-1 w-full rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-sm text-[var(--qs-ink)]"
            value={selectedPrice?.id ?? ""}
            onChange={(event) => setPriceId(Number(event.target.value))}
          >
            {plan.prices.map((price) => (
              <option key={price.id} value={price.id}>
                {formatBillingPeriod(price.billingPeriod, price.customDays)} · {formatPricingAmount(price.amount, price.currency)}
              </option>
            ))}
          </Select>
        </label>
      )}
      <PublicPlanCta
        planSlug={plan.slug}
        priceId={selectedPrice?.id}
        skipSuggestion={selectedPrice?.billingPeriod !== "monthly"}
        className="btn qp-plan-cta"
        isFree={isFree}
        disabled={!isFree && !checkoutAvailable}
        label={!isFree && !checkoutAvailable ? "Checkout unavailable" : label}
      />
      {!isFree && !checkoutAvailable && (
        <p role="status" className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">
          Checkout in {selectedPrice?.currency ?? plan.currency} is not enabled yet.
        </p>
      )}
    </>
  );
}
