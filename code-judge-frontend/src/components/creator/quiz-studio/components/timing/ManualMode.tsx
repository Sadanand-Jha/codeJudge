"use client";

import { useState } from "react";
import { Clock, Play, Square, Radio, Users, Info } from "lucide-react";
import { cn } from "@/lib/helpers";
import { ConfirmModal } from "./ConfirmModal";
import { DurationPicker } from "./DurationPicker";
import { formatRelativeTime } from "./helpers";
import type { ManualConfig } from "./types";
import { SESSION_DURATION_PRESETS } from "./types";

export function ManualMode({
  manual,
  onManualChange,
  participantDuration,
}: {
  manual: ManualConfig;
  onManualChange: (patch: Partial<ManualConfig>) => void;
  participantDuration: number;
}) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const isReady = manual.status === "ready" || manual.status === "draft";
  const isLive = manual.status === "live";
  const isEnded = manual.status === "ended";

  const mockParticipants = 42;
  const mockParticipating = 31;

  return (
    <div className="space-y-5">
      {isReady && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-hover">
              <Clock className="h-5 w-5 text-text-muted" />
            </div>
            <h4 className="text-sm font-bold text-text-primary">
              Not Started
            </h4>
            <p className="mt-1 text-xs text-text-secondary">
              This quiz is ready to start.
            </p>
            <button
              type="button"
              onClick={() => setStartOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
            >
              <Play className="h-4 w-4" />
              Start Quiz
            </button>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <p className="text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-400">
              You can start the quiz whenever you are ready. Participants will
              be able to begin their attempts once you click Start Quiz.
            </p>
          </div>
        </div>
      )}

      {isLive && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Radio className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Live
                </h4>
                <p className="text-xs text-text-secondary">
                  Started{" "}
                  {manual.startedAt
                    ? formatRelativeTime(manual.startedAt)
                    : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {mockParticipating} participating
              </span>
              <span>{mockParticipants} registered</span>
            </div>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setEndOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
            >
              <Square className="h-3.5 w-3.5" />
              End Quiz
            </button>
            <p className="text-[11px] text-text-secondary">
              Ending the quiz stops the overall quiz session. You will be asked
              to confirm before ending it.
            </p>
          </div>
        </div>
      )}

      {isEnded && (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-hover">
            <Square className="h-5 w-5 text-text-muted" />
          </div>
          <h4 className="text-sm font-bold text-text-primary">Ended</h4>
          <p className="mt-1 text-xs text-text-secondary">
            Quiz ended{" "}
            {manual.endedAt ? formatRelativeTime(manual.endedAt) : ""}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          End behavior
        </p>
        <p className="text-[11px] text-text-secondary">
          Choose what happens when the quiz session ends.
        </p>
        <div className="space-y-2">
          <label
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-card-hover cursor-pointer",
              manual.endBehavior === "manual"
                ? "border-indigo-500/40"
                : "border-border"
            )}
          >
            <input
              type="radio"
              name="endBehavior"
              checked={manual.endBehavior === "manual"}
              onChange={() => onManualChange({ endBehavior: "manual" })}
              className="accent-indigo-500"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Keep running until I end it
              </p>
              <p className="text-[11px] text-text-secondary">
                You control when the quiz stops. Useful when you want full
                control over the session.
              </p>
            </div>
          </label>
          <label
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-card-hover cursor-pointer",
              manual.endBehavior === "auto_duration"
                ? "border-indigo-500/40"
                : "border-border"
            )}
          >
            <input
              type="radio"
              name="endBehavior"
              checked={manual.endBehavior === "auto_duration"}
              onChange={() =>
                onManualChange({ endBehavior: "auto_duration" })
              }
              className="accent-indigo-500"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Automatically end after a fixed duration
              </p>
              <p className="text-[11px] text-text-secondary">
                Quiz stops after the configured session duration. Useful for
                timed assessments with a fixed window.
              </p>
            </div>
          </label>
        </div>
        {manual.endBehavior === "auto_duration" && (
          <div className="rounded-lg border border-border bg-card-hover p-3">
            <DurationPicker
              value={manual.sessionDuration}
              onChange={(v) => onManualChange({ sessionDuration: v })}
              presets={SESSION_DURATION_PRESETS}
              label="Quiz Session Duration"
              helperText="Once started, the quiz will automatically end after this duration."
            />
          </div>
        )}
      </div>

      <ConfirmModal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        onConfirm={() => {
          onManualChange({
            status: "live",
            startedAt: new Date().toISOString(),
          });
          setStartOpen(false);
        }}
        title="Start this quiz?"
        description="Starting the quiz will make it available to registered participants. They can begin their attempts immediately."
        details={[
          {
            label: "Duration",
            value: `${participantDuration} minutes per participant`,
          },
          {
            label: "Participants",
            value: `${mockParticipants} registered`,
          },
        ]}
        confirmLabel="Start Quiz"
        confirmColor="emerald"
      />

      <ConfirmModal
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onConfirm={() => {
          onManualChange({
            status: "ended",
            endedAt: new Date().toISOString(),
          });
          setEndOpen(false);
        }}
        title="End this quiz?"
        description="New participants will no longer be able to start the quiz. Participants who are already taking the quiz will follow the configured end behavior."
        details={[
          {
            label: "Registered",
            value: `${mockParticipants}`,
          },
          {
            label: "Currently participating",
            value: `${mockParticipating}`,
          },
        ]}
        confirmLabel="End Quiz"
        confirmColor="rose"
      />
    </div>
  );
}
