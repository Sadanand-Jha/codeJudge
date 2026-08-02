"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Pause, Play, Square, RefreshCw, Users, Clock, CheckCircle2, Radio } from "lucide-react";
import type { QuizRoomStatus } from "@/types/liveAssessment";
import { formatDuration } from "@/lib/liveAssessmentHelpers";

interface HeaderControlsProps {
  quizName: string;
  status: QuizRoomStatus;
  elapsedSeconds: number;
  totalDuration: number;
  studentsJoined: number;
  studentsSubmitted: number;
  onBack: () => void;
  onPause: () => void;
  onResume: () => void;
  onStartQuiz?: () => void;
  onEnd: () => void;
  onRefresh: () => void;
  onOpenParticipants: () => void;
  refreshing?: boolean;
}

const STATUS_BADGE: Record<QuizRoomStatus, { label: string; color: string; bg: string; pulse: boolean }> = {
  waiting: { label: "WAITING", color: "#F59E0B", bg: "rgba(245,158,11,0.15)", pulse: true },
  live: { label: "LIVE", color: "#22C55E", bg: "rgba(34,197,94,0.15)", pulse: true },
  paused: { label: "PAUSED", color: "#F59E0B", bg: "rgba(245,158,11,0.15)", pulse: false },
  ended: { label: "ENDED", color: "#9CA3AF", bg: "rgba(156,163,175,0.15)", pulse: false },
};

export function HeaderControls({
  quizName,
  status,
  elapsedSeconds,
  totalDuration,
  studentsJoined,
  studentsSubmitted,
  onBack,
  onPause,
  onResume,
  onStartQuiz,
  onEnd,
  onRefresh,
  onOpenParticipants,
  refreshing = false,
}: HeaderControlsProps) {
  const badge = STATUS_BADGE[status];
  const isWaiting = status === "waiting";
  const isLive = status === "live";
  const isPaused = status === "paused";
  const progressPct = Math.min(100, (totalDuration > 0 ? (elapsedSeconds / totalDuration) * 100 : 0));

  return (
    <div className="border-b border-white/[0.08] bg-[#0B0D14]/80 backdrop-blur-xl shrink-0 z-30">
      <div className="flex items-center gap-3 px-4 py-2.5 flex-wrap">
        <button onClick={onBack} className="h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-[#9CA3Af] hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5" title="Back to dashboard">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="w-px h-6 bg-white/[0.08] hidden sm:block" />

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate max-w-[220px] sm:max-w-none">{quizName}</p>
            <p className="text-[9px] text-[#71717A]">Live Assessment Room</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: badge.bg, border: `1px solid ${badge.color}40` }}>
          {badge.pulse ? (
            <motion.span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.color }} animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: badge.color }} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: badge.color }}>{badge.label}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
          <span className="text-xs font-bold text-white tabular-nums">{formatDuration(elapsedSeconds)}</span>
          <span className="text-[9px] text-[#71717A] hidden md:inline">/ {formatDuration(totalDuration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span className="text-xs font-bold text-white tabular-nums">{studentsJoined}</span>
            <span className="text-[9px] text-[#71717A] hidden md:inline">joined</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
            <span className="text-xs font-bold text-white tabular-nums">{studentsSubmitted}</span>
            <span className="text-[9px] text-[#71717A] hidden md:inline">submitted</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isWaiting && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onStartQuiz} className="h-8 px-3 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 text-xs font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start Quiz</span>
            </motion.button>
          )}
          {isLive && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onPause} className="h-8 px-3 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-xs font-bold text-[#F59E0B] hover:bg-[#F59E0B]/20 transition-colors flex items-center gap-1.5">
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pause</span>
            </motion.button>
          )}
          {isPaused && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onResume} className="h-8 px-3 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 text-xs font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resume</span>
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onEnd} disabled={status === "ended"} className="h-8 px-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 text-xs font-bold text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onRefresh} className="h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-[#9CA3Af] hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </motion.button>

          <div className="w-px h-6 bg-white/[0.08] hidden sm:block" />

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onOpenParticipants} className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Participants</span>
            <span className="sm:hidden">👥</span>
          </motion.button>
        </div>
      </div>

      <div className="h-0.5 bg-white/[0.04] overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #EC4899, #F472B6)" }} initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
    </div>
  );
}

export default HeaderControls;
