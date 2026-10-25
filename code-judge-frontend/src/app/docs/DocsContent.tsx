"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  KeyRound,
  ListChecks,
  MonitorCheck,
  Plus,
  Presentation,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Target,
  Timer,
  Trophy,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";

type Role = "teacher" | "student";

interface DocStep {
  short: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  points: string[];
  note?: string;
  code?: string;
}

interface RoleOption {
  id: Role;
  label: string;
  cardTitle: string;
  cardDesc: string;
  icon: LucideIcon;
}

interface RoleGuide {
  kicker: string;
  title: string;
  description: string;
  readTime: string;
  steps: DocStep[];
  tip: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  quickLinks: { label: string; href: string }[];
  faqs: { q: string; a: string }[];
  ctaTitle: string;
  ctaBody: string;
}

const ROLES: RoleOption[] = [
  {
    id: "teacher",
    label: "I’m a teacher",
    cardTitle: "Create & run quizzes",
    cardDesc: "Build questions, set the rules, share a code and track results.",
    icon: Presentation,
  },
  {
    id: "student",
    label: "I’m a student",
    cardTitle: "Join & take quizzes",
    cardDesc: "Enter the code, attempt the quiz and review your score.",
    icon: GraduationCap,
  },
];

const GUIDES: Record<Role, RoleGuide> = {
  teacher: {
    kicker: "Teacher guide",
    title: "Create, share and run a quiz end to end.",
    description:
      "Everything from the first blank question to the live leaderboard — in the order you’ll actually do it.",
    readTime: "6 steps · about 5 min",
    steps: [
      {
        short: "Start",
        title: "Start a quiz in Creator Studio",
        summary:
          "Open Creator, hit Create Quiz, and choose the starting point that fits the prep time you have.",
        icon: WandSparkles,
        points: [
          "Start blank for questions you already have.",
          "Generate from a topic, notes or a document with AI.",
          "Build inside a series when the quiz belongs to a course.",
        ],
        note: "Drafts stay private until you publish. Nothing reaches students early.",
      },
      {
        short: "Questions",
        title: "Add questions your way",
        summary:
          "Mix question types in one quiz while keeping the student experience consistent.",
        icon: ListChecks,
        points: [
          "Single choice, multiple select, true/false, fill in the blanks and more.",
          "Set marks, difficulty and an optional per-question timer.",
          "Pull saved questions from your bank instead of retyping them.",
        ],
      },
      {
        short: "Answer key",
        title: "Mark answers, hints and explanations",
        summary:
          "Set the correct answer once, then add the context students need while they learn.",
        icon: Target,
        points: [
          "Mark one or more correct options per question.",
          "Add hints for during the attempt and explanations for review.",
          "Apply negative marking only where it makes sense.",
        ],
        note: "Students never see the answer key until you release results.",
      },
      {
        short: "Rules",
        title: "Choose how the quiz runs",
        summary:
          "Set the pace, attempts and audience before you send a single link.",
        icon: SlidersHorizontal,
        points: [
          "Choose the time limit, attempts allowed and passing score.",
          "Shuffle questions and options to reduce copying.",
          "Schedule a window and pick public, unlisted or private visibility.",
        ],
      },
      {
        short: "Share",
        title: "Share one code",
        summary:
          "Publishing gives the quiz a 16-character code students can use from any device.",
        icon: KeyRound,
        points: [
          "Copy the code into your class group or room.",
          "Students join from the quiz page — no searching required.",
          "Close the window or rotate access whenever you need.",
        ],
        code: "ABCD-1234-EFGH-5678",
        note: "Keep the code inside your class. Anyone with it can attempt a public quiz.",
      },
      {
        short: "Results",
        title: "Track attempts and results",
        summary:
          "Watch submissions land, then dig into scores, questions and leaderboards.",
        icon: BarChart3,
        points: [
          "Live dashboard with every attempt and score.",
          "Question-level analytics to spot weak topics.",
          "Leaderboard, responses and export-ready results.",
        ],
      },
    ],
    tip: "Practice before you publish. Run the quiz yourself from preview mode to check timing, question order and the student view.",
    primary: { label: "Create a quiz", href: "/creator/quizzes/create" },
    secondary: { label: "Open Creator Studio", href: "/creator" },
    quickLinks: [
      { label: "AI quiz generator", href: "/creator/quizzes/ai-generate" },
      { label: "Question bank", href: "/creator/problems" },
      { label: "My quizzes", href: "/creator/quizzes" },
    ],
    faqs: [
      {
        q: "Can I edit a quiz after publishing?",
        a: "Yes. Open the quiz from Creator and edit it. Students see the changes on their next attempt — avoid editing while an attempt is in progress.",
      },
      {
        q: "Can I reuse questions next time?",
        a: "Yes. Save questions to your bank or duplicate the quiz, then swap only the questions you want to change.",
      },
      {
        q: "How do students get their results?",
        a: "Depending on your settings, results appear right after submission or after the quiz window closes. The leaderboard follows the same rule.",
      },
    ],
    ctaTitle: "Ready to build your first quiz?",
    ctaBody: "Open Creator Studio and go from blank page to shareable code.",
  },
  student: {
    kicker: "Student guide",
    title: "Join with a code, attempt with confidence.",
    description:
      "What to expect from the moment your teacher shares a code to the moment your score appears.",
    readTime: "6 steps · about 4 min",
    steps: [
      {
        short: "Code",
        title: "Get the quiz code",
        summary:
          "Your teacher shares a short code — that’s the only thing you need to find the quiz.",
        icon: KeyRound,
        points: [
          "A quiz code looks like ABCD-1234-EFGH-5678.",
          "Room-based quizzes also include a password.",
          "Codes are case-insensitive, so capitals don’t matter.",
        ],
        code: "ABCD-1234-EFGH-5678",
        note: "Lost the code? Ask your teacher — there’s no public quiz search.",
      },
      {
        short: "Join",
        title: "Join from any device",
        summary:
          "Open the quiz page, enter the code and confirm you’re in the right quiz before you start.",
        icon: ScanLine,
        points: [
          "Join from a phone, tablet or laptop.",
          "Check the title, question count, marks and time limit.",
          "Sign in to keep the attempt in your history.",
        ],
        note: "One quiz, one screen — switching devices mid-attempt can end your run.",
      },
      {
        short: "Lobby",
        title: "Check in at the lobby",
        summary:
          "The lobby is where you confirm your details and get ready for the host to start.",
        icon: MonitorCheck,
        points: [
          "Confirm your name and roll number.",
          "Read the instructions and scoring rules.",
          "Keep this tab open and your connection stable.",
        ],
      },
      {
        short: "Attempt",
        title: "Attempt with focus",
        summary:
          "Once the timer starts, move through questions at your pace and keep an eye on the clock.",
        icon: Timer,
        points: [
          "One question at a time with free navigation.",
          "Answers save as you go.",
          "Flag questions and come back before submitting.",
        ],
        note: "When the timer hits zero, the quiz submits automatically. Don’t leave the final question open.",
      },
      {
        short: "Results",
        title: "Submit and see your score",
        summary:
          "After you submit, the result screen shows how you did and where you lost marks.",
        icon: BadgeCheck,
        points: [
          "Instant score when your teacher allows it.",
          "Correct, wrong and skipped question breakdown.",
          "Your rank and leaderboard position.",
        ],
        note: "Some quizzes hide results until the quiz window closes. If you see “pending”, check back later.",
      },
      {
        short: "Review",
        title: "Review and improve",
        summary:
          "Use the review screen and attempt history to turn one quiz into your next revision session.",
        icon: Trophy,
        points: [
          "Reopen explanations for every question.",
          "Find past attempts in My Attempts.",
          "Bookmark questions worth revisiting.",
        ],
      },
    ],
    tip: "Read the instructions before the timer starts. Marks per question and negative marking are shown there — guessing can cost you.",
    primary: { label: "Join a quiz", href: "/quiz" },
    secondary: { label: "My attempts", href: "/quiz/attempts" },
    quickLinks: [
      { label: "Practice sets", href: "/problems" },
      { label: "Rooms", href: "/rooms" },
      { label: "Leaderboard", href: "/leaderboard" },
    ],
    faqs: [
      {
        q: "What happens if my internet drops?",
        a: "Answers already saved stay on the server. Rejoin with the same code and sign in with the same account to continue, while the quiz timer keeps running.",
      },
      {
        q: "Can I pause the timer?",
        a: "No. The timer keeps running once the quiz starts, so plan any breaks around the quiz window.",
      },
      {
        q: "Why can’t I see my score yet?",
        a: "Your teacher may hide results until the quiz closes. Your attempt is still saved and will appear in My Attempts.",
      },
    ],
    ctaTitle: "Have a code? You’re one step away.",
    ctaBody: "Enter it on the quiz page and join the room.",
  },
};

function RolePicker({
  role,
  onSelect,
}: {
  role: Role;
  onSelect: (role: Role) => void;
}) {
  return (
    <div role="group" aria-label="Choose your role" className="grid gap-3 sm:grid-cols-2">
      {ROLES.map((option) => {
        const Icon = option.icon;
        const active = option.id === role;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(option.id)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-200",
              active
                ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[5px_5px_0_var(--qs-sun)]"
                : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-ink)] hover:-translate-y-0.5 hover:border-[var(--qs-ink)] hover:shadow-[4px_4px_0_var(--qs-sun)]"
            )}
          >
            <span className="flex items-start gap-3">
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2",
                  active
                    ? "border-[#1a1240] bg-[var(--qs-sun)] text-[#1a1240]"
                    : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)]"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[10px] font-extrabold uppercase tracking-[0.14em]",
                    active ? "opacity-80" : "text-[var(--qs-muted)]"
                  )}
                >
                  {option.label}
                </span>
                <span className="mt-1 block text-[17px] font-extrabold leading-tight">
                  {option.cardTitle}
                </span>
                <span
                  className={cn(
                    "mt-1.5 block text-[12px] leading-5",
                    active ? "opacity-90" : "text-[var(--qs-muted)]"
                  )}
                >
                  {option.cardDesc}
                </span>
              </span>

              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2",
                  active
                    ? "border-[#1a1240] bg-[var(--qs-sun)] text-[#1a1240]"
                    : "border-[var(--qs-line)] text-[var(--qs-muted)] group-hover:border-[var(--qs-ink)] group-hover:text-[var(--qs-ink)]"
                )}
                aria-hidden="true"
              >
                {active ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StepCard({
  step,
  index,
  total,
  nextTitle,
}: {
  step: DocStep;
  index: number;
  total: number;
  nextTitle?: string;
}) {
  const Icon = step.icon;
  const number = String(index + 1).padStart(2, "0");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 transition-all duration-200 hover:border-[var(--qs-ink)] hover:shadow-[4px_4px_0_var(--qs-sun)] sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1 -top-2 select-none text-[66px] font-extrabold leading-none tracking-[-0.06em] text-[var(--qs-line)]/70"
      >
        {number}
      </span>

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 pr-12">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
              Step {index + 1} of {total}
            </p>
            <h3 className="mt-1 text-lg font-extrabold leading-snug text-[var(--qs-ink)] sm:text-xl">
              {step.title}
            </h3>
          </div>
        </div>

        <p className="mt-3.5 text-[13px] leading-6 text-[var(--qs-muted)] sm:text-sm">
          {step.summary}
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {step.points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-[12px] leading-5 text-[var(--qs-ink)] sm:text-[13px]">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-ok)]"
                strokeWidth={3}
              />
              {point}
            </li>
          ))}
        </ul>

        {(step.code || step.note) && (
          <div
            className={cn(
              "mt-4 grid gap-2",
              step.code && step.note && "sm:grid-cols-2"
            )}
          >
            {step.code && (
              <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5">
                <span className="truncate font-mono text-[13px] font-extrabold tracking-[0.12em] text-[var(--qs-ink)]">
                  {step.code}
                </span>
                <span className="shrink-0 rounded-full border border-[var(--qs-line)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                  Sample
                </span>
              </div>
            )}

            {step.note && (
              <p className="flex items-start gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 text-[12px] leading-5 text-[var(--qs-muted)]">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
                <span>{step.note}</span>
              </p>
            )}
          </div>
        )}

        <div className="mt-auto pt-5">
          <div className="flex items-center gap-3 border-t-2 border-dashed border-[var(--qs-line)] pt-3.5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-muted)]">
              {nextTitle ? "Up next" : "End of guide"}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[var(--qs-ink)]">
              {nextTitle ?? "Open the quiz and get started."}
            </span>
            {nextTitle ? (
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--qs-ok)]" strokeWidth={3} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const AUTO_ADVANCE_MS = 30_000;

export default function DocsContent() {
  const [role, setRole] = useState<Role>("teacher");
  const [activeStep, setActiveStep] = useState(0);
  const guide = GUIDES[role];
  const totalSteps = guide.steps.length;
  const isLastStep = activeStep === totalSteps - 1;
  const activeRole = ROLES.find((option) => option.id === role) ?? ROLES[0];
  const RoleIcon = activeRole.icon;

  const goToStep = (index: number) => {
    const next = Math.min(Math.max(index, 0), totalSteps - 1);
    if (next === activeStep) return;
    setActiveStep(next);
  };

  const selectRole = (nextRole: Role) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setActiveStep(0);
  };

  useEffect(() => {
    if (isLastStep) return;
    const timer = window.setTimeout(() => {
      setActiveStep((current) => Math.min(current + 1, totalSteps - 1));
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [activeStep, isLastStep, role, totalSteps]);

  return (
    <div className="qs-ui relative min-h-[calc(100dvh-3.5rem)] overflow-x-clip bg-[var(--qs-bg)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: "radial-gradient(var(--qs-line) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-muted)]">
          <BookOpen className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
          Help center
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="text-[var(--qs-brand)]">Documentation</span>
        </p>

        <header className="relative mt-4 overflow-hidden rounded-[28px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[8px_8px_0_var(--qs-sun)] sm:p-8">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[26px] border-[var(--qs-brand)]/10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-12 h-52 w-52 rounded-full border-[20px] border-[var(--qs-sun)]/40"
          />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1a1240] bg-[var(--qs-sun)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1a1240]">
              <Sparkles className="h-3 w-3" />
              Two roles. Two clear paths.
            </span>

            <h1 className="mt-4 max-w-[15em] text-[clamp(34px,5vw,56px)] font-extrabold leading-[0.98] tracking-[-0.035em]">
              Docs for both sides of the quiz.
            </h1>
            <p className="mt-4 max-w-[620px] text-[15px] leading-6 text-[var(--qs-muted)] sm:text-[16px]">
              Pick your role and get the exact steps, links and shortcuts for
              your side of the quiz — no manual-diving.
            </p>

            <div className="mt-6 max-w-3xl">
              <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-muted)]">
                Start by choosing your role
              </p>
              <RolePicker role={role} onSelect={selectRole} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-[var(--qs-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-[var(--qs-ok)]" />
                {guide.readTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                Code-based joining
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
                Updated for 2026
              </span>
            </div>
          </div>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[246px_minmax(0,1fr)]">
          <aside className="hidden lg:block lg:sticky lg:top-20">
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-brand)]">
                  On this page
                </p>
                <nav aria-label="Guide sections" className="mt-3 space-y-0.5">
                  {guide.steps.map((step, index) => {
                    const active = index === activeStep;
                    return (
                      <button
                        key={step.title}
                        type="button"
                        onClick={() => goToStep(index)}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[12px] font-bold transition-colors",
                          active
                            ? "bg-[var(--qs-bg)] text-[var(--qs-ink)]"
                            : "text-[var(--qs-muted)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-[9px] font-extrabold tabular-nums transition-colors",
                            active
                              ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                              : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)] group-hover:border-[var(--qs-brand)] group-hover:text-[var(--qs-brand)]"
                          )}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 truncate">{step.short}</span>
                        <ChevronRight
                          className={cn(
                            "ml-auto h-3.5 w-3.5 shrink-0 transition-opacity",
                            active ? "opacity-100 text-[var(--qs-brand)]" : "opacity-0 group-hover:opacity-100"
                          )}
                        />
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-muted)]">
                  Quick links
                </p>
                <div className="mt-3 space-y-1.5">
                  <Link
                    href={guide.primary.href}
                    className="flex items-center justify-between gap-2 rounded-xl bg-[var(--qs-brand)] px-3 py-2.5 text-[12px] font-extrabold text-[var(--qs-on-brand)] transition-transform hover:-translate-y-0.5"
                  >
                    {guide.primary.label}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                  {guide.quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between gap-2 rounded-xl border-2 border-[var(--qs-line)] px-3 py-2 text-[12px] font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                    >
                      {link.label}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <nav
              aria-label="Jump to a step"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:hidden"
            >
              {guide.steps.map((step, index) => {
                const active = index === activeStep;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => goToStep(index)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[11px] font-bold transition-colors",
                      active
                        ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]"
                    )}
                  >
                    <span className={active ? "text-[var(--qs-sun)]" : "text-[var(--qs-brand)]"}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {step.short}
                  </button>
                );
              })}
            </nav>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 lg:mt-0">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-brand)]">
                  <RoleIcon className="h-3 w-3" />
                  {guide.kicker}
                </span>
                <h2 className="mt-3 max-w-[22em] text-[clamp(27px,3.8vw,40px)] font-extrabold leading-[1.06] tracking-[-0.025em]">
                  {guide.title}
                </h2>
                <p className="mt-2.5 max-w-[560px] text-[13px] leading-6 text-[var(--qs-muted)] sm:text-sm">
                  {guide.description}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-muted)]">
                  Step {activeStep + 1}{" "}
                  <span className="opacity-60">/ {totalSteps}</span>
                </p>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--qs-line)]">
                <motion.div
                  key={`progress-${role}-${activeStep}`}
                  initial={{ width: isLastStep ? "100%" : "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: isLastStep ? 0.2 : AUTO_ADVANCE_MS / 1000,
                    ease: "linear",
                  }}
                  className="h-full rounded-full bg-[var(--qs-brand)]"
                />
              </div>

              <div className="relative mt-3 grid">
                {guide.steps.map((step, index) => {
                  const active = index === activeStep;
                  return (
                    <motion.div
                      key={`${role}-${index}`}
                      initial={false}
                      animate={{
                        opacity: active ? 1 : 0,
                        x: active ? 0 : index < activeStep ? -24 : 24,
                      }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      aria-hidden={!active}
                      className={cn(
                        "col-start-1 row-start-1",
                        active ? "relative z-10" : "pointer-events-none"
                      )}
                    >
                      <StepCard
                        step={step}
                        index={index}
                        total={totalSteps}
                        nextTitle={guide.steps[index + 1]?.title}
                      />
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2 sm:gap-3 sm:p-2.5">
                <button
                  type="button"
                  onClick={() => goToStep(activeStep - 1)}
                  disabled={activeStep === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-line)] px-2.5 py-2 text-[12px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-35 sm:px-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sm:hidden">Back</span>
                  <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1.5" aria-label="Choose a step">
                  {guide.steps.map((step, index) => (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => goToStep(index)}
                      aria-label={`Step ${index + 1}: ${step.title}`}
                      aria-current={index === activeStep ? "step" : undefined}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        index === activeStep
                          ? "w-6 bg-[var(--qs-brand)]"
                          : "w-2 bg-[var(--qs-line)] hover:bg-[var(--qs-brand)]/50"
                      )}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => goToStep(activeStep + 1)}
                  disabled={isLastStep}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2.5 py-2 text-[12px] font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none sm:px-4"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-[22px] border-2 border-[#1a1240] bg-[var(--qs-sun)] p-5 text-[#1a1240] sm:p-6">
              <Sparkles className="h-5 w-5" />
              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-70">
                {role === "teacher" ? "Teacher tip" : "Student tip"}
              </p>
              <p className="mt-1.5 max-w-[620px] text-[13px] font-bold leading-6 sm:text-sm">
                {guide.tip}
              </p>
            </div>

            <section aria-labelledby="docs-faq" className="mt-8">
              <h2
                id="docs-faq"
                className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--qs-brand)]"
              >
                Common questions
              </h2>
              <div className="mt-3 space-y-2">
                {guide.faqs.map((faq) => (
                  <details
                    key={faq.q}
                    className="group rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3 open:border-[var(--qs-ink)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-bold text-[var(--qs-ink)] [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <Plus className="h-4 w-4 shrink-0 text-[var(--qs-brand)] transition-transform duration-200 group-open:rotate-45" />
                    </summary>
                    <p className="mt-2 text-[12px] leading-6 text-[var(--qs-muted)]">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <div className="mt-8 overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-5 text-[var(--qs-on-brand)] sm:p-7">
              <h3 className="max-w-[16em] text-2xl font-extrabold leading-tight tracking-[-0.02em] sm:text-3xl">
                {guide.ctaTitle}
              </h3>
              <p className="mt-2 max-w-[480px] text-[13px] leading-6 opacity-85">
                {guide.ctaBody}
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link
                  href={guide.primary.href}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1a1240] bg-[var(--qs-sun)] px-4 py-2.5 text-[13px] font-extrabold text-[#1a1240] shadow-[3px_3px_0_rgba(26,18,64,0.3)] transition-transform hover:-translate-y-0.5"
                >
                  {guide.primary.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={guide.secondary.href}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-current px-4 py-2.5 text-[13px] font-bold transition-opacity hover:opacity-80"
                >
                  {guide.secondary.label}
                </Link>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center justify-between gap-2.5 rounded-2xl border-2 border-dashed border-[var(--qs-line)] px-4 py-3 text-center text-[12px] text-[var(--qs-muted)] sm:flex-row sm:text-left">
              <span>Still stuck? We can help.</span>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 font-bold text-[var(--qs-brand)] transition-opacity hover:opacity-80"
              >
                Contact support
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
