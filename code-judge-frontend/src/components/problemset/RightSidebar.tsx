"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Flame, Clock, ArrowRight, CheckCircle, Lock } from "lucide-react";

const roadmapSteps = [
  { name: "Arrays", status: "completed" as const },
  { name: "Binary Search", status: "completed" as const },
  { name: "Greedy", status: "current" as const },
  { name: "DP", status: "locked" as const },
  { name: "Graphs", status: "locked" as const },
];

const recommended = [
  { id: "CF1234", title: "Two Sum", rating: 1200 },
  { id: "CF1235", title: "Maximum Subarray", rating: 1400 },
  { id: "CF1236", title: "Merge Intervals", rating: 1600 },
  { id: "CF1237", title: "Binary Tree Level Order", rating: 1500 },
  { id: "CF1238", title: "Dijkstra's Algorithm", rating: 1800 },
];

function RoadmapIcon({ status }: { status: "completed" | "current" | "locked" }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-[#22C55E]" />;
  if (status === "current") return <div className="w-4 h-4 rounded-full bg-[#7C3AED] animate-pulse" />;
  return <Lock className="w-4 h-4 text-[#6B7280]" />;
}

export default function RightSidebar() {
  return (
    <div className="space-y-5">
      {/* Daily Challenge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#7C3AED]/20 to-[#3B82F6]/10 p-5"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/10 rounded-full blur-[60px]" />
        <div className="relative z-10">
          <p className="text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF] mb-2">Daily Challenge</p>
          <p className="text-sm font-semibold text-white mb-1">Two Sum II</p>
          <p className="text-[10px] text-[#9CA3AF] mb-4">Rating 1500 · Medium</p>
          <Link
            href="/problems/CF1234/editor"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
          >
            Solve <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </motion.div>

      {/* Current Streak */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5 text-center"
      >
        <div className="relative w-20 h-20 mx-auto mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <motion.circle
              cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={251.2}
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 * 0.52 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.4))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="w-5 h-5 text-[#F59E0B] mb-0.5" />
            <span className="text-lg font-bold text-white">12</span>
          </div>
        </div>
        <p className="text-xs font-semibold text-white">Day Streak</p>
        <p className="text-[10px] text-[#9CA3AF] mt-0.5">Keep Going!</p>
      </motion.div>

      {/* Weekly Goal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5"
      >
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF] mb-3">Weekly Goal</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white">8 / 10 Problems</span>
          <span className="text-[10px] text-[#22C55E]">80%</span>
        </div>
        <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: "80%" }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Next Contest */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5"
      >
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF] mb-2">Next Contest</p>
        <p className="text-sm font-semibold text-white mb-1">Weekly Contest 420</p>
        <div className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF] mb-3">
          <Clock className="w-3 h-3" />
          <span>Starts in 02h 15m</span>
        </div>
        <button className="w-full px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all">
          Register Now
        </button>
      </motion.div>

      {/* Recommended Problems */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5"
      >
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF] mb-3">Recommended</p>
        <div className="space-y-2">
          {recommended.map((r) => (
            <Link
              key={r.id}
              href={`/problems/${r.id}`}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              <span className="text-xs text-white group-hover:text-[#7C3AED] transition-colors">{r.title}</span>
              <span className="text-[10px] text-[#6B7280]">{r.rating}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Learning Roadmap */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="rounded-2xl border border-white/[0.06] bg-[#111827] p-5"
      >
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#9CA3AF] mb-3">Learning Roadmap</p>
        <div className="space-y-3">
          {roadmapSteps.map((step) => (
            <div key={step.name} className="flex items-center gap-3">
              <RoadmapIcon status={step.status} />
              <span className={`text-xs font-medium ${
                step.status === "completed" ? "text-[#22C55E]" :
                step.status === "current" ? "text-[#7C3AED] font-semibold" : "text-[#6B7280]"
              }`}>
                {step.name}
              </span>
              {step.status === "current" && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#7C3AED]">Current</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}