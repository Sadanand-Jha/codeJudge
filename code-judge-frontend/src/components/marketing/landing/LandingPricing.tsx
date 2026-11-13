import Link from "next/link";
import { ArrowRight, Check, Zap } from "lucide-react";
import type { PricingPlan } from "@/types/pricing";
import { CreditCoin } from "@/components/creator/billing/CreditCoin";
import { cn } from "@/lib/helpers";

function formatPrice(value: number, currency: string) {
  try {
    const fractionDigits = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

function FreeLandingPlanCard({ plan }: { plan: PricingPlan }) {
  const features = (
    plan.features.length
      ? plan.features
      : [`${plan.quizzes} quiz creations`, `${plan.rooms} rooms`]
  )
    .filter((feature) => !feature.toLowerCase().includes("trial"))
    .slice(0, 5);

  return (
    <article className="relative flex flex-col rounded-[24px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 text-[var(--qs-ink)] shadow-[0_2px_10px_rgba(27,24,64,0.06)]">
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
        <b className="text-[38px] font-extrabold leading-none tracking-[-0.03em] text-[var(--qs-ink)]">
          Free
        </b>
      </div>
      <p className="mt-2 text-[12.5px] leading-5 text-[var(--qs-muted)]">
        {plan.description || plan.tagline}
      </p>
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
      <Link
        className="mt-4 flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-3 text-[12.5px] font-bold text-[var(--qs-brand)] transition-all hover:border-[var(--qs-brand)] active:translate-y-px"
        href="/creator/quizzes/create"
      >
        {plan.cta || "Start free"} <ArrowRight size={16} aria-hidden />
      </Link>
    </article>
  );
}

export default function LandingPricing({ plans }: { plans: PricingPlan[] }) {
  const visiblePlans = plans;

  return (
    <section className="landing-section landing-pricing" id="pricing" data-reveal>
      <div className="landing-section-heading">
        <span className="landing-eyebrow">Start for free</span>
        <h2>Start simple. Add more when you need it.</h2>
        <p>Free to start. Upgrade only when you need more for your classroom.</p>
      </div>

      {visiblePlans.length ? (
        <div
          className="landing-pricing-grid"
          data-plan-count={visiblePlans.length}
        >
          {visiblePlans.map((plan) =>
            plan.price === 0 ? (
              <FreeLandingPlanCard key={plan.id} plan={plan} />
            ) : (
            <article
              className={cn(
                "relative flex flex-col rounded-[24px] border-2 border-[#1b1740] bg-[linear-gradient(155deg,#34268a_0%,#231a66_45%,#1b1740_100%)] p-5 !text-white",
                plan.featured
                  ? "border-[#f6bf2f]/70 shadow-[0_24px_55px_-20px_rgba(246,191,47,0.35)]"
                  : "shadow-[0_24px_55px_-26px_rgba(40,25,120,0.65)]"
              )}
              key={plan.id}
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
                  {plan.price === 0 ? "Free plan" : "Monthly"}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <b className="text-[38px] font-extrabold leading-none tracking-[-0.03em] !text-white">
                  {plan.price === 0 ? "Free" : formatPrice(plan.price, plan.currency)}
                </b>
                {plan.price > 0 ? <span className="text-[12px] font-semibold !text-white/65">/ month</span> : null}
              </div>
              <p className="mt-2 text-[12.5px] leading-5 !text-white/70">
                {plan.description || plan.tagline}
              </p>
              {plan.credits > 0 ? (
                <span className="mt-3 flex items-center gap-2 rounded-[12px] border border-[#f6bf2f]/35 bg-[#f6bf2f]/10 px-2.5 py-2 text-[12.5px] font-semibold !text-white">
                  <CreditCoin className="h-5 w-5 shrink-0" />
                  {plan.credits.toLocaleString("en-IN")} AI credits / month
                </span>
              ) : null}
              <ul className="mt-3 grid flex-1 gap-2 border-t-2 border-dashed border-white/20 pt-3 text-[12.5px] !text-white/85">
                {(plan.features.length ? plan.features : [`${plan.quizzes} quiz creations`, `${plan.rooms} rooms`])
                  .filter((feature) => !feature.toLowerCase().includes("trial"))
                  .slice(0, 5)
                  .map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#22c55e] !text-white">
                        <Check className="h-3 w-3" strokeWidth={3.5} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
              </ul>
              <Link
                className={cn(
                  "mt-4 flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-[12px] border px-3 text-[12.5px] font-bold transition-all active:translate-y-px",
                  plan.price === 0
                    ? "border-[#6ee7b7]/40 bg-[#6ee7b7]/15 !text-[#d7fff1] hover:bg-[#6ee7b7]/25"
                    : "border-white/20 bg-[linear-gradient(135deg,#8b6cff,#5b3fe8)] !text-white shadow-[0_12px_26px_-12px_rgba(123,92,255,0.9)] hover:brightness-110"
                )}
                href={plan.price === 0 ? "/creator/quizzes/create" : "/pricing"}
              >
                {plan.cta || (plan.price === 0 ? "Start free" : "View plan")}{" "}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </article>
            )
          )}
        </div>
      ) : (
        <p className="landing-pricing-empty">
          Plans are temporarily unavailable. Please check the full pricing page.
        </p>
      )}
      <div className="landing-free-start">
        <div>
          <strong>Not ready to upgrade?</strong>
          <span>Start for free and create your first paper at your own pace.</span>
        </div>
        <Link href="/creator/quizzes/create">
          Start for free <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      <div className="landing-pricing-links">
        <Link href="/pricing">Compare all plans</Link>
        <Link href="/pricing/credits">Explore AI credits</Link>
      </div>
    </section>
  );
}
