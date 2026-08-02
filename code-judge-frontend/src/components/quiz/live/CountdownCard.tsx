"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import { formatDuration } from "@/lib/liveAssessmentHelpers";

interface CountdownCardProps {
  /** ISO string for scheduled start; if omitted, defaults to 45s from mount */
  targetAt?: string;
  /** Called once when the countdown hits zero */
  onStarted?: () => void;
  className?: string;
}

export function CountdownCard({ targetAt, onStarted, className = "" }: CountdownCardProps) {
  const computeTarget = useCallback(() => {
    if (targetAt) return new Date(targetAt).getTime();
    return Date.now() + 45 * 1000;
  }, [targetAt]);

  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, computeTarget() - Date.now()));
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    const t = setInterval(() => {
      const next = Math.max(0, computeTarget() - Date.now());
      setRemainingMs(next);
      if (next <= 0 && !started) {
        setStarted(true);
        onStarted?.();
      }
    }, 500);
    return () => clearInterval(t);
  }, [started, computeTarget, onStarted]);

  const seconds = Math.ceil(remainingMs / 1000);
  const pulse = seconds <= 10 && seconds > 0;

  return (
    <motion.div className={`flex flex-col items-center gap-3 rounded-3xl border border-white/[0.06] bg-[#171923] px-6 py-5 ${className}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#A1A1AA]">
        <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
        Quiz starts in
      </div>
      <motion.div className="text-4xl font-extrabold text-white tabular-nums" animate={pulse ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.6, repeat: pulse ? Infinity : 0 }}>
        {formatDuration(seconds)}
      </motion.div>
      {!started && seconds > 0 && (
        <div className="w-40 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6]" initial={{ width: "100%" }} animate={{ width: `${(seconds / 45) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
      )}
      {started && (
        <motion.div className="flex items-center gap-1.5 text-[#22C55E] text-sm font-medium" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirecting to quiz...
        </motion.div>
      )}
    </motion.div>
  );
}

export default CountdownCard;
