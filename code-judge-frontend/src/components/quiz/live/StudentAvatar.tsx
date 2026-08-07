"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import type { LiveParticipant } from "@/types/liveAssessment";
import { DEFAULT_AVATAR_URL, getPredefinedAvatarByUrl } from "@/config/dicebear";

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
  const displayAvatarUrl =
    participant.avatarUrl && getPredefinedAvatarByUrl(participant.avatarUrl)
      ? participant.avatarUrl
      : DEFAULT_AVATAR_URL;

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayAvatarUrl}
              alt={participant.username}
              className="w-full h-full object-cover"
              loading="lazy"
            />
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

      {/* Hover Card - matches settings modal preview style */}
      {hovered && showHoverCard && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 4 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 rounded-xl border border-white/[0.1] bg-card p-3 shadow-2xl backdrop-blur-xl z-[9999] pointer-events-none"
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
      )}
    </motion.div>
  );
}

export default StudentAvatar;