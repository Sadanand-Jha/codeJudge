"use client";

import { useState } from "react";
import { cn } from "@/lib/helpers";
import { DURATION_PRESETS } from "./types";

export function DurationPicker({
  value,
  onChange,
  presets = DURATION_PRESETS,
  label = "Duration",
  helperText,
  max = 480,
}: {
  value: number;
  onChange: (v: number) => void;
  presets?: number[];
  label?: string;
  helperText?: string;
  max?: number;
}) {
  const isPresetMatch = presets.includes(value);
  const [showCustom, setShowCustom] = useState(!isPresetMatch);
  const [customVal, setCustomVal] = useState(
    isPresetMatch ? "" : String(value)
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => {
              setShowCustom(false);
              onChange(min);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              value === min && !showCustom
                ? "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400"
                : "border-border bg-card text-text-secondary hover:bg-card-hover"
            )}
          >
            {min} min
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((prev) => !prev)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            showCustom
              ? "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400"
              : "border-border bg-card text-text-secondary hover:bg-card-hover"
          )}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={max}
            value={customVal}
            onChange={(e) => {
              setCustomVal(e.target.value);
              const n = parseInt(e.target.value, 10);
              if (n > 0 && n <= max) onChange(n);
            }}
            className="h-9 w-24 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary outline-none focus:border-pink-500/60"
          />
          <span className="text-xs text-text-secondary">minutes</span>
        </div>
      )}
      {helperText && (
        <p className="text-[11px] text-text-secondary">{helperText}</p>
      )}
    </div>
  );
}
