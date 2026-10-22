"use client";

import { useEffect, useState } from "react";
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
  allowStartNow = true,
}: {
  schedule: ScheduleConfig;
  onChange: (patch: Partial<ScheduleConfig>) => void;
  manualStatus: QuizLifecycle;
  validationErrors: string[];
  allowStartNow?: boolean;
}) {
  const [startNowOpen, setStartNowOpen] = useState(false);
  const [showEnd, setShowEnd] = useState(Boolean(schedule.endDate));

  useEffect(() => {
    if (schedule.endDate) setShowEnd(true);
  }, [schedule.endDate]);

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
      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 sm:p-4">
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
      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 sm:p-4">
        <button
          type="button"
          onClick={() => setShowEnd((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left text-xs font-bold text-[var(--qs-ink)]"
          aria-expanded={showEnd}
        >
          <span>Set an end time <span className="font-medium text-[var(--qs-muted)]">(optional)</span></span>
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

      {allowStartNow && isScheduled && schedule.startDate && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStartNowOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-3 py-1.5 text-xs font-extrabold text-white shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
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
