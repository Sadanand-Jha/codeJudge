"use client";

import { Check, Coins, Lock, Star } from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  CREDIT_PURCHASE_PACKS,
  type CreditPurchasePack,
} from "@/config/aiCredits";

/* Pack data — exact values from billing config (single source of truth). */
const PACKS: CreditPurchasePack[] = CREDIT_PURCHASE_PACKS;

const PACK_FEATURES: Record<string, string[]> = {
  starting: [
    "Generate MCQ, short & long questions",
    "Export to PDF / Word",
    "Valid for 1 month",
  ],
  teacher: [
    "Generate MCQ, short & long questions",
    "Export to PDF / Word",
    "Valid for 3 months",
  ],
  master: [
    "Generate MCQ, short & long questions",
    "Export to PDF / Word",
    "Valid for 3 months",
  ],
};

function perCreditRate(pack: CreditPurchasePack): number {
  return pack.price / pack.credits;
}

function savingsPct(pack: CreditPurchasePack, baseRate: number): number | null {
  if (pack.credits === PACKS[0].credits) return null;
  return Math.round((1 - perCreditRate(pack) / baseRate) * 100);
}

export interface CreditPacksSectionProps {
  onSelectPack: (pack: CreditPurchasePack) => void;
}

export function CreditPacksSection({ onSelectPack }: CreditPacksSectionProps) {
  const baseRate = perCreditRate(PACKS[0]);

  return (
    <section
      aria-labelledby="credit-packs-heading"
      className="rounded-2xl px-4 py-10 sm:px-6"
      style={{
        backgroundColor: "#FAF7F9",
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(236,72,153,0.08) 0%, transparent 60%)",
      }}
    >
      {/* Section header */}
      <div className="mx-auto max-w-xl text-center">
        <h2
          id="credit-packs-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Choose your credit pack
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          One-time purchase. No subscription. Credits valid up to 3 months.
        </p>
      </div>

      {/* Cards — equal height, 24px gap */}
      <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PACKS.map((pack) => {
          const rate = perCreditRate(pack);
          const save = savingsPct(pack, baseRate);
          const popular = pack.popular === true;
          const features = PACK_FEATURES[pack.id] ?? PACK_FEATURES.starting;

          return (
            <article
              key={pack.id}
              aria-label={`${pack.name}: ${pack.credits} credits for ₹${pack.price}`}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-7",
                popular
                  ? "border-2 border-pink-300 shadow-[0_8px_30px_rgba(236,72,153,0.15)] hover:shadow-[0_12px_40px_rgba(236,72,153,0.22)] lg:scale-105"
                  : "border border-slate-200 hover:border-pink-200",
                // Popular first on tablet + mobile, middle on desktop
                popular && "max-lg:order-first"
              )}
            >
              {/* Popular badge — pill centered on top edge */}
              {popular && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-pink-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  Most Popular
                </span>
              )}

              {/* Pack name + save chip (text, not color alone) */}
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {pack.name}
                </h3>
                {save !== null && (
                  <span
                    aria-label={`Save ${save}% compared to Starting Pack`}
                    className="inline-flex shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700"
                  >
                    Save {save}%
                  </span>
                )}
              </div>

              {/* Price hero (numbers tabular, sans body) */}
              <p className="mt-4 text-[42px] font-extrabold leading-none tracking-tight tabular-nums text-slate-900">
                ₹{pack.price}
              </p>

              {/* Credits secondary line */}
              <p className="mt-2 inline-flex items-center gap-1.5 text-base font-medium tabular-nums text-slate-900">
                <Coins
                  className="h-4 w-4 shrink-0 text-pink-500"
                  aria-hidden="true"
                />
                {pack.credits} credits
                <span className="font-normal text-slate-500">
                  · ₹{rate.toFixed(2)} / credit
                </span>
              </p>

              {/* Description — 2-line min-height keeps CTAs aligned */}
              <p className="mt-2 min-h-[2.5rem] text-sm leading-5 text-slate-500">
                {pack.blurb}
              </p>

              {/* Checklist — same count on every card */}
              <ul className="mt-4 space-y-2">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-900"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA — mt-auto aligns all buttons on one line */}
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  onClick={() => onSelectPack(pack)}
                  aria-label={`Buy ${pack.name} for ₹${pack.price}`}
                  className={cn(
                    "inline-flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 active:scale-[0.98]",
                    popular
                      ? "bg-pink-500 text-white shadow-[0_2px_8px_rgba(236,72,153,0.25)] hover:bg-pink-600 hover:shadow-[0_4px_14px_rgba(236,72,153,0.3)] active:bg-pink-600"
                      : "border border-pink-500/40 bg-white text-pink-600 hover:border-pink-500 hover:bg-pink-50 active:bg-pink-100"
                  )}
                >
                  {pack.cta}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Trust line */}
      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Secure payments via UPI, Cards &amp; Net Banking
      </p>
    </section>
  );
}

export default CreditPacksSection;
