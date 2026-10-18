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
      "border-2 transition-colors",
      size === "lg"
        ? "rounded-[14px] px-7 py-3.5 text-sm font-extrabold"
        : "rounded-[12px] px-3 py-1.5 text-xs font-bold",
      active
        ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]"
        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
    );

  return (
    <div className="space-y-2">
      <label
        className={cn(
          "block text-[var(--qs-ink)]",
          size === "lg" ? "text-sm font-extrabold" : "text-xs font-bold"
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
          className={cn(
            chipClass(showCustom),
            !showCustom && "border-dashed"
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
            className="h-9 w-24 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)]"
          />
          <span className="text-xs font-medium text-[var(--qs-muted)]">minutes</span>
        </div>
      )}
      {helperText && (
        <p className="text-[11px] font-medium text-[var(--qs-muted)]">{helperText}</p>
      )}
    </div>
  );
}
