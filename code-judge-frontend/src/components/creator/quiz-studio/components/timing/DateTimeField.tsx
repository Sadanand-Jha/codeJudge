"use client";

import { cn } from "@/lib/helpers";

export function DateTimeField({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  error,
  disabled,
  onUseNow,
}: {
  label: string;
  date: string;
  time: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  onUseNow?: (offsetMinutes: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-bold text-[var(--qs-ink)]">
          {label}
        </label>
        {onUseNow && (
          <div className="flex items-center gap-1">
            {[1, 5].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => onUseNow(minutes)}
                disabled={disabled}
                aria-label={`Set start time ${minutes} minute${minutes === 1 ? "" : "s"} from now`}
                className={cn(
                  "rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)]",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                +{minutes}m
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "flex-1 rounded-[12px] border-2 bg-[var(--qs-surface)] px-3 py-2 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors",
            error
              ? "border-[var(--qs-bad)]/50"
              : "border-[var(--qs-line)] focus:border-[var(--qs-brand)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-28 rounded-[12px] border-2 bg-[var(--qs-surface)] px-3 py-2 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors",
            error
              ? "border-[var(--qs-bad)]/50"
              : "border-[var(--qs-line)] focus:border-[var(--qs-brand)]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
      {error && <p className="text-[11px] font-bold text-[var(--qs-bad)]">{error}</p>}
    </div>
  );
}
