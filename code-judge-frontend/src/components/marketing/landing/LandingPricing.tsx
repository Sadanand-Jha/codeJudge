import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { PricingPlan } from "@/types/pricing";

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

export default function LandingPricing({ plans }: { plans: PricingPlan[] }) {
  const visiblePlans = plans;

  return (
    <section className="landing-section landing-pricing" id="pricing" data-reveal>
      <div className="landing-section-heading">
        <span className="landing-eyebrow">Pricing</span>
        <h2>Start simple. Add more when you need it.</h2>
        <p>Current plans and prices, shown clearly. You can also start for free.</p>
      </div>

      {visiblePlans.length ? (
        <div
          className="landing-pricing-grid"
          data-plan-count={visiblePlans.length}
        >
          {visiblePlans.map((plan) => (
            <article
              className={`landing-plan-card${plan.featured ? " is-featured" : ""}`}
              key={plan.id}
            >
              <div className="landing-plan-top">
                <span>{plan.featured ? "POPULAR" : plan.price === 0 ? "FREE PLAN" : "MONTHLY PLAN"}</span>
                {plan.featured ? <i aria-hidden /> : null}
              </div>
              <h3>{plan.name}</h3>
              <p className="landing-plan-description">{plan.description || plan.tagline}</p>
              <div className="landing-plan-price">
                <b>{plan.price === 0 ? "Free" : formatPrice(plan.price, plan.currency)}</b>
                {plan.price > 0 ? <span>/ month</span> : null}
              </div>
              <ul>
                {(plan.features.length ? plan.features : [`${plan.quizzes} quiz creations`, `${plan.rooms} rooms`])
                  .filter((feature) => !feature.toLowerCase().includes("trial"))
                  .slice(0, 5)
                  .map((feature) => (
                    <li key={feature}><Check size={16} aria-hidden />{feature}</li>
                  ))}
              </ul>
              <Link
                className="landing-plan-link"
                href={plan.price === 0 ? "/creator/quizzes/create" : "/pricing"}
              >
                {plan.cta || (plan.price === 0 ? "Start free" : "View plan")}{" "}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </article>
          ))}
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
