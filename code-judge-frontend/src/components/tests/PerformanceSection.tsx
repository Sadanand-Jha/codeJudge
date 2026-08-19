"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ClipboardCheck,
  Code2,
  Trophy,
  Target,
  Gauge,
  Flame,
  Medal,
  Percent,
} from "lucide-react";
import { PERFORMANCE_STATS, PERFORMANCE_TREND } from "./mockData";
import { SectionHeading } from "./ui";
import { cn } from "@/lib/helpers";

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[15px] font-extrabold tabular-nums leading-none tracking-tight text-text-primary">
          {value}
        </div>
        <div className="mt-1 truncate text-[10px] font-medium text-text-muted">{label}</div>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2.5 shadow-2xl backdrop-blur-xl">
      <p className="text-[11px] font-bold text-text-primary">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-bold tabular-nums text-text-primary">{p.value}%</span>
        </p>
      ))}
    </div>
  );
};

/**
 * Your Performance — compact personal analytics. Stat tiles + a two-series
 * trend chart (score & accuracy) so the hub becomes personalized once a
 * student has any activity.
 */
export function PerformanceSection() {
  const s = PERFORMANCE_STATS;

  const tiles = [
    { icon: ClipboardCheck, label: "Tests attempted", value: String(s.testsAttempted), accent: "bg-pink-500/12 text-pink-500 dark:text-ai-accent" },
    { icon: Code2, label: "Problems solved", value: String(s.problemsSolved), accent: "bg-blue-500/12 text-blue-500 dark:text-blue-300" },
    { icon: Trophy, label: "Contests participated", value: String(s.contestsParticipated), accent: "bg-amber-500/12 text-amber-500 dark:text-amber-300" },
    { icon: Target, label: "Average accuracy", value: `${s.avgAccuracy}%`, accent: "bg-emerald-500/12 text-emerald-500" },
    { icon: Gauge, label: "Average score", value: `${s.avgScore}%`, accent: "bg-violet-500/12 text-violet-500 dark:text-violet-300" },
    { icon: Flame, label: "Current streak", value: `${s.currentStreak} days`, accent: "bg-orange-500/12 text-orange-500" },
    { icon: Medal, label: "Best rank", value: `#${s.bestRank.toLocaleString("en-IN")}`, accent: "bg-cyan-500/12 text-cyan-500 dark:text-cyan-300" },
    { icon: Percent, label: "Percentile", value: `${s.percentile}th`, accent: "bg-fuchsia-500/12 text-fuchsia-500 dark:text-fuchsia-300" },
  ];

  return (
    <section>
      <SectionHeading
        title="Your Performance"
        subtitle="A live snapshot of your practice across tests, problems and contests."
        href="/analytics"
        icon={<Gauge className="h-4.5 w-4.5" />}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        {/* Stat tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
          {tiles.map((t, i) => (
            <StatTile key={t.label} {...t} index={i} />
          ))}
        </div>

        {/* Trend chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5"
        >
          <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-violet-500/8 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-extrabold tracking-tight text-text-primary">Score & Accuracy Trend</h3>
              <p className="mt-0.5 text-[10px] text-text-muted">Last 7 months · normalized %</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-pink-500" /> Score
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-violet-500" /> Accuracy
              </span>
            </div>
          </div>

          <div className="relative mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PERFORMANCE_TREND} margin={{ top: 5, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="perfAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[40, 100]}
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-hover)" }} />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke="#ec4899"
                  strokeWidth={2.5}
                  fill="url(#perfScore)"
                  dot={{ r: 2.5, fill: "#ec4899", strokeWidth: 0 }}
                  activeDot={{ r: 4.5, fill: "#ec4899" }}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  name="Accuracy"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#perfAcc)"
                  dot={{ r: 2.5, fill: "#8b5cf6", strokeWidth: 0 }}
                  activeDot={{ r: 4.5, fill: "#8b5cf6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>
  );
}