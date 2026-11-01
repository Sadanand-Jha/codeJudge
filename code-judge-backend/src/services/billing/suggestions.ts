// Pure checkout-upsell calculations. Database and gateway I/O stay outside so
// eligibility, prices and value copy are deterministic and unit-testable.

import type {
  PurchasableCreditPack,
  PurchasablePlanBundle,
} from "../../repositories/billing.repository.ts";
import { validityDaysForPeriod } from "./calculations.ts";

export interface SuggestedPlan {
  id: number;
  slug: string;
  name: string;
  pricePaise: number;
  credits: number;
  validityDays: number;
  currency: string;
}

export interface SuggestedPack {
  id: number;
  code: string;
  name: string;
  priceInr: number;
  pricePaise: number;
  credits: number;
  validityDays: number;
}

export interface PlanBundleSuggestion {
  kind: "plan_bundle";
  suggestionType: "A";
  productId: string;
  bundleId: number;
  sourceProductId: string;
  title: string;
  description: string;
  badge: string;
  amountPaise: number;
  compareAtPaise: number;
  savingsPaise: number;
  credits: number;
  planCredits: number;
  packCredits: number;
  perCreditPaise: number;
  plan: SuggestedPlan;
  pack: SuggestedPack;
}

export interface PackUpgradeSuggestion {
  kind: "pack_upgrade";
  suggestionType: "B";
  productId: string;
  sourceProductId: string;
  title: string;
  description: string;
  badge: string;
  amountPaise: number;
  comparedAmountPaise: number;
  priceDifferencePaise: number;
  extraCredits: number;
  creditMultiplier: number;
  credits: number;
  perCreditPaise: number;
  sourcePack: SuggestedPack;
  pack: SuggestedPack;
}

export type CheckoutSuggestion = PlanBundleSuggestion | PackUpgradeSuggestion;

function suggestedPack(pack: PurchasableCreditPack): SuggestedPack {
  return {
    id: pack.id,
    code: pack.code,
    name: pack.name,
    priceInr: pack.priceInr,
    pricePaise: pack.priceInr * 100,
    credits: pack.credits,
    validityDays: pack.validityDays,
  };
}

/**
 * Builds the monthly-plan bundle suggestion. The comparison price is always the
 * live plan + pack selling price, and a bundle is shown only when it is
 * genuinely cheaper and adds credits. Existing subscribers never see it.
 */
export function buildPlanBundleSuggestion(input: {
  bundle: PurchasablePlanBundle;
  hasActivePlan: boolean;
}): PlanBundleSuggestion | null {
  const { bundle, hasActivePlan } = input;
  if (hasActivePlan) return null;

  const regularPaise = bundle.plan.amountPaise + bundle.pack.priceInr * 100;
  const amountPaise = Math.max(0, Math.trunc(bundle.amountPaise));
  const credits = Math.max(0, bundle.plan.credits) + Math.max(0, bundle.pack.credits);
  if (amountPaise <= 0 || amountPaise >= regularPaise || credits <= 0) {
    return null;
  }

  const plan: SuggestedPlan = {
    id: bundle.plan.planId,
    slug: bundle.plan.slug,
    name: bundle.plan.name,
    pricePaise: bundle.plan.amountPaise,
    credits: bundle.plan.credits,
    validityDays: validityDaysForPeriod(
      bundle.plan.billingPeriod,
      bundle.plan.customDays
    ),
    currency: bundle.plan.currency,
  };
  const pack = suggestedPack(bundle.pack);
  const savingsPaise = regularPaise - amountPaise;

  return {
    kind: "plan_bundle",
    suggestionType: "A",
    productId: `bundle:${bundle.id}`,
    bundleId: bundle.id,
    sourceProductId: `plan:${bundle.planId}`,
    title: `${bundle.plan.name} + ${bundle.pack.credits} AI credits`,
    description: `Everything in ${bundle.plan.name}, plus ${bundle.pack.credits} extra AI credits in one payment.`,
    badge: bundle.badge,
    amountPaise,
    compareAtPaise: regularPaise,
    savingsPaise,
    credits,
    planCredits: bundle.plan.credits,
    packCredits: bundle.pack.credits,
    perCreditPaise: amountPaise / credits,
    plan,
    pack,
  };
}

/**
 * Finds the lowest-priced larger pack that improves the per-credit rate. Users
 * who already own that pack (or a more expensive one) are not upsold again.
 */
export function buildPackUpgradeSuggestion(input: {
  selectedPack: PurchasableCreditPack;
  packs: PurchasableCreditPack[];
  highestOwnedPackPriceInr?: number | null;
}): PackUpgradeSuggestion | null {
  const { selectedPack, packs } = input;
  if (selectedPack.credits <= 0) return null;

  const selectedRate = selectedPack.priceInr / selectedPack.credits;
  const candidates = packs
    .filter(
      (pack) =>
        pack.id !== selectedPack.id &&
        pack.credits > selectedPack.credits &&
        pack.priceInr > selectedPack.priceInr &&
        pack.priceInr / pack.credits < selectedRate
    )
    .sort((a, b) => a.priceInr - b.priceInr || a.id - b.id);

  const candidate = candidates[0];
  if (!candidate) return null;

  const highestOwned = input.highestOwnedPackPriceInr ?? 0;
  if (highestOwned >= candidate.priceInr) return null;

  const source = suggestedPack(selectedPack);
  const pack = suggestedPack(candidate);
  const extraCredits = pack.credits - source.credits;
  const amountPaise = pack.pricePaise;
  const comparedAmountPaise = source.pricePaise;

  return {
    kind: "pack_upgrade",
    suggestionType: "B",
    productId: `pack:${pack.code}`,
    sourceProductId: `pack:${source.code}`,
    title: `${pack.name} — ${pack.credits} AI credits`,
    description: `Pay ₹${pack.priceInr} instead of ₹${source.priceInr} and get ${extraCredits} more credits.`,
    badge: "Best value",
    amountPaise,
    comparedAmountPaise,
    priceDifferencePaise: amountPaise - comparedAmountPaise,
    extraCredits,
    creditMultiplier: pack.credits / source.credits,
    credits: pack.credits,
    perCreditPaise: amountPaise / pack.credits,
    sourcePack: source,
    pack,
  };
}

/**
 * Returns a stable analytics product id for a suggestion's final checkout item.
 */
export function suggestionProductId(
  suggestion: CheckoutSuggestion | null | undefined
): string | null {
  return suggestion?.productId ?? null;
}
