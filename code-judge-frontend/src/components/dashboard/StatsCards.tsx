"use client";

import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Trophy, Users } from "lucide-react";

interface StatsCardsProps {
  solved?: number;
  currentRating?: number;
  maxRating?: number;
  contributions?: number;
}

export default function StatsCards({
  solved = 127,
  currentRating = 1450,
  maxRating = 1600,
  contributions = 23,
}: StatsCardsProps) {
  const stats = [
    {
      label: "Problems Solved",
      value: solved,
      icon: CheckCircle2,
      gradient: "from-[#22C55E] to-[#16A34A]",
      subtext: "Keep going strong!",
    },
    {
      label: "Current Rating",
      value: currentRating,
      icon: TrendingUp,
      gradient: "from-[#7C3AED] to-[#6D28D9]",
      subtext: "+48 this month",
      trend: "+48",
    },
    {
      label: "Max Rating",
      value: maxRating,
      icon: Trophy,
      gradient: "from-[#FBBF24] to-[#F59E0B]",
      subtext: "Personal Best",
    },
    {
      label: "Contributions",
      value: contributions,
      icon: Users,
      gradient: "from-[#3B82F6] to-[#2563EB]",
      subtext: "Community Contributions",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111827] p-5 transition-colors hover:border-white/[0.12]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {stat.trend && (
                <span className="text-[10px] font-semibold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full">
                  {stat.trend}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
            <p className="text-xs font-medium text-[#9CA3AF] mt-1">{stat.label}</p>
            <p className="text-[10px] text-[#6B7280] mt-0.5">{stat.subtext}</p>
          </motion.div>
        );
      })}
    </div>
  );
}