"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Square, Users, Clock, AlertTriangle, X } from "lucide-react";

export function EndQuizModal({
  open,
  onClose,
  onConfirm,
  studentCount,
  inProgressCount,
  submittedCount,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
                <Square className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-500 dark:text-rose-400">
                End Quiz
              </p>
              <h2 className="mt-1.5 text-[22px] font-bold tracking-tight text-gray-900 dark:text-gray-100">
                End this quiz?
              </h2>

              <p className="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                Are you sure you want to end this quiz?
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                Students who haven&apos;t submitted will no longer be able to continue.
                Their current responses will be saved according to your quiz settings.
              </p>

              {/* Status card */}
              <div className="mt-5 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50/80 dark:bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Quiz
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
                <p className="mt-3 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  Quiz ends now
                </p>
              </div>

              {/* Warning */}
              <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  This action cannot be undone for the current quiz run.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] px-7 py-4">
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
                End Quiz
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
