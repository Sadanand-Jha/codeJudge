"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, History, KeyRound, Plus, ShieldCheck, ClipboardCheck } from "lucide-react";
import GuestGuard from "@/components/guards/GuestGuard";

import YourActivitySection from "@/components/quiz/live/YourActivitySection";

/* ── Same ambient background as the upgrade/pricing page ── */
function QuizPageBackground() {
  const stars = useMemo(
    () =>
      Array.from({ length: 48 }).map((_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 1 + (i % 3),
        opacity: 0.3 + ((i * 13) % 50) / 100,
        delay: `${((i * 7) % 40) / 10}s`,
        duration: `${2.5 + ((i * 11) % 30) / 10}s`,
      })),
    []
  );
  const shootingStars = useMemo(
    () => [
      { id: 0, left: "18%", top: "12%", delay: "1.5s", duration: "7s" },
      { id: 1, left: "62%", top: "28%", delay: "4.5s", duration: "9s" },
    ],
    []
  );
  return (
    <>
      {/* Light theme mesh + blobs */}
      <div className="pricing-bg-light pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <div className="pricing-blob pricing-blob-1" />
        <div className="pricing-blob pricing-blob-2" />
        <div className="pricing-blob pricing-blob-3" />
      </div>
      {/* Dark deep-space + stars + nebulas */}
      <div className="pricing-bg-space pointer-events-none absolute inset-0 z-0 hidden dark:block" aria-hidden="true">
        <div className="pricing-stars">
          {stars.map((s) => (
            <span
              key={s.id}
              className="pricing-star"
              style={{
                left: s.left,
                top: s.top,
                width: `${s.size}px`,
                height: `${s.size}px`,
                "--star-opacity": s.opacity,
                "--twinkle-delay": s.delay,
                "--twinkle-duration": s.duration,
              } as React.CSSProperties}
            />
          ))}
        </div>
        {shootingStars.map((ss) => (
          <span
            key={ss.id}
            className="pricing-shooting-star"
            style={{
              left: ss.left,
              top: ss.top,
              "--shoot-delay": ss.delay,
              "--shoot-duration": ss.duration,
            } as React.CSSProperties}
          />
        ))}
        <div className="pricing-nebula -left-20 top-20 h-[320px] w-[320px] bg-[#7C3AED]/20" />
        <div className="pricing-nebula -right-20 bottom-20 h-[380px] w-[380px] bg-[#EC4899]/20" style={{ animationDelay: "6s" }} />
        <div className="pricing-nebula left-1/3 top-1/2 h-[300px] w-[300px] bg-[#6366F1]/15" style={{ animationDelay: "12s" }} />
      </div>
      {/* Local ambient orbs — clearly visible soft color balloons in both themes */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 -top-28 h-[360px] w-[360px] rounded-full bg-[#8B7CFF]/15 blur-[100px] dark:bg-[#7C3AED]/30" />
        <div className="absolute -right-24 top-10 h-[320px] w-[320px] rounded-full bg-[#EC4899]/10 blur-[100px] dark:bg-[#EC4899]/20" />
        <div className="absolute left-[28%] top-[42%] h-[300px] w-[300px] rounded-full bg-[#4F9DFF]/10 blur-[100px] dark:bg-[#6366F1]/15" />
      </div>
    </>
  );
}

function QuizHome() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F7F8FA] px-4 py-6 text-[#101828] dark:bg-[#0B0D10] dark:text-[#F4F6FA] sm:px-6 sm:py-8">
      <QuizPageBackground />
      <main className="relative z-10 mx-auto w-full max-w-[1320px] space-y-5 sm:w-[calc(100%-48px)] sm:space-y-6">
        {/* ── Page header (no giant card) ── */}
        <header className="flex flex-col gap-4 border-b border-[#E4E7EC] pb-5 dark:border-[#252D3A] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3] dark:text-[#687386]">
              ByteClash
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">
              Quizzes
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-[#475467] dark:text-[#9AA4B5] sm:text-[14px] sm:leading-6">
              Join assessments, review your attempts, and track your performance.
            </p>
          </div>
          <Link
            href="/quiz/join"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#8B7CFF] px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#7A6BF5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B7CFF]/50 sm:self-start"
          >
            <Plus className="h-4 w-4" />
            Join Quiz
          </Link>
        </header>

        {/* ── Primary actions (compact) ── */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <ActionCard
            href="/quiz/join"
            icon={KeyRound}
            title="Join a quiz"
            description="Enter a valid quiz code to verify access."
            cta="Join quiz"
            primary
          />
          <ActionCard
            href="#activity"
            icon={History}
            title="My activity"
            description="Review attempts and performance history."
            cta="View activity"
          />
        </section>

        {/* ── Trust strip (existing content, compact) ── */}
        <section className="flex flex-col gap-2 rounded-xl border border-[#E4E7EC] bg-white px-4 py-3 dark:border-[#252D3A] dark:bg-[#151A24] sm:flex-row sm:items-center sm:gap-6">
          <span className="inline-flex items-center gap-2 text-xs text-[#475467] dark:text-[#9AA4B5]">
            <ClipboardCheck className="h-4 w-4 shrink-0 text-[#039855] dark:text-[#20D889]" />
            <span>
              <strong className="font-semibold text-[#101828] dark:text-[#F4F6FA]">Verified entry — </strong>
              Invalid, draft, expired, and unauthorized quiz codes are rejected.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-[#475467] dark:text-[#9AA4B5] sm:border-l sm:border-[#E4E7EC] sm:pl-6 sm:dark:border-[#252D3A]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#1570EF] dark:text-[#4F9DFF]" />
            <span>
              <strong className="font-semibold text-[#101828] dark:text-[#F4F6FA]">Private by design — </strong>
              Creator identity and internal quiz configuration are never shown here.
            </span>
          </span>
        </section>

        <div id="activity" className="scroll-mt-20">
          <YourActivitySection />
        </div>
      </main>
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

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  cta,
  primary = false,
}: {
  href: string;
  icon: typeof KeyRound;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-start gap-3.5 rounded-2xl border p-4 transition-colors duration-150 sm:p-5 ${
        primary
          ? "border-[#8B7CFF]/40 bg-white shadow-[0_0_24px_rgba(139,124,255,0.12)] hover:border-[#8B7CFF]/60 dark:border-[#8B7CFF]/30 dark:bg-[#19202C] dark:shadow-[0_0_24px_rgba(139,124,255,0.08)] dark:hover:border-[#8B7CFF]/50"
          : "border-[#E4E7EC] bg-white hover:border-[#D0D5DD] dark:border-[#252D3A] dark:bg-[#151A24] dark:hover:border-[#353f52]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          primary
            ? "border-[#8B7CFF]/25 bg-[#8B7CFF]/12 text-[#6B5CFF] dark:text-[#8B7CFF]"
            : "border-[#E4E7EC] bg-[#F2F4F7] text-[#475467] dark:border-[#252D3A] dark:bg-[#19202C] dark:text-[#9AA4B5]"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-[#101828] dark:text-[#F4F6FA] sm:text-base">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-[#475467] dark:text-[#9AA4B5] sm:text-sm">
          {description}
        </span>
        <span
          className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
            primary
              ? "bg-[#8B7CFF] text-white group-hover:bg-[#7A6BF5]"
              : "border border-[#E4E7EC] bg-[#F2F4F7] text-[#475467] group-hover:border-[#D0D5DD] group-hover:text-[#101828] dark:border-[#252D3A] dark:bg-[#19202C] dark:text-[#9AA4B5] dark:group-hover:border-[#353f52] dark:group-hover:text-[#F4F6FA]"
          }`}
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
