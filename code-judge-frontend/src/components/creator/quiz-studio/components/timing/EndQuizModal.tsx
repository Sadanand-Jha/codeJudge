"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Square, Users, Clock, FileCheck2, AlertTriangle, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";

function StatTile({
  icon: Icon,
  label,
  value,
  highlighted = false,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  highlighted?: boolean;
  tone?: "brand" | "blue";
}) {
  return (
    <div
      className={cn(
        "rounded-[12px] border-2 px-2.5 py-2.5 sm:px-3 sm:py-3",
        highlighted
          ? "border-[var(--qs-warn)]/45 bg-[var(--qs-warnbg)]"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-[8px] border-2",
          highlighted
            ? "border-[var(--qs-warn)]/35 bg-[var(--qs-surface)] text-[var(--qs-warn)]"
            : tone === "blue"
              ? "border-[var(--qs-line)] bg-[var(--qs-poly-0)] text-[var(--qs-blue)]"
              : "border-[var(--qs-line)] bg-[var(--qs-poly-0)] text-[var(--qs-brand)]"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="mt-2 text-[18px] font-black leading-none tabular-nums text-[var(--qs-ink)] sm:text-[20px]">
        {value ?? "—"}
      </p>
      <p className="mt-1 text-[10px] font-semibold leading-tight text-[var(--qs-muted)]">{label}</p>
    </div>
  );
}

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
          className="fixed inset-0 z-[90] flex items-end justify-center bg-[#1A1240]/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-quiz-title"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[24px] border-t-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] sm:rounded-[22px] sm:border-2 sm:shadow-[8px_8px_0_var(--qs-sun)]"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[var(--qs-line)] sm:hidden" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close end quiz dialog"
              className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)] sm:right-4 sm:top-4"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="overflow-y-auto px-5 pb-1 pt-3 sm:px-7 sm:pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)]">
                <Square className="h-5 w-5 text-[var(--qs-bad)]" />
              </div>

              <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-bad)]">
                End quiz
              </p>
              <h2
                id="end-quiz-title"
                className="qs-display mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--qs-ink)]"
              >
                End this quiz?
              </h2>

              <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--qs-muted)]">
                Students who have not submitted will no longer be able to continue.
                Their current responses will be saved according to your quiz settings.
              </p>

              {/* Status card */}
              <div className="mt-4 rounded-[16px] bg-[var(--qs-poly-0)] p-3 sm:p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)]/20 bg-[var(--qs-okbg)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ok)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-ok)] animate-pulse motion-reduce:animate-none" />
                    Live quiz
                  </span>
                  <span className="text-[10px] font-extrabold text-[var(--qs-ink)] sm:text-[11px]">
                    Quiz ends now
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  <StatTile icon={Users} label="Students" value={studentCount} />
                  <StatTile icon={Clock} label="In progress" value={inProgressCount} highlighted />
                  <StatTile icon={FileCheck2} label="Submitted" value={submittedCount} tone="blue" />
                </div>
              </div>

              {/* Warning */}
              <div className="mb-4 mt-3 flex items-start gap-2 rounded-[10px] border-2 border-[var(--qs-warn)]/25 bg-[var(--qs-warnbg)] px-3 py-2.5 sm:mb-0 sm:px-3.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-warn)]" />
                <p className="text-[11px] font-semibold leading-5 text-[var(--qs-warn)]">
                  This action cannot be undone for the current quiz run.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 flex-col-reverse gap-2 px-5 pb-5 pt-4 sm:flex-row sm:justify-end sm:gap-2.5 sm:px-7 sm:pb-6 sm:pt-5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-full rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-poly-0)] sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-[var(--qs-bad)] bg-[var(--qs-bad)] px-5 text-[13px] font-extrabold text-white transition-transform hover:-translate-y-px active:translate-y-0 sm:w-auto"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" />
                End quiz
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
