"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { AdvancedConfig, LateJoinCutoff } from "./types";

export function AdvancedTiming({
  advanced,
  onChange,
}: {
  advanced: AdvancedConfig;
  onChange: (patch: Partial<AdvancedConfig>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Advanced Timing
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Late joining, rejoining, auto-submit
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-text-secondary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border px-5 py-4">
          <SwitchRow
            label="Allow participants to join after quiz starts"
            description="When enabled, participants can begin their attempts after the quiz has already started, as long as the quiz is still accepting new attempts."
            example="Quiz starts at 2:00 PM. A participant can still join at 2:20 PM."
            checked={advanced.lateJoining}
            onChange={(v) => onChange({ lateJoining: v })}
          />

          {advanced.lateJoining && (
            <div className="ml-0 space-y-2 pl-0">
              <p className="text-xs font-medium text-text-secondary">
                Stop accepting new attempts
              </p>
              <p className="text-[11px] text-text-secondary">
                Choose when late joining should stop.
              </p>
              <div className="space-y-1.5">
                {(
                  [
                    {
                      value: "15min_before",
                      label: "15 minutes before quiz ends",
                    },
                    { value: "at_end", label: "At quiz end" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-card-hover cursor-pointer",
                      advanced.lateJoinCutoff === opt.value
                        ? "border-pink-500/40"
                        : "border-border"
                    )}
                  >
                    <input
                      type="radio"
                      name="lateJoinCutoff"
                      checked={advanced.lateJoinCutoff === opt.value}
                      onChange={() =>
                        onChange({
                          lateJoinCutoff: opt.value as LateJoinCutoff,
                        })
                      }
                      className="accent-pink-500"
                    />
                    <span className="text-sm text-text-primary">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <SwitchRow
            label="Allow participants to rejoin"
            description="Participants can reconnect to an existing attempt after losing connection or refreshing the page. Their existing attempt time is preserved."
            note="The timer is attempt-based, not browser-based. Refreshing the page does not reset the timer."
            checked={advanced.rejoining}
            onChange={(v) => onChange({ rejoining: v })}
          />

          <div className="space-y-2">
            <SwitchRow
              label="Automatically submit when time expires"
              description="When a participant's allotted time runs out, their attempt is automatically submitted."
              checked={advanced.autoSubmit}
              onChange={(v) => onChange({ autoSubmit: v })}
            />
            {advanced.autoSubmit && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card-hover px-3 py-2">
                <Info className="h-3 w-3 shrink-0 text-text-muted" />
                <p className="text-[11px] text-text-secondary">
                  60-minute attempt → Time reaches 00:00 → Attempt
                  submitted
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SwitchRow({
  label,
  description,
  example,
  note,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  example?: string;
  note?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {description && (
            <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
          )}
          {example && (
            <p className="mt-1 text-[11px] text-text-muted italic">
              {example}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
            checked
              ? "border-pink-400 bg-pink-300"
              : "border-border bg-border"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              checked ? "translate-x-[18px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
      {note && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card-hover px-3 py-2">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" />
          <p className="text-[11px] text-text-secondary">{note}</p>
        </div>
      )}
    </div>
  );
}
