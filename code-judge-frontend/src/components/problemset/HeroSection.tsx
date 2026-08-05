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
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 mb-8">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-secondary/5 rounded-full blur-[100px]" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Title + Subtitle */}
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold text-text-primary tracking-tight mb-2">Problems</h1>
          <p className="text-sm text-text-secondary leading-relaxed">
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
                className="bg-card-hover border border-border rounded-xl px-4 py-3 min-w-[120px]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-text-primary">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}