"use client";

import { motion } from "framer-motion";
import { Code2, Trophy, BookOpen, TrendingUp } from "lucide-react";

const stats = [
  { label: "Problems", value: "12,431", icon: Code2 },
  { label: "Contests", value: "1,204", icon: Trophy },
  { label: "Categories", value: "8", icon: BookOpen },
  { label: "Avg Solve Rate", value: "54%", icon: TrendingUp },
];

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-[#111827] via-[#111827] to-[#0F1119] p-8 mb-8">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#7C3AED]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Title + Subtitle */}
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Problems</h1>
          <p className="text-sm text-[#9CA3AF] leading-relaxed">
            Discover thousands of coding challenges from beginner to expert. Improve your algorithmic thinking one problem at a time.
          </p>
        </div>

        {/* Right: Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[120px]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-[#7C3AED]" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}