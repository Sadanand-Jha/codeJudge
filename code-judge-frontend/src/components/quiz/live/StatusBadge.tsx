"use client";

import { motion } from "framer-motion";
import { STATUS_META, type ParticipantStatus } from "@/types/liveAssessment";

interface StatusBadgeProps {
  status: ParticipantStatus;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, pulse = false, size = "sm", className = "" }: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const padding = size === "md" ? "px-2.5 py-1 text-[10px]" : "px-2 py-0.5 text-[9px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding} ${className}`}
      style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}
    >
      {pulse ? (
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: meta.dot }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      )}
      {meta.label}
    </span>
  );
}

export default StatusBadge;
