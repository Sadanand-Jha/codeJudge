"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Users, Clock, Square, X } from "lucide-react";

export function ModeLockModal({
  open,
  onClose,
  onConfirm,
  currentModeLabel,
  status,
  studentCount,
  inProgressCount,
  submittedCount,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentModeLabel: string;
  status: "live" | "ended";
  studentCount?: number;
  inProgressCount?: number;
  submittedCount?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isLive = status === "live";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
          <div className="pointer-events-none absolute h-64 w-64 rounded-full bg-rose-500/15 blur-[100px]" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[480px] overflow-hidden rounded-[22px] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#1a1a2e] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.18),0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5),0_0_1px_rgba(0,0,0,0.3)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-7 pt-7 pb-0">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
                <AlertTriangle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              </div>

              <h2 className="text-[22px] font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Quiz is currently {isLive ? "live" : "ended"}
              </h2>

              <p className="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                You can&apos;t change the quiz start mode while the quiz is running.
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                To change between <strong className="text-gray-700 dark:text-gray-200">Schedule for later</strong> and{" "}
                <strong className="text-gray-700 dark:text-gray-200">Start when I&apos;m ready</strong>, you first need
                to stop the current quiz session.
              </p>

              {/* Status card */}
              <div className="mt-5 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Current Quiz Status
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isLive ? "LIVE" : "ENDED"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-white/[0.06] border border-gray-100 dark:border-white/[0.08]">
                      <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold tabular-nums text-gray-900 dark:text-gray-100">{studentCount ?? "—"}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Students</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-white/[0.06] border border-gray-100 dark:border-white/[0.08]">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold tabular-nums text-gray-900 dark:text-gray-100">{inProgressCount ?? "—"}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">In Progress</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-white/[0.06] border border-gray-100 dark:border-white/[0.08]">
                      <Square className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold tabular-nums text-gray-900 dark:text-gray-100">{submittedCount ?? "—"}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Submitted</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="mt-4 rounded-lg bg-amber-50/60 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 px-3.5 py-2.5">
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  Ending the current quiz will stop this quiz run for all participants. You can then
                  change the start mode and start a new quiz run.
                </p>
              </div>

              {/* Flow hint */}
              <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">Current quiz</span>
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <span className="rounded bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 font-medium text-rose-600 dark:text-rose-400">{isLive ? "LIVE" : "ENDED"}</span>
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <span className="rounded bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">Stop Quiz</span>
                  <span className="text-gray-300 dark:text-gray-600">→</span>
                  <span className="rounded bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 font-medium text-gray-500 dark:text-gray-400">Change mode</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col items-center gap-3 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] px-7 py-4">
              <div className="flex w-full items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-[10px] border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-5 text-[13px] font-medium text-gray-600 dark:text-gray-400 transition-all hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-rose-500 px-5 text-[13px] font-semibold text-white shadow-sm shadow-rose-500/20 transition-all hover:bg-rose-600 hover:shadow-md hover:shadow-rose-500/25 active:scale-[0.98]"
                >
                  <Square className="h-3.5 w-3.5" />
                  End Quiz &amp; Change Setting
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[12px] font-medium text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                Keep current quiz running
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
