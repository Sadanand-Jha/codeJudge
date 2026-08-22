"use client";

import { useState } from "react";
import { Play, Info, Flag } from "lucide-react";
import { DateTimeField } from "./DateTimeField";
import { ConfirmModal } from "./ConfirmModal";
import {
  toDateString,
  toTimeString,
  formatTime12,
  isPast,
  isStartAfterEnd,
} from "./helpers";
import type { ScheduleConfig, QuizLifecycle } from "./types";

export function ScheduleMode({
  schedule,
  onChange,
  manualStatus,
  validationErrors,
}: {
  schedule: ScheduleConfig;
  onChange: (patch: Partial<ScheduleConfig>) => void;
  manualStatus: QuizLifecycle;
  validationErrors: string[];
}) {
  const [startNowOpen, setStartNowOpen] = useState(false);

  const isScheduled =
    manualStatus === "draft" || manualStatus === "scheduled";
  const isLive = manualStatus === "live";
  const isEnded = manualStatus === "ended";
  const locked = isLive || isEnded;

  const endInvalid = isStartAfterEnd(
    schedule.startDate,
    schedule.startTime,
    schedule.endDate,
    schedule.endTime
  );
  const endError =
    schedule.endDate && !schedule.startDate
      ? "Set a start date first, then the end."
      : endInvalid
        ? "End must be after the scheduled start."
        : undefined;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Start
        </p>
        <DateTimeField
          label="Start date & time"
          date={schedule.startDate}
          time={schedule.startTime}
          onDateChange={(d) => onChange({ startDate: d })}
          onTimeChange={(t) => onChange({ startTime: t })}
          error={validationErrors.find((e) => e.includes("start"))}
          disabled={locked}
        />
        {schedule.startDate &&
          schedule.startTime &&
          !isPast(schedule.startDate, schedule.startTime) && (
            <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04] px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                Quiz will automatically become available at{" "}
                {formatTime12(schedule.startTime)}. Participants can begin from
                that time.
              </p>
            </div>
          )}
      </div>

      {/* ===== End date & time ===== */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          End
        </p>
        <DateTimeField
          label="End date & time (optional)"
          date={schedule.endDate}
          time={schedule.endTime}
          onDateChange={(d) => onChange({ endDate: d })}
          onTimeChange={(t) => onChange({ endTime: t })}
          error={endError}
          disabled={locked}
        />
        {schedule.endDate ? (
          !endError && (
            <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04] px-3 py-2">
              <Flag className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                The quiz will stop accepting attempts at{" "}
                {formatTime12(schedule.endTime)} on{" "}
                {new Date(`${schedule.endDate}T00:00`).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "long" }
                )}
                .
              </p>
            </div>
          )
        ) : (
          <p className="flex items-center gap-2 text-[11px] text-text-secondary">
            <span className="h-px w-6 shrink-0 bg-border" />
            Leave empty to end the quiz manually anytime.
          </p>
        )}
      </div>

      {isScheduled && schedule.startDate && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStartNowOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <Play className="h-3 w-3" />
              Start Now
            </button>
          </div>
          <p className="text-[11px] text-text-secondary">
            If you are ready before the scheduled time, you can override the
            schedule and start the quiz immediately.
          </p>
        </div>
      )}

      <ConfirmModal
        open={startNowOpen}
        onClose={() => setStartNowOpen(false)}
        onConfirm={() => {
          setStartNowOpen(false);
          onChange({
            startDate: toDateString(new Date()),
            startTime: toTimeString(new Date()),
          });
        }}
        title="Start this quiz now?"
        description="Start this quiz now instead of waiting for the scheduled time?"
        confirmLabel="Start Now"
      />
    </div>
  );
}
