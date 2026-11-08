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
import { SecureLogo } from "@/components/common/SecureLogo";
import { LandingPageShell } from "@/components/marketing/landing/LandingPageShell";
import LandingReveal from "@/components/marketing/landing/LandingReveal";
import LpHeader from "@/components/marketing/landing/LpHeader";
import { PublicPackCta } from "@/components/pricing/PublicCheckoutCta";
import { formatPricingAmount } from "@/services/pricing";
import {
  getPricingCatalogServer,
  getPricingContentServer,
} from "@/services/pricingServer";
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

const HEADER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Plans", href: "/pricing" },
  { label: "AI credits", href: "#packs" },
  { label: "FAQ", href: "#faq" },
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
    <LandingPageShell>
      <LpHeader links={HEADER_LINKS} />

      <main id="top">
        <div className="landing-page-wrap">
          <section className="pricing-hero pricing-credits-hero" aria-labelledby="credits-title" data-reveal>
            <div className="pricing-hero-inner pricing-credits-hero-inner">
              <div className="pricing-credits-hero-copy">
                <span className="landing-eyebrow">
                  <Sparkles size={15} aria-hidden />
                  AI credit top-ups
                </span>
                <h1 id="credits-title">
                  {content.credits_heading || (
                    <>
                      More AI.{" "}
                      <span className="pricing-hero-gradient-word">Same plan</span>.
                    </>
                  )}
                </h1>
                <p className="pricing-hero-lead">
                  {content.credits_subheading ||
                    `${planList} already include monthly AI credits. When you need more, add a one-time pack — no separate AI subscription.`}
                </p>
                <div className="pricing-hero-actions">
                  <a href="#packs" className="landing-button landing-button-primary">
                    See credit packs <ArrowRight size={17} aria-hidden />
                  </a>
                  <Link href="/pricing" className="landing-button landing-button-outline">
                    Compare monthly plans
                  </Link>
                </div>
                <ul className="pricing-hero-meta" aria-label="Credit highlights">
                  <li>
                    <ShieldCheck size={14} aria-hidden />
                    Works with any plan
                  </li>
                  {creditPacks.length > 0 ? (
                    <li>
                      <Coins size={14} aria-hidden />
                      {creditRange}
                    </li>
                  ) : null}
                  {validity > 0 ? (
                    <li>
                      <Sparkles size={14} aria-hidden />
                      Valid for {validity} months
                    </li>
                  ) : null}
                  <li>GST included</li>
                </ul>
              </div>

              {featuredPack ? (
                <aside
                  className="pricing-pack-spotlight"
                  aria-label={`${featuredPack.name}: ${featuredPack.credits} credits for ${formatPricingAmount(featuredPack.price)}`}
                >
                  <div className="pricing-pack-spotlight-top">
                    <span>
                      <Sparkles size={13} aria-hidden />
                      {featuredPack.name}
                    </span>
                    <span>{featuredPack.validityMonths} months</span>
                  </div>
                  <div className="pricing-pack-spotlight-coin">
                    <Sparkles size={18} aria-hidden />
                    <strong>{featuredPack.credits}</strong>
                    <span>AI credits</span>
                  </div>
                  <div className="pricing-pack-spotlight-price">
                    <b>{formatPricingAmount(featuredPack.price)}</b>
                    <span>one-time</span>
                  </div>
                  <p className="pricing-pack-spotlight-note">Works with any plan.</p>
                </aside>
              ) : null}
            </div>
          </section>

          <section className="landing-section landing-pricing pricing-plans" id="packs" data-reveal>
            <div className="landing-section-heading pricing-plans-heading">
              <span className="landing-eyebrow">Choose a top-up</span>
              <h2>Buy once. Use whenever you need.</h2>
              <p>
                No separate AI subscription. Add credits whenever your included
                monthly allowance runs low.
              </p>
            </div>

            {creditPacks.length ? (
              <div className="landing-pricing-grid pricing-packs-grid">
                {creditPacks.map((pack) => (
                  <article
                    key={pack.id}
                    className={`landing-plan-card pricing-plan-card${pack.popular ? " is-featured" : ""}`}
                    aria-labelledby={`pack-${pack.id}`}
                  >
                    <div className="landing-plan-top">
                      <span>{pack.popular ? "LIMITED OFFER" : "ONE-TIME TOP-UP"}</span>
                      {pack.popular ? <i aria-hidden /> : null}
                    </div>
                    <h3 id={`pack-${pack.id}`}>{pack.name}</h3>
                    <p className="landing-plan-description">{pack.blurb}</p>

                    <div className="pricing-plan-price-row">
                      <div className="landing-plan-price">
                        <b>{formatPricingAmount(pack.price)}</b>
                        <span>one-time</span>
                      </div>
                      <span className="pricing-plan-badge">{pack.validityMonths} months</span>
                    </div>

                    <div className="pricing-pack-credits">
                      <Coins size={17} aria-hidden />
                      <strong>{pack.credits}</strong>
                      <span>AI credits</span>
                    </div>

                    <ul>
                      <li>
                        <Check size={15} aria-hidden />
                        Works with {planList}
                      </li>
                      <li>
                        <Check size={15} aria-hidden />
                        AI questions, papers and exports
                      </li>
                      <li>
                        <Check size={15} aria-hidden />
                        Valid for {pack.validityMonths} months from purchase
                      </li>
                    </ul>

                    <PublicPackCta
                      packId={pack.id}
                      label={pack.cta}
                      className="landing-plan-link pricing-plan-cta"
                    />
                  </article>
                ))}
              </div>
            ) : (
              <p className="landing-pricing-empty">
                No credit packs are available right now. Please check back later.
              </p>
            )}

            <div className="pricing-perks">
              <p className="pricing-perks-label">Secure checkout</p>
              <div className="pricing-perks-grid">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <span className="pricing-perk" key={method.label}>
                      <Icon size={15} aria-hidden />
                      {method.label}
                    </span>
                  );
                })}
                <span className="pricing-perk">
                  <ShieldCheck size={15} aria-hidden />
                  GST included
                </span>
              </div>
            </div>

            <p className="pricing-packs-note">
              Purchased credits work with any plan
              {validity > 0
                ? " and stay valid for " + validity + " months from the date of purchase."
                : "."}
            </p>
          </section>

          <section className="pricing-white-section" data-reveal>
            <div className="pricing-white-inner">
              <div className="landing-section-heading pricing-plans-heading">
                <span className="landing-eyebrow">How credits work</span>
                <h2>Simple from top-up to first generation</h2>
                <p>
                  Buy a pack once, keep it until you need it, and use it alongside
                  your monthly plan.
                </p>
              </div>

              <div className="pricing-steps-grid">
                {steps.map((step, index) => (
                  <div className="pricing-step" key={step.title}>
                    <span className="pricing-step-number">{String(index + 1).padStart(2, "0")}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                ))}
              </div>

              <div className="pricing-credits-card">
                <div>
                  <span className="pricing-credits-eyebrow">Monthly plans</span>
                  <h3>Need more quizzes too?</h3>
                  <p>
                    {planList} include quiz creations and monthly AI credits.
                    Compare plans and top up only when you need more.
                  </p>
                </div>
                <Link className="landing-button pricing-credits-button" href="/pricing">
                  See monthly plans <ArrowRight size={16} aria-hidden />
                </Link>
              </div>

              <div className="pricing-faq-block" id="faq">
                <div className="landing-faq-intro">
                  <div className="landing-section-heading">
                    <span className="landing-eyebrow">Good to know</span>
                    <h2>Credit questions, answered.</h2>
                  </div>
                  <div className="landing-faq-contact">
                    <span>Still have questions?</span>
                    <Link href="/contact">Contact us</Link>
                  </div>
                </div>
                <div className="landing-faq-list">
                  {faqs.map((faq) => (
                    <details key={faq.q}>
                      <summary>{faq.q}</summary>
                      <p>{faq.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="landing-closing" data-reveal>
            <div className="landing-closing-inner">
              <div className="landing-closing-copy">
                <span className="landing-eyebrow">Ready when you are</span>
                <h2>Top up only when you need it.</h2>
                <Link className="landing-button landing-button-closing" href="#packs">
                  Choose a pack <ArrowRight size={17} aria-hidden />
                </Link>
              </div>
              <div className="landing-closing-brand">
                <SecureLogo size={54} variant="full" theme="dark" rounded={false} />
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-page-wrap landing-footer-inner">
          <Link href="/" aria-label="QuizSupport home">
            <SecureLogo size={34} variant="full" rounded={false} />
          </Link>
          <nav aria-label="Footer">
            <Link href="/">Home</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/pricing/credits">AI credits</Link>
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <span>Thoughtful quizzes for every classroom.</span>
        </div>
      </footer>

      <LandingReveal />
    </LandingPageShell>
  );
}
