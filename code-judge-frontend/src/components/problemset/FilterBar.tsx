"use client";

import { motion } from "framer-motion";
import { Bookmark, Flame, Star, Clock, Building2, Sparkles } from "lucide-react";

const quickFilters = [
  { label: "All", value: "all" },
  { label: "Solved", value: "solved", icon: Star },
  { label: "Attempted", value: "attempted", icon: Clock },
  { label: "Unsolved", value: "unsolved" },
  { label: "Bookmarked", value: "bookmarked", icon: Bookmark },
  { label: "Daily Challenge", value: "daily", icon: Flame },
  { label: "Company Questions", value: "company", icon: Building2 },
  { label: "Recommended", value: "recommended", icon: Sparkles },
];

const difficultyLevels = [
  { label: "800", color: "#22C55E", min: 800, max: 899 },
  { label: "1000", color: "#3B82F6", min: 1000, max: 1199 },
  { label: "1200", color: "#7C3AED", min: 1200, max: 1399 },
  { label: "1400", color: "#F59E0B", min: 1400, max: 1599 },
  { label: "1600", color: "#F97316", min: 1600, max: 1799 },
  { label: "1800", color: "#EF4444", min: 1800, max: 1999 },
  { label: "2000", color: "#DC2626", min: 2000, max: 2199 },
  { label: "2200+", color: "#991B1B", min: 2200, max: 9999 },
];

const topics = [
  "Arrays", "DP", "Graphs", "Trees", "Greedy", "Math",
  "Binary Search", "Strings", "Segment Tree", "Bitmask",
  "Implementation", "Sorting", "Interactive", "Geometry",
];

interface FilterBarProps {
  activeQuickFilter: string;
  activeDifficulty: number | null;
  activeTags: string[];
  onQuickFilterChange: (value: string) => void;
  onDifficultyChange: (min: number | null) => void;
  onTagToggle: (tag: string) => void;
}

export default function FilterBar({
  activeQuickFilter,
  activeDifficulty,
  activeTags,
  onQuickFilterChange,
  onDifficultyChange,
  onTagToggle,
}: FilterBarProps) {
  return (
    <div className="space-y-5 mb-8">
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((f) => {
          const isActive = activeQuickFilter === f.value;
          const Icon = f.icon;
          return (
            <button
              key={f.value}
              onClick={() => onQuickFilterChange(f.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                isActive
                  ? "bg-[#7C3AED] text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                  : "bg-white/[0.04] text-[#9CA3AF] border border-white/[0.06] hover:border-white/[0.12] hover:text-white"
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Difficulty Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onDifficultyChange(null)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
            activeDifficulty === null
              ? "bg-white/[0.08] text-white border border-white/[0.12]"
              : "bg-white/[0.04] text-[#9CA3AF] border border-white/[0.06] hover:border-white/[0.12]"
          }`}
        >
          All Ratings
        </button>
        {difficultyLevels.map((d) => {
          const isActive = activeDifficulty === d.min;
          return (
            <button
              key={d.label}
              onClick={() => onDifficultyChange(d.min)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                isActive
                  ? "bg-white/[0.08] shadow-[0_0_10px_rgba(124,58,237,0.15)]"
                  : "bg-white/[0.04] hover:bg-white/[0.06]"
              }`}
              style={{
                color: d.color,
                borderColor: isActive ? d.color + "40" : "rgba(255,255,255,0.06)",
                textShadow: isActive ? `0 0 8px ${d.color}40` : "none",
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Topic Tags */}
      <div className="flex flex-wrap gap-2">
        {topics.map((tag) => {
          const isActive = activeTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                isActive
                  ? "bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/30 shadow-[0_0_10px_rgba(124,58,237,0.1)]"
                  : "bg-white/[0.04] text-[#9CA3AF] border-white/[0.06] hover:border-white/[0.12] hover:text-white"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}