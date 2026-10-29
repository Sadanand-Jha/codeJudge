"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
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

function YesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle
        cx="14"
        cy="14"
        r="13"
        fill="var(--qs-ok-soft, #e3f6ec)"
        stroke="var(--qs-ok)"
        strokeWidth="2"
      />
      <path
        d="M8 14.5l4 4 8-9"
        fill="none"
        stroke="var(--qs-ok)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PriceFeature({ children }: { children: ReactNode }) {
  return (
    <li>
      <YesIcon />
      <span>{children}</span>
    </li>
  );
}

function planFeatures(plan: PricingPlan) {
  const rows: string[] = [];
  if (plan.credits > 0) rows.push(`${plan.credits} free AI credits / month`);
  for (const feature of plan.features) {
    if (plan.credits > 0 && feature.toLowerCase().includes("credit")) continue;
    rows.push(feature);
  }
  if (rows.length === 0) {
    rows.push(`${plan.quizzes} quiz creations`, `${plan.rooms} rooms`);
  }
  return rows;
}

export default function LpPricingTabs({
  plans,
  creditPacks,
  creditValidityMonths,
}: Props) {
  const [mode, setMode] = useState<Mode>("monthly");

  const creditsNote = `One-time payment. No auto-renew. Works with every plan.${
    creditValidityMonths > 0 ? ` Credits are valid for up to ${creditValidityMonths} months.` : ""
  } UPI, cards or net banking.`;

  return (
    <>
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

      {mode === "monthly" ? (
        <div role="tabpanel">
          {plans.length === 0 ? (
            <p className="lpx-note">Plans are currently unavailable. Please check back later.</p>
          ) : (
            <div className="lpx-price-grid">
              {plans.map((plan) => {
                const savings =
                  plan.originalPrice && plan.originalPrice > plan.price
                    ? plan.originalPrice - plan.price
                    : 0;
                const pill = plan.featured
                  ? "Most popular"
                  : plan.trialDays > 0
                    ? `${plan.trialDays}-day trial`
                    : plan.discountBadge || "Monthly plan";
                const chip =
                  plan.credits > 0
                    ? `${plan.credits} free AI credits / month`
                    : savings > 0
                      ? `Save ${formatPrice(savings, plan.currency)} every month`
                      : "";

                return (
                  <div
                    className={`lpx-price-card${plan.featured ? " is-featured" : ""}`}
                    key={plan.id}
                  >
                    <span className="lpx-price-pill">{pill}</span>
                    <h3>{plan.name}</h3>
                    <p className="lpx-price-desc">
                      {plan.description || plan.tagline || ""}
                    </p>
                    <div className="lpx-price-amount">
                      <b>
                        {plan.price === 0 ? "Free" : formatPrice(plan.price, plan.currency)}
                      </b>
                      {plan.price > 0 ? (
                        <span>
                          {savings > 0 ? (
                            <>
                              <s>{formatPrice(plan.originalPrice ?? 0, plan.currency)}</s>{" "}
                            </>
                          ) : null}
                          / month
                        </span>
                      ) : null}
                    </div>
                    {chip ? <span className="lpx-price-chip">{chip}</span> : null}
                    <ul className="lpx-price-list">
                      {planFeatures(plan).map((feature) => (
                        <PriceFeature key={feature}>{feature}</PriceFeature>
                      ))}
                    </ul>
                    <Link href="/pricing" className="lpx-price-cta">
                      {plan.cta || "View plan"}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div role="tabpanel">
          <p className="lpx-note">{creditsNote}</p>
          {creditPacks.length === 0 ? (
            <p className="lpx-note">
              Credit packs are currently unavailable. Please check back later.
            </p>
          ) : (
            <div className="lpx-price-grid">
              {creditPacks.map((pack) => (
                <div
                  className={`lpx-price-card${pack.popular ? " is-featured" : ""}`}
                  key={pack.id}
                >
                  <span className="lpx-price-pill">
                    {pack.popular ? "Limited offer" : "One-time pack"}
                  </span>
                  <h3>{pack.name}</h3>
                  <p className="lpx-price-desc">{pack.blurb}</p>
                  <div className="lpx-price-amount">
                    <b>{formatPrice(pack.price)}</b>
                    <span>one-time</span>
                  </div>
                  <span className="lpx-price-chip">{pack.credits} credits</span>
                  <ul className="lpx-price-list">
                    <PriceFeature>{pack.credits} AI credits</PriceFeature>
                    <PriceFeature>
                      Valid for {pack.validityMonths}{" "}
                      {pack.validityMonths === 1 ? "month" : "months"}
                    </PriceFeature>
                    <PriceFeature>No auto-renew</PriceFeature>
                    <PriceFeature>Works with every plan</PriceFeature>
                  </ul>
                  <Link
                    href={`/creator/billing/credits?pack=${pack.id}`}
                    className="lpx-price-cta"
                  >
                    {pack.cta || "Buy credits"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="lpx-note">
        <Link href="/pricing">Compare all plans</Link> ·{" "}
        <Link href="/pricing/credits">See all AI credit packs</Link>
      </p>

      <div className="lpx-key">
        <div className="lpx-key-copy">
          <div className="lpx-key-icon">
            <KeyRound size={30} aria-hidden />
          </div>
          <div>
            <h3>Your quiz key never leaves your browser</h3>
            <p>
              Encrypted quizzes get a private teacher key, generated in your browser and
              never uploaded. Share only the quiz link with students.
            </p>
          </div>
        </div>
        <div className="lpx-key-chips" aria-hidden="true">
          <span>QK7A</span>
          <span>M2PX</span>
          <span>9TWZ</span>
          <span>R4NB</span>
        </div>
      </div>
    </>
  );
}
