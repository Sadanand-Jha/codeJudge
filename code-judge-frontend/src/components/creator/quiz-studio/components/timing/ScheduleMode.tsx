"use client";

import { DateTimeField } from "./DateTimeField";
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
    </div>
  );
}
