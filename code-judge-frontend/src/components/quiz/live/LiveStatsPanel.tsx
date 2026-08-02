"use client";

import { motion } from "framer-motion";
import { Users, Activity, CheckCircle2, TrendingUp, Target, Clock } from "lucide-react";
import type { LiveStats } from "@/types/liveAssessment";
import { formatDuration } from "@/lib/liveAssessmentHelpers";

interface LiveStatsPanelProps {
  stats: LiveStats;
  className?: string;
}

const STAT_ITEMS = [
  { key: "studentsJoined", label: "Students Joined", icon: Users, color: "#EC4899" },
  { key: "currentlyActive", label: "Currently Active", icon: Activity, color: "#3B82F6" },
  { key: "submitted", label: "Submitted", icon: CheckCircle2, color: "#22C55E" },
  { key: "averageProgress", label: "Average Progress", icon: TrendingUp, color: "#F472B6", suffix: "%" },
  { key: "averageScore", label: "Average Score", icon: Target, color: "#F59E0B" },
  { key: "averageTime", label: "Average Time", icon: Clock, color: "#8B5CF6", format: true },
] as const;

export function LiveStatsPanel({ stats, className = "" }: LiveStatsPanelProps) {
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
      {STAT_ITEMS.map((item, i) => {
        const Icon = item.icon;
        const raw = stats[item.key as keyof LiveStats] as number;
        const value =
          "format" in item && item.format
            ? formatDuration(raw)
            : "suffix" in item && item.suffix
            ? `${raw}${item.suffix}`
            : String(raw);

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/[0.06] bg-[#171923] p-3 hover:border-[#EC4899]/20 transition-all"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                <Icon className="w-3 h-3" style={{ color: item.color }} />
              </div>
              <span className="text-[9px] font-medium text-[#A1A1AA] uppercase tracking-wide leading-tight">{item.label}</span>
            </div>
            <p className="text-lg font-bold text-white tabular-nums">{value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

export default LiveStatsPanel;
