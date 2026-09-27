"use client";

import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { DateTimeField } from "./DateTimeField";
import { ConfirmModal } from "./ConfirmModal";
import {
  toDateString,
  toTimeString,
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
  const [showEnd, setShowEnd] = useState(Boolean(schedule.endDate));

  const isScheduled = manualStatus === "scheduled";
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
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
        <DateTimeField
          label="Starts on"
          date={schedule.startDate}
          time={schedule.startTime}
          onDateChange={(d) => onChange({ startDate: d })}
          onTimeChange={(t) => onChange({ startTime: t })}
          error={validationErrors.find((e) => e.includes("start"))}
          disabled={locked}
        />
      </div>

      {/* ===== End date & time ===== */}
      <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
        <button
          type="button"
          onClick={() => setShowEnd((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold text-text-secondary"
          aria-expanded={showEnd}
        >
          <span>Set an end time <span className="font-normal text-text-muted">(optional)</span></span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showEnd ? "rotate-180" : ""}`} />
        </button>
        {showEnd && (
          <div className="mt-3">
            <DateTimeField
              label="Ends on"
              date={schedule.endDate}
              time={schedule.endTime}
              onDateChange={(d) => onChange({ endDate: d })}
              onTimeChange={(t) => onChange({ endTime: t })}
              error={endError}
              disabled={locked}
            />
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
