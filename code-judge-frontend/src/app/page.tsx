import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  FileText,
  HelpCircle,
  Mail,
  Moon,
  PenLine,
  Plus,
  Radio,
  Smartphone,
  Sparkles,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import QuizCodeForm from "@/components/marketing/QuizCodeForm";
import SampleQuizDemo from "@/components/marketing/SampleQuizDemo";
import HeroPolygons from "@/components/marketing/landing/HeroPolygons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import GeneratorStudio from "@/components/marketing/landing/GeneratorStudio";
import FeatureTabs from "@/components/marketing/landing/FeatureTabs";
import { SecureLogo } from "@/components/common/SecureLogo";
import { CREDIT_PURCHASE_PACKS } from "@/config/aiCredits";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "QuizSupport – Create quizzes with AI. Share them with a code.",
  description:
    "Turn a topic into a ready paper, send students one access code, and watch scores, ranks and question insights arrive live. Generate questions with AI, or practice for JEE, NEET, GATE, SSC, UPSC and Banking.",
  path: "/",
  absoluteTitle: true,
});

const NAV_LINKS = [
  { label: "Tools", href: "#tools" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "/pricing" },
  { label: "AI credits", href: "#pricing" },
];

const EXAMS = ["JEE", "NEET", "GATE", "SSC", "UPSC", "Banking"];

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
    desc: "Build a quiz by hand or from generated questions.",
    cta: "Start building →",
    href: "/creator/quizzes/create",
  },
  {
    icon: Sparkles,
    title: "AI question generator",
    desc: "Pick scope and difficulty. Get questions with answer keys.",
    cta: "Try it below →",
    href: "#qgen",
  },
  {
    icon: FileText,
    title: "Paper generator",
    desc: "Compose a print-ready paper and export it to PDF or Word.",
    cta: "Try it below →",
    href: "#paper",
  },
  {
    icon: HelpCircle,
    title: "Question bank",
    desc: "Save problems once and reuse them across papers.",
    cta: "Open bank →",
    href: "/creator/problems",
  },
  {
    icon: PenLine,
    title: "Practice sets",
    desc: "Ready-made sets for JEE, NEET, GATE, SSC, UPSC and Banking.",
    cta: "Browse sets →",
    href: "/quiz",
  },
  {
    icon: Radio,
    title: "Live quizzes",
    desc: "Share a code and watch responses arrive in real time.",
    cta: "See how →",
    href: "#features",
  },
];

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  { icon: Timer, title: "Secure exams", desc: "Timers and auto-submit when time runs out." },
  {
    icon: CalendarDays,
    title: "Scheduled quizzes",
    desc: "Open and close a quiz on your own schedule.",
  },
  { icon: HelpCircle, title: "Question bank", desc: "Save problems and reuse them across papers." },
  { icon: Mail, title: "Email and export", desc: "Send results by email or download them as CSV." },
  {
    icon: Trophy,
    title: "Ranks and leaderboards",
    desc: "See who is on top, with time as the tiebreaker.",
  },
  { icon: Smartphone, title: "Works anywhere", desc: "Phone or laptop. Nothing to install." },
  { icon: Moon, title: "Light and dark", desc: "Easy on the eyes, day or night." },
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
    title: "Create",
    desc: "Pick subject, chapters and topics, set how many easy, medium and hard questions you want, and let AI draft the paper. Edit anything.",
  },
  {
    number: "2",
    title: "Share the code",
    desc: "Every quiz gets its own access code. Send it on WhatsApp, email or a class group.",
    code: "VQBA-MIDJ-ETTW-EFRT",
  },
  {
    number: "3",
    title: "Watch results",
    desc: "Students get instant feedback. You get scores, ranks, time taken and which questions were hardest.",
  },
];

const AUDIENCES = [
  {
    chip: "Students",
    tone: "blue",
    title: "Practice and compete",
    desc: "Join with a code, answer on any device, see your score instantly and keep your history.",
    cta: "Find practice sets",
    href: "/quiz",
  },
  {
    chip: "Teachers",
    tone: "ok",
    title: "Papers in minutes",
    desc: "Generate questions from your syllabus, export print-ready papers, and see how every student did.",
    cta: "See AI credits",
    href: "/pricing/credits",
  },
  {
    chip: "Creators",
    tone: "warn",
    title: "Host and track",
    desc: "Run live quizzes, add lifelines and lives to make them fun, and track performance over time.",
    cta: "Explore features",
    href: "#features",
  },
];

const FAQS = [
  {
    q: "Do students need to install anything?",
    a: "No. QuizSupport works in the browser on mobile and desktop, so students only need the access code.",
  },
  {
    q: "How does the access code work?",
    a: "Each quiz has its own code. Students enter it on the home page to join, answer the questions and see their result right away.",
  },
  {
    q: "What kinds of questions can AI generate?",
    a: "MCQ, short and long questions, from the subject, chapters and topics you pick. Paste your syllabus for more precise results.",
  },
  {
    q: "Is there a subscription?",
    a: "There is a free plan with five quizzes a month. Basic and Pro add more quiz creations and include monthly AI credits; extra credits are one-time packs that work with every plan.",
  },
  {
    q: "Can I get results out of the platform?",
    a: "Yes. Download results as CSV, send them by email, or export papers to PDF and Word.",
  },
  {
    q: "Can I print a question paper?",
    a: "Yes. Add questions to the paper generator, set the title, marks and time, then export it to PDF or Word.",
  },
];

const BASE_RATE = CREDIT_PURCHASE_PACKS[0]
  ? CREDIT_PURCHASE_PACKS[0].price / CREDIT_PURCHASE_PACKS[0].credits
  : 0;

const CREDIT_VALIDITY_MONTHS = Math.max(
  ...CREDIT_PURCHASE_PACKS.map((pack) => pack.validityMonths)
);

export default function HomePage() {
  return (
    <div className="qs-ui qs-lp min-h-screen">
      <nav aria-label="Main">
        <div className="wrap">
          <Link href="/" aria-label="QuizSupport home">
            <SecureLogo size={42} variant="full" rounded={false} className="logo" />
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
              Create a quiz
            </Link>
          </div>
        </div>
      </nav>

      <main id="top">
        <div className="hs">
          <HeroPolygons />
          <header className="wrap hero">
            <div>
              <p className="eb">AI quiz &amp; paper studio</p>
              <h1>Create quizzes with AI. Share them with a code.</h1>
              <p className="lead">
                Turn a topic into a ready paper, send students one access code, and
                watch scores, ranks and question insights arrive live.
              </p>
              <QuizCodeForm />
              <p className="sub">
                Want to host one?{" "}
                <Link href="/creator/quizzes/create">Create a quiz for free</Link>
              </p>
              <div className="exs">
                {EXAMS.map((exam) => (
                  <span key={exam}>{exam}</span>
                ))}
              </div>
            </div>
            <SampleQuizDemo />
          </header>
        </div>

        <section className="s" id="tools">
          <div className="wrap">
            <p className="eb">The toolkit</p>
            <h2 className="t">Everything you need to build a quiz or a question paper</h2>
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
            <p className="eb">Everything in one place</p>
            <h2 className="t">
              One platform for the whole quiz, from first question to final rank
            </h2>
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

        <section className="s" id="how">
          <div className="wrap">
            <p className="eb">How it works</p>
            <h2 className="t">From blank page to live results in three steps</h2>
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

        <section className="s" id="pricing">
          <div className="wrap">
            <p className="eb">AI credits</p>
            <h2 className="t">
              Pay once. Use your credits for up to {CREDIT_VALIDITY_MONTHS} months.
            </h2>
            <p className="d">
              Basic and Pro include monthly AI credits; extra packs are a
              one-time purchase and work with every plan. Every pack lets you
              generate MCQ, short and long questions and export to PDF or Word.
            </p>
            <div className="pk3">
              {CREDIT_PURCHASE_PACKS.map((pack) => {
                const rate = pack.price / pack.credits;
                const save = BASE_RATE ? Math.round((1 - rate / BASE_RATE) * 100) : 0;
                return (
                  <div className={pack.popular ? "pk hot" : "pk"} key={pack.id}>
                    {pack.popular && <span className="tag">★ Most Popular</span>}
                    <div className="nm">
                      {pack.name}
                      {save > 0 && <span className="save">Save {save}%</span>}
                    </div>
                    <div className="pr">₹{pack.price}</div>
                    <div className="cr">
                      {pack.credits} credits <span>· ₹{rate.toFixed(2)} / credit</span>
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
              Secure payments via UPI, Cards &amp; Net Banking.{" "}
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
            {FAQS.map((faq) => (
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
              <h2>Your first quiz takes about five minutes.</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" href="/creator/quizzes/create">
                  Create a quiz
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
          </div>
        </div>
      </footer>
    </div>
  );
}
