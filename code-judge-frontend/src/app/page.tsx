import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CreditCard,
  FileText,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  Moon,
  PenLine,
  Plus,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  Trophy,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import QuizCodeForm from "@/components/marketing/QuizCodeForm";
import SampleQuizDemo from "@/components/marketing/SampleQuizDemo";
import HeroPolygons from "@/components/marketing/landing/HeroPolygons";
import AnimatedStat from "@/components/marketing/landing/AnimatedStat";
import ThemeToggle from "@/components/ui/ThemeToggle";
import GeneratorStudio from "@/components/marketing/landing/GeneratorStudio";
import FeatureTabs from "@/components/marketing/landing/FeatureTabs";
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

const NAV_LINKS = [
  { label: "Tools", href: "#tools" },
  { label: "Features", href: "#features" },
  { label: "Rooms", href: "#rooms" },
  { label: "Why us", href: "#why" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#plans" },
];

interface ToolCard {
  icon: LucideIcon;
  title: string;
  desc: string;
  cta: string;
  href: string;
}

const TOOLS: ToolCard[] = [
  {
    icon: Plus,
    title: "Quiz builder",
    desc: "Start blank. Or start with a prompt.",
    cta: "Build one →",
    href: "/creator/quizzes/create",
  },
  {
    icon: Sparkles,
    title: "AI question generator",
    desc: "Pick the scope. Get questions, keys and marks.",
    cta: "Try it →",
    href: "#qgen",
  },
  {
    icon: FileText,
    title: "Paper generator",
    desc: "The paper assembles itself.",
    cta: "See it →",
    href: "#paper",
  },
  {
    icon: HelpCircle,
    title: "Question bank",
    desc: "Save the good ones. Reuse them.",
    cta: "Open bank →",
    href: "/creator/problems",
  },
  {
    icon: PenLine,
    title: "Practice sets",
    desc: "Ready-made. No setup.",
    cta: "Browse sets →",
    href: "/quiz",
  },
  {
    icon: Radio,
    title: "Live quizzes",
    desc: "One code. Everyone in. Results live.",
    cta: "See it live →",
    href: "#features",
  },
];

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  { icon: Timer, title: "Secure exams", desc: "Timed and focused. No babysitting." },
  {
    icon: CalendarDays,
    title: "Scheduled quizzes",
    desc: "Open and close on your clock.",
  },
  { icon: HelpCircle, title: "Question bank", desc: "Save once. Reuse everywhere." },
  { icon: Mail, title: "Email and export", desc: "Results out in one click." },
  {
    icon: Trophy,
    title: "Ranks and leaderboards",
    desc: "Ranks, with time as the tiebreaker.",
  },
  { icon: Smartphone, title: "Works anywhere", desc: "Phone or laptop. Nothing to install." },
  { icon: Moon, title: "Light and dark", desc: "Easy on the eyes, day or night." },
];

const STATS = [
  { value: 1000, suffix: "+", label: "learners every month" },
  { value: 20, suffix: "+", label: "teachers and creators" },
  { value: 0, suffix: "", label: "installs needed" },
  { value: 1, suffix: "", label: "code to join" },
];

const WHY_CARDS: FeatureCard[] = [
  {
    icon: ShieldCheck,
    title: "Exam mode, minus the drama",
    desc: "Cheating is hard. It watches so you don't have to.",
  },
  {
    icon: Users,
    title: "One room. Every quiz.",
    desc: "Group once, share one code, reuse the batch forever.",
  },
  {
    icon: Zap,
    title: "Results before the bell",
    desc: "Instant grading, ranks and accuracy — no spreadsheets.",
  },
  {
    icon: Lock,
    title: "You see it first",
    desc: "You see results instantly. Students, one hour after.",
  },
  {
    icon: BarChart3,
    title: "Know what to teach next",
    desc: "Hardest questions, slowest topics and who needs help.",
  },
  {
    icon: Sparkles,
    title: "AI does the busywork",
    desc: "Generate a full paper, then edit anything you want.",
  },
];

const COMPARISON_ROWS = [
  {
    need: "Students join",
    us: "One code",
    them: "Links, lists, reminders",
  },
  {
    need: "Exam integrity",
    us: "Focused exam mode",
    them: "No controls",
  },
  {
    need: "Batch management",
    us: "Reusable rooms",
    them: "Spreadsheets",
  },
  {
    need: "Results",
    us: "Instant ranks + analytics",
    them: "Manual marking",
  },
  {
    need: "Result privacy",
    us: "Teacher first",
    them: "Everyone at once",
  },
  {
    need: "Exports",
    us: "CSV, email, PDF, Word",
    them: "Copy-paste",
  },
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
    desc: "Subject, chapters, difficulty. AI drafts the paper. You edit what you want.",
  },
  {
    number: "2",
    title: "Share the code",
    desc: "Every quiz gets its own code. Send it anywhere.",
    code: "VQBA-MIDJ-ETTW-EFRT",
  },
  {
    number: "3",
    title: "Watch results",
    desc: "Scores, ranks and the questions that tripped everyone up — instantly.",
  },
];

const AUDIENCES = [
  {
    chip: "Students",
    tone: "blue",
    title: "Practice. Compete. Repeat.",
    desc: "Join with a code, answer anywhere, see your score instantly.",
    cta: "Find practice sets",
    href: "/quiz",
  },
  {
    chip: "Teachers",
    tone: "ok",
    title: "Papers in minutes",
    desc: "Generate from your syllabus, export print-ready, see every result.",
    cta: "See AI credits",
    href: "/pricing/credits",
  },
  {
    chip: "Creators",
    tone: "warn",
    title: "Host. Track. Repeat.",
    desc: "Live quizzes, lifelines and performance over time.",
    cta: "Explore features",
    href: "#features",
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
      a: "No. It runs in the browser on phone or laptop. Just the code.",
    },
    {
      q: "How does the access code work?",
      a: "Every quiz has its own code. Enter it to join. Results open an hour after the quiz ends; teachers see them immediately.",
    },
    {
      q: "What is exam mode?",
      a: "A focused exam view with timers so every attempt stays on the paper.",
    },
    {
      q: "What are rooms?",
      a: "Reusable student groups. Create once, share the code, assign every quiz.",
    },
    {
      q: "Who can see results?",
      a: "Owners and collaborators see results immediately. Students see theirs an hour after the quiz ends.",
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
      a: "Yes. CSV, email, PDF and Word.",
    },
    {
      q: "Can I print a question paper?",
      a: "Yes. Add questions, set title, marks and time, then export to PDF or Word.",
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
      <nav aria-label="Main">
        <div className="wrap">
          <Link href="/" aria-label="QuizSupport home">
            <SecureLogo size={35} variant="full" rounded={false} className="logo" />
          </Link>
          <div className="nl">
            {NAV_LINKS.map((link) =>
              link.href.startsWith("#") ? (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              )
            )}
            <ThemeToggle variant="icon" />
            <Link href="/login" className="btn sm">
              Log in
            </Link>
            <Link href="/creator/quizzes/create" className="btn sm pri">
              Create a paper
            </Link>
          </div>
        </div>
      </nav>

      <main id="top">
        <div className="hs">
          <HeroPolygons />
          {trialPlan && (
            <div className="wrap trial-banner-wrap">
              <div className="trial-banner">
                <div className="trial-copy">
                  <span className="trial-kicker">New creator offer</span>
                  <strong>{trialDays}-day free trial</strong>
                  <span className="trial-includes">
                    Quiz-only trial. No AI credits. No card required.
                  </span>
                </div>
                <Link href="/register" className="btn trial-cta">
                  Start quiz-only trial
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </div>
          )}
          <header className="wrap hero hero-compact">
            <div>
              <p className="eb">AI paper studio</p>
              <h1>Pick a scope. The paper writes itself.</h1>
              <p className="lead">
                One scope in. A ready paper out. Share a code and watch the results
                land.
              </p>
              <QuizCodeForm />
            </div>
            <SampleQuizDemo />
          </header>
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

        <section className="s" id="tools">
          <div className="wrap">
            <p className="eb">The toolkit</p>
            <h2 className="t">From one scope to a finished paper.</h2>
            <div className="tg">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const content = (
                  <>
                    <i>
                      <Icon size={20} />
                    </i>
                    <div>
                      <b>{tool.title}</b>
                      <small>{tool.desc}</small>
                      <em>{tool.cta}</em>
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

        <section className="s" id="features">
          <div className="wrap">
            <p className="eb">After the paper</p>
            <h2 className="t">The paper is only the beginning.</h2>
            <FeatureTabs />
            <div className="fg">
              {FEATURE_CARDS.map((feature) => {
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

        <section className="s" id="why">
          <div className="wrap">
            <p className="eb">Why it feels different</p>
            <h2 className="t">Built for the parts nobody warns you about.</h2>
            <p className="d">
              Most tools stop at a form and a score.{" "}
              <SecureLogo
                size={20}
                variant="full"
                rounded={false}
                className="inline-block align-[-4px]"
              />{" "}
              handles the rest.
            </p>
            <div className="wg">
              {WHY_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div className="wc" key={card.title}>
                    <i>
                      <Icon size={22} />
                    </i>
                    <h3>{card.title}</h3>
                    <p>{card.desc}</p>
                  </div>
                );
              })}
            </div>
            <div className="cmp-wrap">
              <table className="cmp">
                <thead>
                  <tr>
                    <th>What you need</th>
                    <th>
                      <SecureLogo size={26} variant="full" rounded={false} theme="dark" />
                    </th>
                    <th>The usual stack</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.need}>
                      <th scope="row">{row.need}</th>
                      <td className="yes">
                        <span>
                          <Check size={16} aria-hidden />
                          {row.us}
                        </span>
                      </td>
                      <td className="no">
                        <span>
                          <X size={16} aria-hidden />
                          {row.them}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="cmp-note">One platform. None of the patchwork.</p>
          </div>
        </section>

        <section className="s" id="rooms">
          <div className="wrap rooms-split">
            <div>
              <p className="eb">Rooms</p>
              <h2 className="t">Your batch. Your quizzes. One room.</h2>
              <p className="d">
                Create a room once. Share the code. Run every quiz for that batch
                from one place.
              </p>
              <ul className="ck">
                <li>Generate a code. Join in seconds.</li>
                <li>Reuse the room across quizzes and terms.</li>
                <li>See who joined, attempted and needs a nudge.</li>
                <li>Built for batches, clubs and study groups.</li>
              </ul>
              <div className="rooms-actions">
                <Link className="btn pri" href="/rooms">
                  Explore rooms
                </Link>
                <Link className="btn" href="/creator/rooms">
                  Create a room
                </Link>
              </div>
            </div>
            <div className="room-flow">
              <div className="room-flow-step">
                <i>
                  <Users size={24} />
                </i>
                <div>
                  <b>Create a room</b>
                  <small>Add students once.</small>
                </div>
              </div>
              <span className="room-flow-line" aria-hidden />
              <div className="room-flow-step">
                <i>
                  <KeyRound size={24} />
                </i>
                <div>
                  <b>Share the room code</b>
                  <small>One code for everyone.</small>
                </div>
              </div>
              <span className="room-flow-line" aria-hidden />
              <div className="room-flow-step">
                <i>
                  <Radio size={24} />
                </i>
                <div>
                  <b>Run every quiz</b>
                  <small>Reuse the batch. Track every attempt.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="s" id="how">
          <div className="wrap">
            <p className="eb">How it works</p>
            <h2 className="t">Three steps. One of them is just choosing.</h2>
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
                  <a href={audience.href} className="btn sm">
                    {audience.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="s" id="plans">
          <div className="wrap">
            <p className="eb">Monthly plans</p>
            <h2 className="t">
              {trialDays > 0
                ? `Start with a ${trialDays}-day quiz-only trial.`
                : "Start creating quizzes today."}{" "}
              {offerPlan?.offer ? `Upgrade at the ${offerPlan.offer.toLowerCase()}.` : "Upgrade when you need more."}
            </h2>
            <p className="d">
              Every plan includes the builder, codes, instant results and
              leaderboards. Paid plans add more creations and AI credits.
            </p>
            {offerPlan && (
              <div className="offer-strip">
                <span className="offer-tag">{offerPlan.offer}</span>
                <div>
                  <b>{planNames || "Paid plans"} are available at the {offerPlan.offer?.toLowerCase()}.</b>
                  <small>
                    {trialDays > 0
                      ? `Start with a ${trialDays}-day quiz-only trial. Upgrade only when you need more.`
                      : "Upgrade only when you need more."}
                  </small>
                </div>
              </div>
            )}
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
                    <p>{plan.tagline}</p>
                    <Link className="btn" href="/pricing">
                      {plan.cta}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="sub" style={{ textAlign: "center", marginTop: 30 }}>
              <Link href="/pricing">Compare all monthly plans</Link>.
            </p>
          </div>
        </section>

        <section className="s" id="pricing">
          <div className="wrap">
            <p className="eb">AI credits</p>
            <h2 className="t">
              {creditValidityMonths > 0
                ? `Pay once. Use your credits for up to ${creditValidityMonths} months.`
                : "Pay once. Use your credits whenever you need them."}
            </h2>
            <p className="d">
              Paid monthly plans include AI credits. Extra packs are one-time
              and work with every plan.
            </p>
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
                    <div className="cr">
                      {pack.credits} credits
                    </div>
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
            <p className="sub" style={{ textAlign: "center", marginTop: 30 }}>
              <Link href="/pricing/credits">See all AI credit packs</Link>.
            </p>
            <p className="sub" style={{ textAlign: "center", marginTop: 8 }}>
              Need more quiz creations?{" "}
              <Link href="/pricing">Compare monthly plans</Link>.
            </p>
          </div>
        </section>

        <section className="s">
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

        <section className="s" style={{ borderTop: 0 }}>
          <div className="wrap">
            <div className="cta">
              <h2>Your first paper is one scope away.</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" href="/creator/quizzes/create">
                  Start with a scope
                </Link>
                <a
                  className="btn"
                  href="#top"
                  style={{
                    background: "transparent",
                    color: "var(--on-brand)",
                    borderColor: "var(--on-brand)",
                  }}
                >
                  Join with a code
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <SecureLogo size={34} variant="full" rounded={false} className="logo" />
          <div className="fl">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/quiz">Quizzes</Link>
            <Link href="/rooms">Rooms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
