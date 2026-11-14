import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Layers3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { LandingPlanCard } from "@/components/pricing/LandingPlanCard";
import { LandingPageShell } from "@/components/marketing/landing/LandingPageShell";
import LandingIllustration from "@/components/marketing/landing/LandingIllustration";
import LandingReveal from "@/components/marketing/landing/LandingReveal";
import LpHeader from "@/components/marketing/landing/LpHeader";
import { BASIC_TRIAL_CREDITS } from "@/lib/constants";
import {
  type PricingCatalog,
} from "@/services/pricing";
import {
  getPricingCatalogServer,
  getPricingContentServer,
} from "@/services/pricingServer";

const PLAN_INCLUDES: Array<{ title: string; icon: LucideIcon }> = [
  { title: "Access codes", icon: LockKeyhole },
  { title: "Instant results", icon: Zap },
  { title: "PDF & Word", icon: FileText },
  { title: "Email results to creator", icon: Mail },
  { title: "Leaderboards", icon: Layers3 },
  { title: "Any device", icon: Smartphone },
];

const HEADER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Plans", href: "#pricing" },
  { label: "AI credits", href: "/pricing/credits" },
  { label: "FAQ", href: "#faq" },
];

function buildFaqs(catalog: PricingCatalog) {
  const freePlan = catalog.plans.find((plan) => plan.price === 0);
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
      q: "Is there a free plan?",
      a: freePlan
        ? `Yes. ${freePlan.name} is free forever and includes everything you need to get started.`
        : "Free plan availability depends on the current plans shown above.",
    },
    {
      q: "Is there a free trial?",
      a: trialPlan
        ? `Yes. ${trialPlan.name} includes a ${trialPlan.trialDays}-day trial with ${BASIC_TRIAL_CREDITS} AI credits. Request it from billing; the owner approves each request. No card required.`
        : freePlan
          ? `${freePlan.name} is free forever, so you can start without a trial.`
          : "Trial availability depends on the current plans shown above.",
    },
  ];
}

export default async function PricingPage() {
  const [catalog, content] = await Promise.all([
    getPricingCatalogServer(),
    getPricingContentServer(),
  ]);
  const freePlan = catalog.plans.find((plan) => plan.price === 0);
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const trialDays = trialPlan?.trialDays ?? 0;
  const offer = catalog.plans.find((plan) => plan.offer)?.offer ?? null;
  const creditValidityMonths =
    catalog.creditPacks.length > 0
      ? Math.max(...catalog.creditPacks.map((pack) => pack.validityMonths))
      : 0;
  const faqs = buildFaqs(catalog);
  const startHref = trialDays > 0 ? "/login?next=/creator/billing/plans" : "/register";
  const startLabel =
    trialDays > 0 ? "Request Basic trial" : freePlan ? "Start for free" : "Get started";

  return (
    <LandingPageShell>
      <LpHeader links={HEADER_LINKS} />

      <main id="top">
        <div className="landing-page-wrap">
          <section className="landing-hero pricing-landing-hero" aria-labelledby="pricing-title" data-reveal>
            <div className="landing-hero-aurora" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="landing-hero-copy">
              <span className="landing-eyebrow">
                <Sparkles size={15} aria-hidden />
                Plans &amp; pricing
              </span>
              <h1 id="pricing-title">
                {content.plans_heading || (
                  <>
                    Simple pricing for{" "}
                    <span className="landing-hero-gradient-word">every classroom</span>.
                  </>
                )}
              </h1>
              <p>
                {content.plans_subheading ||
                  "Essential is free forever. Elevate adds advanced tools, anti-cheat, analytics and monthly AI credits when you need more."}
              </p>
              <div className="landing-hero-actions">
                <Link href={startHref} className="landing-button landing-button-primary">
                  {startLabel} <ArrowRight size={17} aria-hidden />
                </Link>
                <a href="#pricing" className="landing-button landing-button-outline">
                  Compare plans
                </a>
              </div>
              <ul className="pricing-hero-meta landing-pricing-meta" aria-label="Pricing highlights">
                <li>
                  <ShieldCheck size={14} aria-hidden />
                  No card required
                </li>
                {freePlan ? (
                  <li>
                    <Check size={14} aria-hidden />
                    {freePlan.name} free forever
                  </li>
                ) : null}
                {trialDays > 0 ? (
                  <li>
                    <Sparkles size={14} aria-hidden />
                    {trialPlan?.name ?? "Basic"} trial · approval required
                  </li>
                ) : null}
                {creditValidityMonths > 0 ? (
                  <li>
                    <Zap size={14} aria-hidden />
                    AI credit top-ups
                  </li>
                ) : null}
                {offer ? <li>{offer}</li> : null}
              </ul>
            </div>

            <div className="landing-hero-art-wrap">
              <div className="landing-fan-card landing-fan-card-yellow" aria-hidden="true" />
              <div className="landing-fan-card landing-fan-card-rose" aria-hidden="true" />
              <div className="landing-hero-panel">
                <div className="landing-panel-intro">
                  <span className="landing-panel-label">
                    <Sparkles size={14} aria-hidden />
                    Compare at a glance
                  </span>
                  <h2>Pick the plan that fits your class.</h2>
                  <p>Every plan includes the full quiz builder, access codes and results.</p>
                </div>
                <div className="landing-screen-frame">
                  <div className="landing-screen-toolbar">
                    <span><i /> Plans</span>
                    <span>{catalog.plans.length} options</span>
                  </div>
                  <ul className="pricing-glance-list">
                    {catalog.plans.map((plan) => (
                      <li key={plan.id}>
                        <span>{plan.name}</span>
                        <b>{plan.price === 0 ? "Free" : `${plan.price}`}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <LandingIllustration variant="hero" />
            </div>
            <p className="landing-hero-caption">
              Start free, then move up when your classroom needs more.
            </p>
          </section>

          <section className="landing-section landing-pricing pricing-plans" id="pricing" data-reveal>
            <div className="landing-section-heading pricing-plans-heading">
              <span className="landing-eyebrow">Choose a plan</span>
              <h2>One simple price for every quiz maker</h2>
              <p>
                Every plan includes the full quiz builder, access codes, instant
                results and leaderboards. Plans differ by quiz creations and the
                monthly AI credits included.
              </p>
            </div>

            {catalog.plans.length ? (
              <div className="landing-pricing-grid">
                {catalog.plans.map((plan) => (
                  <LandingPlanCard
                    key={plan.id}
                    plan={plan}
                    checkoutAvailable={catalog.countryPricing?.checkoutAvailable ?? true}
                    countryName={catalog.countryPricing?.countryName}
                  />
                ))}
              </div>
            ) : (
              <p className="landing-pricing-empty">
                Plans are currently unavailable. Please check back later.
              </p>
            )}

            <div className="landing-free-start">
              <div>
                <strong>Not ready to upgrade?</strong>
                <span>
                  {content.plans_gst_note ||
                    `${freePlan?.name ?? "Essential"} is free forever. Elevate includes monthly AI credits; top up anytime with a one-time pack.`}
                </span>
              </div>
              <Link href="/register">
                Start for free <ArrowRight size={16} aria-hidden />
              </Link>
            </div>

            <div className="pricing-perks">
              <p className="pricing-perks-label">Every plan includes</p>
              <div className="pricing-perks-grid">
                {PLAN_INCLUDES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <span className="pricing-perk" key={item.title}>
                      <Icon size={15} aria-hidden />
                      {item.title}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="pricing-credits-card">
              <div>
                <span className="pricing-credits-eyebrow">Optional top-up</span>
                <h3>Need extra AI credits?</h3>
                <p>
                  Paid plans include a monthly allowance. Additional credits are
                  one-time packs
                  {creditValidityMonths > 0
                    ? `, valid for ${creditValidityMonths} months,`
                    : ""}{" "}
                  and work with every plan.
                </p>
              </div>
              <Link className="landing-button pricing-credits-button" href="/pricing/credits">
                Explore AI credits <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </section>

          <section className="landing-section landing-faq" id="faq" data-reveal>
            <div className="landing-faq-intro">
              <div className="landing-section-heading">
                <span className="landing-eyebrow">Good to know</span>
                <h2>Plan questions, answered.</h2>
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
          </section>

          <section className="landing-closing" data-reveal>
            <div className="landing-closing-inner">
              <div className="landing-closing-copy">
                <span className="landing-eyebrow">Start today</span>
                <h2>
                  {trialDays > 0
                    ? `Request your ${trialDays}-day ${trialPlan?.name ?? "Basic"} trial today.`
                    : freePlan
                      ? `Start free with ${freePlan.name} today.`
                      : "Start creating quizzes today."}
                </h2>
                <Link className="landing-button landing-button-closing" href={startHref}>
                  {trialDays > 0 ? "Request your trial" : "Create an account"}{" "}
                  <ArrowRight size={17} aria-hidden />
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
