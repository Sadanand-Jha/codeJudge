"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Zap, Gem, Target, Users, Rocket, Lock, Sparkles, Star, Crown } from "lucide-react";
import { getUserInfo } from "@/services/user";
import { cn } from "@/lib/helpers";
import ProfileSectionHeader from "./ProfileSectionHeader";

interface AchievementDef {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  glow: string;
  /** Minimum rating required (rating-based achievements). */
  minRating?: number;
  /** Some achievements depend on data not yet exposed by the API. */
  unlocked?: boolean;
}

const RATING_TIERS = [
  { minRating: 1200, title: "Rising Coder", desc: "Reached 1200 rating", icon: Rocket, gradient: "from-[#22C55E] to-[#10B981]", glow: "rgba(34,197,94,0.2)" },
  { minRating: 1400, title: "Specialist", desc: "Reached 1400 rating", icon: Star, gradient: "from-[#F59E0B] to-[#F97316]", glow: "rgba(245,158,11,0.2)" },
  { minRating: 1600, title: "Expert", desc: "Reached 1600 rating", icon: Target, gradient: "from-[#3B82F6] to-[#2563EB]", glow: "rgba(59,130,246,0.2)" },
  { minRating: 1900, title: "Master", desc: "Reached 1900 rating", icon: Gem, gradient: "from-[#7C3AED] to-[#6D28D9]", glow: "rgba(124,58,237,0.2)" },
  { minRating: 2100, title: "Grandmaster", desc: "Reached 2100 rating", icon: Crown, gradient: "from-[#FBBF24] to-[#DC2626]", glow: "rgba(251,191,36,0.2)" },
];

const STAT_ACHIEVEMENTS: AchievementDef[] = [
  { title: "30 Day Streak", desc: "Solved problems 30 days in a row", icon: Flame, gradient: "from-[#F59E0B] to-[#DC2626]", glow: "rgba(245,158,11,0.2)", unlocked: false },
  { title: "100 Problems", desc: "Solved 100 problems total", icon: Trophy, gradient: "from-[#FBBF24] to-[#F59E0B]", glow: "rgba(251,191,36,0.2)", unlocked: false },
  { title: "Speed Coder", desc: "Solved a problem in under 5 minutes", icon: Zap, gradient: "from-[#22C55E] to-[#16A34A]", glow: "rgba(34,197,94,0.2)", unlocked: false },
  { title: "Contest Winner", desc: "Won a weekly contest", icon: Gem, gradient: "from-[#EC4899] to-[#7C3AED]", glow: "rgba(236,72,153,0.2)", unlocked: false },
  { title: "Community Contributor", desc: "Made 10 community contributions", icon: Users, gradient: "from-[#3B82F6] to-[#06B6D4]", glow: "rgba(59,130,246,0.2)", unlocked: false },
];

export default function AchievementsPage() {
  const [rating, setRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserInfo()
      .then((u) => setRating(u.rating ?? 0))
      .catch(() => setRating(0))
      .finally(() => setLoading(false));
  }, []);

  const ratingAchievements = useMemo(
    () =>
      RATING_TIERS.map((t) => ({
        ...t,
        unlocked: rating >= t.minRating,
      })),
    [rating]
  );

  const unlockedCount = ratingAchievements.filter((a) => a.unlocked).length + STAT_ACHIEVEMENTS.filter((a) => a.unlocked).length;
  const total = ratingAchievements.length + STAT_ACHIEVEMENTS.length;

  // Progress toward the next rating tier (for the progress bar)
  const nextTier = ratingAchievements.find((a) => !a.unlocked);
  const previousTier = [...ratingAchievements].reverse().find((a) => a.unlocked);
  const progressPct = nextTier
    ? Math.max(0, Math.min(100, ((rating - (previousTier?.minRating ?? 0)) / (nextTier.minRating - (previousTier?.minRating ?? 0))) * 100))
    : 100;

  const cards = [...ratingAchievements, ...STAT_ACHIEVEMENTS];

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <ProfileSectionHeader
          title="Achievements"
          description="Milestones you unlock as you grow as a competitive programmer."
          badge={
            <span className="rounded-full bg-[#FBBF24]/10 px-2.5 py-1 text-[10px] font-bold text-[#FBBF24]">
              {unlockedCount}/{total} unlocked
            </span>
          }
        />

        {/* Rating progress */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#7C3AED]/10 blur-3xl" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Rating progress</p>
                  <p className="text-xs text-text-muted">
                    {loading ? "Loading..." : nextTier ? `${nextTier.title} unlocks at ${nextTier.minRating} rating` : "You reached the top rating tier!"}
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold text-text-primary">{rating}</span>
            </div>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-card-hover">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            {nextTier && (
              <p className="mt-2 text-right text-[10px] font-medium text-text-muted">
                {Math.round(progressPct)}% of the way to {nextTier.title}
              </p>
            )}
          </div>
        </motion.div>

        {/* Achievement grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((a, i) => {
            const Icon = a.icon;
            const unlocked = Boolean(a.unlocked);
            return (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                whileHover={unlocked ? { y: -4 } : undefined}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-5 text-center transition-colors",
                  unlocked
                    ? "border-border bg-card"
                    : "border-border bg-card/50"
                )}
                style={unlocked ? { boxShadow: `0 0 24px ${a.glow}` } : undefined}
              >
                {unlocked ? (
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: a.glow }} />
                ) : (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
                )}

                <div className="relative z-10">
                  <div
                    className={cn(
                      "mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-all",
                      unlocked
                        ? `bg-gradient-to-br ${a.gradient} shadow-lg`
                        : "bg-card-hover"
                    )}
                  >
                    <Icon
                      className={cn("h-5 w-5", unlocked ? "text-white" : "text-text-muted")}
                    />
                  </div>

                  <p className={cn("mt-3 text-xs font-semibold", unlocked ? "text-text-primary" : "text-text-muted")}>
                    {a.title}
                  </p>
                  <p className={cn("mt-1 text-[10px] leading-relaxed", unlocked ? "text-text-secondary" : "text-text-muted")}>
                    {a.desc}
                  </p>

                  <span
                    className={cn(
                      "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      unlocked
                        ? "bg-gradient-to-r from-[#EC4899]/15 to-[#7C3AED]/15 text-[#EC4899]"
                        : "border border-border bg-card-hover text-text-muted"
                    )}
                  >
                    {unlocked ? (
                      <><Sparkles className="h-2.5 w-2.5" /> Unlocked</>
                    ) : (
                      <><Lock className="h-2.5 w-2.5" /> Locked</>
                    )}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
