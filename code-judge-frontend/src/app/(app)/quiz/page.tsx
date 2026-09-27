"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, History, KeyRound, ShieldCheck } from "lucide-react";
import GuestGuard from "@/components/guards/GuestGuard";
import YourActivitySection from "@/components/quiz/live/YourActivitySection";

function QuizHome() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-6 text-text-primary sm:px-6 sm:py-8 lg:px-8">
      <main className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure quiz access
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Quizzes</h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Join an assessment using its verified 16-letter code, then manage your attempts and results from one place.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4">
          <ActionCard
            href="/quiz/join"
            icon={KeyRound}
            title="Join quiz"
            description="Enter a valid quiz code to verify access."
            primary
          />
          <ActionCard
            href="#activity"
            icon={History}
            title="My activity"
            description="Review attempts, results, and quiz history."
          />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4">
          <InfoBox icon={ClipboardCheck} title="Verified entry" text="Invalid, draft, expired, and unauthorized quiz codes are rejected." />
          <InfoBox icon={ShieldCheck} title="Private by design" text="Creator identity and internal quiz configuration are never shown here." />
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
  primary = false,
}: {
  href: string;
  icon: typeof KeyRound;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-40 min-w-0 flex-col rounded-2xl border p-4 transition sm:min-h-44 sm:p-6 ${primary ? "border-pink-500/25 bg-pink-500/[0.06] hover:border-pink-500/40" : "border-border bg-card hover:border-border-hover"}`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${primary ? "bg-pink-500 text-white" : "bg-card-hover text-text-secondary"}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <h2 className="mt-4 break-words text-sm font-bold text-text-primary sm:text-base">{title}</h2>
      <p className="mt-1 flex-1 text-[11px] leading-4 text-text-secondary sm:text-sm sm:leading-5">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600 dark:text-pink-300 sm:text-xs">
        Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function InfoBox({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-3.5 sm:p-5">
      <Icon className="h-5 w-5 text-emerald-500" />
      <h3 className="mt-3 text-xs font-bold text-text-primary sm:text-sm">{title}</h3>
      <p className="mt-1 text-[10px] leading-4 text-text-secondary sm:text-xs sm:leading-5">{text}</p>
    </div>
  );
}
