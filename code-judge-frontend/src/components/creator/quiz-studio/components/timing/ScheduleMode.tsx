"use client";

import { useState } from "react";
import { Play, Info } from "lucide-react";
import { cn } from "@/lib/helpers";
import { DateTimeField } from "./DateTimeField";
import { ConfirmModal } from "./ConfirmModal";
import {
  toDateString,
  toTimeString,
  formatTime12,
  isPast,
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Automatically end quiz
          </p>
          <button
            type="button"
            onClick={() => onChange({ autoEnd: !schedule.autoEnd })}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
              schedule.autoEnd
                ? "border-indigo-400 bg-indigo-300"
                : "border-border bg-border"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                schedule.autoEnd ? "translate-x-[18px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
        <p className="text-[11px] text-text-secondary">
          {schedule.autoEnd
            ? "When the quiz ends, new participants can no longer start an attempt. Participants who are already taking the quiz follow the configured end behavior."
            : "Quiz remains live until you manually end it."}
        </p>
        {schedule.autoEnd && (
          <DateTimeField
            label="End date & time"
            date={schedule.endDate}
            time={schedule.endTime}
            onDateChange={(d) => onChange({ endDate: d })}
            onTimeChange={(t) => onChange({ endTime: t })}
            error={validationErrors.find((e) => e.includes("end"))}
            disabled={locked}
          />
        )}
        {schedule.autoEnd && schedule.endDate && schedule.endTime && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-card-hover px-3 py-2">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" />
            <p className="text-[11px] text-text-secondary">
              Participants will no longer be able to start the quiz after{" "}
              {formatTime12(schedule.endTime)}.
            </p>
          </div>
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
