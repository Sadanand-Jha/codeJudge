"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarClock, Flame, Megaphone, Sparkles, Trophy, Users } from "lucide-react";
import { TRENDING_TESTS, CONTESTS_PREVIEW, SERIES_MAP, EXAM_MAP } from "./mockData";
import { FreeBadge, PriceTag, Stars } from "./ui";
import { cn } from "@/lib/helpers";

function ModuleHeader({ icon, label, color = "text-pink-500 dark:text-ai-accent" }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <div className="mb-3 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
      <span className={color}>{icon}</span>
      {label}
    </div>
  );
}

/* ============================================
   Trending Tests — 3 compact "hot right now" cards
   ============================================ */
function TrendingTests() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <ModuleHeader icon={<Flame className="h-3.5 w-3.5 text-orange-500" />} label="Trending Tests" color="text-orange-500" />
      <ul className="space-y-2.5">
        {TRENDING_TESTS.map((t) => {
          const exam = EXAM_MAP[t.examId];
          return (
            <li key={t.id}>
              <Link
                href={`/tests?exam=${t.examId}`}
                className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card-hover/40 p-2.5 transition-colors hover:border-pink-500/30 hover:bg-card-hover dark:hover:border-ai-accent/40"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                    exam?.gradient ?? "from-pink-500 to-violet-600"
                  )}
                >
                  {exam && <exam.icon className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-text-primary group-hover:text-pink-500 dark:group-hover:text-ai-accent">
                    {t.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span className="tabular-nums">{t.attempts.toLocaleString("en-IN")} attempts</span>
                    <span aria-hidden>·</span>
                    <span>{t.duration}</span>
                  </span>
                </span>
                <span className="mt-0.5 shrink-0">{t.free ? <FreeBadge /> : null}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/tests?explore=1"
        className="group mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-pink-500 transition-colors hover:gap-1.5 dark:text-ai-accent"
      >
        View all
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ============================================
   Upcoming Contest — bridges Tests → Contests
   ============================================ */
function UpcomingContest() {
  const contest = CONTESTS_PREVIEW.find((c) => c.status === "upcoming");
  const countdown = contest?.startLabel.replace("Starts in ", "") ?? "02h 34m";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 to-teal-500/6 p-4">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative">
        <ModuleHeader icon={<CalendarClock className="h-3.5 w-3.5 text-emerald-500" />} label="Upcoming Contest" color="text-emerald-500" />
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Trophy className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold leading-snug text-text-primary">
              {contest?.name ?? "Weekly Coding Challenge"}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-text-muted">
              <Users className="h-3 w-3" />
              <span className="tabular-nums">{(contest?.participants ?? 2431).toLocaleString("en-IN")} registered</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-card/70 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Starts in</span>
          <span className="font-mono text-[14px] font-extrabold tabular-nums text-emerald-500">{countdown}</span>
        </div>

        <Link
          href="/contests"
          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-[11px] font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          Register <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ============================================
   Top Test Series — 2 teacher-created series
   ============================================ */
const RAIL_SERIES = ["s_jeeadvanced", "s_ssc_free"];

function TopSeries() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <ModuleHeader icon={<Sparkles className="h-3.5 w-3.5 text-pink-500 dark:text-ai-accent" />} label="Top Test Series" />
      <ul className="space-y-2.5">
        {RAIL_SERIES.map((id) => {
          const s = SERIES_MAP[id];
          if (!s) return null;
          const exam = EXAM_MAP[s.examId];
          return (
            <li key={id}>
              <Link
                href={`/tests/series/${s.id}`}
                className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card-hover/40 p-2.5 transition-colors hover:border-pink-500/30 hover:bg-card-hover dark:hover:border-ai-accent/40"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                    exam?.gradient ?? "from-pink-500 to-violet-600"
                  )}
                >
                  {exam && <exam.icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-text-primary group-hover:text-pink-500 dark:group-hover:text-ai-accent">
                    {s.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[10px] font-semibold text-text-secondary">
                      {s.testCount} Tests
                    </span>
                    <span className="text-[10px] font-semibold text-text-secondary">
                      · {s.difficulty}
                    </span>
                    <Stars rating={s.rating} size={11} />
                    <span className="text-[10px] font-bold tabular-nums text-text-primary">{s.rating}</span>
                  </span>
                </span>
              </Link>
              <div className="mt-1.5 flex items-center justify-between pl-[52px]">
                {s.price === 0 ? (
                  <FreeBadge />
                ) : (
                  <PriceTag price={s.price} originalPrice={s.originalPrice} />
                )}
                <span className="text-[10px] font-bold text-pink-500 dark:text-ai-accent">View Series</span>
              </div>
            </li>
          );
        })}
      </ul>
      <Link
        href="/tests/series"
        className="group mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-pink-500 transition-colors hover:gap-1.5 dark:text-ai-accent"
      >
        Browse all series
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ============================================
   Advertisement slot — clearly labeled, column-oriented, integrated.
   ============================================ */
function AdSlot() {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-pink-500/10 via-violet-600/10 to-ai-accent/10 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-text-muted">
        <Megaphone className="h-3 w-3" /> Advertisement
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-extrabold leading-tight text-text-primary">ByteClash Pro</div>
          <div className="mt-0.5 text-[10px] leading-snug text-text-secondary">
            Unlimited mocks, AI analytics & rank tracking for all exams.
          </div>
        </div>
      </div>
      <Link
        href="/pricing"
        className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 text-[11px] font-bold text-white transition-transform hover:-translate-y-0.5"
      >
        Go Pro
      </Link>
    </div>
  );
}

/* ============================================
   Explore rail — the right column of the "Explore Tests" section.
   Fills the desktop viewport with useful content instead of empty space.
   ============================================ */
export function ExploreRail({ className }: { className?: string }) {
  return (
    <aside className={cn("space-y-4", className)}>
      <div className="sticky top-20 space-y-4">
        <TrendingTests />
        <UpcomingContest />
        <TopSeries />
        <AdSlot />
      </div>
    </aside>
  );
}