import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { PricingFooter, PricingNav } from "@/components/pricing/PricingChrome";
import { BASIC_TRIAL_CREDITS } from "@/lib/constants";
import {
  formatPricingAmount,
  getPricingCatalogServer,
  getPlanDiscount,
} from "@/services/pricing";

export const metadata = {
  title: "Request your 7-day Basic trial · QuizSupport",
  description:
    "Log in and request the 7-day Basic trial from billing. Approved trials include Basic features and AI credits.",
};

const STEPS = [
  {
    title: "Log in",
    body: "Log in or create your account. No card required.",
  },
  {
    title: "Request the trial",
    body: "Open billing and submit a trial request. The owner reviews it before access starts.",
  },
  {
    title: "Get Basic access",
    body: "Approved trials run for 7 days with Basic features and AI credits. Pick a plan when you are ready.",
  },
];

export default async function StartFreeTrialPage() {
  const catalog = await getPricingCatalogServer();
  const plans = catalog.plans;
  const trialPlan = plans.find((plan) => plan.trialDays > 0);
  const trialDays = trialPlan?.trialDays ?? 7;
  const offer = plans.find((plan) => plan.offer)?.offer ?? "Limited 2026 offer price";

  return (
    <div className="qs-ui qs-lp qp-page qp-themed-page qp-trial-page min-h-screen">
      <PricingNav active="plans" followTheme />

      <main id="top">
        <header className="wrap qp-hero qp-trial-hero">
          <p className="eb">{trialDays}-day Basic trial</p>
          <h1>
            Try QuizSupport
            <br />
            <span>free for {trialDays} days</span>
          </h1>
          <p className="lead">
            Log in, open billing and request the {trialDays}-day Basic trial. Approved trials
            include Basic features and AI credits. Move up to a plan when your quiz load grows.
          </p>
          <div className="qp-actions">
            <Link href="/login?next=/creator/billing/plans" className="btn pri">
              Log in to request trial <ArrowRight size={16} aria-hidden />
            </Link>
            <a href="#plans" className="btn">
              Compare plans
            </a>
          </div>
          <div className="qp-meta" aria-label="Trial highlights">
            <span>No card required</span>
            <span>Owner approval</span>
            <span>AI credits included</span>
            <span>{offer}</span>
            <span>GST included</span>
          </div>
        </header>

        <section className="s qp-trial-how">
          <div className="wrap">
            <div className="qp-head">
              <p className="eb">How it works</p>
              <h2 className="t">
                Start in <span className="qp-trial-grad">three steps</span>
              </h2>
            </div>
            <div className="qp-trial-steps">
              {STEPS.map((step, index) => (
                <div className="qp-trial-step" key={step.title}>
                  <b>{index + 1}</b>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="s qp-plans" id="plans">
          <div className="wrap">
            <div className="qp-head">
              <p className="eb">Choose a plan</p>
              <h2 className="t">
                One simple price for <span className="qp-trial-grad">every quiz maker</span>
              </h2>
              <p className="d">
                Every plan includes the full quiz builder, access codes, instant results
                and leaderboards. Plans differ by quiz creations and monthly AI credits.
              </p>
            </div>

            <div className="qp-grid">
              {plans.length === 0 && (
                <p className="qp-plan-desc">
                  Plans are currently unavailable. Please check back later.
                </p>
              )}
              {plans.map((plan) => {
                const discount = getPlanDiscount(plan);
                const isTrial = plan.trialDays > 0;
                return (
                  <article
                    key={plan.id}
                    className={`qp-plan${plan.featured ? " is-hot" : ""}`}
                    aria-labelledby={`trial-plan-${plan.id}`}
                  >
                    {plan.featured && <span className="qp-badge">Most popular</span>}

                    <div className="qp-plan-top">
                      <h3 id={`trial-plan-${plan.id}`}>{plan.name}</h3>
                      {isTrial ? (
                        <span className="qp-pill">{plan.trialDays}-day trial</span>
                      ) : plan.discountBadge || discount > 0 ? (
                        <span className="qp-pill">
                          {plan.discountBadge || `${discount}% off`}
                        </span>
                      ) : null}
                    </div>
                    {plan.offer && <p className="qp-offer">{plan.offer}</p>}
                    <p className="qp-plan-desc">{plan.tagline}</p>

                    <div className="qp-price">
                      <b>{formatPricingAmount(plan.price, plan.currency)}</b>
                      {discount > 0 && plan.originalPrice ? (
                        <s>{formatPricingAmount(plan.originalPrice, plan.currency)}</s>
                      ) : null}
                      <span>/ month</span>
                    </div>

                    <p className="qp-plan-credits">
                      <Sparkles size={14} aria-hidden />
                      {isTrial
                        ? `Includes ${BASIC_TRIAL_CREDITS} AI credits for the ${plan.trialDays}-day trial`
                        : `Includes ${plan.credits} AI credits / month`}
                    </p>

                    <ul className="qp-features">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <span className="qp-tick" aria-hidden>
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={isTrial ? "/login?next=/creator/billing/plans" : "/login?next=/pricing"}
                      className="btn qp-plan-cta"
                    >
                      {isTrial
                        ? "Log in to request trial"
                        : `Log in to choose ${plan.name}`}
                    </Link>
                  </article>
                );
              })}
            </div>

            <p className="qp-after">
              Log in to request your trial from billing. Trials start after owner
              approval. Prices include GST. Plan changes take effect from the next billing cycle.
            </p>
          </div>
        </section>

        <section className="s qp-trial-final">
          <div className="wrap">
            <div className="qp-trial-final-box">
              <p className="eb">Ready when you are</p>
              <h2>
                Log in and request your <span className="qp-trial-grad">Basic trial</span>
              </h2>
              <p>{trialDays} days of Basic features and AI credits. Owner approval required. No card required.</p>
              <div className="qp-actions">
                <Link href="/login?next=/creator/billing/plans" className="btn pri">
                  Log in to request trial <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PricingFooter followTheme />
    </div>
  );
}
