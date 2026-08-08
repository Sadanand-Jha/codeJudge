"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, Wifi, Target, ListChecks } from "lucide-react";
import type { LiveParticipant } from "@/types/liveAssessment";
import { STATUS_META, CONNECTION_META } from "@/types/liveAssessment";
import { formatDuration } from "@/lib/liveAssessmentHelpers";
import { DEFAULT_AVATAR_URL, getPredefinedAvatarByUrl } from "@/config/dicebear";
import { StatusBadge } from "./StatusBadge";

interface ParticipantCardProps {
  participant: LiveParticipant;
  index?: number;
}

export function ParticipantCard({ participant, index = 0 }: ParticipantCardProps) {
  const meta = STATUS_META[participant.status];
  const conn = CONNECTION_META[participant.connection];
  const displayAvatarUrl =
    participant.avatarUrl && getPredefinedAvatarByUrl(participant.avatarUrl)
      ? participant.avatarUrl
      : DEFAULT_AVATAR_URL;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.2 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-border bg-[#171923] p-3 hover:border-[#EC4899]/25 hover:bg-[#1E2030] transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 group">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg overflow-hidden"
            style={{ border: `2px solid ${meta.ring}`, backgroundColor: "#111217", boxShadow: `0 0 12px ${meta.ring}25` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayAvatarUrl} alt={participant.username} className="w-full h-full object-cover" loading="lazy" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#171923]" style={{ backgroundColor: meta.dot }} />

          {/* Hover preview similar to settings modal */}
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-14 top-1/2 -translate-y-1/2 z-50 w-48 rounded-xl border border-white/[0.1] bg-card p-3 shadow-2xl backdrop-blur-xl hidden group-hover:block"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#EC4899]/40 to-[#BE185D]/30 blur-md opacity-80" />
                  <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white/10 bg-background shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={displayAvatarUrl} alt={participant.username} className="h-full w-full object-cover" />
                  </div>
                </div>
                <p className="text-xs font-bold text-white truncate w-full text-center">{participant.username}</p>
                <p className="text-[10px] text-muted-foreground text-center">Participant</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-white truncate">{participant.username}</p>
            <StatusBadge status={participant.status} pulse={participant.status === "attempting"} />
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${meta.ring}, #EC4899)` }} initial={{ width: 0 }} animate={{ width: `${participant.progress}%` }} transition={{ duration: 0.5, delay: index * 0.02 }} />
            </div>
            <span className="text-[10px] font-bold text-white tabular-nums">{participant.progress}%</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ListChecks className="w-3 h-3 text-[#EC4899]" />
              {participant.questionsAnswered}/{participant.totalQuestions}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-[#22C55E]" />
              {participant.score !== undefined ? `${participant.score} pts` : "—"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#F59E0B]" />
              {formatDuration(participant.timeSpent)}
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3" style={{ color: conn.color }} />
              {conn.label}
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">Current: <span className="text-white/80 font-medium">Q{participant.currentQuestion}</span></span>
            {participant.submittedAt && <span className="text-[9px] text-[#22C55E]">Submitted</span>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ParticipantCard;
