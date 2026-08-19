"use client";

import { cn } from "@/lib/helpers";

export type QuestionStatus = "not-visited" | "not-answered" | "answered" | "marked" | "answered-marked";

export interface PaletteEntry {
  index: number;
  status: QuestionStatus;
}

const STATUS_DOT: Record<QuestionStatus, string> = {
  "not-visited": "bg-border-hover text-text-muted",
  "not-answered": "bg-rose-500 text-white",
  answered: "bg-emerald-500 text-white",
  marked: "bg-violet-500 text-white",
  "answered-marked": "bg-violet-500 text-white ring-2 ring-violet-300",
};

const LEGEND: { status: QuestionStatus; label: string; swatch: string }[] = [
  { status: "answered", label: "Answered", swatch: "bg-emerald-500" },
  { status: "not-answered", label: "Not answered", swatch: "bg-rose-500" },
  { status: "marked", label: "Marked for review", swatch: "bg-violet-500" },
  { status: "not-visited", label: "Not visited", swatch: "bg-card-hover" },
];

export function QuestionPalette({
  entries,
  currentIndex,
  onSelect,
}: {
  entries: PaletteEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-5">
        {entries.map((e) => {
          const active = e.index === currentIndex;
          return (
            <button
              key={e.index}
              onClick={() => onSelect(e.index)}
              aria-label={`Question ${e.index}`}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold transition-all",
                STATUS_DOT[e.status],
                e.status === "answered-marked" && "ring-2 ring-violet-300/70",
                active && "scale-110 ring-2 ring-pink-500 dark:ring-ai-accent"
              )}
            >
              {e.index}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        {LEGEND.map((l) => (
          <div key={l.status} className="flex items-center gap-2 text-[10px] text-text-secondary">
            <span className={cn("h-2.5 w-2.5 rounded", l.swatch)} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}