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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1A1240]/60 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[480px] overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="px-7 pt-7 pb-0">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-badbg)]">
                <AlertTriangle className="h-5 w-5 text-[var(--qs-bad)]" />
              </div>

              <h2 className="text-xl font-black tracking-tight text-[var(--qs-ink)]">
                Quiz is currently {isLive ? "live" : "ended"}
              </h2>

              <p className="mt-3 text-[13px] font-medium leading-relaxed text-[var(--qs-muted)]">
                You can&apos;t change the quiz start mode while the quiz is running.
              </p>
              <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[var(--qs-muted)]">
                To change between <strong className="font-extrabold text-[var(--qs-ink)]">Schedule for later</strong> and{" "}
                <strong className="font-extrabold text-[var(--qs-ink)]">Start when I&apos;m ready</strong>, you first need
                to stop the current quiz session.
              </p>

              {/* Status card */}
              <div className="mt-5 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-bad)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-bad)] animate-pulse motion-reduce:animate-none" />
                    {currentModeLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-ok)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-ok)] animate-pulse motion-reduce:animate-none" />
                    {isLive ? "LIVE" : "ENDED"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
                      <Users className="h-3.5 w-3.5 text-[var(--qs-muted)]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-black tabular-nums text-[var(--qs-ink)]">{studentCount ?? "—"}</p>
                      <p className="text-[10px] font-medium text-[var(--qs-muted)]">Students</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
                      <Clock className="h-3.5 w-3.5 text-[#a85d00]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-black tabular-nums text-[var(--qs-ink)]">{inProgressCount ?? "—"}</p>
                      <p className="text-[10px] font-medium text-[var(--qs-muted)]">In Progress</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
                      <Square className="h-3.5 w-3.5 text-[var(--qs-ok)]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-black tabular-nums text-[var(--qs-ink)]">{submittedCount ?? "—"}</p>
                      <p className="text-[10px] font-medium text-[var(--qs-muted)]">Submitted</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="mt-4 rounded-[12px] border-2 border-[#a85d00]/30 bg-[#fff3d6] px-3.5 py-2.5">
                <p className="text-[11px] font-medium leading-relaxed text-[#a85d00]">
                  Ending the current quiz will stop this quiz run for all participants. You can then
                  change the start mode and start a new quiz run.
                </p>
              </div>

              {/* Flow hint */}
              <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--qs-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-1.5 py-0.5 font-bold text-[var(--qs-muted)]">Current quiz</span>
                  <span className="text-[var(--qs-muted)]">→</span>
                  <span className="rounded-[8px] border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-1.5 py-0.5 font-bold text-[var(--qs-bad)]">{isLive ? "LIVE" : "ENDED"}</span>
                  <span className="text-[var(--qs-muted)]">→</span>
                  <span className="rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-1.5 py-0.5 font-bold text-[var(--qs-muted)]">Stop Quiz</span>
                  <span className="text-[var(--qs-muted)]">→</span>
                  <span className="rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-1.5 py-0.5 font-bold text-[var(--qs-muted)]">Change mode</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col items-center gap-3 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-7 py-4">
              <div className="flex w-full items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex h-10 items-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-5 text-[13px] font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
                >
                  <Square className="h-3.5 w-3.5" />
                  End Quiz &amp; Change Setting
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-[12px] font-bold text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)]"
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
