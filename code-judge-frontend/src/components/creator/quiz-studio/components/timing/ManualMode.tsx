"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Square, Radio, Info, RotateCcw } from "lucide-react";
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
  participantDuration,
  quizId,
}: {
  manual: ManualConfig;
  onManualChange: (patch: Partial<ManualConfig>) => void;
  participantDuration: number;
  quizId?: string;
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
            className="space-y-3"
          >
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-hover">
              <Clock className="h-5 w-5 text-text-muted" />
            </div>
            <h4 className="text-sm font-bold text-text-primary">
              Not Started
            </h4>
            <p className="mt-1 text-xs text-text-secondary">
              This quiz is ready to start.
            </p>
            <button
              type="button"
              onClick={() => {
                setModalEndBehavior(manual.endBehavior);
                setModalSessionDuration(manual.sessionDuration);
                setStartOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
            >
              <Play className="h-4 w-4" />
              Start Quiz
            </button>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <p className="text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-400">
              You can start the quiz whenever you are ready. Participants will
              be able to begin their attempts once you click Start Quiz.
            </p>
          </div>
        </motion.div>
      )}

      {isLive && (
        <motion.div
          key="live"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Radio className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Live
                </h4>
                <p className="text-xs text-text-secondary">
                  Started{" "}
                  {manual.startedAt
                    ? formatRelativeTime(manual.startedAt)
                    : ""}
                </p>
              </div>
            </div>

          </div>
          <button
            type="button"
            onClick={() => setEndOpen(true)}
            className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 px-8 py-5 text-lg font-extrabold text-white shadow-xl shadow-rose-500/25 transition-all hover:brightness-110 hover:shadow-rose-500/30 active:scale-[0.98]"
          >
            <Square className="h-5 w-5" />
            End Quiz
          </button>
          <p className="text-[11px] text-text-secondary text-center">
            Ending the quiz stops the overall quiz session for all participants.
          </p>
        </motion.div>
      )}

      {isEnded && (
        <motion.div
          key="ended"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-hover">
              <Square className="h-5 w-5 text-text-muted" />
            </div>
            <h4 className="text-sm font-bold text-text-primary">Ended</h4>
            <p className="mt-1 text-xs text-text-secondary">
              Quiz ended{" "}
              {manual.endedAt ? formatRelativeTime(manual.endedAt) : ""}
            </p>
            <button
              type="button"
              onClick={() => {
                setModalEndBehavior(manual.endBehavior);
                setModalSessionDuration(manual.sessionDuration);
                setRestartOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Quiz
            </button>
          </div>
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
            label: "Duration",
            value: `${participantDuration} minutes per participant`,
          },
        ]}
        confirmLabel="Start Quiz"
        confirmColor="emerald"
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            When should the quiz end?
          </p>
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-card-hover cursor-pointer",
                modalEndBehavior === "manual"
                  ? "border-pink-500/40"
                  : "border-border"
              )}
            >
              <input
                type="radio"
                name="startEndBehavior"
                checked={modalEndBehavior === "manual"}
                onChange={() => setModalEndBehavior("manual")}
                className="accent-pink-500"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Keep running until I end it
                </p>
                <p className="text-[11px] text-text-secondary">
                  You control when the quiz stops. Full control over the session.
                </p>
              </div>
            </label>
            <label
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-card-hover cursor-pointer",
                modalEndBehavior === "auto_duration"
                  ? "border-pink-500/40"
                  : "border-border"
              )}
            >
              <input
                type="radio"
                name="startEndBehavior"
                checked={modalEndBehavior === "auto_duration"}
                onChange={() => setModalEndBehavior("auto_duration")}
                className="accent-pink-500"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Automatically end after a fixed duration
                </p>
                <p className="text-[11px] text-text-secondary">
                  Quiz stops after the configured session duration.
                </p>
              </div>
            </label>
          </div>
          {modalEndBehavior === "auto_duration" && (
            <div className="rounded-lg border border-border bg-card-hover p-3">
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
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            When should the quiz end?
          </p>
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-card-hover cursor-pointer",
                modalEndBehavior === "manual"
                  ? "border-pink-500/40"
                  : "border-border"
              )}
            >
              <input
                type="radio"
                name="restartEndBehavior"
                checked={modalEndBehavior === "manual"}
                onChange={() => setModalEndBehavior("manual")}
                className="accent-pink-500"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Keep running until I end it
                </p>
                <p className="text-[11px] text-text-secondary">
                  You control when the quiz stops. Full control over the session.
                </p>
              </div>
            </label>
            <label
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-card-hover cursor-pointer",
                modalEndBehavior === "auto_duration"
                  ? "border-pink-500/40"
                  : "border-border"
              )}
            >
              <input
                type="radio"
                name="restartEndBehavior"
                checked={modalEndBehavior === "auto_duration"}
                onChange={() => setModalEndBehavior("auto_duration")}
                className="accent-pink-500"
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Automatically end after a fixed duration
                </p>
                <p className="text-[11px] text-text-secondary">
                  Quiz stops after the configured session duration.
                </p>
              </div>
            </label>
          </div>
          {modalEndBehavior === "auto_duration" && (
            <div className="rounded-lg border border-border bg-card-hover p-3">
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
