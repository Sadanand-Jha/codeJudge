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
  CREDIT_PURCHASE_PACKS,
  CREDIT_VALIDITY_MONTHS,
  type CreditPurchasePack,
} from "@/config/aiCredits";
import { CREATOR_PLANS } from "@/config/creatorPlans";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata = buildPublicPageMetadata({
  title: "AI Credits",
  description:
    `Buy one-time QuizSupport AI credit top-ups for question generation, paper creation and exports. Basic and Pro include monthly credits; extra packs work with any plan and stay valid for ${CREDIT_VALIDITY_MONTHS} months.`,
  path: "/pricing/credits",
});

const PAYMENT_METHODS: Array<{ label: string; icon: LucideIcon }> = [
  { label: "UPI", icon: Smartphone },
  { label: "Cards", icon: CreditCard },
  { label: "Net Banking", icon: Landmark },
];

function inr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function perCredit(pack: CreditPurchasePack): string {
  return `₹${(pack.price / pack.credits).toFixed(2)}`;
}

export default function AICreditsPricingPage() {
  const credits = CREDIT_PURCHASE_PACKS.map((pack) => pack.credits);
  const validity = Math.max(...CREDIT_PURCHASE_PACKS.map((pack) => pack.validityMonths));
  const minCredits = Math.min(...credits);
  const maxCredits = Math.max(...credits);
  const featuredPack =
    CREDIT_PURCHASE_PACKS.find((pack) => pack.popular) ?? CREDIT_PURCHASE_PACKS[0];
  const basicCredits = CREATOR_PLANS.find((plan) => plan.id === "basic")?.credits ?? 0;
  const proCredits = CREATOR_PLANS.find((plan) => plan.id === "pro")?.credits ?? 0;

  const steps = [
    {
      title: "Pick a top-up",
      body: `Add ${minCredits} or ${maxCredits} credits in one payment. No separate AI subscription.`,
    },
    {
      title: "Stack it on any plan",
      body: "Packs add to your included plan credits and work with Free, Basic and Pro.",
    },
    {
      title: `Use them within ${validity} months`,
      body: `Purchased credits stay valid for ${validity} months. Plan credits refresh with your plan.`,
    },
  ];

  const faqs = [
    {
      q: "Do monthly plans include AI credits?",
      a: `Yes. Basic includes ${basicCredits} AI credits a month and Pro includes ${proCredits}. Packs are only for extra usage on top of that.`,
    },
    {
      q: "Do AI credits expire?",
      a: `Purchased credits stay valid for ${validity} months from the date of purchase. Monthly credits included with Basic or Pro refresh each billing cycle.`,
    },
    {
      q: "Do I need a paid plan to buy credits?",
      a: "No. AI credits work with the Free plan too. You can buy a pack without upgrading your monthly plan.",
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
            <h1>More AI. Same plan.</h1>
            <p className="lead">
              Basic and Pro already include monthly AI credits. When you need
              more, add a one-time pack — no separate AI subscription.
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
              <span>
                {minCredits}–{maxCredits} credits
              </span>
              <span>Valid for {validity} months</span>
            </div>
          </div>

          {featuredPack && (
            <aside
              className="qp-credit-visual"
              aria-label={`${featuredPack.name}: ${featuredPack.credits} credits for ${inr(featuredPack.price)}`}
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
                <b>{inr(featuredPack.price)}</b>
                <span>one-time</span>
                <em>{perCredit(featuredPack)} / credit</em>
              </div>
            </aside>
          )}
        </header>

        <ScrollThemeSection id="packs">
          <div className="wrap">
            <div className="qp-credit-head">
              <div>
                <p className="eb">Choose a top-up</p>
                <h2 className="t">Buy once. Use for {validity} months.</h2>
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
                  Basic includes {basicCredits} credits a month and Pro includes{" "}
                  {proCredits}. Buy a pack only when you need extra.
                </p>
              </div>
              <Link href="/pricing" className="qp-credit-note-link">
                Compare plans <ArrowRight size={14} />
              </Link>
            </div>

            <div className="qp-packs">
              {CREDIT_PURCHASE_PACKS.map((pack) => (
                <article
                  key={pack.id}
                  className={`qp-pack${pack.popular ? " is-popular" : ""}`}
                >
                  {pack.popular && <span className="qp-badge">Most popular</span>}

                  <div className="qp-pack-top">
                    <h3>{pack.name}</h3>
                    <span className="qp-pack-validity">
                      {pack.validityMonths} months
                    </span>
                  </div>

                  <div className="qp-pack-price">
                    <b>{inr(pack.price)}</b>
                    <span>one-time</span>
                  </div>

                  <div className="qp-pack-credits">
                    <strong>{pack.credits}</strong> AI credits
                    <span>{perCredit(pack)} / credit</span>
                  </div>

                  <p className="qp-pack-desc">{pack.blurb}</p>

                  <ul className="qp-features qp-pack-features">
                    <li>
                      <span className="qp-tick" aria-hidden="true">
                        <Check size={12} strokeWidth={3.5} />
                      </span>
                      Works with Free, Basic and Pro
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
                  Pack details and per-credit pricing
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pack</th>
                    <th scope="col">Credits</th>
                    <th scope="col">Per credit</th>
                    <th scope="col">Validity</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_PURCHASE_PACKS.map((pack) => (
                    <tr key={pack.id}>
                      <td>
                        <strong>{inr(pack.price)}</strong>
                        <span>{pack.name}</span>
                      </td>
                      <td>{pack.credits}</td>
                      <td>{perCredit(pack)}</td>
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
              Purchased credits work with any plan and stay valid for {validity}{" "}
              months from the date of purchase.
            </p>
          </div>
        </ScrollThemeSection>

        <section className="s qp-how">
          <div className="wrap">
            <p className="eb">How credits work</p>
            <h2 className="t">Simple from top-up to first generation</h2>
            <div className="qs-steps qp-steps">
              {steps.map((step, index) => (
                <div className="qs-step" key={step.title}>
                  <span className="qp-step-num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
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
                  Basic and Pro include quiz creations and monthly AI credits.
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
