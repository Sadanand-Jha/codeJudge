"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import { WaitingRoomThemeProvider } from "@/context/WaitingRoomThemeContext";
import { AnimatedCrowd } from "@/components/quiz/live/AnimatedCrowd";
import { PREDEFINED_AVATARS } from "@/config/dicebear";
import type { LiveParticipant } from "@/types/liveAssessment";
import QuizPageReady from "./QuizPageReady";
import { useIsMobile } from "@/hooks/useIsMobile";

/* ═══════════════════════════════════════════════════════════════
   Shared student-quiz page shell — QuizSupport design language
   (.qs-ui): lavender canvas, indigo ink, violet brand, Bricolage
   display type. Logic-free: pages keep their own data fetching.

   Backgrounds:
   - "orbs" (default): soft static brand/sun orbs, both themes.
   - "sky": brand canvas + roaming avatar crowd (kept from the
     waiting room), purely decorative.
   ═══════════════════════════════════════════════════════════════ */

export function QuizAmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[var(--qs-bg)]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--qs-line) 1px, transparent 1px), linear-gradient(to bottom, var(--qs-line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(80% 70% at 50% 0%, #000 25%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 50% 0%, #000 25%, transparent 78%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, color-mix(in srgb, var(--qs-brand) 9%, transparent), transparent 72%)",
        }}
      />
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
  const isMobile = useIsMobile();
  // Mobile: static canvas only — no roaming AnimatedCrowd. Content reveals
  // via QuizPageReady.
  if (isMobile) {
    return <QuizAmbientBackground />;
  }
  return (
    <WaitingRoomThemeProvider>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <QuizAmbientBackground />

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
    <Link href={href} className="qs-btn qs-btn-ghost gap-1.5 px-3.5 py-2 text-xs">
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
  const cls = cn("qs-btn gap-1.5 px-5 py-3 text-sm", className);
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
  eyebrow = "QuizSupport",
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
      "qs-ui relative bg-[var(--qs-bg)] px-4 text-[var(--qs-ink)] sm:px-6",
      fitViewport
        ? "min-h-[calc(100dvh-3.5rem)] overflow-x-hidden overflow-y-auto py-3 lg:h-[calc(100dvh-3.5rem)] lg:min-h-0 lg:overflow-hidden lg:py-4"
        : "min-h-[calc(100dvh-3.5rem)] overflow-hidden py-6 sm:py-8"
    )}>
      {background === "sky" ? (
        <QuizSkyBackground participants={crowdParticipants} crowdSpeed={crowdSpeed} />
      ) : (
        <QuizAmbientBackground />
      )}
      <main className={cn("relative z-10 mx-auto w-full", fitViewport ? "space-y-3 lg:h-full lg:space-y-4" : "space-y-5 sm:space-y-6", maxWidth)}>
        {(backHref || actions) && (
          <div className="flex items-center justify-between gap-3">
            <div>{backHref && <QuizBackLink href={backHref} label={backLabel} />}</div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          </div>
        )}
        {!hideHeader && (
        <header className="border-b-2 border-[var(--qs-line)] pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
            {eyebrow}
          </p>
          <h1 className="mt-1.5 text-[26px] font-extrabold leading-tight sm:text-[32px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[var(--qs-muted)] sm:text-[14px] sm:leading-6">
              {subtitle}
            </p>
          )}
        </header>
        )}
        {/* Mobile: render fully first, then reveal — no half-painted jank. */}
        <QuizPageReady>{children}</QuizPageReady>
      </main>
    </div>
  );
}

/* ── qs-ui brand loader (replaces the theme-dependent icon spinner) ── */
export function QuizLoader({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("h-7 w-7 animate-spin text-[var(--qs-brand)]", className)}
      aria-label="Loading"
    />
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
    <div className="qs-ui relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[var(--qs-bg)] px-4 py-6 sm:px-6">
      <QuizAmbientBackground />
      <div className="relative z-10 flex min-h-[70vh] items-center justify-center">
        <div className="qs-card w-full max-w-md p-6 text-center sm:p-8">
          {loading ? (
            <QuizLoader className="mx-auto" />
          ) : (
            icon
          )}
          {title && (
            <h1 className="mt-4 text-xl font-extrabold text-[var(--qs-ink)]">{title}</h1>
          )}
          <p className="mt-2 text-sm leading-6 text-[var(--qs-muted)]">{text}</p>
          {action && <div className="mt-6">{action}</div>}
        </div>
      </div>
    </div>
  );
}
