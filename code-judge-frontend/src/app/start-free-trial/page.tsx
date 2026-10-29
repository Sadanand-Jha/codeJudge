import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { PricingFooter, PricingNav } from "@/components/pricing/PricingChrome";
import {
  formatPricingAmount,
  getPricingCatalogServer,
  getPlanDiscount,
} from "@/services/pricing";

export const metadata = {
  title: "Start your 7-day free trial · QuizSupport",
  description:
    "Log in to start your 7-day quiz-only trial. Build quizzes, share one code and watch results land.",
};

const STEPS = [
  {
    title: "Log in",
    body: "Log in or create your account. No card required.",
  },
  {
    title: "Start your trial",
    body: "Get 7 days of the full quiz builder, access codes and instant results.",
  },
  {
    title: "Pick a plan",
    body: "Move up when your quiz load grows. Paid plans add monthly AI credits.",
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
          <p className="eb">{trialDays}-day free trial</p>
          <h1>
            Try QuizSupport
            <br />
            <span>free for {trialDays} days</span>
          </h1>
          <p className="lead">
            Log in to start your {trialDays}-day quiz-only trial. Build quizzes, share one
            code and watch results land. Move up to a plan when your quiz load grows.
          </p>
          <div className="qp-actions">
            <Link href="/login?next=/creator" className="btn pri">
              Log in to start free trial <ArrowRight size={16} aria-hidden />
            </Link>
            <a href="#plans" className="btn">
              Compare plans
            </a>
          </div>
          <div className="qp-meta" aria-label="Trial highlights">
            <span>No card required</span>
            <span>Quiz-only trial</span>
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
                      Includes {plan.credits} AI credits / month
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
                      href={isTrial ? "/login?next=/creator" : "/login?next=/pricing"}
                      className="btn qp-plan-cta"
                    >
                      {isTrial
                        ? "Log in to start free trial"
                        : `Log in to choose ${plan.name}`}
                    </Link>
                  </article>
                );
              })}
            </div>

            <p className="qp-after">
              Log in to start your free trial. Prices include GST. Plan changes take
              effect from the next billing cycle.
            </p>
          </div>
        </section>

        <section className="s qp-trial-final">
          <div className="wrap">
            <div className="qp-trial-final-box">
              <p className="eb">Ready when you are</p>
              <h2>
                Log in and start your <span className="qp-trial-grad">free trial</span>
              </h2>
              <p>{trialDays} days, quiz-only, no card required.</p>
              <div className="qp-actions">
                <Link href="/login?next=/creator" className="btn pri">
                  Log in to start free trial <ArrowRight size={16} aria-hidden />
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
