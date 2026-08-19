"use client";

import { motion } from "framer-motion";
import { Star, TrendingUp, CheckCircle2 } from "lucide-react";
import type { ExamMeta } from "./types";
import { cn } from "@/lib/helpers";

/**
 * Abstract exam thumbnail — no stock photos.
 * Each exam gets a distinct gradient identity + a subtle grid texture and a
 * small "score ring" motif, so the marketplace reads visually before you read
 * a single word.
 */
export function SeriesThumbnail({
  exam,
  compact = false,
  className,
}: {
  exam: ExamMeta;
  compact?: boolean;
  className?: string;
}) {
  const Icon = exam.icon;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br text-white",
        exam.gradient,
        compact ? "h-20" : "h-32 sm:h-36",
        className
      )}
    >
      {/* Grid texture */}
      <div className="tests-thumb-grid absolute inset-0 opacity-60" />

      {/* Soft corner glow */}
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-black/10 blur-xl" />

      {/* Floating "attempted" ring */}
      {!compact && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold backdrop-blur-sm"
        >
          <TrendingUp className="h-3 w-3" />
          Trending
        </motion.div>
      )}

      {/* Exam icon — big and central */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn("relative flex items-center justify-center", compact ? "h-11 w-11" : "h-14 w-14 sm:h-16 sm:w-16")}>
          <div className="absolute inset-0 rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-[2px]" />
          <Icon className={cn("relative text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]", compact ? "h-6 w-6" : "h-7 w-7 sm:h-8 sm:w-8")} />
        </div>
      </div>

      {/* Score-ring motif — abstract, bottom-left */}
      {!compact && (
        <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
          <div className="relative h-9 w-9">
            <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="94"
                strokeDashoffset="22"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold">86%</span>
          </div>
          <div className="text-[10px] leading-tight">
            <div className="flex items-center gap-0.5 font-bold">
              <Star className="h-3 w-3 fill-current" /> 4.8
            </div>
            <div className="text-white/80">12.4K students</div>
          </div>
        </div>
      )}

      {/* Checkmark chip — bottom right */}
      {!compact && (
        <div className="absolute bottom-2.5 right-3 flex items-center gap-1 rounded-md bg-black/15 px-1.5 py-0.5 text-[9px] font-bold text-white/90 backdrop-blur-sm">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </div>
      )}
    </div>
  );
}
