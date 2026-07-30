"use client";

import { motion } from "framer-motion";
import { Trophy, Calendar } from "lucide-react";

interface ProfileHeroProps {
  username: string;
  email: string;
  joinDate?: string;
}

export default function ProfileHero({ username, email, joinDate = "Jan 2024" }: ProfileHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#111827] p-8"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-[#3B82F6]/10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-[100px]" />

      <div className="relative z-10 flex items-center justify-between gap-8">
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-[#7C3AED]/20">
            {username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{username || "User"}</h1>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#7C3AED] px-2.5 py-1 rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10">
                Specialist
              </span>
            </div>
            <p className="text-sm text-[#9CA3AF] mt-1">{email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-[#9CA3AF]">🇮🇳 India</span>
              <span className="text-[#3F3F46]">•</span>
              <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
                <Calendar className="w-3 h-3" />
                Joined {joinDate}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Quote */}
        <div className="hidden lg:block flex-1 max-w-md mx-auto">
          <p className="text-sm italic text-[#9CA3AF] text-center">
            "Code is like humor. When you have to explain it, it's bad."
          </p>
        </div>

        {/* Right: Trophy illustration */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-[#7C3AED]/20 rounded-full blur-2xl" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#FBBF24]/20 to-[#7C3AED]/20 border border-[#FBBF24]/20 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-[#FBBF24]" />
          </div>
          {/* Floating particles */}
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FBBF24] animate-pulse" />
          <div className="absolute -bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>
      </div>
    </motion.div>
  );
}