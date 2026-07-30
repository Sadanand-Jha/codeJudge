"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakWidgetProps {
  streak?: number;
  goal?: number;
}

export default function StreakWidget({ streak = 47, goal = 100 }: StreakWidgetProps) {
  const pct = Math.min((streak / goal) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111827] p-6"
    >
      {/* Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/10 rounded-full blur-[60px]" />

      <div className="relative z-10 flex flex-col items-center">
        <h3 className="text-xs font-medium uppercase tracking-widest text-[#9CA3AF] mb-4">Current Streak</h3>

        {/* Circular progress ring */}
        <div className="relative w-24 h-24 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.4))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="w-5 h-5 text-[#F59E0B] mb-0.5" />
            <span className="text-2xl font-bold text-white">{streak}</span>
          </div>
        </div>

        <p className="text-xs text-[#9CA3AF] text-center">
          {goal - streak} days to 100!
        </p>
        <p className="text-[10px] text-[#6B7280] mt-1 text-center">
          Keep the fire burning! 🔥
        </p>
      </div>
    </motion.div>
  );
}