"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { PricingCreditPack, PricingPlan } from "@/types/pricing";

type Mode = "monthly" | "credits";

interface Props {
  plans: PricingPlan[];
  creditPacks: PricingCreditPack[];
  creditValidityMonths: number;
  trialDays: number;
}

function formatPrice(value: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

function hasFeature(plan: PricingPlan, needle: string) {
  return plan.features.some((feature) => feature.toLowerCase().includes(needle));
}

function Yes() {
  return <span className="lpx-tbl-yes">✓ Included</span>;
}

function No() {
  return <span className="lpx-tbl-no">—</span>;
}

export default function LpPricingTabs({
  plans,
  creditPacks,
  creditValidityMonths,
  trialDays,
}: Props) {
  const [mode, setMode] = useState<Mode>("monthly");

  const planRows = [
    { label: "Quiz creations", value: (plan: PricingPlan) => String(plan.quizzes) },
    { label: "Rooms", value: (plan: PricingPlan) => String(plan.rooms) },
    {
      label: "AI credits / month",
      value: (plan: PricingPlan) => (plan.credits > 0 ? String(plan.credits) : <No />),
    },
    { label: "Builder, codes, leaderboards", value: () => <Yes /> },
    { label: "Instant results", value: () => <Yes /> },
    {
      label: "Exports (PDF, Word, CSV)",
      value: (plan: PricingPlan) => (hasFeature(plan, "export") ? <Yes /> : <No />),
    },
    {
      label: "Priority support",
      value: (plan: PricingPlan) => (hasFeature(plan, "priority") ? <Yes /> : <No />),
    },
  ];

  const packRows = [
    { label: "Credits", value: (pack: PricingCreditPack) => String(pack.credits) },
    {
      label: "Price per credit",
      value: (pack: PricingCreditPack) =>
        formatPrice(Math.round((pack.price / Math.max(pack.credits, 1)) * 100) / 100),
    },
    {
      label: "Validity",
      value: (pack: PricingCreditPack) =>
        `${pack.validityMonths} ${pack.validityMonths === 1 ? "month" : "months"}`,
    },
    { label: "Best for", value: (pack: PricingCreditPack) => pack.blurb },
    { label: "Auto-renew", value: () => <No /> },
    { label: "Works with every plan", value: () => <Yes /> },
  ];

  const note =
    mode === "monthly"
      ? `${trialDays > 0 ? `Start with a ${trialDays}-day quiz-only trial. ` : ""}Every plan includes the builder, codes, instant results and leaderboards.`
      : `One-time payment. No auto-renew. Works with every plan.${
          creditValidityMonths > 0 ? ` Credits are valid for up to ${creditValidityMonths} months.` : ""
        } UPI, cards or net banking.`;

  const columns = mode === "monthly" ? plans : creditPacks;
  const rowDefs = mode === "monthly" ? planRows : packRows;

  return (
    <>
      <p className="lpx-lead">
        Every plan includes the builder, codes, instant results and leaderboards.
      </p>
      <div className="lpx-switch" role="tablist" aria-label="Pricing type">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "monthly"}
          onClick={() => setMode("monthly")}
        >
          Monthly plans
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "credits"}
          onClick={() => setMode("credits")}
        >
          AI credits
        </button>
      </div>
      <p className="lpx-note">{note}</p>

      {columns.length === 0 ? (
        <p className="lpx-note">
          {mode === "monthly"
            ? "Plans are currently unavailable. Please check back later."
            : "Credit packs are currently unavailable. Please check back later."}
        </p>
      ) : (
        <div className="lpx-cmp">
          <div
            className="lpx-tbl"
            style={{ gridTemplateColumns: `1.1fr repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            <div className="lpx-tbl-head lpx-tbl-empty" aria-hidden />
            {mode === "monthly"
              ? plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`lpx-tbl-head${plan.featured ? " is-featured" : ""}`}
                  >
                    <span className="lpx-th-tag">
                      {plan.featured
                        ? "Most popular"
                        : plan.trialDays > 0
                          ? `${plan.trialDays}-day trial`
                          : plan.discountBadge || plan.offer || "Monthly plan"}
                    </span>
                    <h3>{plan.name}</h3>
                    <div className="lpx-tbl-price">
                      {plan.price === 0 ? "Free" : formatPrice(plan.price, plan.currency)}
                      {plan.originalPrice && plan.originalPrice > plan.price ? (
                        <s>{formatPrice(plan.originalPrice, plan.currency)}</s>
                      ) : null}
                      {plan.price > 0 ? <small> / month</small> : null}
                    </div>
                    <Link href="/pricing" className="lpx-btn lpx-btn-yellow lpx-btn-wide">
                      {plan.cta || "View plan"}
                    </Link>
                  </div>
                ))
              : creditPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`lpx-tbl-head${pack.popular ? " is-featured" : ""}`}
                  >
                    <span className="lpx-th-tag">
                      {pack.popular ? "Limited offer" : "One-time pack"}
                    </span>
                    <h3>{pack.name}</h3>
                    <div className="lpx-tbl-price">{formatPrice(pack.price)}</div>
                    <Link
                      href={`/creator/billing/credits?pack=${pack.id}`}
                      className="lpx-btn lpx-btn-yellow lpx-btn-wide"
                    >
                      {pack.cta || "Buy credits"}
                    </Link>
                  </div>
                ))}

            {rowDefs.map((row) => (
              <Fragment key={row.label}>
                <div className="lpx-tbl-label">{row.label}</div>
                {mode === "monthly"
                  ? plans.map((plan) => (
                      <div className="lpx-tbl-cell" key={`${row.label}-${plan.id}`}>
                        {(row.value as (plan: PricingPlan) => React.ReactNode)(plan)}
                      </div>
                    ))
                  : creditPacks.map((pack) => (
                      <div className="lpx-tbl-cell" key={`${row.label}-${pack.id}`}>
                        {(row.value as (pack: PricingCreditPack) => React.ReactNode)(pack)}
                      </div>
                    ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      <p className="lpx-note">
        <Link href="/pricing">Compare all plans</Link> ·{" "}
        <Link href="/pricing/credits">See all AI credit packs</Link>
      </p>
    </>
  );
}
