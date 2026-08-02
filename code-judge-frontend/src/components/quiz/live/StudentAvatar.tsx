"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import type { LiveParticipant } from "@/types/liveAssessment";

interface StudentAvatarProps {
  participant: LiveParticipant;
  index: number;
  count: number;
  size?: "xs" | "sm" | "md" | "lg";
  showName?: boolean;
  showHoverCard?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 70, emoji: "text-2xl", ring: 3 },
  sm: { box: 80, emoji: "text-3xl", ring: 3 },
  md: { box: 90, emoji: "text-4xl", ring: 4 },
  lg: { box: 100, emoji: "text-4xl", ring: 4 },
};

export function StudentAvatar({
  participant,
  index,
  count,
  size = "md",
  showName = true,
  showHoverCard = true,
  className = "",
}: StudentAvatarProps) {
  const [hovered, setHovered] = useState(false);
  const dims = SIZE_MAP[size];

  // Breathing animation - subtle scale
  const breathAnim = useMemo(() => {
    const seed = participant.positionSeed || (index + 1) / (count + 1);
    return {
      duration: 3 + (seed * 2),
      delay: (seed * 1.5) % 1.5,
      rotateRange: 1.5,
    };
  }, [participant.positionSeed, index, count]);

  return (
    <motion.div
      className={`relative flex flex-col items-center gap-1 ${className}`}
      style={{ zIndex: hovered ? 9999 : 10 + index }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        animate={{
          scale: [1, 1.03, 1],
          rotate: [0, breathAnim.rotateRange, -breathAnim.rotateRange, 0],
        }}
        transition={{
          duration: breathAnim.duration,
          delay: breathAnim.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="relative" style={{ width: dims.box, height: dims.box }}>
          {/* Soft pink glow - single box-shadow, no blur filter */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: "0 0 16px rgba(236,72,153,0.3)",
            }}
          />

          <div
            className="relative rounded-full flex items-center justify-center overflow-hidden"
            style={{
              width: dims.box,
              height: dims.box,
              border: `${dims.ring}px solid rgba(236,72,153,0.5)`,
              backgroundColor: "#171923",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {participant.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={participant.avatarUrl}
                alt={participant.username}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className={dims.emoji}>{participant.avatar}</span>
            )}
          </div>

          {/* Small yellow waiting dot */}
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#F59E0B] border-2 border-[#09090B]"
            style={{ boxShadow: "0 0 8px rgba(245,158,11,0.6)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {showName && (
        <div className="text-center max-w-[80px]">
          <p className="text-[10px] font-medium text-white/90 truncate leading-tight">
            {participant.username}
          </p>
        </div>
      )}

      {/* Hover Card */}
      {hovered && showHoverCard && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 rounded-2xl border border-[#EC4899]/30 bg-[#111217]/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-4 z-[9999] pointer-events-none"
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 overflow-hidden"
              style={{
                border: `2px solid rgba(236,72,153,0.5)`,
                backgroundColor: "#171923",
                boxShadow: "0 0 16px rgba(236,72,153,0.3)",
              }}
            >
              {participant.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={participant.avatarUrl}
                  alt={participant.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                participant.avatar
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{participant.username}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div
                  className="w-2 h-2 rounded-full bg-[#F59E0B]"
                  style={{ boxShadow: "0 0 6px rgba(245,158,11,0.6)" }}
                />
                <span className="text-[10px] text-[#F59E0B] font-medium">Waiting</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#9CA3AF]">Roll No:</span>
              <span className="text-white font-medium">23CS{String(1000 + index).slice(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9CA3AF]">Status:</span>
              <span className="text-[#F59E0B] font-medium">Waiting for teacher</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9CA3AF]">Joined:</span>
              <span className="text-white font-medium">{Math.floor(Math.random() * 5) + 1} min ago</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default StudentAvatar;