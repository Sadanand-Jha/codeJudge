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
import {
  formatPricingAmount,
  getPricingCatalogServer,
  getPricingContentServer,
  getPlanDiscount,
  type PricingCatalog,
} from "@/services/pricing";

const PLAN_INCLUDES: Array<{ title: string; icon: LucideIcon }> = [
  { title: "Access codes", icon: LockKeyhole },
  { title: "Instant results", icon: Zap },
  { title: "PDF & Word", icon: FileText },
  { title: "Email results to creator", icon: Mail },
  { title: "Leaderboards", icon: Layers3 },
  { title: "Any device", icon: Smartphone },
];

function buildFaqs(catalog: PricingCatalog) {
  const paidPlans = catalog.plans.filter((plan) => plan.price > 0);
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const creditAnswer = paidPlans.every((plan) => plan.credits > 0)
    ? `Yes. ${paidPlans.map((plan) => `${plan.name} includes ${plan.credits} AI credits a month`).join(", ")}. Need more? Buy a one-time top-up separately.`
    : "Paid plans may include monthly AI credits. Need more? Buy a one-time top-up separately.";

  return [
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
      a: creditAnswer,
    },
    {
      q: "Is there a free trial?",
      a: trialPlan
        ? `Yes. ${trialPlan.name} includes a ${trialPlan.trialDays}-day trial${trialPlan.credits > 0 ? ` with ${trialPlan.credits} AI credits` : ""}. Request it from billing; the owner approves each request. No card required.`
        : "Trial availability depends on the current plans shown above.",
    },
    {
      q: "Are prices inclusive of taxes?",
      a: "Yes. All plan prices shown here include GST.",
    },
  ];
}

export default async function PricingPage() {
  const [catalog, content] = await Promise.all([
    getPricingCatalogServer(),
    getPricingContentServer(),
  ]);
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const trialDays = trialPlan?.trialDays ?? 0;
  const offer = catalog.plans.find((plan) => plan.offer)?.offer ?? null;
  const creditValidityMonths =
    catalog.creditPacks.length > 0
      ? Math.max(...catalog.creditPacks.map((pack) => pack.validityMonths))
      : 0;
  const faqs = buildFaqs(catalog);

  return (
    <div className="qs-ui qs-lp qp-page min-h-screen">
      <PricingNav active="plans" />

      <main id="top">
        <header className="wrap qp-hero">
          <p className="eb">{content.plans_banner || "Monthly plans"}</p>
          <h1>{content.plans_heading || "Plans that grow with your quiz load"}</h1>
          <p className="lead">
            {content.plans_subheading ||
              "Move up when your quiz load grows. Every plan includes the full quiz builder, access codes and instant results. Paid plans also include monthly AI credits."}
          </p>
          <div className="qp-actions">
            <Link
              href={trialDays > 0 ? "/login?next=/creator/billing/plans" : "/register"}
              className="btn pri"
            >
              {trialDays > 0 ? "Request Basic trial" : "Get started"} <ArrowRight size={16} />
            </Link>
            <a href="#plans" className="btn">
              Compare plans
            </a>
          </div>
          <div className="qp-meta" aria-label="Pricing highlights">
            <span>No card required</span>
            {trialDays > 0 && <span>Basic trial · approval required</span>}
            {trialDays > 0 && <span>AI credits included</span>}
            {offer && <span>{offer}</span>}
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
              {catalog.plans.length === 0 && (
                <p className="qp-plan-desc">Plans are currently unavailable. Please check back later.</p>
              )}
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
                      ) : plan.discountBadge || discount > 0 ? (
                        <span className="qp-pill">{plan.discountBadge || `${discount}% off`}</span>
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

                    <Link
                      href={plan.trialDays ? "/login?next=/creator/billing/plans" : "/register"}
                      className="btn qp-plan-cta"
                    >
                      {plan.trialDays ? `Request ${plan.trialDays}-day trial` : plan.cta}
                    </Link>
                  </article>
                );
              })}
            </div>

            <p className="qp-after">
              <Sparkles size={15} />
              {content.plans_gst_note ||
                "Every paid plan includes monthly AI credits. Need more? Top up with a one-time pack."}
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
                  one-time packs{creditValidityMonths > 0 ? `, valid for ${creditValidityMonths} months,` : ""} and
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
            {faqs.map((faq) => (
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
                <h2>{trialDays > 0 ? `Request your ${trialDays}-day Basic trial today.` : "Start creating quizzes today."}</h2>
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
