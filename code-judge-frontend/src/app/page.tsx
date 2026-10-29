import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  GraduationCap,
  HelpCircle,
  Mail,
  Mic,
  NotebookPen,
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
import HeroPolygons from "@/components/marketing/landing/HeroPolygons";
import LandingReveal from "@/components/marketing/landing/LandingReveal";
import LpHeader from "@/components/marketing/landing/LpHeader";
import LpJoinForm from "@/components/marketing/landing/LpJoinForm";
import SampleQuizDemo from "@/components/marketing/SampleQuizDemo";
import LpPricingTabs from "@/components/marketing/landing/LpPricingTabs";
import StudioShowcase from "@/components/marketing/landing/StudioShowcase";
import { SecureLandingImage } from "@/components/marketing/landing/SecureLandingImage";
import { SecureLogo } from "@/components/common/SecureLogo";
import { getPricingCatalogServer } from "@/services/pricing";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "QuizSupport – Choose a topic. AI writes your paper.",
  description:
    "Pick a subject and chapters. AI writes the questions, composes the paper and gets it ready to share. One code for students, instant results for you.",
  path: "/",
  absoluteTitle: true,
});

const STATS = [
  { value: 1000, suffix: "+", label: "Learners every month" },
  { value: 20, suffix: "+", label: "Teachers and creators" },
  { value: 0, suffix: "", label: "Installs needed" },
  { value: 1, suffix: "", label: "Code to join" },
];

const CAPABILITIES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Radio, title: "Live quizzes", desc: "One code in. Attempts land as they happen." },
  { icon: Trophy, title: "Responses & ranks", desc: "Marks, time and rank for every student." },
  { icon: BarChart3, title: "Question analytics", desc: "Hardest, easiest and slowest questions." },
  { icon: Zap, title: "Game mode", desc: "Lives, lifelines and a timer per question." },
  { icon: ShieldCheck, title: "Secure exams", desc: "Focused, timed attempts with auto-submit." },
  { icon: CalendarDays, title: "Scheduled quizzes", desc: "Open and close on your clock." },
  { icon: HelpCircle, title: "Question bank", desc: "Save once. Reuse across every paper." },
  { icon: Mail, title: "Email and export", desc: "CSV, PDF, Word and email in one click." },
  { icon: Smartphone, title: "Works anywhere", desc: "Phone or laptop. Nothing to install." },
];

const STEPS = [
  {
    number: "1",
    title: "Choose the topic",
    desc: "Choose subject and chapters. AI drafts the paper.",
  },
  {
    number: "2",
    title: "Share the code",
    desc: "Every quiz gets a code. Send it anywhere.",
  },
  {
    number: "3",
    title: "Watch results",
    desc: "Scores, ranks and tricky questions, instantly.",
  },
];

const AUDIENCES: {
  icon: LucideIcon;
  chip: string;
  title: string;
  desc: string;
  points: string[];
  cta: string;
  href: string;
  tone: string;
}[] = [
  {
    icon: GraduationCap,
    chip: "For students",
    title: "Practice. Compete. Repeat.",
    desc: "Join with a code and start answering.",
    points: [
      "Join quiz with one code",
      "Attempt on your phone or laptop",
      "Practise with ready-made sets",
      "Climb ranks, with time as tiebreaker",
    ],
    cta: "Find practice sets",
    href: "/quiz",
    tone: "blue",
  },
  {
    icon: NotebookPen,
    chip: "For teachers",
    title: "Papers in minutes",
    desc: "Turn your syllabus into a ready paper.",
    points: [
      "AI writes questions from subject and chapters",
      "Edit anything. Set marks and time",
      "Export print-ready PDF or Word",
      "See every result before students do",
    ],
    cta: "See AI credits",
    href: "/pricing/credits",
    tone: "green",
  },
  {
    icon: Mic,
    chip: "For creators",
    title: "Host. Track. Repeat.",
    desc: "Run quizzes for any batch or crowd.",
    points: [
      "Go live with one shareable code",
      "Schedule when quizzes open and close",
      "Add game mode and lifelines",
      "Track performance over time in rooms",
    ],
    cta: "Explore features",
    href: "#features",
    tone: "amber",
  },
];

function buildFaqs(trialDays: number) {
  return [
    {
      q: "Do students need to install anything?",
      a: "No. It runs in the browser on any phone or laptop.",
    },
    {
      q: "When do students see results?",
      a: "You see them instantly. Students see theirs an hour after the quiz ends.",
    },
    {
      q: "What is exam mode?",
      a: "A focused, timed exam view that keeps every attempt on the paper.",
    },
    {
      q: "Can I export results or papers?",
      a: "Yes. Results go to CSV or email. Papers go to PDF or Word.",
    },
    {
      q: "Is there a subscription?",
      a:
        trialDays > 0
          ? `Monthly plans start with a ${trialDays}-day quiz-only trial. AI credit packs are one-time, with no auto-renew.`
          : "Monthly plans renew monthly. AI credit packs are one-time, with no auto-renew.",
    },
  ];
}

export default async function HomePage() {
  const catalog = await getPricingCatalogServer();
  const plans = catalog.plans;
  const creditPacks = catalog.creditPacks;
  const trialDays = plans.find((plan) => plan.trialDays > 0)?.trialDays ?? 7;
  const creditValidityMonths =
    creditPacks.length > 0 ? Math.max(...creditPacks.map((pack) => pack.validityMonths)) : 0;
  const faqs = buildFaqs(trialDays);

  return (
    <div className="qs-ui qs-lp lpx">
      <LpHeader />

      <header id="top" className="lpx-hero-shell">
        <div className="lpx-hero-movie" aria-hidden="true">
          <span className="lpx-hero-beam" />
          <span className="lpx-hero-orb lpx-hero-orb-a" />
          <span className="lpx-hero-orb lpx-hero-orb-b" />
          <span className="lpx-hero-grain" />
        </div>
        <HeroPolygons />
        <div className="lpx-wrap">
          <div className="lpx-trial">
            <HeroPolygons />
            <div className="lpx-trial-copy">
              <span className="lpx-trial-tag">
                <Sparkles size={13} aria-hidden />
                Launch offer
              </span>
              <p>
                <b>{trialDays} days free trial.</b>
              </p>
            </div>
            <Link href="/pricing" className="lpx-btn lpx-btn-dark">
              Start free trial
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          <div className="lpx-hero">
            <div>
              <h1>Choose a topic. AI writes your paper.</h1>
              <p className="lpx-lead">Pick subject and chapters. Share one code. Watch results land.</p>
              <LpJoinForm />
            </div>
            <div className="lpx-hero-demo">
              <SampleQuizDemo timerSeconds={45} />
            </div>
          </div>
        </div>

        <div className="lpx-stats">
          <div className="lpx-wrap">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <b>
                  <AnimatedStat value={stat.value} suffix={stat.suffix} />
                </b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="lpx-section" id="studio" data-reveal>
        <div className="lpx-wrap">
          <StudioShowcase />
        </div>
      </section>

      <section className="lpx-section" id="features" data-reveal>
        <div className="lpx-wrap">
          <FeatureTabs />
          <div className="lpx-g8">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title}>
                  <em>
                    <Icon size={20} aria-hidden />
                  </em>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="rooms" className="lpx-rooms" data-reveal>
        <HeroPolygons />
        <div className="lpx-wrap lpx-two">
          <div>
            <span className="lpx-tag lpx-tag-yellow">Rooms</span>
            <h2>Your batch. Your quizzes. One room.</h2>
            <p className="lpx-lead">Create once. Share one code. Run every quiz here.</p>
            <ul className="lpx-checks lpx-checks-light">
              <li>Students join in seconds with one code</li>
              <li>Reuse the room across quizzes and terms</li>
              <li>See who joined, attempted, needs a nudge</li>
              <li>Made for batches, clubs, study groups</li>
            </ul>
            <div className="lpx-actions">
              <Link href="/creator/rooms" className="lpx-btn lpx-btn-yellow">
                Create a room
              </Link>
              <Link href="/rooms" className="lpx-btn lpx-btn-outline-light">
                Explore rooms
              </Link>
            </div>
          </div>
          <div className="lpx-hand-shot">
            <SecureLandingImage
              name="hand-phone"
              alt="The Rooms screen on a phone held in one hand, showing joined classrooms, member counts and activity"
              width={700}
              height={1057}
            />
          </div>
        </div>
      </section>

      <section className="lpx-section" id="how" data-reveal>
        <div className="lpx-wrap">
          <h2>Three steps. One of them is just choosing.</h2>
          <p className="lpx-lead">Choose, share, watch. That is the whole flow.</p>
          <div className="lpx-steps">
            {STEPS.map((step) => (
              <div className="lpx-step" key={step.number}>
                <div className="lpx-step-num">{step.number}</div>
                <div className="lpx-step-stem" />
                <div className="lpx-step-text">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lpx-section" id="who" data-reveal>
        <div className="lpx-wrap">
          <h2>Made for everyone in the room.</h2>
          <p className="lpx-lead">See what you get, whichever side you are on.</p>
          <div className="lpx-who">
            {AUDIENCES.map((audience) => {
              const Icon = audience.icon;
              return (
                <div className="lpx-wc" key={audience.chip}>
                  <div className={`lpx-wh lpx-wh-${audience.tone}`}>
                    <i>
                      <Icon size={25} aria-hidden />
                    </i>
                    <small>{audience.chip}</small>
                    <h3>{audience.title}</h3>
                    <p>{audience.desc}</p>
                  </div>
                  <div className="lpx-wb">
                    <h4>What you get</h4>
                    <ul className="lpx-checks">
                      {audience.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    {audience.href.startsWith("#") ? (
                      <a href={audience.href} className="lpx-btn lpx-btn-outline lpx-btn-wide">
                        {audience.cta}
                      </a>
                    ) : (
                      <Link href={audience.href} className="lpx-btn lpx-btn-outline lpx-btn-wide">
                        {audience.cta}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="lpx-section" id="pricing" data-reveal>
        <div className="lpx-wrap">
          <h2>Simple pricing. Pick what you need.</h2>
          <LpPricingTabs
            plans={plans}
            creditPacks={creditPacks}
            creditValidityMonths={creditValidityMonths}
            trialDays={trialDays}
          />
        </div>
      </section>

      <section className="lpx-section" id="faq" data-reveal>
        <div className="lpx-wrap lpx-faq">
          <h2>Good to know</h2>
          {faqs.map((faq) => (
            <details key={faq.q}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lpx-cta" data-reveal>
        <HeroPolygons />
        <h2>Your first paper is one topic away.</h2>
        <div className="lpx-cta-actions">
          <Link href="/creator/quizzes/create" className="lpx-btn lpx-btn-dark">
            Start with a topic
          </Link>
          <a href="#top" className="lpx-btn lpx-btn-outline-dark">
            Join with a code
          </a>
        </div>
      </section>

      <footer className="lpx-footer">
        <div className="lpx-wrap">
          <b>
            <SecureLogo size={36} variant="full" rounded={false} />
          </b>
          <nav aria-label="Footer">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/quiz">Quizzes</Link>
            <Link href="/rooms">Rooms</Link>
          </nav>
        </div>
      </footer>
      <LandingReveal />
    </div>
  );
}
