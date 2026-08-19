"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Clock,
  Users,
  Zap,
  Medal,
  ArrowRight,
  CalendarDays,
  TimerReset,
  Radio,
} from "lucide-react";
import type { ContestPreview } from "./types";
import { CONTESTS_PREVIEW } from "./mockData";
import { SectionHeading } from "./ui";
import { cn } from "@/lib/helpers";

const KIND_STYLES: Record<ContestPreview["kind"], string> = {
  Weekly: "border-blue-500/25 bg-blue-500/10 text-blue-500 dark:text-blue-300",
  Monthly: "border-violet-500/25 bg-violet-500/10 text-violet-500 dark:text-violet-300",
  Special: "border-amber-500/25 bg-amber-500/10 text-amber-500 dark:text-amber-300",
  College: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300",
  Sponsored: "border-pink-500/25 bg-pink-500/10 text-pink-500 dark:text-ai-accent",
};

function ContestCard({ contest, index = 0 }: { contest: ContestPreview; index?: number }) {
  const live = contest.status === "live";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.2) }}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-card p-4 transition-all duration-300 hover:-translate-y-1",
        live
          ? "border-emerald-500/30 shadow-[0_14px_34px_rgba(16,185,129,0.12)]"
          : "border-border hover:border-pink-500/25 hover:shadow-[0_14px_34px_rgba(0,0,0,0.10)] dark:hover:border-ai-accent/25"
      )}
    >
      {live && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />}

      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", KIND_STYLES[contest.kind])}>
          {contest.kind}
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        ) : (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
              contest.status === "upcoming"
                ? "border-violet-500/25 bg-violet-500/10 text-violet-500 dark:text-violet-300"
                : "border-border bg-card-hover/60 text-text-muted"
            )}
          >
            {contest.status === "upcoming" ? "Upcoming" : "Past"}
          </span>
        )}
      </div>

      <h4 className="mt-3 line-clamp-2 text-[13px] font-bold leading-snug text-text-primary group-hover:text-pink-500 dark:group-hover:text-ai-accent">
        {contest.name}
      </h4>

      <div className="mt-3 space-y-1.5 text-[11px] text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Clock className={cn("h-3.5 w-3.5", live ? "text-emerald-500" : "text-text-muted")} />
          <span className={cn(live && "font-semibold text-emerald-500")}>{contest.startLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TimerReset className="h-3.5 w-3.5 text-text-muted" />
          {contest.durationMin} min
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-text-muted" />
          {contest.participants.toLocaleString("en-IN")} registered
          {contest.prize && (
            <span className="ml-auto inline-flex items-center gap-1 font-bold text-amber-500">
              <Medal className="h-3.5 w-3.5" /> {contest.prize}
            </span>
          )}
        </div>
      </div>

      <Link
        href="/contests"
        className={cn(
          "mt-4 flex h-8.5 items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold transition-all",
          live
            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:-translate-y-0.5"
            : contest.status === "upcoming"
              ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.28)] hover:-translate-y-0.5"
              : "border border-border bg-card-hover/60 text-text-secondary hover:border-pink-500/25 hover:text-pink-500 dark:hover:text-ai-accent"
        )}
      >
        {live ? (
          <>
            <Radio className="h-3.5 w-3.5" /> Join Now
          </>
        ) : contest.status === "upcoming" ? (
          <>
            {contest.registered ? "Registered" : "Register"}
            <ArrowRight className="h-3 w-3" />
          </>
        ) : (
          <>
            View Results <ArrowRight className="h-3 w-3" />
          </>
        )}
      </Link>
    </motion.div>
  );
}

/**
 * Contests preview — Live / Upcoming / Past so the sibling product is visible
 * from the Tests hub without leaving the page.
 */
export function ContestsPreview() {
  const live = CONTESTS_PREVIEW.find((c) => c.status === "live");
  const upcoming = CONTESTS_PREVIEW.filter((c) => c.status === "upcoming").slice(0, 2);
  const past = CONTESTS_PREVIEW.filter((c) => c.status === "past").slice(0, 3);

  return (
    <section>
      <SectionHeading
        title="Contests"
        subtitle="Timed competitions with rankings and prizes — join live or register ahead."
        href="/contests"
        icon={<Trophy className="h-4.5 w-4.5" />}
      />

      {/* Live — prominent */}
      {live && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="relative mb-5 overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 via-transparent to-teal-500/8 p-5 sm:p-6"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_6px_18px_rgba(16,185,129,0.35)]">
              <Zap className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Live now
                </span>
                <span className="text-[11px] text-text-muted">
                  {live.participants.toLocaleString("en-IN")} competing
                </span>
              </div>
              <h3 className="mt-1.5 text-lg font-extrabold tracking-tight text-text-primary">{live.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-secondary">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" /> {live.startLabel}
                </span>
                <span className="inline-flex items-center gap-1">
                  <TimerReset className="h-3.5 w-3.5 text-text-muted" /> {live.durationMin} min
                </span>
                {live.prize && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                    <Medal className="h-3.5 w-3.5" /> {live.prize} prize pool
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/contests"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5"
            >
              <Radio className="h-4 w-4" /> Join Now
            </Link>
          </div>
        </motion.div>
      )}

      {/* Upcoming + past grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {upcoming.map((c, i) => (
          <ContestCard key={c.id} contest={c} index={i} />
        ))}
        {past.map((c, i) => (
          <ContestCard key={c.id} contest={c} index={i + 2} />
        ))}
        {/* View all tile */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="flex min-h-[196px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card ring-1 ring-border">
            <CalendarDays className="h-4 w-4 text-text-secondary" />
          </span>
          <div className="text-[12px] font-bold text-text-primary">Explore all contests</div>
          <p className="text-[10px] leading-relaxed text-text-muted">Weekly, monthly, special, college & sponsored.</p>
          <Link
            href="/contests"
            className="mt-1 inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:text-ai-accent"
          >
            Go to Contests <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}