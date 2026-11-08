"use client";

import { useEffect, useState } from "react";
import { Square } from "lucide-react";
import { DateTimeField } from "./DateTimeField";
import { EndQuizModal } from "./EndQuizModal";
import {
  toDateString,
  toTimeString,
  isStartAfterEnd,
  isPast,
} from "./helpers";
import { updateQuizStatus } from "@/services/quiz";
import { toast } from "@/lib/toast";
import type { ScheduleConfig, QuizLifecycle } from "./types";

export function ScheduleMode({
  schedule,
  onChange,
  manualStatus,
  validationErrors,
  quizId,
  onEnded,
}: {
  schedule: ScheduleConfig;
  onChange: (patch: Partial<ScheduleConfig>) => void;
  manualStatus: QuizLifecycle;
  validationErrors: string[];
  quizId?: string;
  onEnded?: () => void;
}) {
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setClockTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const isLive = manualStatus === "live";
  const isEnded = manualStatus === "ended";
  const locked = isLive || isEnded;

  const startReached =
    !!schedule.startDate &&
    !!schedule.startTime &&
    isPast(schedule.startDate, schedule.startTime);
  const endReached =
    !!schedule.endDate &&
    !!schedule.endTime &&
    isPast(schedule.endDate, schedule.endTime);
  const isRunning = !isEnded && (isLive || (startReached && !endReached));

  const endInvalid = isStartAfterEnd(
    schedule.startDate,
    schedule.startTime,
    schedule.endDate,
    schedule.endTime
  );
  const endError =
    !schedule.endDate || !schedule.endTime
      ? "End date and time are required for a scheduled quiz."
      : !schedule.startDate
        ? "Set a start date first, then the end."
        : endInvalid
          ? "End must be after the scheduled start."
          : undefined;

  return (
    <div className="space-y-5">
      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 sm:p-4">
        <DateTimeField
          label="Starts on"
          date={schedule.startDate}
          time={schedule.startTime}
          onDateChange={(d) => onChange({ startDate: d })}
          onTimeChange={(t) => onChange({ startTime: t })}
          onUseNow={(minutes) => {
            const now = new Date(Date.now() + minutes * 60_000);
            onChange({ startDate: toDateString(now), startTime: toTimeString(now) });
          }}
          error={validationErrors.find((e) => e.includes("start"))}
          disabled={locked}
        />
      </div>

      {/* ===== End date & time ===== */}
      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 sm:p-4">
        <DateTimeField
          label="Ends on *"
          date={schedule.endDate}
          time={schedule.endTime}
          onDateChange={(d) => onChange({ endDate: d })}
          onTimeChange={(t) => onChange({ endTime: t })}
          error={endError}
          disabled={locked}
        />
        <p className="mt-2 text-[11px] font-medium text-[var(--qs-muted)]">
          End date and time are required. The quiz closes automatically at this time.
        </p>
      </div>

      {isRunning && quizId && (
        <div className="flex flex-col gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-okbg)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--qs-ok)] animate-pulse motion-reduce:animate-none" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--qs-ink)]">Quiz is live</p>
              <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">
                It closes automatically at the scheduled end time. You can stop it early at any moment.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEndOpen(true)}
            disabled={ending}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-surface)] px-3.5 text-xs font-extrabold text-[var(--qs-bad)] transition-colors hover:bg-[var(--qs-badbg)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Square className="h-3 w-3" fill="currentColor" />
            End quiz now
          </button>
        </div>
      )}

      <EndQuizModal
        open={endOpen}
        onClose={() => {
          if (!ending) setEndOpen(false);
        }}
        onConfirm={async () => {
          if (!quizId || ending) return;
          setEnding(true);
          try {
            await updateQuizStatus(quizId, "ended");
          } catch {
            toast.error({ title: "Failed to end quiz" });
            setEnding(false);
            return;
          }
          setEnding(false);
          setEndOpen(false);
          onEnded?.();
          toast.success({ title: "Quiz ended", description: "Participants can no longer submit responses." });
        }}
      />
    </div>
  );
}
