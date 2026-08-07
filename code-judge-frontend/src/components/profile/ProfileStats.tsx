"use client";

import { motion, type Variants } from "framer-motion";
import { CheckCircle2, TrendingUp, Trophy, GitPullRequest } from "lucide-react";

interface ProfileStatsProps {
  username: string;
  email: string;
  solved: number;
  rank: number;
  contributions: number;
  rating?: number;
  maxRating?: number;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function ProfileStats({ username, email, solved, rank, contributions, rating = 0, maxRating = 0 }: ProfileStatsProps) {
  const stats = [
    { label: "Problems Solved", value: solved, icon: CheckCircle2 },
    { label: "Current Rating", value: rating || "—", icon: TrendingUp },
    { label: "Max Rating", value: maxRating || "—", icon: Trophy },
    { label: "Contributions", value: contributions, icon: GitPullRequest },
  ];

  return (
    <>
      {/* Profile Header — Full Width */}
      <motion.div
        variants={cardVariants}
        className="md:col-span-12 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl"
      >
        <div className="flex items-center gap-5">
          {/* Avatar with gradient */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {username?.charAt(0).toUpperCase() || "U"}
          </div>
          {/* Username + Email */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-100 tracking-tight">{username || "User"}</h2>
              {/* Glowing Specialist badge */}
              <span className="text-[10px] font-medium uppercase tracking-widest text-cyan-400 px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
                Specialist
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{email}</p>
          </div>
        </div>
      </motion.div>

      {/* Four Stat Cards */}
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            variants={cardVariants}
            whileHover={{ y: -4 }}
            className="md:col-span-3 bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl transition-colors hover:border-cyan-500/30"
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <div className="w-8 h-8 rounded-lg border border-slate-700/50 bg-slate-700/30 flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-slate-100">{stat.value}</p>
          </motion.div>
        );
      })}
    </>
  );
}