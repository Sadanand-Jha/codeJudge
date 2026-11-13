"use client";

import Link from "next/link";
import { useId } from "react";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useMySubscription } from "@/hooks/useMySubscription";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { formatPricingAmount, type PricingPlan } from "@/services/pricing";
import { useAICreditsStore } from "@/store/aiCreditsStore";
import type { CreditPurchasePack } from "@/services/aiCredits";

function packFeatures(pack: CreditPurchasePack): string[] {
  const months = pack.validityMonths;
  return [
    "Generate MCQ, short & long questions",
    "Export to PDF / Word",
    `Valid for ${months} month${months === 1 ? "" : "s"}`,
  ];
}

function savingsPercent(pack: CreditPurchasePack, base?: CreditPurchasePack): number {
  if (!base || base.credits === 0 || pack.credits === 0) return 0;
  const baseRate = base.price / base.credits;
  const rate = pack.price / pack.credits;
  return Math.max(0, Math.round((1 - rate / baseRate) * 100));
}


function CurrentPlanCard({ plan }: { plan: PricingPlan }) {
  const included = plan.credits > 0;
  const features = included
    ? [
        `Up to ${plan.quizzes} quiz creations`,
        `${plan.credits} AI credits every month`,
        "Top up anytime when you need more",
      ]
    : [
        "Platform access",
        "Pay only for the credits you use",
        "Buy a top-up whenever you need AI",
      ];

  return (
    <article
      aria-current="true"
      aria-label={`${plan.name} plan — current plan`}
      className="relative flex flex-col rounded-[26px] border border-[var(--qs-line)] border-b-[5px] border-b-[var(--qs-sun)] bg-[var(--qs-surface)] px-5 pb-5 pt-[22px] text-[var(--qs-ink)] shadow-[0_12px_28px_rgba(27,24,64,0.12)] max-[900px]:order-first sm:rounded-[26px] sm:border-2 sm:border-[var(--qs-ink)] sm:border-b-2 sm:px-[26px] sm:pb-7 sm:pt-7 sm:shadow-none"
    >
      <span className="absolute -top-4 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--qs-ok)] px-4 py-[5px] text-[13px] font-extrabold text-white sm:flex">
        <Sparkles className="h-3 w-3" />
        Current plan
      </span>

      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-[24px] font-extrabold leading-[1.2] tracking-tight sm:text-[20px] sm:font-extrabold">{plan.name}</h3>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--qs-ok)] px-2 py-0.5 text-[9px] font-bold text-white sm:hidden">
            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
            Current plan
          </span>
        </div>
        <span className="flex h-[30px] shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--qs-okbg)] px-3 text-[13px] font-extrabold tracking-wide text-[var(--qs-ok)] sm:px-[11px] sm:text-[12px] sm:font-extrabold">
          Active
        </span>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2 sm:mt-0 sm:block">
        <p className="my-2 text-[44px] font-extrabold leading-none tracking-[-0.02em] sm:my-5 sm:mb-2.5 sm:text-[64px] sm:font-black sm:leading-none">
          {formatPricingAmount(plan.price, plan.currency)}
          <span className="ml-1.5 text-[16px] font-semibold text-[var(--qs-muted)] sm:ml-2 sm:text-base sm:font-bold">/ month</span>
        </p>
        <p className="text-[14px] font-extrabold sm:text-base sm:font-bold">
          {included ? `${plan.credits} AI credits included` : "No monthly credits"}
        </p>
      </div>
      <p className="mb-0 mt-3.5 text-[15px] font-medium leading-[1.45] text-[var(--qs-muted)] sm:mb-[18px] sm:mt-3 sm:min-h-[46px] sm:text-base sm:leading-normal">
        {included
          ? "Your plan includes credits every month. Add a pack only when you need extra."
          : "Your current plan. Buy a credit pack only when you need AI credits."}
      </p>

      <ul className="m-0 mb-0 mt-4 flex flex-1 list-none flex-col gap-3 border-t-[1.5px] border-dashed border-[var(--qs-line)] pb-5 pt-4 sm:mb-[26px] sm:gap-[11px] sm:border-t-2 sm:pt-[18px]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 sm:gap-2.5">
            <span className="mt-px grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)] sm:h-5 sm:w-5">
              <Check className="h-[13px] w-[13px] sm:h-3 sm:w-3" strokeWidth={3.4} />
            </span>
            <span className="text-[15px] font-semibold leading-[1.4] sm:text-sm sm:leading-5">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/creator/billing/plans"
        className="mt-5 flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[16px] font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none sm:mt-0 sm:h-auto sm:gap-2 sm:rounded-[14px] sm:border-2 sm:py-[15px] sm:text-base sm:font-extrabold sm:shadow-[3px_3px_0_var(--qs-sun)]"
      >
        Compare monthly plans
        <ArrowRight className="h-4 w-4 sm:h-4 sm:w-4" />
      </Link>
    </article>
  );
}

function MasterPackCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" className={className}>
      <circle cx="15" cy="15" r="13.5" fill="#f6bf2f" stroke="#b87408" strokeWidth="1.5" />
      <path
        d="M15 7.5l2 4.7 5 .5-3.8 3.3 1.2 5-4.4-2.7-4.4 2.7 1.2-5L8 12.7l5-.5z"
        fill="#fff4c9"
        stroke="#c98410"
        strokeWidth=".8"
      />
    </svg>
  );
}

function MasterPackArt() {
  const uid = useId().replace(/:/g, "");
  const goldId = `mp-gold-${uid}`;
  const glowId = `mp-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 440 210"
      width="100%"
      height="136"
      role="img"
      aria-label="Gold coins"
      className="mx-auto max-w-[280px]"
    >
      <defs>
        <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffeaa3" />
          <stop offset=".5" stopColor="#f6bf2f" />
          <stop offset="1" stopColor="#d98e0c" />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="#fdeccb" stopOpacity=".95" />
          <stop offset="1" stopColor="#fdeccb" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="220" cy="120" rx="200" ry="95" fill={`url(#${glowId})`} />
      <ellipse cx="220" cy="190" rx="70" ry="9" fill="#5b3df5" opacity=".18" />
      <circle cx="220" cy="106" r="66" fill="#b87408" />
      <circle cx="220" cy="98" r="66" fill={`url(#${goldId})`} stroke="#b87408" strokeWidth="2.5" />
      <circle
        cx="220"
        cy="98"
        r="52"
        fill="none"
        stroke="#c98410"
        strokeWidth="2.5"
        strokeDasharray="4 5"
      />
      <text
        x="220"
        y="118"
        textAnchor="middle"
        fontFamily="inherit"
        fontWeight="800"
        fontSize="62"
        fill="#fff6d0"
        stroke="#b87408"
        strokeWidth="1.5"
      >
        ₹
      </text>

      <circle cx="96" cy="136" r="30" fill="#b87408" />
      <circle cx="96" cy="131" r="30" fill={`url(#${goldId})`} stroke="#b87408" strokeWidth="2" />
      <circle
        cx="96"
        cy="131"
        r="22"
        fill="none"
        stroke="#c98410"
        strokeWidth="1.6"
        strokeDasharray="3 3"
      />
      <path
        d="M96 119l3.2 7.4 8 .8-6 5.2 1.8 7.8-7-4.2-7 4.2 1.8-7.8-6-5.2 8-.8z"
        fill="#fff4c9"
        stroke="#c98410"
        strokeWidth="1"
      />

      <circle cx="348" cy="146" r="24" fill="#b87408" />
      <circle cx="348" cy="141" r="24" fill={`url(#${goldId})`} stroke="#b87408" strokeWidth="2" />
      <circle
        cx="348"
        cy="141"
        r="17"
        fill="none"
        stroke="#c98410"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <path
        d="M348 131l2.6 6 6.4.6-4.8 4.2 1.5 6.3-5.7-3.4-5.7 3.4 1.5-6.3-4.8-4.2 6.4-.6z"
        fill="#fff4c9"
        stroke="#c98410"
        strokeWidth=".8"
      />

      <path d="M400 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#5b3df5" />
      <path d="M52 44l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#f6bf2f" />
      <path d="M270 20l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#b9a9fb" />
    </svg>
  );
}

function MasterPackCard({
  pack,
  badge,
  onSelect,
}: {
  pack: CreditPurchasePack;
  badge: string;
  onSelect: (pack: CreditPurchasePack) => void;
}) {
  const perCredit = pack.credits > 0 ? (pack.price / pack.credits).toFixed(2) : "0.00";
  const features = packFeatures(pack);

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[linear-gradient(150deg,#f7f5ff_0%,#efeafe_55%,#f7f5ff_100%)] p-0 shadow-[0_18px_45px_-20px_rgba(70,40,200,0.45)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-[#b9a9fb] opacity-70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-[#5b3df5] opacity-30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-1/3 h-44 w-44 rounded-full bg-[#fdeccb] opacity-90 blur-3xl"
      />

      <div className="relative z-10 flex h-full flex-col rounded-[24px] border border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.38))] p-4 shadow-[0_0_0_1.5px_rgba(91,61,245,0.28),inset_0_1px_0_#fff] backdrop-blur-xl sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[22px] font-extrabold tracking-[-0.01em] text-[#1b1740]">{pack.name}</h3>
          <span className="rounded-full bg-[#5b3df5] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] !text-white">
            {badge}
          </span>
        </div>

        <MasterPackArt />

        <div className="flex items-end gap-3">
          <span className="text-[48px] font-black leading-[0.9] tracking-[-0.03em] text-[#1b1740] sm:text-[56px]">
            {formatPricingAmount(pack.price, "INR")}
          </span>
          <span className="pb-2 text-[13px] font-semibold leading-tight text-[#3d3a66]">
            one-time
            <br />
            payment
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white bg-[linear-gradient(135deg,#fdeccb,#fff7e0)] py-1.5 pl-1.5 pr-4 shadow-[0_6px_16px_-8px_rgba(160,100,0,0.5)]">
            <MasterPackCoin className="h-[26px] w-[26px] shrink-0" />
            <span className="text-[15px] font-extrabold text-[#4a2f00]">{pack.credits} credits</span>
          </span>
          <span className="rounded-full bg-white/70 px-2.5 py-1.5 text-[11px] font-semibold text-[#3a2a9c]">
            ≈ ₹{perCredit} per credit
          </span>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-[#3d3a66]">{pack.blurb}</p>

        <div className="my-4 border-t-2 border-dashed border-[#5b3df5]/25" />

        <ul className="flex flex-1 list-none flex-col gap-2.5 p-0">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-[13px] font-semibold text-[#1b1740]">
              <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[#5b3df5] text-black">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => onSelect(pack)}
          className="cta mt-4 flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-[14px] border-0 bg-[linear-gradient(135deg,#7a5cff,#5b3df5_55%,#4326d6)] text-[15px] font-bold !text-white shadow-[0_14px_30px_-10px_rgba(70,40,200,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] transition-[filter] hover:brightness-110"
        >
          {pack.cta}
          <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </div>
    </article>
  );
}

export function CreditPackCard({
  pack,
  basePack,
  onSelect,
}: {
  pack: CreditPurchasePack;
  basePack?: CreditPurchasePack;
  onSelect: (pack: CreditPurchasePack) => void;
}) {
  const save = pack.id === basePack?.id ? 0 : savingsPercent(pack, basePack);
  const badge = /master\s*pack/i.test(pack.name)
    ? "Best value"
    : save > 0
      ? `Save ${save}%`
      : pack.popular
        ? "Limited offer"
        : "One-time pack";

  return <MasterPackCard pack={pack} badge={badge} onSelect={onSelect} />;
}

export function CreditPacks({
  packs,
  onSelect,
}: {
  packs: CreditPurchasePack[];
  onSelect: (pack: CreditPurchasePack) => void;
}) {
  const balance = useAICreditsStore((state) => state.balance);
  const { subscription } = useMySubscription();
  const { catalog } = usePricingCatalog();
  const activePlanId = subscription?.planSlug ?? balance.planId;
  const currentPlan = catalog.plans.find((plan) => plan.slug === activePlanId);
  const basePack = packs.reduce<CreditPurchasePack | undefined>(
    (highest, pack) =>
      !highest || pack.price / pack.credits > highest.price / highest.credits ? pack : highest,
    undefined
  );
  // AI Credits is for top-ups only — never show the monthly plan card here.
  const showCurrentPlan = false;

  return (
    <div>
      <div
        className={cn(
          "grid items-start gap-[18px] sm:gap-6",
          showCurrentPlan && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]"
        )}
      >
        {showCurrentPlan && currentPlan && (
          <section aria-labelledby="monthly-plan-heading">
            <h3
              id="monthly-plan-heading"
              className="mb-4 hidden text-[18px] font-extrabold tracking-tight text-[var(--qs-ink)] sm:block"
            >
              Monthly plan
            </h3>
            <CurrentPlanCard plan={currentPlan} />
          </section>
        )}

        <section aria-label="AI credit packs">
          <div
            className={cn(
              "mx-auto grid w-full items-stretch gap-[18px] sm:gap-6",
              packs.length === 1 ? "max-w-[436px]" : "max-w-4xl sm:grid-cols-2 lg:grid-cols-2"
            )}
          >
            {packs.map((pack) => (
              <CreditPackCard key={pack.id} pack={pack} basePack={basePack} onSelect={onSelect} />
            ))}
          </div>
        </section>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--qs-muted)] sm:mt-7 sm:text-[13px]">
        <Lock className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
        Secure payments via UPI, Cards &amp; Net Banking
      </p>
    </div>
  );
}
