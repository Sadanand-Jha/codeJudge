import Link from "next/link";
import {
  ArrowRight,
  Check,
  Coins,
  CreditCard,
  Landmark,
  ShieldCheck,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { PricingFooter, PricingNav } from "@/components/pricing/PricingChrome";
import { ScrollThemeSection } from "@/components/pricing/ScrollThemeSection";
import {
  formatPricingAmount,
  getPricingCatalogServer,
  getPricingContentServer,
} from "@/services/pricing";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export async function generateMetadata() {
  const catalog = await getPricingCatalogServer();
  const validity =
    catalog.creditPacks.length > 0
      ? Math.max(...catalog.creditPacks.map((pack) => pack.validityMonths))
      : 0;
  const description = validity
    ? `Buy one-time QuizSupport AI credit top-ups for question generation, paper creation and exports. Monthly plans include credits; extra packs work with any plan and stay valid for ${validity} months.`
    : "Buy one-time QuizSupport AI credit top-ups for question generation, paper creation and exports. Extra packs work with any plan.";

  return buildPublicPageMetadata({
    title: "AI Credits",
    description,
    path: "/pricing/credits",
  });
}

const PAYMENT_METHODS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "UPI", icon: Smartphone },
  { label: "Cards", icon: CreditCard },
  { label: "Net Banking", icon: Landmark },
];

export default async function AICreditsPricingPage() {
  const [catalog, content] = await Promise.all([
    getPricingCatalogServer(),
    getPricingContentServer(),
  ]);
  const creditPacks = catalog.creditPacks;
  const credits = creditPacks.map((pack) => pack.credits);
  const validity =
    creditPacks.length > 0
      ? Math.max(...creditPacks.map((pack) => pack.validityMonths))
      : 0;
  const minCredits = credits.length > 0 ? Math.min(...credits) : 0;
  const maxCredits = credits.length > 0 ? Math.max(...credits) : 0;
  const featuredPack =
    creditPacks.find((pack) => pack.popular) ?? creditPacks[0];
  const paidPlans = catalog.plans.filter((plan) => plan.price > 0);
  const creditPlanNames = paidPlans.filter((plan) => plan.credits > 0).map((plan) => plan.name);
  const planList = creditPlanNames.length > 0 ? creditPlanNames.join(" and ") : "Monthly plans";
  const planCredits = paidPlans
    .filter((plan) => plan.credits > 0)
    .map((plan) => `${plan.name} includes ${plan.credits} AI credits a month`)
    .join(" and ");
  const creditRange =
    creditPacks.length === 0
      ? "No packs available"
      : minCredits === maxCredits
        ? `${minCredits} credits`
        : `${minCredits}–${maxCredits} credits`;

  const steps = [
    {
      title: "Pick a top-up",
      body: creditPacks.length > 0
        ? `Add ${creditRange.toLowerCase()} in one payment. No separate AI subscription.`
        : "Choose a top-up when packs become available. No separate AI subscription.",
    },
    {
      title: "Stack it on any plan",
      body: `Packs add to your included plan credits and work with ${planList}.`,
    },
    {
      title: validity ? `Use them within ${validity} months` : "Use them any time",
      body: validity
        ? `Purchased credits stay valid for ${validity} months. Plan credits refresh with your plan.`
        : "Purchased credits stay valid for the period shown at purchase. Plan credits refresh with your plan.",
    },
  ];

  const faqs = [
    {
      q: "Do monthly plans include AI credits?",
      a: planCredits
        ? `Yes. ${planCredits}. Packs are only for extra usage on top of that.`
        : "Monthly plans may include AI credits. Packs are only for extra usage on top of your plan allowance.",
    },
    {
      q: "Do AI credits expire?",
      a: validity
        ? `Purchased credits stay valid for ${validity} months from the date of purchase. Monthly credits included with ${planList} refresh each billing cycle.`
        : `Purchased credits stay valid for the period shown at purchase. Monthly credits included with ${planList} refresh each billing cycle.`,
    },
    {
      q: "Do I need a paid plan to buy credits?",
      a: `No. AI credits work alongside any active ${planList} subscription. You can buy a pack whenever your included allowance runs low.`,
    },
    {
      q: "What can I use AI credits for?",
      a: "Credits are used for AI question generation, paper creation, improvements and exports across the platform.",
    },
    {
      q: "Do purchased credits renew automatically?",
      a: "No. Every credit pack is a one-time purchase. You only pay again when you choose to buy another pack.",
    },
    {
      q: "Are prices inclusive of taxes?",
      a: "Yes. All credit pack prices shown here include GST.",
    },
  ];

  return (
    <div className="qs-ui qs-lp qp-page min-h-screen">
      <PricingNav active="credits" />

      <main id="top">
        <header className="wrap qp-credit-hero">
          <div className="qp-credit-hero-copy">
            <p className="eb">AI credit top-ups</p>
            <h1>{content.credits_heading || "More AI. Same plan."}</h1>
            <p className="lead">
              {content.credits_subheading ||
                `${planList} already include monthly AI credits. When you need more, add a one-time pack — no separate AI subscription.`}
            </p>
            <div className="qp-actions">
              <a href="#packs" className="btn pri">
                See credit packs <ArrowRight size={16} />
              </a>
              <Link href="/pricing" className="btn">
                Compare monthly plans
              </Link>
            </div>
            <div className="qp-meta" aria-label="Credit highlights">
              <span>Works with any plan</span>
              {creditPacks.length > 0 && (
                <span>{creditRange}</span>
              )}
              {validity > 0 && <span>Valid for {validity} months</span>}
            </div>
          </div>

          {featuredPack && (
            <aside
              className="qp-credit-visual"
              aria-label={`${featuredPack.name}: ${featuredPack.credits} credits for ${formatPricingAmount(featuredPack.price)}`}
            >
              <div className="qp-credit-visual-top">
                <span className="qp-credit-visual-tag">
                  <Sparkles size={13} aria-hidden="true" />
                  {featuredPack.name}
                </span>
                <span className="qp-credit-visual-validity">
                  {featuredPack.validityMonths} months
                </span>
              </div>

              <div className="qp-credit-coin">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                <strong>{featuredPack.credits}</strong>
                <span>AI credits</span>
              </div>

              <div className="qp-credit-visual-price">
                <b>{formatPricingAmount(featuredPack.price)}</b>
                <span>one-time</span>
              </div>
            </aside>
          )}
        </header>

        <ScrollThemeSection id="packs">
          <div className="wrap">
            <div className="qp-credit-head">
              <div>
                <p className="eb">Choose a top-up</p>
                <h2 className="t">
                  {validity ? `Buy once. Use for ${validity} months.` : "Buy once. Top up when you need more."}
                </h2>
              </div>
              <p className="d">
                No separate AI subscription. Add credits whenever your included
                monthly allowance runs low.
              </p>
            </div>

            <div className="qp-credit-note">
              <span className="qp-credit-note-icon" aria-hidden="true">
                <Coins size={19} />
              </span>
              <div>
                <strong>Monthly plans already include credits.</strong>
                <p>
                  {planCredits ? `${planCredits}. ` : ""}Buy a pack only when you need extra.
                </p>
              </div>
              <Link href="/pricing" className="qp-credit-note-link">
                Compare plans <ArrowRight size={14} />
              </Link>
            </div>

            <div className="qp-packs">
              {creditPacks.length === 0 && (
                <p className="qp-pack-desc">No credit packs are available right now. Please check back later.</p>
              )}
              {creditPacks.map((pack) => (
                <article
                  key={pack.id}
                  className={`qp-pack${pack.popular ? " is-popular" : ""}`}
                >
                  {pack.popular && <span className="qp-badge">Limited offer</span>}

                  <div className="qp-pack-top">
                    <h3>{pack.name}</h3>
                    <span className="qp-pack-validity">
                      {pack.validityMonths} months
                    </span>
                  </div>

                  <div className="qp-pack-price">
                    <b>{formatPricingAmount(pack.price)}</b>
                    <span>one-time</span>
                  </div>

                  <div className="qp-pack-credits">
                    <strong>{pack.credits}</strong> AI credits
                  </div>

                  <p className="qp-pack-desc">{pack.blurb}</p>

                  <ul className="qp-features qp-pack-features">
                    <li>
                      <span className="qp-tick" aria-hidden="true">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                      Works with {planList}
                    </li>
                    <li>
                      <span className="qp-tick" aria-hidden="true">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                      AI questions, papers and exports
                    </li>
                    <li>
                      <span className="qp-tick" aria-hidden="true">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                      Valid for {pack.validityMonths} months from purchase
                    </li>
                  </ul>

                  <Link
                    href={`/creator/billing/credits?pack=${pack.id}`}
                    className="btn qp-pack-cta"
                  >
                    {pack.cta}
                  </Link>
                </article>
              ))}
            </div>

            <div className="qp-table-wrap">
              <table className="qp-table">
                <caption className="qp-table-caption">
                  Pack details
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pack</th>
                    <th scope="col">Credits</th>
                    <th scope="col">Validity</th>
                  </tr>
                </thead>
                <tbody>
                  {creditPacks.length === 0 && (
                <p className="qp-pack-desc">No credit packs are available right now. Please check back later.</p>
              )}
              {creditPacks.map((pack) => (
                    <tr key={pack.id}>
                      <td>
                        <strong>{formatPricingAmount(pack.price)}</strong>
                        <span>{pack.name}</span>
                      </td>
                      <td>{pack.credits}</td>
                      <td>{pack.validityMonths} months</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="qp-pay">
              <span className="qp-pay-secure">
                <ShieldCheck size={16} />
                Secure checkout
              </span>
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <span key={method.label}>
                    <Icon size={15} />
                    {method.label}
                  </span>
                );
              })}
              <span>GST included</span>
            </div>

            <p className="qp-note">
              Purchased credits work with any plan
              {validity > 0 ? " and stay valid for " + validity + " months from the date of purchase." : "."}
            </p>
          </div>
        </ScrollThemeSection>

        <section className="s qp-how">
          <div className="wrap">
            <p className="eb">How credits work</p>
            <h2 className="t">Simple from top-up to first generation</h2>
            <div className="qs-steps qp-steps">
              {steps.map((step) => (
                <div className="qs-step" key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>

            <div className="qp-cross qp-cross-dark">
              <div>
                <span className="qp-cross-tag">Monthly plans</span>
                <h3>Need more quizzes too?</h3>
                <p>
                  {planList} include quiz creations and monthly AI credits.
                  Compare plans and top up only when you need more.
                </p>
              </div>
              <Link href="/pricing" className="btn qp-cross-btn">
                See monthly plans <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="s qp-faq" id="faq">
          <div className="wrap qp-faq-wrap">
            <p className="eb">Good to know</p>
            <h2 className="t">Credit questions, answered</h2>
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
                <p className="eb">Ready when you are</p>
                <h2>Top up only when you need it.</h2>
              </div>
              <div className="qp-cta-actions">
                <a href="#packs" className="btn">
                  Choose a pack
                </a>
                <Link
                  href="/register"
                  className="btn"
                  style={{
                    background: "transparent",
                    color: "var(--on-brand)",
                    borderColor: "var(--on-brand)",
                  }}
                >
                  Create an account
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
