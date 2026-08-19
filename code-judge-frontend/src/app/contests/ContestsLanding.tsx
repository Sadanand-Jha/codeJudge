"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Clock,
  CalendarDays,
  TimerReset,
  Users,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Gauge,
  Medal,
  Flame,
  Crown,
  Target,
  Rocket,
  ChevronDown,
  Swords,
  Shield,
  TrendingUp,
  Flag,
  Building2,
  Scale,
  Landmark,
  Cpu,
  Stethoscope,
  GraduationCap,
  Calculator,
  Sigma,
  Globe,
  Brain,
  Braces,
  Search,
  Star,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { getAllContests, getMyContests, type Contest } from "@/services/contests";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/helpers";
import { ContestsHero } from "./ContestsHero";
import {
  useNow,
  useCountdown,
  useCountUp,
  getContestState,
  seededParticipants,
  seededPrize,
  seededDifficulty,
  seededProblemCount,
  seededCategory,
  seededYourRank,
  formatStartsIn,
  formatDuration,
  formatDate,
} from "./countdown";

const LAYOUT_CLASSES =
  "mx-auto w-full max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-10 xl:px-12 2xl:px-16";

type StatusTab = "all" | "live" | "upcoming" | "my" | "completed";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "ALL" },
  { value: "live", label: "LIVE" },
  { value: "upcoming", label: "UPCOMING" },
  { value: "my", label: "MY CONTESTS" },
  { value: "completed", label: "COMPLETED" },
];

const CATEGORIES = [
  { id: "cp", label: "Competitive Programming", icon: Braces, gradient: "from-amber-400 to-orange-600" },
  { id: "dsa", label: "DSA", icon: Target, gradient: "from-orange-400 to-rose-500" },
  { id: "ai", label: "AI / ML", icon: Brain, gradient: "from-fuchsia-500 to-purple-600" },
  { id: "web", label: "Web Development", icon: Globe, gradient: "from-sky-500 to-cyan-500" },
  { id: "math", label: "Mathematics", icon: Sigma, gradient: "from-emerald-500 to-teal-500" },
  { id: "aptitude", label: "Aptitude", icon: Calculator, gradient: "from-amber-500 to-orange-500" },
  { id: "jee", label: "JEE", icon: GraduationCap, gradient: "from-orange-500 to-rose-500" },
  { id: "neet", label: "NEET", icon: Stethoscope, gradient: "from-emerald-500 to-green-500" },
  { id: "gate", label: "GATE", icon: Cpu, gradient: "from-cyan-500 to-teal-500" },
  { id: "ssc", label: "SSC", icon: Landmark, gradient: "from-yellow-500 to-amber-500" },
  { id: "upsc", label: "UPSC", icon: Scale, gradient: "from-rose-500 to-pink-500" },
  { id: "college", label: "College Challenges", icon: Building2, gradient: "from-blue-500 to-sky-500" },
  { id: "open", label: "Open Challenges", icon: Flag, gradient: "from-fuchsia-500 to-pink-500" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Advanced"] as const;

const LEADERBOARD = [
  { rank: 1, name: "Aarav Sharma", handle: "aarav_7x", rating: 2487, score: 3200, streak: 12, change: "up", gradient: "from-amber-400 to-orange-500" },
  { rank: 2, name: "Priya Nair", handle: "priya_byte", rating: 2391, score: 2950, streak: 9, change: "up", gradient: "from-slate-300 to-slate-500" },
  { rank: 3, name: "Rohan Mehta", handle: "rohan_dp", rating: 2314, score: 2810, streak: 5, change: "down", gradient: "from-orange-300 to-amber-600" },
  { rank: 4, name: "Sneha Iyer", handle: "sneha_code", rating: 2268, score: 2640, streak: 8, change: "up", gradient: "from-violet-400 to-fuchsia-500" },
  { rank: 5, name: "Kabir Singh", handle: "kabir_1337", rating: 2205, score: 2490, streak: 3, change: "down", gradient: "from-sky-400 to-blue-500" },
];

const BATTLE_STATS = [
  { value: 12483, decimals: 0, prefix: "", suffix: "", label: "Competitors", hint: "registered this month" },
  { value: 248, decimals: 0, prefix: "", suffix: "", label: "Contests Completed", hint: "since ByteClash v1" },
  { value: 1.8, decimals: 1, prefix: "", suffix: "M", label: "Problems Solved", hint: "across every battle" },
  { value: 1, decimals: 0, prefix: "#", suffix: "", label: "Current Champion", hint: "aarav_7x · 2487 rating" },
];

const RATING_HISTORY = [1745, 1761, 1752, 1790, 1783, 1821, 1809, 1847];

function seededCapacity(id: number): number {
  return Math.ceil((seededParticipants(id) * 1.15) / 100) * 100;
}

type EntryLabel = { text: string; cls: string; ping?: boolean };

function entryLabel(c: Contest, now: number): EntryLabel {
  const state = getContestState(c, now);
  if (state === "live") return { text: "LIVE", cls: "border-rose-500/40 bg-rose-500/10 text-rose-500", ping: true };
  if (state === "past") return { text: "ENDED", cls: "border-border bg-card-hover/60 text-text-muted" };
  const start = new Date(c.starttime!).getTime();
  const ratio = seededParticipants(c.id) / seededCapacity(c.id);
  if (ratio >= 0.95) return { text: "FULL", cls: "border-rose-500/40 bg-rose-500/10 text-rose-500" };
  if (start - now < 24 * 3600000)
    return { text: "STARTING SOON", cls: "border-orange-500/40 bg-orange-500/10 text-orange-500", ping: true };
  return { text: "REGISTRATION OPEN", cls: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300" };
}

/* ---------------------------------- Dropdown ---------------------------------- */

function ArenaDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-secondary transition-colors hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-300"
      >
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary">{current?.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-52 overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors",
                o.value === value
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                  : "text-text-secondary hover:bg-card-hover",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Profile strip ---------------------------------- */

function ArenaProfile() {
  const w = 132;
  const h = 40;
  const min = Math.min(...RATING_HISTORY);
  const max = Math.max(...RATING_HISTORY);
  const pts = RATING_HISTORY.map((v, i) => {
    const x = (i / (RATING_HISTORY.length - 1)) * w;
    const y = h - 4 - ((v - min) / (max - min)) * (h - 8);
    return [x.toFixed(1), y.toFixed(1)];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `M${pts[0][0]},${h} L${pts.map((p) => p.join(",")).join(" L")} L${pts[pts.length - 1][0]},${h} Z`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              Your Rating
            </div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-3xl font-black tabular-nums leading-none text-text-primary">1847</span>
              <span className="mb-0.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-500">
                <ArrowUpRight className="h-3 w-3" /> +42
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-secondary">
              <span>
                GLOBAL RANK <b className="text-text-primary">#12,482</b>
              </span>
              <span className="hidden sm:inline">·</span>
              <span>
                COLLEGE RANK <b className="text-text-primary">#87</b>
              </span>
            </div>
          </div>

          <div className="hidden sm:block">
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
              <defs>
                <linearGradient id="arenaSparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#arenaSparkFill)" />
              <polyline points={line} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="#f97316" />
            </svg>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Contest Streak
          </div>
          <span className="text-xl leading-none">🔥</span>
        </div>
        <div className="mt-2 text-3xl font-black tabular-nums leading-none text-text-primary">
          7 <span className="text-sm font-bold text-text-muted">contests</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-hover">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-600" style={{ width: "70%" }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-text-muted">
          <span>Don&apos;t break it.</span>
          <span>Next milestone → 10</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Live banner ---------------------------------- */

function LiveBanner({ contest }: { contest: Contest }) {
  const cd = useCountdown(contestEndIso(contest));
  return (
    <div
      id="live-arena"
      className="contests-live-glow relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-600/10 via-orange-500/10 to-amber-500/10 p-5 sm:p-6"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/10 blur-2xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="relative flex h-3 w-3 shrink-0 mt-1">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
          </span>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-500">
              <Zap className="h-3 w-3" /> LIVE NOW
            </div>
            <h3 className="mt-2 text-xl font-extrabold leading-tight tracking-tight text-text-primary">
              {contest.name}
            </h3>
            <p className="mt-1 text-xs font-semibold text-text-secondary">
              {seededParticipants(contest.id).toLocaleString("en-IN")} competitors are fighting right now ·{" "}
              {seededProblemCount(contest.id)} problems · {seededDifficulty(contest.id)}
            </p>
            {cd && (
              <p className="mt-2 text-[11px] font-bold text-rose-500">
                {cd.d}d {cd.h}h {cd.m}m {cd.s}s remaining
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-[11px] font-semibold text-text-secondary sm:flex">
            <Users className="h-3.5 w-3.5 text-rose-500" />
            Your rank <b className="text-text-primary">#{seededYourRank(contest.id)}</b>
          </div>
          <Link
            href={`/contests/${contest.id}`}
            className="contests-cta-pulse inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-5 text-[13px] font-extrabold text-white transition-all hover:-translate-y-0.5"
          >
            <Rocket className="h-4 w-4" />
            ENTER CONTEST
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function contestEndIso(c: Contest): string | null {
  if (!c.starttime) return null;
  return new Date(new Date(c.starttime).getTime() + (c.duration ?? 120) * 60000).toISOString();
}

/* ---------------------------------- Event card ---------------------------------- */

function UpcomingCard({ contest, index = 0, now, entered }: { contest: Contest; index?: number; now: number; entered: boolean }) {
  const label = entryLabel(contest, now);
  const participants = seededParticipants(contest.id);
  const capacity = seededCapacity(contest.id);
  const fill = Math.min((participants / capacity) * 100, 100);
  const cd = useCountdown(contest.starttime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-[0_16px_40px_rgba(245,158,11,0.10)]"
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 opacity-60 transition-opacity group-hover:opacity-100" />

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
          <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
          {formatDate(contest.starttime)}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider", label.cls)}>
          {label.ping && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
            </span>
          )}
          {label.text}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-text-primary transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-300">
        {contest.name}
      </h3>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
        <Clock className={cn("h-3.5 w-3.5", cd ? "text-amber-500" : "text-text-muted")} />
        <span className={cn(cd && "text-amber-600 dark:text-amber-300")}>
          {cd ? `Starts in ${cd.d}d ${cd.h}h ${cd.m}m` : formatStartsIn(contest.starttime, now)}
        </span>
        <span className="text-text-muted">·</span>
        <span className="inline-flex items-center gap-1">
          <TimerReset className="h-3 w-3 text-text-muted" />
          {formatDuration(contest.duration)}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {participants.toLocaleString("en-IN")} competitors
          </span>
          <span>{Math.round(fill)}% full</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-card-hover">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r", fill >= 95 ? "from-rose-500 to-orange-500" : "from-amber-400 to-orange-600")}
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Medal className="h-3.5 w-3.5 text-amber-500" />
          {seededPrize(contest.id)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-text-muted" />
          {seededDifficulty(contest.id)}
        </span>
        <span className="rounded-full border border-border bg-card-hover/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
          {CATEGORY_MAP[seededCategory(contest.name)] ?? "Contest"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2.5">
        {entered ? (
          <span className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-bold text-emerald-500">
            <Shield className="h-3.5 w-3.5" />
            You&apos;re in — be ready at the bell
          </span>
        ) : (
          <Link
            href={`/contests/${contest.id}/register`}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(245,158,11,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(245,158,11,0.4)]"
          >
            <Swords className="h-3.5 w-3.5" />
            Register Now
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        <Link
          href={`/contests/${contest.id}`}
          aria-label={`View ${contest.name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-hover/60 text-text-secondary transition-all hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-300"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ---------------------------------- Battle stats ---------------------------------- */

function BattleStat({ stat, index }: { stat: (typeof BATTLE_STATS)[number]; index: number }) {
  const { ref, val } = useCountUp(stat.value, stat.decimals, 1600);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="rounded-2xl border border-border bg-card p-5 text-center"
    >
      <span ref={ref} className="contests-countdown-num text-3xl font-black tabular-nums text-amber-600 dark:text-amber-300">
        {stat.prefix}
        {val.toLocaleString("en-IN", { maximumFractionDigits: stat.decimals })}
        {stat.suffix}
      </span>
      <div className="mt-1 text-xs font-bold uppercase tracking-wider text-text-primary">{stat.label}</div>
      <div className="mt-0.5 text-[10px] text-text-muted">{stat.hint}</div>
    </motion.div>
  );
}

/* ---------------------------------- Leaderboard ---------------------------------- */

function PodiumEntry({ e }: { e: (typeof LEADERBOARD)[number] }) {
  const heights = { 1: "pt-10", 2: "pt-16", 3: "pt-20" };
  const order = { 1: "order-2", 2: "order-1", 3: "order-3" };
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: e.rank * 0.08 }}
      className={cn("flex flex-col items-center", heights[e.rank as 1 | 2 | 3], order[e.rank as 1 | 2 | 3])}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-black text-white shadow-lg",
          e.gradient,
          e.rank === 1 && "contests-rank-1",
        )}
      >
        {e.rank}
      </div>
      <div className="mt-3 text-center">
        <div className="text-[13px] font-extrabold leading-tight text-text-primary">{e.name}</div>
        <div className="text-[11px] text-text-muted">@{e.handle}</div>
        <div className="mt-1 text-xs font-bold tabular-nums text-amber-600 dark:text-amber-300">{e.rating} rating</div>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-card-hover/60 px-2 py-0.5 text-[10px] font-bold text-text-muted">
        <Flame className="h-3 w-3 text-orange-500" /> {e.streak}
      </div>
    </motion.div>
  );
}

function LeaderboardSection() {
  const podium = [LEADERBOARD[1], LEADERBOARD[0], LEADERBOARD[2]];
  return (
    <section className="mt-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/12 to-orange-600/12 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
              <Crown className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">WHO&apos;S ON TOP?</h2>
          </div>
          <p className="mt-1 text-[13px] text-text-secondary">Every rated battle reshuffles the ladder.</p>
        </div>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 transition-colors hover:text-orange-600 dark:text-amber-300 dark:hover:text-orange-300"
        >
          VIEW FULL LEADERBOARD <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid grid-cols-3 items-end rounded-2xl border border-border bg-card px-4 pb-5 pt-2 sm:px-8">
          {podium.map((e) => (
            <PodiumEntry key={e.rank} e={e} />
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-card-hover/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Rank</span>
            <span>Player</span>
            <span>Rating</span>
          </div>
          {LEADERBOARD.slice(3).map((e) => (
            <div key={e.rank} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
              <span className="w-10 text-[11px] font-bold text-text-muted">#{e.rank}</span>
              <span className="flex-1">
                <span className="block text-[13px] font-bold leading-tight text-text-primary">{e.name}</span>
                <span className="text-[11px] text-text-muted">@{e.handle}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tabular-nums text-text-primary">
                {e.rating}
                {e.change === "up" ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Empty state ---------------------------------- */

function EmptyArena({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card-hover text-amber-500 ring-1 ring-border">
        {query ? <Search className="h-6 w-6" /> : <Swords className="h-6 w-6" />}
      </span>
      <h3 className="mt-4 text-base font-extrabold tracking-tight text-text-primary">THE ARENA IS QUIET… FOR NOW.</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
        {query ? "Nothing matches that search. Try clearing it." : "New battles are announced every week — check back soon."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-500/20 dark:text-amber-300"
      >
        <Star className="h-3.5 w-3.5" />
        Reset filters
      </button>
    </div>
  );
}

/* ---------------------------------- Main ---------------------------------- */

function ContestsContent() {
  const toast = useToast();
  const [contests, setContests] = useState<Contest[]>([]);
  const [myContests, setMyContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<StatusTab>("all");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [duration, setDuration] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [all, mine] = await Promise.all([getAllContests(), getMyContests()]);
        if (!cancelled) {
          setContests(all);
          setMyContests(mine);
        }
      } catch {
        if (!cancelled) {
          toast.error({ title: "Failed to Load Contests", description: "Please try again later." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const now = useNow();
  const myIds = useMemo(() => new Set(myContests.map((c) => c.id)), [myContests]);

  const featured = useMemo(() => {
    const live = contests.find((c) => getContestState(c, now) === "live");
    if (live) return live;
    const upcoming = contests
      .filter((c) => getContestState(c, now) === "upcoming")
      .sort((a, b) => new Date(a.starttime!).getTime() - new Date(b.starttime!).getTime());
    return upcoming[0] ?? null;
  }, [contests, now]);

  const liveBanner = useMemo(
    () => contests.find((c) => getContestState(c, now) === "live") ?? null,
    [contests, now],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contests.filter((c) => {
      const state = getContestState(c, now);
      if (tab === "live" && state !== "live") return false;
      if (tab === "upcoming" && state !== "upcoming") return false;
      if (tab === "completed" && state !== "past") return false;
      if (tab === "my" && !myIds.has(c.id)) return false;
      if (category !== "all" && seededCategory(c.name) !== category) return false;
      if (difficulty !== "all" && seededDifficulty(c.id) !== difficulty) return false;
      if (duration !== "all") {
        const d = c.duration ?? 120;
        if (duration === "short" && !(d < 60)) return false;
        if (duration === "medium" && !(d >= 60 && d <= 180)) return false;
        if (duration === "long" && !(d > 180)) return false;
      }
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contests, query, tab, category, difficulty, duration, myIds, now]);

  const upcoming = filtered.filter((c) => getContestState(c, now) === "upcoming");
  const past = filtered.filter((c) => getContestState(c, now) === "past");

  const resetFilters = () => {
    setQuery("");
    setTab("all");
    setCategory("all");
    setDifficulty("all");
    setDuration("all");
  };

  const showGrid = upcoming.length > 0;
  const showTable = past.length > 0;

  if (loading) {
    return (
      <AppLayout>
        <div className={LAYOUT_CLASSES}>
          <div className="pt-8" />
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card" />
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-60 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="contests-page-shell contests-ambient relative min-h-screen">
        <div className={LAYOUT_CLASSES}>
          <div className="pt-8" />
          <ContestsHero featured={featured} totalCount={contests.length} query={query} onSearch={setQuery} />

          {/* Arena profile */}
          <div className="mt-8">
            <ArenaProfile />
          </div>

          {/* Filters */}
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="contests-segmented flex flex-wrap items-center gap-1 rounded-xl bg-card-hover/80 p-1">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[11px] font-extrabold tracking-wide transition-all",
                    tab === t.value
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_4px_14px_rgba(245,158,11,0.35)]"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ArenaDropdown
                label="Category"
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  document.getElementById("contest-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]}
              />
              <ArenaDropdown
                label="Difficulty"
                value={difficulty}
                onChange={setDifficulty}
                options={[{ value: "all", label: "Any level" }, ...DIFFICULTY_OPTIONS.map((d) => ({ value: d, label: d }))]}
              />
              <ArenaDropdown
                label="Duration"
                value={duration}
                onChange={setDuration}
                options={[
                  { value: "all", label: "Any duration" },
                  { value: "short", label: "Under 60 min" },
                  { value: "medium", label: "60–180 min" },
                  { value: "long", label: "Over 180 min" },
                ]}
              />
            </div>
          </div>

          {/* Live banner */}
          {liveBanner && (
            <div className="mt-8">
              <LiveBanner contest={liveBanner} />
            </div>
          )}

          {/* Upcoming grid */}
          <section id="contest-grid" className="mt-12 scroll-mt-24">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/12 to-orange-600/12 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                    {tab === "my" ? "Your Contests" : "Upcoming Battles"}
                  </h2>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">
                  {tab === "my"
                    ? "The fights you've entered — don't be late."
                    : "Register ahead — doors close when the bell rings."}
                </p>
              </div>
              <span className="text-xs font-semibold text-text-muted">{upcoming.length} upcoming</span>
            </div>

            {showGrid ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((c, i) => (
                  <UpcomingCard key={c.id} contest={c} index={i} now={now} entered={myIds.has(c.id)} />
                ))}
              </div>
            ) : (
              <EmptyArena query={query} onReset={resetFilters} />
            )}
          </section>

          {/* Completed table */}
          {showTable && (
            <section className="mt-14">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/12 to-orange-600/12 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">Completed Battles</h2>
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    Relive the battles — view problems, results and standings.
                  </p>
                </div>
                <span className="text-xs font-semibold text-text-muted">{past.length} completed</span>
              </div>

              <div className="contests-table overflow-hidden rounded-2xl border border-border bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-card-hover/60">
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted sm:px-5">
                          Contest
                        </th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Date
                        </th>
                        <th className="hidden px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted sm:table-cell">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Ended
                        </th>
                        <th className="w-14 px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {past.map((c) => (
                        <tr key={c.id} className="group border-t border-border transition-colors hover:bg-card-hover/50">
                          <td className="px-4 py-3.5 sm:px-5">
                            <Link
                              href={`/contests/${c.id}`}
                              className="block text-[13px] font-semibold leading-tight text-text-primary transition-colors hover:text-amber-600 dark:hover:text-amber-300"
                            >
                              {c.name}
                            </Link>
                            <span className="mt-0.5 block text-[11px] text-text-muted">
                              {formatDuration(c.duration)} · {seededDifficulty(c.id)} ·{" "}
                              {seededParticipants(c.id).toLocaleString("en-IN")} fought
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-text-secondary">{formatDate(c.starttime)}</td>
                          <td className="hidden px-4 py-3.5 text-xs text-text-secondary sm:table-cell">
                            {formatDuration(c.duration)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-[11px] font-semibold text-text-muted">
                            {formatStartsIn(c.starttime, now)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Link
                              href={`/contests/${c.id}`}
                              aria-label={`View ${c.name}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card-hover/60 text-text-secondary transition-all hover:border-amber-500/40 hover:bg-gradient-to-br hover:from-amber-500 hover:to-orange-600 hover:text-white"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Battle stats */}
          <section className="mt-14">
            <div className="mb-6 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/12 to-orange-600/12 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
                <Zap className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">THE BATTLE IS ON</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {BATTLE_STATS.map((s, i) => (
                <BattleStat key={s.label} stat={s} index={i} />
              ))}
            </div>
          </section>

          {/* Categories */}
          <section className="mt-14">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/12 to-orange-600/12 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
                    <Target className="h-4 w-4" />
                  </span>
                  <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">Pick Your Battle</h2>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">Thirteen arenas — find the one you want to conquer.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      document.getElementById("contest-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-[0_12px_30px_rgba(245,158,11,0.10)]"
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white", cat.gradient)}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-text-primary transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-300">
                        {cat.label}
                      </span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Battle arena
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Leaderboard */}
          <LeaderboardSection />
        </div>
      </div>
    </AppLayout>
  );
}

export default function ContestsLanding() {
  return <ContestsContent />;
}