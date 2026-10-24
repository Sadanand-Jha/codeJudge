"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import GuestGuard from "@/components/guards/GuestGuard";

import YourActivitySection from "@/components/quiz/live/YourActivitySection";
import QuizHubBackdrop from "@/components/quiz/live/QuizHubBackdrop";
import QuizHubHero from "@/components/quiz/live/QuizHubHero";
import QuizPageReady from "@/components/quiz/live/QuizPageReady";
import { useTheme } from "@/context/ThemeContext";

function TrustStrip() {
  return (
    <section className="grid gap-2.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3.5 shadow-[4px_4px_0_var(--qs-sun)] sm:grid-cols-2 sm:gap-3 sm:px-5 sm:py-4">
      <span className="flex items-start gap-2.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-[13px] leading-snug text-[var(--qs-muted)] sm:border-0 sm:bg-transparent sm:p-0 sm:text-sm">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-okbg)]">
          <BadgeCheck className="h-4 w-4 text-[var(--qs-ok)]" />
        </span>
        <span>
          <strong className="font-extrabold text-[var(--qs-ink)]">Verified entry — </strong>
          Every quiz code is checked before a quiz begins.
        </span>
      </span>
      <span className="flex items-start gap-2.5 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-[13px] leading-snug text-[var(--qs-muted)] sm:border-0 sm:border-l-2 sm:bg-transparent sm:p-0 sm:pl-5 sm:text-sm sm:rounded-none">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)]">
          <ShieldCheck className="h-4 w-4 text-[var(--qs-brand)]" />
        </span>
        <span>
          <strong className="font-extrabold text-[var(--qs-ink)]">Private by default — </strong>
          Your answers stay secure throughout every attempt.
        </span>
      </span>
    </section>
  );
}

function QuizHome() {
  const { theme } = useTheme();
  const missionMode = theme === "dark";

  return (
    <div className="qs-ui relative min-h-[calc(100dvh-3.5rem)]">
      <QuizHubBackdrop />
      <QuizPageReady>
        <div className="qs-wrap relative z-10 pb-12 pt-4 sm:pt-6">
          <main className="w-full space-y-8">
            <QuizHubHero />

            <TrustStrip />

            <div id="activity" className="scroll-mt-20">
              <YourActivitySection missionMode={missionMode} />
            </div>
          </main>
        </div>
      </QuizPageReady>
    </div>
  );
}

export default function QuizDashboardPage() {
  return (
    <GuestGuard action="join-contest">
      <QuizHome />
    </GuestGuard>
  );
}
