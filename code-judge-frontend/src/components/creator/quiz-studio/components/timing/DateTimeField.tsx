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
}: {
  label: string;
  date: string;
  time: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "flex-1 rounded-lg border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors",
            error
              ? "border-rose-500/50"
              : "border-input-border focus:border-indigo-500/60",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-28 rounded-lg border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors",
            error
              ? "border-rose-500/50"
              : "border-input-border focus:border-indigo-500/60",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
