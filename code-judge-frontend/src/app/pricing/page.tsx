import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Layers3,
  LockKeyhole,
  Mail,
  Smartphone,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PricingFooter, PricingNav } from "@/components/pricing/PricingChrome";
import { CREDIT_VALIDITY_MONTHS } from "@/config/aiCredits";
import {
  getPricingCatalogServer,
  getPlanDiscount,
} from "@/services/pricing";

const PLAN_INCLUDES: Array<{ title: string; icon: LucideIcon }> = [
  { title: "Access codes", icon: LockKeyhole },
  { title: "Instant results", icon: Zap },
  { title: "PDF & Word", icon: FileText },
  { title: "Email results to creator", icon: Mail },
  { title: "Leaderboards", icon: Layers3 },
  { title: "Any device", icon: Smartphone },
];

const FAQS = [
  {
    q: "What counts as a quiz creation?",
    a: "Each published quiz counts once against your monthly limit. Drafts and practice sets do not use a creation.",
  },
  {
    q: "Can I change my plan later?",
    a: "Yes. Move up whenever you need more quiz creations, or choose a smaller plan for the next billing cycle.",
  },
  {
    q: "Do plans include AI credits?",
    a: "Yes. Basic includes 20 AI credits a month and Pro includes 50. Need more? Buy a one-time top-up separately.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Basic includes a 7-day quiz-only trial. AI credits are not included. No card required.",
  },
  {
    q: "Are prices inclusive of taxes?",
    a: "Yes. All plan prices shown here include GST.",
  },
];

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default async function PricingPage() {
  const catalog = await getPricingCatalogServer();
  const creditValidityMonths =
    catalog.creditPacks.length > 0
      ? Math.max(...catalog.creditPacks.map((pack) => pack.validityMonths))
      : CREDIT_VALIDITY_MONTHS;

  return (
    <div className="qs-ui qs-lp qp-page min-h-screen">
      <PricingNav active="plans" />

      <main id="top">
        <header className="wrap qp-hero">
          <p className="eb">Monthly plans</p>
          <h1>Plans that grow with your quiz load</h1>
          <p className="lead">
            Start with a 7-day quiz-only trial. Move up when your quiz load grows.
            Every plan includes the full quiz builder, access codes and instant
            results. Paid plans also include monthly AI credits at the limited
            2026 offer price.
          </p>
          <div className="qp-actions">
            <Link href="/register" className="btn pri">
              Start quiz-only trial <ArrowRight size={16} />
            </Link>
            <a href="#plans" className="btn">
              Compare plans
            </a>
          </div>
          <div className="qp-meta" aria-label="Pricing highlights">
            <span>No card required</span>
            <span>Quiz-only trial</span>
            <span>Limited 2026 offer</span>
            <span>GST included</span>
          </div>
        </header>

        <section className="s qp-plans" id="plans">
          <div className="wrap">
            <div className="qp-head">
              <p className="eb">Choose a plan</p>
              <h2 className="t">One simple price for every quiz maker</h2>
              <p className="d">
                Every plan includes the full quiz builder, access codes,
                instant results and leaderboards. Plans differ by quiz
                creations and the monthly AI credits included.
              </p>
            </div>

            <div className="qp-grid">
              {catalog.plans.map((plan) => {
                const discount = getPlanDiscount(plan);
                return (
                  <article
                    key={plan.id}
                    className={`qp-plan${plan.featured ? " is-hot" : ""}`}
                    aria-labelledby={`plan-${plan.id}`}
                  >
                    {plan.featured && <span className="qp-badge">Most popular</span>}

                    <div className="qp-plan-top">
                      <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
                      {plan.trialDays ? (
                        <span className="qp-pill">{plan.trialDays}-day trial</span>
                      ) : discount > 0 ? (
                        <span className="qp-pill">{discount}% off</span>
                      ) : null}
                    </div>
                    {plan.offer && <p className="qp-offer">{plan.offer}</p>}
                    <p className="qp-plan-desc">{plan.tagline}</p>

                    <div className="qp-price">
                      <b>{inr(plan.price)}</b>
                      {discount > 0 && plan.originalPrice ? (
                        <s>{inr(plan.originalPrice)}</s>
                      ) : null}
                      <span>/ month</span>
                    </div>

                    <p
                      className={`qp-plan-credits${plan.credits === 0 ? " is-muted" : ""}`}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      {plan.credits > 0
                        ? `Includes ${plan.credits} AI credits / month`
                        : "AI credits sold separately"}
                    </p>

                    <ul className="qp-features">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <span className="qp-tick" aria-hidden="true">
                            <Check size={12} strokeWidth={3.5} />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link href="/register" className="btn qp-plan-cta">
                      {plan.cta}
                    </Link>
                  </article>
                );
              })}
            </div>

            <p className="qp-after">
              <Sparkles size={15} />
              Every paid plan includes monthly AI credits. Need more? Top up
              with a one-time pack.
            </p>

            <div className="qp-includes">
              <p className="qp-includes-label">Every plan includes</p>
              <div className="qp-includes-grid">
                {PLAN_INCLUDES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span key={item.title}>
                      <Icon size={15} />
                      {item.title}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="qp-cross">
              <div>
                <span className="qp-cross-tag">Optional top-up</span>
                <h3>Need extra AI credits?</h3>
                <p>
                  Paid plans include a monthly allowance. Additional credits are
                  one-time packs, valid for {creditValidityMonths} months, and
                  work with every plan.
                </p>
              </div>
              <Link href="/pricing/credits" className="btn qp-cross-btn">
                Explore AI credits <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="s qp-faq" id="faq">
          <div className="wrap qp-faq-wrap">
            <p className="eb">Good to know</p>
            <h2 className="t">Plan questions, answered</h2>
            {FAQS.map((faq) => (
              <details className="fq" key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="s qp-cta-section">
          <div className="wrap">
            <div className="cta">
              <div>
                <p className="eb">Start today</p>
                <h2>Start your 7-day quiz-only trial today.</h2>
              </div>
              <div className="qp-cta-actions">
                <Link href="/register" className="btn">
                  Create an account
                </Link>
                <Link
                  href="/pricing/credits"
                  className="btn"
                  style={{
                    background: "transparent",
                    color: "var(--on-brand)",
                    borderColor: "var(--on-brand)",
                  }}
                >
                  View AI credits
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PricingFooter />
    </div>
  );
}
