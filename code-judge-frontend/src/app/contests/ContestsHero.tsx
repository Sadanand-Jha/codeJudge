"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Flame,
  Swords,
  Users,
  Medal,
  TimerReset,
  CalendarDays,
  Gauge,
  ArrowRight,
  ChevronRight,
  Target,
  Crown,
  Rocket,
} from "lucide-react";
import { SearchBar } from "@/components/tests/SearchBar";
import { ProductTabs } from "@/components/tests/ProductTabs";
import { cn } from "@/lib/helpers";
import type { Contest } from "@/services/contests";
import {
  useCountdown,
  useNow,
  getContestState,
  contestEndIso,
  seededParticipants,
  seededPrize,
  seededDifficulty,
  seededProblemCount,
  formatDuration,
  formatDate,
} from "./countdown";

const QUICK_CHIPS = [
  { label: "🔥 LIVE NOW", tab: "live" },
  { label: "Starting soon", tab: "upcoming" },
  { label: "Weekly Clash", tab: "all" },
  { label: "Monthly Championship", tab: "all" },
];

function CountdownBoxes({ target, accent }: { target: string; accent: "amber" | "rose" }) {
  const cd = useCountdown(target);
  if (!cd) {
    return (
      <div className="flex h-[76px] items-center justify-center rounded-xl bg-card-hover/70 text-xs font-semibold text-text-muted">
        {accent === "rose" ? "Contest in progress — fight!" : "Counting down…"}
      </div>
    );
  }
  const boxes = [
    { label: "Days", value: cd.d },
    { label: "Hours", value: cd.h },
    { label: "Mins", value: cd.m },
    { label: "Secs", value: cd.s },
  ];
  const numCls =
    accent === "rose"
      ? "text-rose-500 dark:text-rose-400"
      : "text-amber-500 dark:text-amber-300";
  return (
    <div className="grid grid-cols-4 gap-2">
      {boxes.map((b) => (
        <div key={b.label} className="contests-countdown-box rounded-xl bg-card-hover/70 px-1 py-3 text-center ring-1 ring-inset ring-border">
          <div className={cn("contests-countdown-num text-2xl font-extrabold tabular-nums leading-none", numCls)}>
            {String(b.value).padStart(2, "0")}
          </div>
          <div className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">{b.label}</div>
        </div>
      ))}
    </div>
  );
}

function FeaturedCard({ contest, now }: { contest: Contest | null; now: number }) {
  const state = contest ? getContestState(contest, now) : null;
  const live = state === "live";
  const target = contest ? (live ? contestEndIso(contest) : contest.starttime) : null;

  if (!contest) {
    return (
      <div className="relative mx-auto max-w-[380px] rounded-2xl border border-border bg-card/80 p-6 text-center backdrop-blur-sm">
        <Swords className="mx-auto h-9 w-9 text-amber-400 dark:text-amber-300" />
        <h3 className="mt-3 text-lg font-extrabold tracking-tight text-text-primary">The arena is quiet… for now.</h3>
        <p className="mt-1 text-xs text-text-secondary">The next battle begins soon.</p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-300">
          <Flame className="h-3.5 w-3.5" />
          Stay tuned
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/80 p-5 backdrop-blur-sm",
        live
          ? "border-rose-500/40 shadow-[0_0_0_1px_rgba(244,63,94,0.25),0_18px_50px_rgba(244,63,94,0.15)]"
          : "border-amber-500/30 shadow-[0_18px_50px_rgba(0,0,0,0.3)]",
      )}
    >
      {live && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />}

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider",
            live
              ? "border-rose-500/40 bg-rose-500/10 text-rose-500"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />}
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", live ? "bg-rose-500" : "bg-amber-500")} />
          </span>
          {live ? "LIVE NOW" : "UPCOMING"}
        </span>
        <span className="rounded-full border border-border bg-card-hover/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
          {formatDuration(contest.duration)}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-xl font-extrabold leading-tight tracking-tight text-text-primary">
        {contest.name}
      </h3>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
          <span>{live ? "Time remaining" : "Starts in"}</span>
          <span className="inline-flex items-center gap-1 text-amber-500 dark:text-amber-300">
            <TimerReset className="h-3 w-3" />
            {formatDuration(contest.duration)}
          </span>
        </div>
        {target && <CountdownBoxes target={target} accent={live ? "rose" : "amber"} />}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { icon: CalendarDays, label: "Starts", value: formatDate(contest.starttime), cls: "text-text-primary" },
          { icon: Users, label: "Competitors", value: seededParticipants(contest.id).toLocaleString("en-IN"), cls: "text-amber-600 dark:text-amber-300" },
          { icon: Medal, label: "Prize pool", value: seededPrize(contest.id), cls: "text-amber-500" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-card-hover/70 px-2.5 py-2.5 ring-1 ring-inset ring-border">
              <Icon className={cn("h-3.5 w-3.5", s.cls)} />
              <div className="mt-1.5 text-[12px] font-extrabold tabular-nums leading-none text-text-primary">{s.value}</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-text-muted">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-[11px] font-semibold text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-text-muted" />
          {seededDifficulty(contest.id)} · {seededProblemCount(contest.id)} problems
        </span>
        <span className="text-text-muted">Rated</span>
      </div>

      <div className="mt-4 flex gap-2.5">
        <Link
          href={live ? `/contests/${contest.id}` : `/contests/${contest.id}/register`}
          className={cn(
            "contests-cta-pulse inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 text-[13px] font-extrabold text-white transition-all hover:-translate-y-0.5",
            live
              ? "from-rose-500 to-red-600"
              : "from-amber-500 to-orange-600",
          )}
        >
          {live ? (
            <>
              <Rocket className="h-4 w-4" /> ENTER CONTEST
            </>
          ) : (
            <>
              <Swords className="h-4 w-4" /> JOIN CONTEST
            </>
          )}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/contests/${contest.id}`}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-xl border border-border bg-card-hover/60 px-4 text-[13px] font-bold text-text-primary transition-all hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-300"
        >
          View Details <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/**
 * Contests hero — explosive competitive arena.
 * "PROVE YOURSELF." with the featured contest, live countdown and arena FX.
 */
export function ContestsHero({
  featured,
  totalCount,
  query,
  onSearch,
}: {
  featured: Contest | null;
  totalCount: number;
  query: string;
  onSearch: (q: string) => void;
}) {
  const [search, setSearch] = useState(query);
  const now = useNow();

  return (
    <section className="contests-hero-wrap relative overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur-sm">
      <div className="contests-hero-glow" />
      <div className="contests-arena-grid absolute inset-0" />
      {/* ambient particles */}
      <div className="contests-particle left-[12%] top-24 h-2 w-2" style={{ animationDelay: "0s" }} />
      <div className="contests-particle right-[30%] top-16 h-1.5 w-1.5" style={{ animationDelay: "2.5s" }} />
      <div className="contests-particle left-[42%] bottom-24 h-1.5 w-1.5" style={{ animationDelay: "4s" }} />
      <div className="contests-particle right-[10%] bottom-16 h-2.5 w-2.5" style={{ animationDelay: "1.4s" }} />

      <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-6 lg:px-10 lg:py-12">
        {/* Left — copy + search */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-300" />
            </span>
            The ByteClash Arena
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-4 text-[34px] font-extrabold leading-[1.06] tracking-tight text-text-primary sm:text-[42px] lg:text-[48px]"
          >
            PROVE
            <br />
            <span className="contests-fire-text">
              YOURSELF.
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-bold text-text-secondary"
          >
            <span>COMPETE</span>
            <ChevronRight className="h-4 w-4 text-amber-500 dark:text-amber-300" />
            <span>CLIMB</span>
            <ChevronRight className="h-4 w-4 text-orange-500" />
            <span>CONQUER</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mt-3 max-w-lg text-[15px] leading-relaxed text-text-secondary"
          >
            Timed battles against coders worldwide. Register, show up at the bell, out-solve the
            arena and watch your rating climb.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative z-20 mt-6 max-w-xl"
          >
            <SearchBar
              value={search}
              onChange={(v) => {
                setSearch(v);
                onSearch(v);
              }}
              onSubmit={() => onSearch(search)}
              placeholder="Search the arena…"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            <span className="text-xs text-text-muted">Jump to:</span>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="rounded-full border border-border bg-card-hover/60 px-3 py-1 text-xs font-semibold text-text-secondary transition-colors hover:border-amber-500/40 hover:text-amber-600 dark:hover:border-amber-400/40 dark:hover:text-amber-300"
                onClick={() => {
                  setSearch("");
                  onSearch("");
                  document
                    .getElementById(chip.tab === "live" ? "live-arena" : "contest-grid")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {chip.label}
              </button>
            ))}
            <span className="text-xs text-text-muted">
              {totalCount} battle{totalCount === 1 ? "" : "s"} open
            </span>
          </motion.div>
        </div>

        {/* Right — featured contest */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <FeaturedCard contest={featured} now={now} />

          <div className="contests-float-slow absolute -left-5 top-8 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-text-primary">Global rank</div>
              <div className="text-[9px] text-text-muted">#12,482 · Top 4%</div>
            </div>
          </div>

          <div className="contests-float-slower absolute -right-3 bottom-10 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/12 text-orange-500">
              <Target className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-text-primary">Rating impact</div>
              <div className="text-[9px] text-text-muted">+42 this month</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Product tabs — Problems / Tests / Contests */}
      <ProductTabs active="contests" />
    </section>
  );
}