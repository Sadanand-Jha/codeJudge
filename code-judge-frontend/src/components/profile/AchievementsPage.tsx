"use client";

import { motion } from "framer-motion";
import {
  Award,
  CalendarCheck2,
  Check,
  Code2,
  Crown,
  Flag,
  Flame,
  Footprints,
  Layers,
  Lock,
  Medal,
  MessageSquare,
  Moon,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import ProfileSectionHeader from "./ProfileSectionHeader";

interface AchievementDef {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "unlocked" | "progress" | "locked";
  current?: number;
  target?: number;
  unit?: string;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { title: "First Step", desc: "Complete your first assessment", icon: Footprints, status: "unlocked" },
  { title: "Getting Started", desc: "Solve 5 coding problems", icon: Code2, status: "progress", current: 3, target: 5, unit: "problems" },
  { title: "On a Roll", desc: "Maintain a 3-day activity streak", icon: Flame, status: "progress", current: 2, target: 3, unit: "days" },
  { title: "Rising Coder", desc: "Solve 25 coding problems", icon: TrendingUp, status: "progress", current: 12, target: 25, unit: "problems" },
  { title: "Problem Solver", desc: "Solve 50 coding problems", icon: Layers, status: "locked", current: 0, target: 50, unit: "problems" },
  { title: "Streak Master", desc: "Maintain a 7-day activity streak", icon: CalendarCheck2, status: "locked", current: 0, target: 7, unit: "days" },
  { title: "Night Owl", desc: "Solve 3 problems after midnight", icon: Moon, status: "locked", current: 0, target: 3, unit: "problems" },
  { title: "Speed Runner", desc: "Solve a problem in under 5 minutes", icon: Zap, status: "locked" },
  { title: "Community Voice", desc: "Post 5 comments on discussions", icon: MessageSquare, status: "locked", current: 0, target: 5, unit: "comments" },
  { title: "Contest Contender", desc: "Finish your first contest", icon: Flag, status: "locked" },
  { title: "Centurion", desc: "Solve 100 coding problems", icon: Crown, status: "locked", current: 0, target: 100, unit: "problems" },
  { title: "Champion", desc: "Win your first contest", icon: Medal, status: "locked" },
];

export default function AchievementsPage() {
  const unlockedCount = ACHIEVEMENTS.filter(
    (a) => a.status === "unlocked" || (a.status === "progress" && (a.current ?? 0) > 0)
  ).length;

  return (
    <div className="relative min-h-full bg-[#FAF8FF] px-4 py-6 sm:px-6 dark:bg-[#09090B]">
      {/* Soft ambient lavender glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden">
        <div className="absolute left-1/2 top-[-90px] h-60 w-[30rem] -translate-x-1/2 rounded-full bg-[#A78BFA]/15 blur-3xl dark:bg-[#8B5CF6]/10" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-6">
        <ProfileSectionHeader
          title="Achievements"
          description="Milestones you've unlocked along your journey"
          icon={Award}
          iconTone="from-[#A78BFA] to-[#8B5CF6]"
          badge={
            <span className="rounded-full border border-[#E9DFFC] bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-[#7C3AED] dark:border-[#292235] dark:bg-[#111116] dark:text-[#A78BFA]">
              {unlockedCount} of {ACHIEVEMENTS.length} unlocked
            </span>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ACHIEVEMENTS.map((a, i) => {
            const Icon = a.icon;
            const pct =
              a.status === "unlocked"
                ? 100
                : a.target
                  ? Math.round(((a.current ?? 0) / a.target) * 100)
                  : 0;
            return (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 500, damping: 32, mass: 0.6 } }}
                className={cn(
                  "group relative flex flex-col rounded-2xl border p-5 transition-[border-color,box-shadow] duration-200",
                  a.status === "locked"
                    ? "border-[#E9DFFC]/70 bg-white dark:border-[#292235]/60 dark:bg-[#111116]"
                    : "border-[#E9DFFC] bg-white shadow-[0_1px_2px_rgba(139,92,246,0.05),0_8px_24px_rgba(139,92,246,0.07)] dark:border-[#292235] dark:bg-[#111116] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_10px_28px_rgba(0,0,0,0.45)]",
                  a.status === "locked"
                    ? "hover:border-[#C4B5FD] dark:hover:border-[#3B2E63] dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                    : "hover:border-[#C4B5FD] hover:shadow-[0_1px_2px_rgba(139,92,246,0.06),0_14px_34px_rgba(139,92,246,0.14)] dark:hover:border-[#4C3D78] dark:hover:shadow-[0_14px_36px_rgba(0,0,0,0.5),0_0_28px_rgba(139,92,246,0.16)]"
                )}
              >
                {a.status === "unlocked" && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-2xl bg-gradient-to-b from-[#A78BFA]/15 to-transparent dark:from-[#A78BFA]/10" />
                )}

                <div className={cn("relative flex flex-col", a.status === "locked" && "opacity-75 transition-opacity duration-200 group-hover:opacity-100 dark:opacity-70")}>

                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-[1.06]",
                    a.status === "unlocked" &&
                      "bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6] shadow-[0_4px_16px_rgba(139,92,246,0.35)] dark:shadow-[0_4px_20px_rgba(139,92,246,0.4)]",
                    a.status === "progress" && "bg-[#A78BFA]/10 dark:bg-[#A78BFA]/10",
                    a.status === "locked" && "bg-[#E9DFFC]/60 dark:bg-white/[0.04]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      a.status === "unlocked" && "text-white",
                      a.status === "progress" && "text-[#7C3AED] dark:text-[#A78BFA]",
                      a.status === "locked" && "text-[#A78BFA]/60 dark:text-[#A78BFA]/45"
                    )}
                  />
                </div>

                <p className={cn("mt-3.5 text-sm font-semibold tracking-tight", a.status === "locked" ? "text-text-secondary" : "text-text-primary")}>
                  {a.title}
                </p>
                <p className={cn("mt-1 text-xs leading-relaxed", a.status === "locked" ? "text-text-muted" : "text-text-secondary")}>
                  {a.desc}
                </p>

                <div className="mt-auto pt-4">
                  {a.status === "unlocked" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6]/10 px-2.5 py-1 text-[10px] font-semibold text-[#7C3AED] dark:bg-[#A78BFA]/10 dark:text-[#A78BFA]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Unlocked
                    </span>
                  )}

                  {a.status === "progress" && (
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] font-semibold text-text-primary">
                          {a.current}
                          <span className="text-text-muted"> / {a.target}{a.unit ? ` ${a.unit}` : ""}</span>
                        </span>
                        <span className="text-[10px] font-medium text-[#7C3AED] dark:text-[#A78BFA]">{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E9DFFC] dark:bg-white/[0.06]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6]"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.1 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  )}

                  {a.status === "locked" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E9DFFC] px-2.5 py-1 text-[10px] font-medium text-text-muted dark:border-[#292235]">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}