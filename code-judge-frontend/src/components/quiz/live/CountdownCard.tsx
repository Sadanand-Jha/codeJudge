"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { QuizLoader } from "./StudentQuizShell";
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
    <motion.div
      className={`qs-ui flex flex-col items-center gap-3 rounded-3xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-6 py-5 shadow-[5px_5px_0_var(--qs-sun)] ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--qs-muted)]">
        <Clock className="w-3.5 h-3.5 text-[var(--qs-brand)]" />
        Quiz starts in
      </div>
      <motion.div className="text-4xl font-extrabold text-[var(--qs-ink)] tabular-nums" animate={pulse ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.6, repeat: pulse ? Infinity : 0 }}>
        {formatDuration(seconds)}
      </motion.div>
      {!started && seconds > 0 && (
        <div className="w-40 h-1.5 rounded-full bg-[var(--qs-line)] overflow-hidden">
          <motion.div className="h-full rounded-full bg-[var(--qs-brand)]" initial={{ width: "100%" }} animate={{ width: `${(seconds / 45) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
      )}
      {started && (
        <motion.div className="flex items-center gap-1.5 text-[var(--qs-ok)] text-sm font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <QuizLoader size={16} />
          Redirecting to quiz...
        </motion.div>
      )}
    </motion.div>
  );
}

export default CountdownCard;
