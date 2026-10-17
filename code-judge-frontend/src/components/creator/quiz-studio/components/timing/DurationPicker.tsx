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
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  presets?: number[];
  label?: string;
  helperText?: string;
  max?: number;
  size?: "md" | "lg";
}) {
  const isPresetMatch = presets.includes(value);
  const [showCustom, setShowCustom] = useState(!isPresetMatch);
  const [customVal, setCustomVal] = useState(
    isPresetMatch ? "" : String(value)
  );

  const chipClass = (active: boolean) =>
    cn(
      "border transition-colors",
      size === "lg"
        ? "rounded-xl px-7 py-3.5 text-base font-semibold"
        : "rounded-lg px-3 py-1.5 text-xs font-medium",
      active
        ? size === "lg"
          ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_8px_24px_rgba(236,72,153,0.35)]"
          : "border-pink-500/40 bg-pink-500/10 text-pink-600 dark:text-pink-400"
        : size === "lg"
          ? "border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300 dark:hover:bg-pink-500/20"
          : "border-border bg-card text-text-secondary hover:bg-card-hover"
    );

  return (
    <div className="space-y-2">
      <label
        className={cn(
          "block text-text-secondary",
          size === "lg" ? "text-sm font-semibold" : "text-xs font-medium"
        )}
      >
        {label}
      </label>
      <div className={cn("flex flex-wrap", size === "lg" ? "gap-2" : "gap-1.5")}>
        {presets.map((min) => (
          <button
            key={min}
            type="button"
            onClick={() => {
              setShowCustom(false);
              onChange(min);
            }}
            className={chipClass(value === min && !showCustom)}
          >
            {min} min
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowCustom((prev) => !prev)}
          className={chipClass(showCustom)}
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
            placeholder={`1–${max}`}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              if (raw === "") {
                setCustomVal("");
                return;
              }
              const n = Math.min(max, Math.max(1, parseInt(raw, 10)));
              setCustomVal(String(n));
              onChange(n);
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
