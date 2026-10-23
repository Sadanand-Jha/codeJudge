"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Square, RotateCcw } from "lucide-react";
import { cn } from "@/lib/helpers";
import { ConfirmModal } from "./ConfirmModal";
import { EndQuizModal } from "./EndQuizModal";
import { DurationPicker } from "./DurationPicker";
import { formatRelativeTime } from "./helpers";
import { updateQuizStatus } from "@/services/quiz";
import { toast } from "@/lib/toast";
import type { ManualConfig } from "./types";
import { SESSION_DURATION_PRESETS } from "./types";

export function ManualMode({
  manual,
  onManualChange,
  quizId,
  allowStart = true,
}: {
  manual: ManualConfig;
  onManualChange: (patch: Partial<ManualConfig>) => void;
  quizId?: string;
  allowStart?: boolean;
}) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [modalEndBehavior, setModalEndBehavior] = useState<"manual" | "auto_duration">(manual.endBehavior);
  const [modalSessionDuration, setModalSessionDuration] = useState(manual.sessionDuration);

  const isReady = manual.status === "draft";
  const isLive = manual.status === "live";
  const isEnded = manual.status === "ended";

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {isReady && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3.5 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)]">
              <Clock className="h-5 w-5 text-[#1a1240]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--qs-ink)]">Not started yet</p>
              <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
                This quiz is ready. Participants can begin their attempts as
                soon as you start it.
              </p>
            </div>
            </div>
            {allowStart ? (
              <button
                type="button"
                onClick={() => {
                  setModalEndBehavior(manual.endBehavior);
                  setModalSessionDuration(manual.sessionDuration);
                  setStartOpen(true);
                }}
                className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-4 text-sm font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none sm:w-auto"
              >
                <Play className="h-4 w-4" />
                Start Quiz
              </button>
            ) : (
              <p className="shrink-0 rounded-[12px] border-2 border-dashed border-[var(--qs-line)] px-3 py-2 text-center text-[11px] font-bold text-[var(--qs-muted)] sm:max-w-[170px]">
                Use Start Quiz below when you&apos;re ready.
              </p>
            )}
          </motion.div>
        )}

      {isLive && (
        <motion.div
          key="live"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-okbg)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-ok)] animate-pulse motion-reduce:animate-none" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[var(--qs-ink)]">Live now</p>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">
              Started{" "}
              {manual.startedAt
                ? formatRelativeTime(manual.startedAt)
                : ""}
            </p>
          </div>
          </div>
          <button
            type="button"
            onClick={() => setEndOpen(true)}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-surface)] px-3.5 text-xs font-extrabold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-badbg)] sm:w-auto"
          >
            <Square className="h-3 w-3" fill="currentColor" />
            End quiz
          </button>
        </motion.div>
      )}

      {isEnded && (
        <motion.div
          key="ended"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-badbg)]">
            <Square className="h-4 w-4 text-[var(--qs-bad)]" fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[var(--qs-ink)]">Ended</p>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">
              Quiz ended{" "}
              {manual.endedAt ? formatRelativeTime(manual.endedAt) : ""}
            </p>
          </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalEndBehavior(manual.endBehavior);
              setModalSessionDuration(manual.sessionDuration);
              setRestartOpen(true);
            }}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-4 text-sm font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none sm:w-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Restart Quiz
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ===== Start Quiz Modal with End Behavior ===== */}
      <ConfirmModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onConfirm={async () => {
          if (quizId) {
            try {
              await updateQuizStatus(quizId, "live", {
                endBehavior: modalEndBehavior,
                sessionDuration: modalEndBehavior === "auto_duration" ? modalSessionDuration : undefined,
              });
            } catch {
              toast.error({ title: "Failed to start quiz" });
              return;
            }
          }
          onManualChange({
            status: "live",
            startedAt: new Date().toISOString(),
            endBehavior: modalEndBehavior,
            sessionDuration: modalSessionDuration,
          });
          setStartOpen(false);
          toast.success({ title: "Quiz is live!", description: "Participants can now start their attempts." });
        }}
        title="Start this quiz?"
        description="Starting the quiz will make it available to registered participants. They can begin their attempts immediately."
        details={[
          {
            label: "Time per student",
            value: `${participantDuration} minutes each`,
          },
        ]}
        confirmLabel="Start Quiz"
        confirmColor="emerald"
      >
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
            When should the quiz end?
          </p>
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-center gap-3 rounded-[14px] border-2 bg-[var(--qs-surface)] p-3 transition-colors cursor-pointer",
                modalEndBehavior === "manual"
                  ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                  : "border-[var(--qs-line)] hover:border-[var(--qs-brand)]"
              )}
            >
              <input
                type="radio"
                name="startEndBehavior"
                checked={modalEndBehavior === "manual"}
                onChange={() => setModalEndBehavior("manual")}
                className="accent-[var(--qs-brand)]"
              />
              <div>
                <p className="text-sm font-bold text-[var(--qs-ink)]">
                  Keep running until I end it
                </p>
                <p className="text-[11px] font-medium text-[var(--qs-muted)]">
                  You control when the quiz stops. Full control over the session.
                </p>
              </div>
            </label>
            <label
              className={cn(
                "flex items-center gap-3 rounded-[14px] border-2 bg-[var(--qs-surface)] p-3 transition-colors cursor-pointer",
                modalEndBehavior === "auto_duration"
                  ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                  : "border-[var(--qs-line)] hover:border-[var(--qs-brand)]"
              )}
            >
              <input
                type="radio"
                name="startEndBehavior"
                checked={modalEndBehavior === "auto_duration"}
                onChange={() => setModalEndBehavior("auto_duration")}
                className="accent-[var(--qs-brand)]"
              />
              <div>
                <p className="text-sm font-bold text-[var(--qs-ink)]">
                  Automatically end after a fixed duration
                </p>
                <p className="text-[11px] font-medium text-[var(--qs-muted)]">
                  Quiz stops after the configured session duration.
                </p>
              </div>
            </label>
          </div>
          {modalEndBehavior === "auto_duration" && (
            <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
              <DurationPicker
                value={modalSessionDuration}
                onChange={setModalSessionDuration}
                presets={SESSION_DURATION_PRESETS}
                label="Quiz Session Duration"
                helperText="Once started, the quiz will automatically end after this duration."
              />
            </div>
          )}
        </div>
      </ConfirmModal>

      <EndQuizModal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onConfirm={async () => {
          if (quizId) {
            try {
              await updateQuizStatus(quizId, "ended");
            } catch {
              toast.error({ title: "Failed to end quiz" });
              return;
            }
          }
          onManualChange({
            status: "ended",
            endedAt: new Date().toISOString(),
          });
          setEndOpen(false);
        }}
      />

      <ConfirmModal
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        onConfirm={async () => {
          if (quizId) {
            try {
              await updateQuizStatus(quizId, "live", {
                endBehavior: modalEndBehavior,
                sessionDuration: modalEndBehavior === "auto_duration" ? modalSessionDuration : undefined,
              });
            } catch {
              toast.error({ title: "Failed to restart quiz" });
              return;
            }
          }
          onManualChange({
            status: "live",
            startedAt: new Date().toISOString(),
            endedAt: undefined,
            endBehavior: modalEndBehavior,
            sessionDuration: modalSessionDuration,
          });
          setRestartOpen(false);
          toast.success({ title: "Quiz is live!", description: "Participants can now start their attempts." });
        }}
        title="Restart this quiz?"
        description="This will make the quiz live again. Participants will be able to start new attempts."
        confirmLabel="Restart Quiz"
        confirmColor="emerald"
      >
        <div className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
            When should the quiz end?
          </p>
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-center gap-3 rounded-[14px] border-2 bg-[var(--qs-surface)] p-3 transition-colors cursor-pointer",
                modalEndBehavior === "manual"
                  ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                  : "border-[var(--qs-line)] hover:border-[var(--qs-brand)]"
              )}
            >
              <input
                type="radio"
                name="restartEndBehavior"
                checked={modalEndBehavior === "manual"}
                onChange={() => setModalEndBehavior("manual")}
                className="accent-[var(--qs-brand)]"
              />
              <div>
                <p className="text-sm font-bold text-[var(--qs-ink)]">
                  Keep running until I end it
                </p>
                <p className="text-[11px] font-medium text-[var(--qs-muted)]">
                  You control when the quiz stops. Full control over the session.
                </p>
              </div>
            </label>
            <label
              className={cn(
                "flex items-center gap-3 rounded-[14px] border-2 bg-[var(--qs-surface)] p-3 transition-colors cursor-pointer",
                modalEndBehavior === "auto_duration"
                  ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                  : "border-[var(--qs-line)] hover:border-[var(--qs-brand)]"
              )}
            >
              <input
                type="radio"
                name="restartEndBehavior"
                checked={modalEndBehavior === "auto_duration"}
                onChange={() => setModalEndBehavior("auto_duration")}
                className="accent-[var(--qs-brand)]"
              />
              <div>
                <p className="text-sm font-bold text-[var(--qs-ink)]">
                  Automatically end after a fixed duration
                </p>
                <p className="text-[11px] font-medium text-[var(--qs-muted)]">
                  Quiz stops after the configured session duration.
                </p>
              </div>
            </label>
          </div>
          {modalEndBehavior === "auto_duration" && (
            <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
              <DurationPicker
                value={modalSessionDuration}
                onChange={setModalSessionDuration}
                presets={SESSION_DURATION_PRESETS}
                label="Quiz Session Duration"
                helperText="Once started, the quiz will automatically end after this duration."
              />
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}
