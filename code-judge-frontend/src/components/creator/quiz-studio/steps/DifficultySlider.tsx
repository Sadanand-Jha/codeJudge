"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/helpers";

export interface DifficultySliderOption {
  id: string | number;
  heading: string;
}

const DIFFICULTY_TEXT_COLORS: Record<string, string> = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-orange-600 dark:text-orange-400",
  expert: "text-rose-600 dark:text-rose-400",
};

/** Pipe fill colours — the coloured portion always matches the active level. */
const DIFFICULTY_TRACK_COLORS: Record<string, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-orange-500",
  expert: "bg-rose-500",
};

/**
 * Sliding difficulty selector (same look everywhere): a muted rail with a
 * coloured fill that stops at the knob, a spring-animated knob, and per-option
 * labels beneath. The fill colour tracks the active difficulty.
 */
export function DifficultySlider({
  options,
  selectedId,
  selectedHeading,
  onSelect,
}: {
  options: DifficultySliderOption[];
  selectedId?: string | number | "" | null;
  selectedHeading: string;
  onSelect: (option: DifficultySliderOption) => void;
}) {
  if (options.length === 0) {
    return <p className="text-[11px] text-text-muted">Loading difficulty options…</p>;
  }
  const found = options.findIndex((opt) =>
    selectedId !== "" && selectedId != null
      ? String(selectedId) === String(opt.id)
      : selectedHeading.toLowerCase() === opt.heading.toLowerCase()
  );
  const selectedIndex = found >= 0 ? found : 0;
  const n = options.length;
  const pos = (i: number) => (n === 1 ? 50 : (i * 100) / (n - 1));
  const selected = options[selectedIndex];
  const selectedColor =
    DIFFICULTY_TEXT_COLORS[selected.heading.toLowerCase()] ?? "text-text-primary";
  const selectedTrack =
    DIFFICULTY_TRACK_COLORS[selected.heading.toLowerCase()] ?? "bg-violet-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 pb-1.5 pt-2.5 dark:border-border dark:bg-card">
      <p className={cn("text-center text-[12px] font-extrabold capitalize", selectedColor)}>
        {selected.heading}
      </p>
      {/* Compact control: slim track and a smaller knob, together with a
          shorter container, so the difficulty selector stays low-profile. */}
      <div className="relative mt-2 h-[36px]">
        <div className="absolute inset-x-5 top-0 h-[36px]">
          {/* Muted rail — the portion to the right of the knob stays grey. */}
          <div className="absolute inset-x-0 top-1 h-4 rounded-full bg-gray-200 shadow-inner dark:bg-white/10" />
          {/* Coloured fill — runs from the left edge to the knob and takes the
              colour of the active difficulty. */}
          <motion.div
            className={cn("absolute left-0 top-1 h-4 rounded-full", selectedTrack)}
            animate={{ width: `${pos(selectedIndex)}%` }}
            transition={{ type: "spring", stiffness: 420, damping: 25 }}
          />
          <motion.span
            className="pointer-events-none absolute top-0 z-30 h-6 w-6 -translate-x-1/2 rounded-full border-[3px] border-white bg-white shadow-[0_3px_10px_rgba(30,41,59,0.28)]"
            animate={{ left: `${pos(selectedIndex)}%` }}
            transition={{ type: "spring", stiffness: 420, damping: 25 }}
          />
          <input
            type="range"
            min={0}
            max={n - 1}
            step={1}
            value={selectedIndex}
            onChange={(e) => {
              const opt = options[Number(e.target.value)];
              if (opt) onSelect(opt);
            }}
            aria-label="Select difficulty"
            className="absolute inset-x-0 top-0 z-40 h-6 w-full cursor-grab opacity-0 active:cursor-grabbing"
          />
          {options.map((opt, i) => (
            <span
              key={opt.id}
              className={cn(
                "absolute top-[22px] max-w-[72px] -translate-x-1/2 truncate text-[8px] font-bold capitalize",
                i === selectedIndex
                  ? DIFFICULTY_TEXT_COLORS[opt.heading.toLowerCase()] ?? "text-text-primary"
                  : "text-text-muted"
              )}
              style={{ left: `${pos(i)}%` }}
            >
              {opt.heading}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
