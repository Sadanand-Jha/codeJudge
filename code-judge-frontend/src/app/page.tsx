import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Check,
  CreditCard,
  FileText,
  HelpCircle,
  Mail,
  PenLine,
  Plus,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import AnimatedStat from "@/components/marketing/landing/AnimatedStat";
import FeatureTabs from "@/components/marketing/landing/FeatureTabs";
import GeneratorStudio from "@/components/marketing/landing/GeneratorStudio";
import HeroPolygons from "@/components/marketing/landing/HeroPolygons";
import LandingHeader from "@/components/marketing/landing/LandingHeader";
import LandingHero from "@/components/marketing/landing/LandingHero";
import { SecureLogo } from "@/components/common/SecureLogo";
import {
  formatPricingAmount,
  getPricingCatalogServer,
  getPlanDiscount,
  type PricingCatalog,
} from "@/services/pricing";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "QuizSupport – Pick a scope. AI composes the paper.",
  description:
    "Choose your subject and scope. AI writes the questions, composes the paper and gets it ready to share. One code for students, instant results for you.",
  path: "/",
  absoluteTitle: true,
});

interface ToolCard {
  icon: LucideIcon;
  title: string;
  badge: string;
  tone: string;
  points: string[];
  cta: string;
  href: string;
}

const TOOLS: ToolCard[] = [
  {
    icon: Plus,
    title: "Quiz builder",
    badge: "Core tool",
    tone: "ok",
    points: ["Start blank or from a prompt", "Add your own questions", "Or let AI fill the paper"],
    cta: "Open builder",
    href: "/creator/quizzes/create",
  },
  {
    icon: Sparkles,
    title: "AI question generator",
    badge: "AI",
    tone: "warn",
    points: [
      "Choose subject, topic and difficulty",
      "Get questions with answer keys",
      "Generate a full set in seconds",
    ],
    cta: "Open generator",
    href: "#studio",
  },
  {
    icon: FileText,
    title: "Paper composer",
    badge: "Export",
    tone: "blue",
    points: [
      "Collect the questions you like",
      "Set marks, duration and title",
      "Export a print-ready paper",
    ],
    cta: "Compose a paper",
    href: "#paper-builder",
  },
  {
    icon: HelpCircle,
    title: "Question bank",
    badge: "Library",
    tone: "",
    points: [
      "Save the questions that work",
      "Search and tag your own library",
      "Reuse them across every paper",
    ],
    cta: "Open question bank",
    href: "/creator/problems",
  },
  {
    icon: PenLine,
    title: "Ready practice sets",
    badge: "Ready",
    tone: "ok",
    points: [
      "JEE, NEET, GATE, SSC, UPSC and Banking",
      "Curated practice by exam track",
      "Open and start — no setup",
    ],
    cta: "Browse practice sets",
    href: "/quiz",
  },
  {
    icon: Radio,
    title: "Live quiz room",
    badge: "Live",
    tone: "bad",
    points: [
      "One access code for everyone",
      "Students join in the browser",
      "Live attempts, ranks and results",
    ],
    cta: "See the live platform",
    href: "#platform",
  },
];

interface Capability {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: Radio,
    title: "Live quizzes",
    desc: "One code in. Attempts land as they happen.",
  },
  {
    icon: Trophy,
    title: "Responses & ranks",
    desc: "Marks, time and rank for every student.",
  },
  {
    icon: BarChart3,
    title: "Question analytics",
    desc: "Hardest, easiest and slowest questions.",
  },
  {
    icon: Zap,
    title: "Game mode",
    desc: "Lives, lifelines and a timer per question.",
  },
  {
    icon: ShieldCheck,
    title: "Secure exams",
    desc: "Focused, timed attempts with auto-submit.",
  },
  {
    icon: CalendarDays,
    title: "Scheduled quizzes",
    desc: "Open and close on your clock.",
  },
  {
    icon: HelpCircle,
    title: "Question bank",
    desc: "Save once. Reuse across every paper.",
  },
  {
    icon: Mail,
    title: "Email & export",
    desc: "CSV, PDF, Word and email in one click.",
  },
  {
    icon: Smartphone,
    title: "Works anywhere",
    desc: "Phone or laptop. Nothing to install.",
  },
];

const STATS = [
  { value: 1000, suffix: "+", label: "learners every month" },
  { value: 20, suffix: "+", label: "teachers and creators" },
  { value: 0, suffix: "", label: "installs needed" },
  { value: 1, suffix: "", label: "code to join" },
];

interface Step {
  number: string;
  title: string;
  desc: string;
  code?: string;
}

const STEPS: Step[] = [
  {
    number: "1",
    title: "Pick the scope",
    desc: "Subject, chapter, topic, difficulty. AI drafts the questions. You keep, edit or regenerate anything.",
  },
  {
    number: "2",
    title: "Share the code",
    desc: "Every quiz gets its own access code. Send it anywhere — no accounts, no app installs.",
    code: "VQBA-MIDJ-ETTW-EFRT",
  },
  {
    number: "3",
    title: "Results before the bell",
    desc: "Scores, ranks and question-level analytics land live. Export everything in a click.",
  },
];

const AUDIENCES = [
  {
    chip: "Students",
    tone: "blue",
    title: "Practice. Compete. Repeat.",
    desc: "Join with a code, answer anywhere, see your score and rank instantly.",
    cta: "Find practice sets",
    href: "/quiz",
  },
  {
    chip: "Teachers",
    tone: "ok",
    title: "Papers in minutes",
    desc: "Generate from your syllabus, export a print-ready paper, see every result.",
    cta: "Try the AI generator",
    href: "#studio",
  },
  {
    chip: "Creators",
    tone: "warn",
    title: "Host. Track. Repeat.",
    desc: "Live quizzes, lifelines, rooms and performance over time — all in one place.",
    cta: "Explore the platform",
    href: "#platform",
  },
];

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "AI generator", href: "#studio" },
      { label: "Paper composer", href: "#paper-builder" },
      { label: "Live platform", href: "#platform" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Meet the developer", href: "/meet-the-developer" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Quizzes", href: "/quiz" },
      { label: "Rooms", href: "/rooms" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

function buildFaqs(catalog: PricingCatalog) {
  const paidPlans = catalog.plans.filter((plan) => plan.price > 0);
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const planNames = paidPlans.map((plan) => plan.name).join(" and ");
  const subscriptionAnswer = trialPlan
    ? `${trialPlan.name} starts with a ${trialPlan.trialDays}-day quiz-only trial. After the trial, ${planNames || "paid plans"} include monthly quiz creations, rooms and AI credits; extra credits are one-time packs.`
    : `${planNames || "Paid plans"} include monthly quiz creations, rooms and AI credits; extra credits are one-time packs.`;

  return [
    {
      q: "Do students need to install anything?",
      a: "No. It runs in the browser on phone or laptop. Students just enter the access code.",
    },
    {
      q: "How does the access code work?",
      a: "Every quiz has its own code. Enter it to join. Results open an hour after the quiz ends; teachers see them immediately.",
    },
    {
      q: "What kinds of questions can AI generate?",
      a: "MCQ, short and long, from the subject, chapters and topics you choose. Paste a syllabus for sharper results.",
    },
    {
      q: "Is there a subscription?",
      a: subscriptionAnswer,
    },
    {
      q: "Can I get results out of the platform?",
      a: "Yes. Export to CSV, PDF or Word, or email results in one click.",
    },
    {
      q: "Can I print a question paper?",
      a: "Yes. Add questions, set the title, marks and duration, then export a print-ready PDF or Word file.",
    },
    {
      q: "What is exam mode?",
      a: "A focused exam view with timers and auto-submit so every attempt stays on the paper.",
    },
    {
      q: "What are rooms?",
      a: "Reusable student groups. Create once, share the code, and assign every quiz to the same batch.",
    },
    {
      q: "Who can see results?",
      a: "Owners and collaborators see results immediately. Students see theirs an hour after the quiz ends.",
    },
  ];
}

export default async function HomePage() {
  const catalog = await getPricingCatalogServer();
  const creditPacks = catalog.creditPacks;
  const creditValidityMonths =
    creditPacks.length > 0
      ? Math.max(...creditPacks.map((pack) => pack.validityMonths))
      : 0;
  const baseRate = creditPacks[0]
    ? creditPacks[0].price / creditPacks[0].credits
    : 0;
  const paidPlans = catalog.plans.filter((plan) => plan.price > 0);
  const trialPlan = catalog.plans.find((plan) => plan.trialDays > 0);
  const trialDays = trialPlan?.trialDays ?? 0;
  const offerPlan =
    catalog.plans.find((plan) => plan.offer && plan.price > 0) ?? null;
  const planNames = paidPlans.map((plan) => plan.name).join(" and ");
  const faqs = buildFaqs(catalog);

  return (
    <div className="qs-ui qs-lp min-h-screen">
      <LandingHeader trialDays={trialDays} />

      <main id="top">
        <div className="hs">
          <HeroPolygons />
          <LandingHero />
        </div>

        <section className="lp-stats" aria-label="QuizSupport by the numbers">
          <div className="wrap">
            {STATS.map((stat) => (
              <div className="lp-stat" key={stat.label}>
                <b>
                  <AnimatedStat value={stat.value} suffix={stat.suffix} />
                </b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="s" id="toolkit">
          <div className="wrap">
            <p className="eb">The toolkit</p>
            <h2 className="t">From one scope to a finished paper.</h2>
            <p className="d">
              Six tools that share the same question bank, the same access codes and
              the same results view. Use one, or use the whole loop.
            </p>
            <div className="tg">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const content = (
                  <>
                    <i>
                      <Icon size={20} />
                    </i>
                    <div>
                      <b>
                        {tool.title}
                        <span className={tool.tone ? `pl ${tool.tone}` : "pl"}>
                          {tool.badge}
                        </span>
                      </b>
                      <ul className="tpoints">
                        {tool.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                      <em>{tool.cta} →</em>
                    </div>
                  </>
                );
                return tool.href.startsWith("#") ? (
                  <a className="tc" key={tool.title} href={tool.href}>
                    {content}
                  </a>
                ) : (
                  <Link className="tc" key={tool.title} href={tool.href}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <GeneratorStudio />

        <section className="s" id="platform">
          <div className="wrap">
            <p className="eb">The live platform</p>
            <h2 className="t">The paper is only the beginning.</h2>
            <p className="d">
              Publish, share and run the quiz. Then see every answer, rank and
              question-level insight — while it is still useful.
            </p>
            <FeatureTabs />
            <div className="fg">
              {CAPABILITIES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div className="fc" key={feature.title}>
                    <i>
                      <Icon size={20} />
                    </i>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="s" id="how">
          <div className="wrap">
            <p className="eb">How it works</p>
            <h2 className="t">Three steps. One of them is just choosing.</h2>
            <p className="d">
              The slow part of a quiz is the paper. The rest should take minutes,
              not a free afternoon.
            </p>
            <div className="st">
              {STEPS.map((step) => (
                <div className="step" key={step.number}>
                  <b>{step.number}</b>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  {step.code && <span className="code cd">{step.code}</span>}
                </div>
              ))}
            </div>
            <div className="au">
              {AUDIENCES.map((audience) => (
                <div className="ac" key={audience.chip}>
                  <span className={`pl ${audience.tone}`}>{audience.chip}</span>
                  <h3>{audience.title}</h3>
                  <p>{audience.desc}</p>
                  {audience.href.startsWith("#") ? (
                    <a href={audience.href} className="btn sm">
                      {audience.cta}
                    </a>
                  ) : (
                    <Link href={audience.href} className="btn sm">
                      {audience.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="s" id="pricing">
          <div className="wrap">
            <p className="eb">Pricing</p>
            <h2 className="t">
              {trialDays > 0
                ? `Start with a ${trialDays}-day quiz-only trial.`
                : "Start creating quizzes today."}{" "}
              {offerPlan?.offer
                ? `Upgrade at the ${offerPlan.offer.toLowerCase()}.`
                : "Upgrade when you need more."}
            </h2>
            <p className="d">
              Every plan includes the builder, access codes, instant results and
              leaderboards. Paid plans add more creations and AI credits. Keep the
              free quiz-only flow for as long as it works for you.
            </p>
            {offerPlan && (
              <div className="offer-strip">
                <span className="offer-tag">{offerPlan.offer}</span>
                <div>
                  <b>
                    {planNames || "Paid plans"} are available at the{" "}
                    {offerPlan.offer?.toLowerCase()}.
                  </b>
                  <small>
                    {trialDays > 0
                      ? `Start with a ${trialDays}-day quiz-only trial. Upgrade only when you need more.`
                      : "Upgrade only when you need more."}
                  </small>
                </div>
              </div>
            )}

            <h3 className="pgroup">Monthly plans</h3>
            <div className="lp-plans">
              {catalog.plans.length === 0 && (
                <p className="d">Plans are currently unavailable. Please check back later.</p>
              )}
              {catalog.plans.map((plan) => {
                const discount = getPlanDiscount(plan);
                return (
                  <div className={plan.featured ? "pk hot" : "pk"} key={plan.id}>
                    {plan.featured && <span className="tag">★ Most popular</span>}
                    <div className="nm">
                      {plan.name}
                      {plan.trialDays ? (
                        <span className="save">{plan.trialDays}-day trial</span>
                      ) : plan.discountBadge || discount > 0 ? (
                        <span className="save">{plan.discountBadge || `${discount}% off`}</span>
                      ) : null}
                    </div>
                    <span
                      className={plan.offer ? "offer-line" : "offer-line is-empty"}
                      aria-hidden={plan.offer ? undefined : true}
                    >
                      {plan.offer ?? "\u00A0"}
                    </span>
                    <div className="pr">
                      {formatPricingAmount(plan.price, plan.currency)}
                      {discount > 0 && plan.originalPrice ? (
                        <s className="was">{formatPricingAmount(plan.originalPrice, plan.currency)}</s>
                      ) : null}
                      <small> / month</small>
                    </div>
                    <div className="cr cr-plans">
                      <span className="cr-plans-main">
                        {plan.quizzes} quiz creations · {plan.rooms}{" "}
                        {plan.rooms === 1 ? "room" : "rooms"}
                      </span>
                      <span
                        className={
                          plan.credits > 0 ? "cr-credits" : "cr-credits is-muted"
                        }
                      >
                        {plan.credits > 0 && <Sparkles size={12} aria-hidden />}
                        {plan.credits > 0
                          ? `${plan.credits} AI credits / month`
                          : "AI credits sold separately"}
                      </span>
                    </div>
                    {plan.features.length > 0 && (
                      <ul className="pfeat">
                        {plan.features.slice(0, 6).map((feature) => (
                          <li key={feature}>
                            <Check size={14} aria-hidden />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p>{plan.tagline}</p>
                    <Link className="btn" href="/pricing">
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="sub pricing-note">
              <Link href="/pricing">Compare all monthly plans</Link>.
            </p>

            <div className="packs-head">
              <div>
                <h3 className="pgroup">AI credit packs</h3>
                <p className="d">
                  Paid monthly plans include AI credits. Extra packs are one-time and
                  work with every plan.
                </p>
              </div>
              <span className="packs-note">
                {creditValidityMonths > 0
                  ? `Credits stay valid for up to ${creditValidityMonths} months.`
                  : "Use your credits whenever you need them."}
              </span>
            </div>
            <div className="pay-ad">
              <span className="pay-ico" aria-hidden="true">
                <CreditCard size={22} />
              </span>
              <div className="pay-copy">
                <span className="pay-tag">One-time payment</span>
                <b>No auto-renew. No surprise charges.</b>
                <small>
                  {creditValidityMonths > 0
                    ? `Buy once. Use for up to ${creditValidityMonths} months.`
                    : "Buy once. Use your credits whenever you need them."}{" "}
                  UPI, cards or net banking.
                </small>
              </div>
              <div className="pay-pills" aria-label="Payment methods">
                <span>UPI</span>
                <span>Cards</span>
                <span>Net Banking</span>
              </div>
            </div>
            <div className="pk3">
              {creditPacks.length === 0 && (
                <p className="d">Credit packs are currently unavailable. Please check back later.</p>
              )}
              {creditPacks.map((pack) => {
                const rate = pack.price / pack.credits;
                const save = baseRate ? Math.round((1 - rate / baseRate) * 100) : 0;
                return (
                  <div className={pack.popular ? "pk hot" : "pk"} key={pack.id}>
                    {pack.popular && <span className="tag">★ Limited Offer</span>}
                    <div className="nm">
                      {pack.name}
                      {save > 0 && <span className="save">Save {save}%</span>}
                    </div>
                    <div className="pr">{formatPricingAmount(pack.price)}</div>
                    <div className="cr">{pack.credits} credits</div>
                    <p>
                      {pack.blurb} Valid for {pack.validityMonths}{" "}
                      {pack.validityMonths === 1 ? "month" : "months"}.
                    </p>
                    <Link className="btn" href={`/creator/billing/credits?pack=${pack.id}`}>
                      {pack.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="sub pricing-note">
              <Link href="/pricing/credits">See all AI credit packs</Link> ·{" "}
              <Link href="/pricing">Compare monthly plans</Link>
            </p>
          </div>
        </section>

        <section className="s" id="faq">
          <div className="wrap fq-wrap">
            <p className="eb">Questions</p>
            <h2 className="t">Good to know</h2>
            {faqs.map((faq) => (
              <details className="fq" key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="s cta-section">
          <div className="wrap">
            <div className="cta">
              <p className="cta-kicker">No setup. No installs.</p>
              <h2>Your first quiz takes about five minutes.</h2>
              <p className="cta-lead">
                Pick a scope, let AI compose the paper, and share the code. Students
                join in the browser — results arrive before the bell.
              </p>
              <div className="cta-actions">
                <Link className="btn sun" href="/creator/quizzes/create">
                  Create a quiz for free
                </Link>
                <a className="btn ghost-light" href="#top">
                  Join with a code
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap ft">
          <div className="ft-brand">
            <SecureLogo size={34} variant="full" rounded={false} className="logo" />
            <p>AI-assisted papers, one access code, and results before the bell.</p>
            <small>© {new Date().getFullYear()} QuizSupport. All rights reserved.</small>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div className="ft-col" key={column.title}>
              <b>{column.title}</b>
              {column.links.map((link) =>
                link.href.startsWith("#") ? (
                  <a key={link.label} href={link.href}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
