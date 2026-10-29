"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Lock,
  Fuel,
  Plus,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { formatDate, formatDateTimeIST, timeAgo } from "@/lib/formatters";
import { getUserTimeZone } from "@/lib/timezone";
import { deriveQuizStatus, type EffectiveQuizStatus } from "@/lib/quizStatus";
import { useData } from "@/lib/hooks/useData";
import { GenerateWithAiButton } from "@/components/creator/common/GenerateWithAiButton";
import { useQuizKeyStore } from "@/store/quizKeyStore";
import { TrialOfferBanner } from "@/components/marketing/TrialOfferBanner";
import { TimingModal } from "@/components/creator/dashboard/TimingModal";
import { ErrorState, Skeleton } from "@/components/creator/billing/ui";
import { checkLowCreditWarning, useAICreditsStore } from "@/store/aiCreditsStore";
import { useCreditState } from "@/hooks/useCreditState";
import { creditExpiryDays, fuelSegments } from "@/lib/creditState";
import { usePricingCatalog } from "@/hooks/usePricingCatalog";
import { useAuthStore } from "@/store/authStore";
import {
  getCreatorProfileOverview,
  type CreatorProfileOverview,
  type CreatorRecentAttempt,
} from "@/services/creatorProfile";
import { getMyCreatedQuizzes, type Quiz } from "@/services/quiz";
import { WHOLE_QUIZ_AI_ENABLED } from "@/config/creatorFeatures";

/* ============================================================
   Types & mapping
   ============================================================ */

type QuizStatus = EffectiveQuizStatus;

type QuizListRecord = Quiz & {
  participants?: number | string | null;
  total_questions?: number | string | null;
  attempts?: number | string | null;
  completion_rate?: number | string | null;
};

interface QuizRow {
  id: string;
  title: string;
  status: QuizStatus;
  questions: number;
  attempts: number;
  participants: number;
  completionRate: number;
  durationMin: number;
  createdAt: string | null;
  startAt: string | null;
  endAt: string | null;
}

type AttentionTone = "warn" | "bad" | "blue";

interface AttentionItem {
  tone: AttentionTone;
  label: string;
  text: string;
  href?: string;
  cta?: string;
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function mapQuiz(quiz: QuizListRecord): QuizRow {
  return {
    id: String(quiz.id),
    title: quiz.name || "Untitled quiz",
    status: deriveQuizStatus(quiz),
    questions: num(quiz.total_questions),
    attempts: num(quiz.attempts),
    participants: num(quiz.participants),
    completionRate: clamp(num(quiz.completion_rate), 0, 100),
    durationMin: num(quiz.duration),
    createdAt: quiz.created_at ?? null,
    startAt: quiz.starttime ?? null,
    endAt: quiz.endtime ?? null,
  };
}

function formatPct(value: number): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

function attemptScoreLabel(attempt: CreatorRecentAttempt): string {
  const pct = typeof attempt.percentage === "string" ? Number(attempt.percentage) : attempt.percentage;
  if (pct !== null && pct !== undefined && Number.isFinite(pct)) return `${Math.round(pct)}%`;
  if (attempt.score !== null && attempt.score !== undefined) return `${attempt.score} pts`;
  return attempt.status === "completed" ? "Submitted" : "In progress";
}

function attemptPct(attempt: CreatorRecentAttempt): number | null {
  const pct = typeof attempt.percentage === "string" ? Number(attempt.percentage) : attempt.percentage;
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null;
  return clamp(pct, 0, 100);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "S";
}

function nameHue(name: string): number {
  let hue = 0;
  for (let i = 0; i < name.length; i += 1) hue = (hue * 31 + name.charCodeAt(i)) % 360;
  return hue;
}

/* ============================================================
   Shared styles
   ============================================================ */

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)]";
const BTN_SM =
  "inline-flex items-center justify-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
const PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.08em]";

const PILL_TONE: Record<QuizStatus, string> = {
  live: "text-[var(--qs-ok)]",
  draft: "text-[#a85d00]",
  scheduled: "text-[#2457d6]",
  completed: "text-[#2457d6]",
};

const STATUS_META: Record<QuizStatus, { label: string; tone: string; dot: string }> = {
  live: { label: "Live", tone: "text-[var(--qs-ok)]", dot: "var(--qs-ok)" },
  draft: { label: "Draft", tone: "text-[#a85d00]", dot: "var(--qs-sun)" },
  scheduled: { label: "Scheduled", tone: "text-[#2457d6]", dot: "#2457d6" },
  completed: { label: "Completed", tone: "text-[#2457d6]", dot: "#2457d6" },
};

/* ============================================================
   Small building blocks
   ============================================================ */

function StatusPill({ status }: { status: QuizStatus }) {
  return (
    <span className={cn(PILL, PILL_TONE[status])}>
      {status === "completed" ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {STATUS_META[status].label}
    </span>
  );
}

function DashPanel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("h-full rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="qs-display text-[19px] font-extrabold text-[var(--qs-ink)]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-[var(--qs-muted)]">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

function EmptyHint({ text, hint, action }: { text: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--qs-line)] px-4 py-7 text-center">
      <p className="text-[13px] font-semibold text-[var(--qs-ink)]">{text}</p>
      {hint && <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-5 text-[var(--qs-muted)]">{hint}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
  hint,
  color,
  index,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 + index * 0.04 }}
      className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5"
    >
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
        {label}
      </p>
      <p className="qs-display mt-1.5 text-[30px] font-extrabold leading-none tracking-tight text-[var(--qs-ink)]">
        {value}
        {unit && <span className="ml-1.5 text-[13px] font-semibold tracking-normal text-[var(--qs-muted)]">{unit}</span>}
      </p>
      <p className="mt-1 truncate text-[12px] text-[var(--qs-muted)]" title={hint}>
        {hint}
      </p>
    </motion.div>
  );
}

/* ============================================================
   Dashboard hero + action cards
   ============================================================ */

function DashboardHero({
  greeting,
  firstName,
  vaultUnlocked,
}: {
  greeting: string;
  firstName: string;
  vaultUnlocked: boolean;
}) {
  return (
    <section className="relative -mx-3 -mt-4 overflow-hidden bg-[#281C58] px-6 pb-[130px] pt-11 sm:-mx-5 sm:-mt-5 lg:-mx-8 lg:-mt-6">
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-[360px] w-[520px] bg-[#4A3A5E]"
        style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 h-[400px] w-[600px] bg-[#3F3088]"
        style={{ clipPath: "polygon(30% 0, 100% 0, 100% 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-[260px] w-[420px] bg-[#5B47B8]"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-[240px] h-[220px] w-[360px] bg-[#33256E]"
        style={{ clipPath: "polygon(0 100%, 55% 0, 100% 100%)" }}
      />

      <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-6">
        <div>
          <span className="inline-block rounded-full border-2 border-[#1E1B3A] bg-[#FFD23F] px-3.5 py-[7px] text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#1E1B3A]">
            Teacher dashboard
          </span>
          <h1 className="mt-[18px] text-[clamp(36px,4.4vw,56px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#ffffff]">
            {greeting}, {firstName}
          </h1>
          <p className="mt-2.5 text-[17px] text-[#DDD5F7]">
            Here&apos;s what&apos;s happening with your quizzes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#ffffff] px-4 py-2.5 text-[13px] font-bold text-[#ffffff]">
            <Lock className="h-4 w-4" />
            {vaultUnlocked ? "Keys unlocked · this tab" : "Keys locked · enter per quiz"}
          </span>
          <Link
            href="/creator/quizzes/create"
            className="inline-flex h-[52px] items-center gap-2.5 rounded-[14px] border-2 border-[#1E1B3A] bg-[#FFD23F] px-6 text-[16px] font-extrabold text-[#1E1B3A] shadow-[0_4px_0_#1E1B3A] transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.8} />
            Create quiz
          </Link>
        </div>
      </div>
    </section>
  );
}

function DashboardActionCard({
  title,
  description,
  href,
  cta,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[180px] flex-col rounded-[19px] border-2 border-[#1E1B3A] bg-[var(--qs-surface)] p-[18px] shadow-[5px_5px_0_#FFD23F] transition-transform hover:-translate-y-1"
    >
      <span className="grid h-[42px] w-[42px] place-items-center rounded-[11px] border-2 border-[#1E1B3A] bg-[var(--qs-brand)] text-[#ffffff]">
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <h2 className="mt-4 text-[16px] font-extrabold tracking-[-0.01em] text-[#1E1B3A]">{title}</h2>
      <p className="mt-1.5 text-[10.5px] leading-[1.55] text-[#4A4670]">{description}</p>
      <span className="mt-auto flex items-center gap-1.5 pt-3.5 text-[10px] font-extrabold text-[var(--qs-brand)]">
        {cta} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function DashboardActions({
  unlockedKeyCount,
  onLock,
}: {
  unlockedKeyCount: number;
  onLock: () => void;
}) {
  const vaultUnlocked = unlockedKeyCount > 0;
  return (
    <div className="relative mx-auto -mt-[84px] w-full max-w-[1200px] px-6 pb-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
        <DashboardActionCard
          title="New quiz"
          description="Build one by hand. Questions are encrypted in your browser as you save."
          href="/creator/quizzes/create"
          cta="Start building"
          icon={Plus}
        />

        <div className="flex min-h-[180px] flex-col rounded-[19px] border-2 border-[#1E1B3A] bg-[#1E1B3A] p-[18px] text-[#ffffff] shadow-[5px_5px_0_#FFD23F]">
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-[42px] w-[42px] place-items-center rounded-[11px] border-2 border-[#FFD23F] bg-[#FFD23F] text-[#1E1B3A]">
              <Lock className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border-2 px-2 py-[3px] text-[8px] font-extrabold uppercase tracking-[0.08em]",
                vaultUnlocked
                  ? "border-[#7EE2B8] text-[#7EE2B8]"
                  : "border-[#FFD23F] text-[#FFD23F]"
              )}
            >
              <span
                className={cn(
                  "h-[5px] w-[5px] rounded-full",
                  vaultUnlocked ? "bg-[#7EE2B8]" : "bg-[#FFD23F]"
                )}
              />
              {vaultUnlocked ? "Unlocked" : "Locked"}
            </span>
          </div>
          <h2 className="mt-4 text-[16px] font-extrabold tracking-[-0.01em]">Encrypted vault</h2>
          <p className="mt-1.5 text-[10.5px] leading-[1.55] text-[#DDD5F7]">
            {vaultUnlocked
              ? `${unlockedKeyCount} ${
                  unlockedKeyCount === 1 ? "quiz key is" : "quiz keys are"
                } unlocked in this tab. Lock them when you're done.`
              : "Every quiz has its own key. Enter it when you open an encrypted quiz."}
          </p>
          {vaultUnlocked ? (
            <button
              type="button"
              onClick={onLock}
              className="mt-auto inline-flex h-8 items-center justify-center self-start rounded-[9px] border-2 border-[#FFD23F] bg-[#FFD23F] px-3.5 text-[10px] font-extrabold text-[#1E1B3A] transition-colors hover:brightness-105"
            >
              Lock all keys
            </button>
          ) : (
            <span className="mt-auto inline-flex items-center self-start text-[10px] font-bold text-[#DDD5F7]">
              Keys are requested per quiz
            </span>
          )}
        </div>

        <DashboardActionCard
          title="Paper builder"
          description="Print-ready papers, assembled from your own questions."
          href="/creator/tests/create"
          cta="Build a paper"
          icon={FileText}
        />
        <DashboardActionCard
          title="Question bank"
          description="Reuse your problems. Stored encrypted, readable only with your key."
          href="/creator/question-bank"
          cta="Open bank"
          icon={Database}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-center text-[13px] text-[#4A4670]">
        <ShieldCheck className="h-4 w-4 shrink-0 text-[#0B6B4A]" />
        Questions are encrypted in your browser before they reach our servers.
      </div>
    </div>
  );
}

/* ============================================================
   Quick actions
   ============================================================ */

const QUICK_ACTIONS: Array<{ title: string; sub: string; href: string; icon: LucideIcon; comingSoon?: boolean; ai?: boolean }> = [
  { title: "New quiz", sub: "Build one by hand", href: "/creator/quizzes/create", icon: Plus },
  {
    title: "Generate with AI",
    sub: WHOLE_QUIZ_AI_ENABLED ? "From files, topics or prompts" : "Coming soon",
    href: "/creator/quizzes/ai-generate",
    icon: WandSparkles,
    comingSoon: !WHOLE_QUIZ_AI_ENABLED,
    ai: true,
  },
  { title: "Paper builder", sub: "Print-ready papers", href: "/creator/tests/create", icon: FileText },
  { title: "Question bank", sub: "Reuse your problems", href: "/creator/question-bank", icon: Database },
];

function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {QUICK_ACTIONS.map((action, index) => {
        const Icon = action.icon;
        const className =
          "flex h-full items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5 transition-colors hover:border-[var(--qs-brand)]";
        const content = (
          <>
            <i className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
              <Icon className="h-5 w-5" />
            </i>
            <span className="min-w-0">
              <b className="block truncate text-[14px] font-bold text-[var(--qs-ink)]">{action.title}</b>
              <small className="block truncate text-[12px] text-[var(--qs-muted)]">{action.sub}</small>
            </span>
          </>
        );
        return (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
          >
            {action.ai ? (
              <GenerateWithAiButton
                href={action.href}
                label={action.title}
                comingSoon={action.comingSoon}
                variant="plain"
                className={cn(className, "w-full text-left")}
              >
                {content}
              </GenerateWithAiButton>
            ) : action.comingSoon ? (
              <button
                type="button"
                aria-disabled="true"
                onClick={() =>
                  toast.info({
                    title: "Coming soon",
                    description: "AI quiz generation is not available yet.",
                  })
                }
                className={cn(className, "w-full cursor-not-allowed text-left opacity-60")}
              >
                {content}
              </button>
            ) : (
              <Link href={action.href} className={className}>
                {content}
              </Link>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Live quiz hero / first-quiz guide
   ============================================================ */

const FIRST_QUIZ_STEPS = [
  "Create a quiz or generate questions with AI",
  "Review the questions and set the timer",
  "Publish it and share the access code",
  "Watch responses arrive on this page",
];

function OnboardingCard() {
  return (
    <article className="relative h-full rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
      <span className={cn(PILL, "text-[#2457d6]")}>Getting started</span>
      <h2 className="qs-display mt-3 text-[24px] font-extrabold text-[var(--qs-ink)] sm:text-[28px]">
        Create your first quiz
      </h2>
      <p className="mt-1 text-[13px] text-[var(--qs-muted)]">Four steps from empty page to live results.</p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2">
        {FIRST_QUIZ_STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-2xl border-2 border-[var(--qs-line)] px-3.5 py-2.5"
          >
            <b className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--qs-ink)] text-[12px] font-extrabold text-[var(--qs-surface)]">
              {index + 1}
            </b>
            <span className="text-[13px] font-medium leading-5 text-[var(--qs-ink)]">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/creator/quizzes/create" className={BTN_PRI}>
          <Plus className="h-4 w-4" />
          Create quiz
        </Link>
        <GenerateWithAiButton
          href={WHOLE_QUIZ_AI_ENABLED ? "/creator/quizzes/ai-generate" : undefined}
          comingSoon={!WHOLE_QUIZ_AI_ENABLED}
          size="md"
          label="Generate with AI"
        />
      </div>
    </article>
  );
}

function NoLiveCard({ draftCount }: { draftCount: number }) {
  return (
    <article className="relative flex h-full flex-col rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-6">
      <span className={cn(PILL, "text-[#2457d6]")}>Quiet</span>
      <h2 className="qs-display mt-3 text-[24px] font-extrabold text-[var(--qs-ink)] sm:text-[28px]">
        Nothing is live right now
      </h2>
      <p className="mt-1.5 text-[13px] leading-6 text-[var(--qs-muted)]">
        {draftCount > 0
          ? `You have ${draftCount} ${draftCount === 1 ? "draft" : "drafts"} waiting. Publish one to start collecting responses, or build something new.`
          : "Publish a quiz to start collecting responses — live attempts, scores and progress will show up right here."}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link href="/creator/quizzes/create" className={BTN_PRI}>
          <Plus className="h-4 w-4" />
          Create quiz
        </Link>
        <Link href="/creator/quizzes" className={BTN}>
          View quizzes
        </Link>
      </div>
    </article>
  );
}

function LiveQuizCard({ quiz, onChangeTiming }: { quiz: QuizRow; onChangeTiming: () => void }) {
  const completed = Math.round((quiz.attempts * quiz.completionRate) / 100);
  const pending = Math.max(quiz.attempts - completed, 0);
  const notStarted = Math.max(quiz.participants - quiz.attempts, 0);
  const tracked = completed + pending + notStarted;

  const segments =
    tracked > 0
      ? [
          { key: "done", value: completed, color: "var(--qs-ok)", label: `${completed} completed` },
          { key: "pending", value: pending, color: "var(--qs-bad)", label: `${pending} not completed` },
          { key: "todo", value: notStarted, color: "#2457d6", label: `${notStarted} not started` },
        ]
      : [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="relative flex h-full flex-col rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 transition-colors hover:border-[var(--qs-brand)]"
    >
      <span className={cn(PILL, "w-fit text-[var(--qs-ok)]")}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Live now
      </span>

      <h2 className="qs-display mt-4 break-words text-[20px] font-extrabold leading-[1.25] text-[var(--qs-ink)]">
        {quiz.title}
      </h2>

      <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--qs-muted)]">
        <Clock className="h-3.5 w-3.5" />
        {quiz.endAt ? `Closes ${formatDateTimeIST(quiz.endAt)}` : "No end time — runs until you close it"}
      </p>

      <div className="my-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] px-3 py-[5px] text-[13px] font-bold text-[var(--qs-muted)]">
          {quiz.questions > 0 ? `${quiz.questions} ${quiz.questions === 1 ? "question" : "questions"}` : "No questions yet"}
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] px-3 py-[5px] text-[13px] font-bold text-[var(--qs-muted)]">
          {quiz.attempts.toLocaleString("en-IN")} {quiz.attempts === 1 ? "attempt" : "attempts"}
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] px-3 py-[5px] text-[13px] font-bold text-[var(--qs-muted)]">
          {formatPct(quiz.completionRate)} completed
        </span>
      </div>

      {segments.length > 0 && (
        <>
          <div className="flex h-3.5 overflow-hidden rounded-full border-2 border-[var(--qs-ink)]">
            {segments.map(
              (segment) =>
                segment.value > 0 && (
                  <i
                    key={segment.key}
                    className="block h-full"
                    style={{ width: `${(segment.value / tracked) * 100}%`, background: segment.color }}
                  />
                )
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-medium text-[var(--qs-muted)]">
            {segments.map((segment) => (
              <span key={segment.key} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: segment.color }} />
                {segment.label}
              </span>
            ))}
          </div>
        </>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t-2 border-[var(--qs-line)] pt-3.5">
        <button
          type="button"
          onClick={onChangeTiming}
          className="inline-flex items-center justify-center rounded-[10px] bg-[var(--qs-brand)] px-4 py-2 text-[13px] font-bold text-[var(--qs-on-brand)] transition-all hover:brightness-110"
        >
          Change timing
        </button>
        <Link
          href={`/creator/quizzes/${quiz.id}/analytics`}
          className="inline-flex items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          Analytics
        </Link>
        <Link
          href={`/creator/quizzes/${quiz.id}/responses`}
          className="inline-flex items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] px-3.5 py-2 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
        >
          Responses
        </Link>
      </div>
    </motion.article>
  );
}

/* ============================================================
   Low-fuel warning strip
   ============================================================ */

function LowFuelStrip() {
  const { state } = useCreditState();
  if (state !== "empty") return null;

  return (
    <section
      role="status"
      aria-live="polite"
      data-credit-warning="empty"
      className="flex flex-col gap-3 rounded-[18px] border-2 border-[var(--qs-credit-strip-border)] bg-[var(--qs-credit-strip-bg)] px-4 py-3 text-[var(--qs-credit-strip-text)] sm:flex-row sm:items-center"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-credit-chip-border)] bg-[var(--qs-credit-card)]">
        <TriangleAlert className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold leading-5">Your tank is empty. Refuel your credits.</p>
        <p className="text-[12px] font-medium leading-5">Credits stay valid for 6 months from purchase.</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <Link
          href="/creator/billing/credits"
          className="inline-flex min-h-9 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-1.5 text-[12px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-credit-accent)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
        >
          Buy credits
        </Link>
        <Link
          href="/creator/billing/transactions"
          className="inline-flex min-h-9 items-center justify-center rounded-[10px] border-2 border-[var(--qs-credit-strip-border)] bg-[var(--qs-credit-surface)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--qs-credit-strip-text)] transition-colors hover:bg-[var(--qs-credit-card)]"
        >
          History
        </Link>
      </div>
    </section>
  );
}

/* ============================================================
   Credits card
   ============================================================ */

function CreditsCard() {
  const balance = useAICreditsStore((s) => s.balance);
  const lastPackCredits = useAICreditsStore((s) => s.lastPackCredits);
  const { state, expiresAt } = useCreditState();
  const remaining = balance.totalRemaining;
  const empty = state === "empty";
  const low =
    !empty &&
    checkLowCreditWarning(remaining, balance.monthlyAllowance || remaining || 1);
  const { catalog } = usePricingCatalog();
  const validityMonths =
    catalog.creditPacks.length > 0
      ? Math.max(...catalog.creditPacks.map((pack) => pack.validityMonths))
      : null;
  const packCapacity = Math.max(
    lastPackCredits,
    ...catalog.creditPacks.map((pack) => pack.credits),
    remaining,
    1
  );
  const filledSegments = fuelSegments(remaining, packCapacity);
  const expiryDays = creditExpiryDays(expiresAt);
  const expiryHint =
    expiryDays === null
      ? null
      : expiryDays <= 0
        ? "Credits expire today."
        : expiryDays <= 14
          ? `Credits expire in ${expiryDays} day${expiryDays === 1 ? "" : "s"}.`
          : null;

  return (
    <article
      data-credit-card={empty ? "empty" : "ok"}
      className={cn(
        "flex h-full flex-col rounded-[26px] border-2 p-5 sm:p-6",
        empty
          ? "border-[var(--qs-credit-chip-border)] bg-[var(--qs-credit-card)]"
          : "border-[var(--qs-ink)] bg-[var(--qs-surface)]"
      )}
    >
      <span
        className={cn(
          "grid h-12 w-12 place-items-center rounded-full border-2",
          empty
            ? "border-[var(--qs-credit-chip-border)] bg-[var(--qs-credit-card)] text-[var(--qs-credit-chip-text)]"
            : "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]"
        )}
      >
        {empty ? <Fuel className="h-5 w-5" strokeWidth={2.5} /> : <Sparkles className="h-5 w-5" strokeWidth={2.5} />}
      </span>
      <p className="mt-3.5 leading-none">
        <span className="qs-display text-[44px] font-extrabold tracking-tight text-[var(--qs-ink)]">{remaining}</span>
        <span className="ml-2.5 align-middle text-[15px] font-bold text-[var(--qs-muted)]">credits left</span>
      </p>
      <p className="mt-1.5 text-[13px] text-[var(--qs-muted)]">
        {empty
          ? "Your tank is empty. Buy credits to keep generating with AI."
          : validityMonths
            ? `Valid ${validityMonths} months from purchase.`
            : "Credits stay valid for 6 months from purchase."}
      </p>

      <div className="mt-4">
        <div
          className="qs-credit-fuel"
          role="img"
          aria-label={`${remaining} of ${packCapacity} credits remaining`}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <i key={index} data-filled={index < filledSegments ? "true" : "false"} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-[var(--qs-muted)]">
          {filledSegments} of 5 fuel bars
        </p>
      </div>

      {expiryHint && (
        <p className="mt-2 text-[12px] font-semibold text-[var(--qs-credit-chip-text)]">{expiryHint}</p>
      )}

      {low && !expiryHint && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/20 p-3">
          <span className="mt-0.5 text-[var(--qs-ink)]">
            <TriangleAlert className="h-4 w-4" />
          </span>
          <p className="text-[12px] font-medium leading-5 text-[var(--qs-ink)]">
            Running low — top up before your next paper.
          </p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link href="/creator/billing/credits" className={BTN_PRI}>
          Buy credits
        </Link>
        <Link href="/creator/billing/transactions" className={BTN}>
          History
        </Link>
      </div>
    </article>
  );
}

/* ============================================================
   Status mix donut
   ============================================================ */

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function StatusMixPanel({ quizzes }: { quizzes: QuizRow[] }) {
  const counts = useMemo(() => {
    const base: Record<QuizStatus, number> = { live: 0, draft: 0, scheduled: 0, completed: 0 };
    for (const quiz of quizzes) base[quiz.status] += 1;
    return base;
  }, [quizzes]);

  const total = quizzes.length;
  const order: QuizStatus[] = ["live", "draft", "scheduled", "completed"];

  let offset = 0;
  const segments = order
    .filter((status) => counts[status] > 0)
    .map((status) => {
      const length = (counts[status] / total) * DONUT_CIRCUMFERENCE;
      const segment = { status, length, offset };
      offset += length;
      return segment;
    });

  return (
    <DashPanel title="Status mix" subtitle="Live, draft, scheduled and completed">
      {total === 0 ? (
        <EmptyHint text="No quizzes yet." hint="Create a quiz to see its status here." />
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <svg viewBox="0 0 140 140" role="img" aria-label="Quiz status mix" className="h-[140px] w-[140px] shrink-0">
            <circle cx="70" cy="70" r={DONUT_RADIUS} fill="none" stroke="var(--qs-line)" strokeWidth="20" />
            {segments.map((segment) => (
              <circle
                key={segment.status}
                cx="70"
                cy="70"
                r={DONUT_RADIUS}
                fill="none"
                style={{ stroke: STATUS_META[segment.status].dot }}
                strokeWidth="20"
                strokeDasharray={`${Math.max(0, segment.length - (segments.length > 1 ? 3 : 0))} ${DONUT_CIRCUMFERENCE}`}
                strokeDashoffset={-segment.offset}
                transform="rotate(-90 70 70)"
              />
            ))}
            <text
              x="70"
              y="76"
              textAnchor="middle"
              className="qs-display"
              style={{ fill: "var(--qs-ink)", font: "800 30px 'Bricolage Grotesque', sans-serif" }}
            >
              {total}
            </text>
            <text
              x="70"
              y="92"
              textAnchor="middle"
              style={{ fill: "var(--qs-muted)", font: "700 10px 'DM Sans', sans-serif" }}
            >
              Quizzes
            </text>
          </svg>
          <ul className="min-w-[130px] flex-1 list-none space-y-2 p-0">
            {order.map((status) => (
              <li key={status} className="flex items-center gap-2 text-[13px] font-medium text-[var(--qs-ink)]">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STATUS_META[status].dot }} />
                {STATUS_META[status].label}
                <b className="ml-auto tabular-nums">{counts[status]}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashPanel>
  );
}

/* ============================================================
   Attempts by quiz bars
   ============================================================ */

function AttemptsByQuizPanel({ quizzes }: { quizzes: QuizRow[] }) {
  const items = useMemo(
    () =>
      [...quizzes]
        .filter((quiz) => quiz.attempts > 0)
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 6),
    [quizzes]
  );
  const max = Math.max(...items.map((quiz) => quiz.attempts), 1);

  return (
    <DashPanel title="Attempts by quiz" subtitle="Where your responses come from">
      {items.length === 0 ? (
        <EmptyHint text="No attempts yet." hint="Share a quiz code to start collecting responses." />
      ) : (
        <>
          <div className="flex h-[150px] items-end gap-2.5 border-b-2 border-[var(--qs-ink)]">
            {items.map((quiz) => (
              <div key={quiz.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <em className="mb-1 text-[12px] font-extrabold not-italic tabular-nums text-[var(--qs-ink)]">
                  {quiz.attempts}
                </em>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((quiz.attempts / max) * 88, 6)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-t-[10px] border-2 border-b-0 border-[var(--qs-ink)]",
                    quiz.attempts === max ? "bg-[var(--qs-sun)]" : "bg-[var(--qs-brand)]"
                  )}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2.5">
            {items.map((quiz) => (
              <span
                key={quiz.id}
                className="min-w-0 flex-1 truncate text-center text-[11px] font-bold text-[var(--qs-muted)]"
                title={quiz.title}
              >
                {quiz.title}
              </span>
            ))}
          </div>
        </>
      )}
    </DashPanel>
  );
}

/* ============================================================
   Needs attention
   ============================================================ */

function NeedsAttentionPanel({ quizzes }: { quizzes: QuizRow[] }) {
  const { state: creditState } = useCreditState();
  const items = useMemo<AttentionItem[]>(() => {
    const list: AttentionItem[] = [];

    if (creditState === "empty") {
      list.push({
        tone: "warn",
        label: "Credits",
        text: "AI credits have run out. Buy a pack to keep generating with AI.",
        href: "/creator/billing/credits",
        cta: "Buy credits",
      });
    }

    quizzes
      .filter((quiz) => quiz.status === "draft")
      .slice(0, 2)
      .forEach((quiz) => {
        list.push({
          tone: "warn",
          label: "Draft",
          text:
            quiz.questions > 0
              ? `“${quiz.title}” has ${quiz.questions} ${quiz.questions === 1 ? "question" : "questions"} ready. Publish it to share the code.`
              : `“${quiz.title}” is still empty. Add questions before publishing.`,
        });
      });

    quizzes
      .filter((quiz) => quiz.attempts >= 3 && quiz.completionRate < 60)
      .slice(0, 2)
      .forEach((quiz) => {
        list.push({
          tone: "bad",
          label: "Completion",
          text: `Only ${formatPct(quiz.completionRate)} of attempts on “${quiz.title}” were completed.`,
        });
      });

    const scheduled = quizzes.filter((quiz) => quiz.status === "scheduled").length;
    if (scheduled > 0) {
      list.push({
        tone: "blue",
        label: "Scheduled",
        text: `${scheduled} ${scheduled === 1 ? "quiz opens" : "quizzes open"} automatically at their start time.`,
      });
    }

    return list.slice(0, 4);
  }, [creditState, quizzes]);

  return (
    <DashPanel title="Needs attention" subtitle="Things worth a look today">
      {items.length === 0 ? (
        <EmptyHint text="All clear." hint="Alerts about drafts, low completion and schedules show up here." />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={`${item.label}-${item.text}`}
              className="flex items-start gap-2.5 rounded-2xl border-2 border-[var(--qs-line)] px-3.5 py-3"
            >
              <span
                className={cn(
                  PILL,
                  item.tone === "warn" ? "text-[#a85d00]" : item.tone === "bad" ? "text-[var(--qs-bad)]" : "text-[#2457d6]"
                )}
              >
                {item.label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium leading-5 text-[var(--qs-ink)]">{item.text}</p>
                {item.href && item.cta && (
                  <Link
                    href={item.href}
                    className="mt-1 inline-flex text-[12px] font-extrabold text-[var(--qs-credit-chip-text)] underline decoration-2 underline-offset-2"
                  >
                    {item.cta}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashPanel>
  );
}

/* ============================================================
   Recent quizzes table
   ============================================================ */

function RecentQuizzesPanel({ quizzes }: { quizzes: QuizRow[] }) {
  const rows = useMemo(
    () =>
      [...quizzes]
        .sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0))
        .slice(0, 6),
    [quizzes]
  );

  return (
    <DashPanel
      title="Recent quizzes"
      subtitle="Your latest work and how it is doing"
      action={
        <Link href="/creator/quizzes" className={BTN_SM}>
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyHint
          text="No quizzes yet."
          hint={
            WHOLE_QUIZ_AI_ENABLED
              ? "Create one from scratch, or generate a complete quiz with AI."
              : "Create one from scratch. AI quiz generation is coming soon."
          }
          action={
            <Link href="/creator/quizzes/create" className={BTN_PRI}>
              <Plus className="h-4 w-4" />
              Create quiz
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                {["Quiz", "Status", "Questions", "Attempts", "Completion", ""].map((heading) => (
                  <th
                    key={heading || "actions"}
                    className="whitespace-nowrap px-2.5 py-2 text-left text-[10px] font-black uppercase tracking-[0.1em] text-[var(--qs-muted)]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((quiz, index) => (
                <tr key={quiz.id} className="transition-colors hover:bg-[var(--qs-bg)]">
                  <td className="border-t-2 border-[var(--qs-line)] px-2.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-extrabold",
                          index === 0
                            ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]"
                            : "border-[var(--qs-line)] text-[var(--qs-ink)]"
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <b className="block max-w-[260px] truncate text-[13px] font-bold text-[var(--qs-ink)]" title={quiz.title}>
                          {quiz.title}
                        </b>
                        {quiz.createdAt && (
                          <span className="text-[11px] text-[var(--qs-muted)]">{formatDate(quiz.createdAt)}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="border-t-2 border-[var(--qs-line)] px-2.5 py-3">
                    <StatusPill status={quiz.status} />
                  </td>
                  <td className="border-t-2 border-[var(--qs-line)] px-2.5 py-3 text-[13px] font-semibold tabular-nums text-[var(--qs-ink)]">
                    {quiz.questions}
                  </td>
                  <td className="border-t-2 border-[var(--qs-line)] px-2.5 py-3 text-[13px] font-extrabold tabular-nums text-[var(--qs-ink)]">
                    {quiz.attempts}
                  </td>
                  <td className="border-t-2 border-[var(--qs-line)] px-2.5 py-3">
                    <div className="flex items-center gap-2.5 text-[13px] font-bold tabular-nums text-[var(--qs-ink)]">
                      {quiz.attempts > 0 ? formatPct(quiz.completionRate) : "—"}
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--qs-line)]">
                        <i
                          className="block h-full bg-[var(--qs-brand)]"
                          style={{ width: `${quiz.attempts > 0 ? quiz.completionRate : 0}%` }}
                        />
                      </span>
                    </div>
                  </td>
                  <td className="border-t-2 border-[var(--qs-line)] px-2.5 py-3 text-right">
                    <Link href={`/creator/quizzes/${quiz.id}/analytics`} className={BTN_SM}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashPanel>
  );
}

/* ============================================================
   Recent activity & top students
   ============================================================ */

function AttemptAvatar({ name }: { name: string }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] text-[11px] font-extrabold text-white"
      style={{ background: `hsl(${nameHue(name)} 55% 42%)` }}
    >
      {initials(name)}
    </span>
  );
}

function RecentActivityPanel({ attempts }: { attempts: CreatorRecentAttempt[] }) {
  const items = useMemo(() => attempts.slice(0, 6), [attempts]);

  return (
    <DashPanel title="Recent activity" subtitle="Latest student submissions">
      {items.length === 0 ? (
        <EmptyHint text="No activity yet." hint="Submissions appear here in real time." />
      ) : (
        <div>
          {items.map((attempt, index) => (
            <div
              key={attempt.id}
              className={cn("flex items-center gap-3 py-2.5", index > 0 && "border-t-2 border-[var(--qs-line)]")}
            >
              <AttemptAvatar name={attempt.studentName} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13px] font-bold text-[var(--qs-ink)]">{attempt.studentName}</b>
                <small className="block truncate text-[11px] text-[var(--qs-muted)]">
                  {attempt.status === "completed" ? "submitted" : "attempting"} {attempt.quizName || "a quiz"}
                  {" · "}
                  {attempt.attemptedAt ? timeAgo(attempt.attemptedAt) : "recently"}
                </small>
              </div>
              <b className="shrink-0 text-[13px] font-extrabold tabular-nums text-[var(--qs-ink)]">
                {attemptScoreLabel(attempt)}
              </b>
            </div>
          ))}
        </div>
      )}
    </DashPanel>
  );
}

function TopStudentsPanel({ attempts }: { attempts: CreatorRecentAttempt[] }) {
  const items = useMemo(
    () =>
      [...attempts]
        .filter((attempt) => attemptPct(attempt) !== null)
        .sort((a, b) => (attemptPct(b) ?? 0) - (attemptPct(a) ?? 0))
        .slice(0, 5),
    [attempts]
  );

  return (
    <DashPanel title="Top students" subtitle="Best scores across recent attempts">
      {items.length === 0 ? (
        <EmptyHint text="No scores yet." hint="Ranked student scores appear once quizzes are attempted." />
      ) : (
        <div className="space-y-1">
          {items.map((attempt, index) => {
            const pct = attemptPct(attempt) ?? 0;
            return (
              <div key={attempt.id} className="flex items-center gap-3 py-2">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-extrabold",
                    index === 0
                      ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]"
                      : "border-[var(--qs-line)] text-[var(--qs-ink)]"
                  )}
                >
                  {index + 1}
                </span>
                <AttemptAvatar name={attempt.studentName} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-bold text-[var(--qs-ink)]">{attempt.studentName}</b>
                  <small className="block truncate text-[11px] text-[var(--qs-muted)]">
                    {attempt.quizName || "a quiz"}
                  </small>
                </div>
                <div className="flex shrink-0 items-center gap-2.5 text-[13px] font-bold tabular-nums text-[var(--qs-ink)]">
                  {Math.round(pct)}%
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--qs-line)]">
                    <i className="block h-full bg-[var(--qs-brand)]" style={{ width: `${pct}%` }} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashPanel>
  );
}

/* ============================================================
   Scheduled
   ============================================================ */

function ScheduledPanel({
  quizzes,
  onReschedule,
}: {
  quizzes: QuizRow[];
  onReschedule: (quiz: QuizRow) => void;
}) {
  const items = useMemo(() => quizzes.filter((quiz) => quiz.status === "scheduled"), [quizzes]);

  return (
    <DashPanel title="Scheduled" subtitle="Quizzes opening soon">
      {items.length === 0 ? (
        <EmptyHint
          text="Nothing scheduled."
          hint="Schedule a quiz to open and close automatically."
          action={
            <Link href="/creator/quizzes/create" className={BTN_SM}>
              Schedule a quiz
            </Link>
          }
        />
      ) : (
        <div>
          {items.map((quiz, index) => (
            <div
              key={quiz.id}
              className={cn("flex items-center gap-3 py-2.5", index > 0 && "border-t-2 border-[var(--qs-line)]")}
            >
              <Link
                href={`/creator/quizzes/${quiz.id}/edit`}
                className="flex min-w-0 flex-1 items-center gap-3 transition-colors hover:text-[var(--qs-brand)]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[var(--qs-line)] text-[#2457d6]">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-bold text-[var(--qs-ink)]">{quiz.title}</b>
                  <small className="block truncate text-[11px] text-[var(--qs-muted)]">
                    {quiz.startAt ? `Opens ${formatDateTimeIST(quiz.startAt)}` : "Opens soon"} · {quiz.questions}{" "}
                    {quiz.questions === 1 ? "question" : "questions"}
                  </small>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--qs-muted)]" />
              </Link>
              <button type="button" onClick={() => onReschedule(quiz)} className={BTN_SM}>
                Reschedule
              </button>
            </div>
          ))}
        </div>
      )}
    </DashPanel>
  );
}

/* ============================================================
   Skeleton
   ============================================================ */

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Skeleton className="h-[280px] lg:col-span-2" />
        <Skeleton className="h-[280px]" />
      </div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Skeleton className="h-[260px]" />
        <Skeleton className="h-[260px]" />
        <Skeleton className="h-[260px]" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Skeleton className="h-[320px] xl:col-span-2" />
        <Skeleton className="h-[320px]" />
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

interface DashboardData {
  overview: CreatorProfileOverview;
  quizzes: QuizRow[];
}

function greetingForNow(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { timeZone: getUserTimeZone(), hour: "numeric", hour12: false }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function CreatorDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = greetingForNow();
  const [timingQuiz, setTimingQuiz] = useState<QuizRow | null>(null);
  const unlockedKeyCount = useQuizKeyStore(
    (state) => Object.keys(state.keys).length
  );
  const clearQuizKeys = useQuizKeyStore((state) => state.clearAll);
  const vaultUnlocked = unlockedKeyCount > 0;

  const { status, data, error, retry } = useData<DashboardData>(async () => {
    const [overview, quizzes] = await Promise.all([
      getCreatorProfileOverview(),
      getMyCreatedQuizzes({ page: 1, limit: 50 })
        .then((res) => res.quizzes.map((quiz) => mapQuiz(quiz as QuizListRecord)))
        .catch(() => [] as QuizRow[]),
    ]);
    return { overview, quizzes };
  });

  const firstName =
    user?.firstName?.trim() ||
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.username?.trim() ||
    "Creator";

  const quizzes = useMemo(() => data?.quizzes ?? [], [data]);
  const overview = data?.overview;
  const recentAttempts = useMemo(() => overview?.recentAttempts ?? [], [overview]);

  const liveQuiz = useMemo(() => quizzes.find((quiz) => quiz.status === "live"), [quizzes]);
  const draftCount = useMemo(() => quizzes.filter((quiz) => quiz.status === "draft").length, [quizzes]);

  const tiles = useMemo(() => {
    const assessments = overview?.assessments ?? { total: 0, published: 0, draft: 0 };
    const attempts = overview?.attempts ?? { total: 0, completed: 0 };
    const students = overview?.students ?? { total: 0, recentActive: 0, avgAttemptsPerStudent: 0 };
    const completion = attempts.total > 0 ? (attempts.completed / attempts.total) * 100 : 0;

    return [
      {
        label: "Quizzes",
        value: String(assessments.total),
        hint: `${assessments.published} published · ${assessments.draft} draft`,
        color: "var(--qs-brand)",
      },
      {
        label: "Total attempts",
        value: attempts.total.toLocaleString("en-IN"),
        hint: `${attempts.completed.toLocaleString("en-IN")} completed`,
        color: "var(--qs-ok)",
      },
      {
        label: "Students",
        value: students.total.toLocaleString("en-IN"),
        hint: `${students.recentActive} active in the last 30 days`,
        color: "#2457d6",
      },
      {
        label: "Completion",
        value: attempts.total > 0 ? formatPct(completion) : "—",
        hint: attempts.total > 0 ? "of attempts completed" : "No attempts yet",
        color: "var(--qs-sun)",
      },
    ];
  }, [overview]);

  return (
    <div className="creator-dashboard-page pb-2" data-credit-page="dashboard">
      <DashboardHero greeting={greeting} firstName={firstName} vaultUnlocked={vaultUnlocked} />

      <DashboardActions
        unlockedKeyCount={unlockedKeyCount}
        onLock={clearQuizKeys}
      />

      <div className="mt-2 space-y-5">
        <TrialOfferBanner />

        <LowFuelStrip />

        <QuickActions />

        {status === "loading" && <DashboardSkeleton />}

        {status === "error" && <ErrorState onRetry={retry} message={error?.message} />}

        {status === "ready" && data && (
          <>
            {/* Live quiz + credits */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {liveQuiz ? (
                  <LiveQuizCard quiz={liveQuiz} onChangeTiming={() => setTimingQuiz(liveQuiz)} />
                ) : quizzes.length === 0 ? (
                  <OnboardingCard />
                ) : (
                  <NoLiveCard draftCount={draftCount} />
                )}
              </div>
              <CreditsCard />
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {tiles.map((tile, index) => (
                <StatTile
                  key={tile.label}
                  label={tile.label}
                  value={tile.value}
                  hint={tile.hint}
                  color={tile.color}
                  index={index}
                />
              ))}
            </div>

            {/* Attempts, status mix, attention */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
              <AttemptsByQuizPanel quizzes={quizzes} />
              <StatusMixPanel quizzes={quizzes} />
              <NeedsAttentionPanel quizzes={quizzes} />
            </div>

            {/* Recent quizzes + activity */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <RecentQuizzesPanel quizzes={quizzes} />
              </div>
              <RecentActivityPanel attempts={recentAttempts} />
            </div>

            {/* Top students + scheduled */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <TopStudentsPanel attempts={recentAttempts} />
              <ScheduledPanel quizzes={quizzes} onReschedule={setTimingQuiz} />
            </div>
          </>
        )}
      </div>

      {timingQuiz && (
        <TimingModal
          quiz={timingQuiz}
          onClose={() => setTimingQuiz(null)}
          onSaved={() => {
            setTimingQuiz(null);
            retry();
          }}
        />
      )}

    </div>
  );
}
