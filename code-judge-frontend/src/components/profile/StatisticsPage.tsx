"use client";

import { motion } from "framer-motion";
import { BarChart3, Target, Percent, Zap } from "lucide-react";
import {
  StatsCards,
  RatingHistory,
  TopicMastery,
  ActivityHeatmap,
  RecentContests,
  RecentSubmissions,
  StreakWidget,
} from "@/components/dashboard";
import ProfileSectionHeader from "./ProfileSectionHeader";

const DIFFICULTY = [
  { label: "Easy", solved: 74, total: 90, color: "#22C55E" },
  { label: "Medium", solved: 41, total: 80, color: "#F59E0B" },
  { label: "Hard", solved: 12, total: 50, color: "#EF4444" },
];

export default function StatisticsPage() {
  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <ProfileSectionHeader
          title="Statistics"
          description="A deep dive into your competitive programming performance."
          icon={BarChart3}
          iconTone="from-[#06B6D4] to-[#3B82F6]"
        />

        <StatsCards solved={127} currentRating={1450} maxRating={1600} contributions={23} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><RatingHistory /></div>
          <div className="space-y-6"><StreakWidget streak={47} goal={100} /></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><TopicMastery /></div>
          <div className="lg:col-span-2"><ActivityHeatmap /></div>
        </div>

        {/* Difficulty + Accuracy + Speed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DifficultyCard />
          <AccuracyCard />
          <SpeedCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentContests />
          <RecentSubmissions />
        </div>
      </div>
    </div>
  );
}

function DifficultyCard() {
  const total = DIFFICULTY.reduce((s, d) => s + d.total, 0);
  const solvedTotal = DIFFICULTY.reduce((s, d) => s + d.solved, 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444]">
          <Target className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Difficulty Distribution</h3>
          <p className="text-xs text-text-muted">{solvedTotal} of {total} solved</p>
        </div>
      </div>
      <div className="space-y-4">
        {DIFFICULTY.map((d) => {
          const pct = Math.round((d.solved / d.total) * 100);
          return (
            <div key={d.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">{d.label}</span>
                <span className="text-[10px] text-text-muted">{d.solved}/{d.total}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-card-hover">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: d.color }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function AccuracyCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#10B981]">
          <Percent className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Accuracy</h3>
          <p className="text-xs text-text-muted">Submission success rate</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#22C55E"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 40}
              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
              whileInView={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - 0.72) }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 6px rgba(34,197,94,0.4))" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-text-primary">72%</span>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-[10px] text-text-muted">Accepted</p>
            <p className="text-sm font-semibold text-text-primary">1,284</p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted">Total</p>
            <p className="text-sm font-semibold text-text-primary">1,783</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SpeedCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#7C3AED]">
          <Zap className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Contest Performance</h3>
          <p className="text-xs text-text-muted">Summary across rated contests</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatMini label="Contests" value="12" tone="text-[#FBBF24]" />
        <StatMini label="Best Rank" value="#189" tone="text-[#22C55E]" />
        <StatMini label="Avg. Solved" value="3.4" tone="text-[#3B82F6]" />
      </div>
    </motion.div>
  );
}

function StatMini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card-hover/60 p-3 text-center">
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-text-muted">{label}</p>
    </div>
  );
}
