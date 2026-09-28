"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import { WaitingRoomThemeProvider } from "@/context/WaitingRoomThemeContext";
import { ThemeBackground } from "@/components/quiz/live/ThemeBackground";
import { AnimatedCrowd } from "@/components/quiz/live/AnimatedCrowd";
import { PREDEFINED_AVATARS } from "@/config/dicebear";
import type { LiveParticipant } from "@/types/liveAssessment";
import QuizSpaceAtmosphere from "./QuizSpaceAtmosphere";

/* ═══════════════════════════════════════════════════════════════
   Shared student-quiz page shell — same design language as the
   Quizzes landing (/quiz): ambient background, centered max-width
   container, eyebrow + title + subtitle header, violet accent.
   Logic-free: pages keep their own data fetching and handlers.

   Backgrounds:
   - "orbs" (default): soft static gradient orbs, both themes.
   - "sky": waiting-room animated sky (deep-space in dark theme,
     ai-cloud in light) + roaming avatar crowd, purely decorative.
   ═══════════════════════════════════════════════════════════════ */

export function QuizAmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-28 -top-28 h-[360px] w-[360px] rounded-full bg-[#8B7CFF]/15 blur-[100px] dark:bg-[#7C3AED]/30" />
      <div className="absolute -right-24 top-10 h-[320px] w-[320px] rounded-full bg-[#EC4899]/10 blur-[100px] dark:bg-[#EC4899]/20" />
      <div className="absolute left-[28%] top-[42%] h-[300px] w-[300px] rounded-full bg-[#4F9DFF]/10 blur-[100px] dark:bg-[#6366F1]/15" />
      <QuizSpaceAtmosphere />
    </div>
  );
}

/* Decorative-only crowd: reuses the waiting-room roaming avatars as a
   background layer. Stable ids, no names shown, no hover previews, and
   pointer events fully disabled so the form underneath always wins. */
const AMBIENT_AVATAR_COUNT = 14;

function useAmbientParticipants(): LiveParticipant[] {
  return useMemo(() => {
    const joinedAt = new Date(0).toISOString();
    return Array.from({ length: AMBIENT_AVATAR_COUNT }, (_, i) => {
      const preset = PREDEFINED_AVATARS[i % PREDEFINED_AVATARS.length];
      return {
        id: `ambient-${i}`,
        username: `ambient-${i}`,
        avatar: preset.label,
        avatarUrl: preset.url,
        status: "idle",
        progress: 0,
        questionsAnswered: 0,
        totalQuestions: 0,
        currentQuestion: 0,
        timeSpent: 0,
        connection: "good",
        joinedAt,
        positionSeed: (i + 1) / (AMBIENT_AVATAR_COUNT + 1),
      } satisfies LiveParticipant;
    });
  }, []);
}

export function QuizSkyBackground({
  crowd = true,
  participants,
  crowdSpeed = 1,
}: {
  crowd?: boolean;
  /** Real users (e.g. quiz attempters). Falls back to ambient avatars when omitted/empty. */
  participants?: LiveParticipant[];
  crowdSpeed?: number;
}) {
  const ambient = useAmbientParticipants();
  const pool = participants && participants.length > 0 ? participants : ambient;
  return (
    <WaitingRoomThemeProvider>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <ThemeBackground />
        <QuizSpaceAtmosphere />
      
        {crowd && (
          <div
            key={participants && participants.length > 0 ? "real" : "ambient"}
            className="absolute inset-0 [&_*]:pointer-events-none!"
          >
            <AnimatedCrowd participants={pool} glow speedMultiplier={crowdSpeed} />
          </div>
        )}
      </div>
    </WaitingRoomThemeProvider>
  );
}

export function QuizBackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-pink-200/80 bg-white/80 px-3 text-xs font-semibold text-pink-700 shadow-sm transition-colors duration-150 hover:border-pink-300 hover:bg-pink-50 dark:border-[#252D3A] dark:bg-[#151A24] dark:text-[#9AA4B5] dark:hover:border-[#353f52] dark:hover:text-[#F4F6FA]"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}

export function QuizPrimaryButton({
  href,
  onClick,
  disabled,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = cn(
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(244,114,182,.75)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(244,114,182,.85)] disabled:cursor-not-allowed disabled:opacity-50 dark:from-[#8B7CFF] dark:via-[#7A6BF5] dark:to-[#6856E8] dark:hover:shadow-[0_14px_30px_-16px_rgba(124,92,255,.9)]",
    className
  );
  if (href && !disabled) {
    return <Link href={href} className={cls}>{children}</Link>;
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export default function StudentQuizShell({
  children,
  eyebrow = "ByteClash",
  title,
  subtitle,
  actions,
  backHref,
  backLabel,
  maxWidth = "max-w-[1320px]",
  background = "orbs",
  crowdParticipants,
  crowdSpeed = 1,
  hideHeader = false,
  fitViewport = false,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  maxWidth?: string;
  background?: "orbs" | "sky";
  crowdParticipants?: LiveParticipant[];
  crowdSpeed?: number;
  /** Hide the eyebrow/title/subtitle header (page brings its own heading). Back row stays. */
  hideHeader?: boolean;
  /** Lock the shell to the available viewport instead of allowing page growth. */
  fitViewport?: boolean;
}) {
  return (
    <div className={cn(
      "relative bg-[#FFF9F1] px-4 text-[#101828] dark:bg-[#0B0D10] dark:text-[#F4F6FA] sm:px-6",
      fitViewport
        ? "min-h-[calc(100dvh-3.5rem)] overflow-x-hidden overflow-y-visible py-3 sm:h-[calc(100dvh-3.5rem)] sm:min-h-0 sm:overflow-hidden sm:py-4"
        : "min-h-[calc(100dvh-3.5rem)] overflow-hidden py-6 sm:py-8"
    )}>
      {background === "sky" ? (
        <QuizSkyBackground participants={crowdParticipants} crowdSpeed={crowdSpeed} />
      ) : (
        <QuizAmbientBackground />
      )}
      <main className={cn("relative z-10 mx-auto w-full", fitViewport ? "space-y-3 sm:h-full sm:space-y-4" : "space-y-5 sm:space-y-6", maxWidth)}>
        {(backHref || actions) && (
          <div className="flex items-center justify-between gap-3">
            <div>{backHref && <QuizBackLink href={backHref} label={backLabel} />}</div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          </div>
        )}
        {!hideHeader && (
        <header className="border-b border-pink-200/70 pb-5 dark:border-[#252D3A]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:text-[#687386]">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#475467] dark:text-[#9AA4B5] sm:text-[14px] sm:leading-6">
              {subtitle}
            </p>
          )}
        </header>
        )}
        {children}
      </main>
    </div>
  );
}

/* ── Centered loading / error / empty card (replaces per-page duplicates) ── */
export function QuizStateScreen({
  icon,
  title,
  text,
  action,
  loading = false,
}: {
  icon?: React.ReactNode;
  title?: string;
  text: string;
  action?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#FFF9F1] px-4 py-6 dark:bg-[#0B0D10] sm:px-6">
      <QuizAmbientBackground />
      <div className="relative z-10 flex min-h-[70vh] items-center justify-center">
        <div className="w-full max-w-md rounded-[24px] border border-pink-200/80 bg-white/85 p-6 text-center shadow-[0_24px_65px_-38px_rgba(244,114,182,.65)] backdrop-blur-xl dark:border-[#252D3A] dark:bg-[#151A24] sm:p-8">
          {loading ? (
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#8B7CFF]" />
          ) : (
            icon
          )}
          {title && (
            <h1 className="mt-4 text-xl font-bold text-[#101828] dark:text-[#F4F6FA]">{title}</h1>
          )}
          <p className="mt-2 text-sm leading-6 text-[#475467] dark:text-[#9AA4B5]">{text}</p>
          {action && <div className="mt-6">{action}</div>}
        </div>
      </div>
    </div>
  );
}
