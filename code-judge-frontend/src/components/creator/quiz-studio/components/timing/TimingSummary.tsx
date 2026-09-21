"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDateTime, toTimeString } from "./helpers";
import type { TimingState } from "./types";
import { LIFECYCLE_META } from "./types";
import { Badge } from "../../primitives";

export function TimingSummary({ state }: { state: TimingState }) {
  const { mode, schedule, manual, participantDuration, advanced } = state;
  const meta = LIFECYCLE_META[manual.status];

  const rows: { label: string; value: string }[] = [
    { label: "Start mode", value: mode === "schedule" ? "Scheduled" : "Manual" },
  ];

  if (mode === "schedule") {
    if (schedule.startDate) {
      rows.push({
        label: "Quiz starts",
        value: formatDateTime(schedule.startDate, schedule.startTime),
      });
    }
    rows.push({
      label: "Quiz ends",
      value: schedule.endDate
        ? formatDateTime(schedule.endDate, schedule.endTime)
        : "Manual end",
    });
  } else {
    rows.push({ label: "Status", value: meta.label });
    if (manual.startedAt) {
      rows.push({
        label: "Started",
        value: formatDateTime(
          manual.startedAt.split("T")[0],
          toTimeString(new Date(manual.startedAt))
        ),
      });
    }
  }

  rows.push({
    label: "Participant time",
    value: `${participantDuration} minutes`,
  });

  rows.push({
    label: "Late joining",
    value: advanced.lateJoining ? "Allowed" : "Disabled",
  });

  rows.push({
    label: "Rejoining",
    value: advanced.rejoining ? "Allowed" : "Disabled",
  });

  rows.push({
    label: "Auto-submit",
    value: advanced.autoSubmit ? "Enabled" : "Disabled",
  });

  const warnings: string[] = [];

  if (
    mode === "manual" &&
    manual.endBehavior === "auto_duration" &&
    manual.sessionDuration < participantDuration
  ) {
    warnings.push(
      `The quiz session duration (${manual.sessionDuration} min) is shorter than the participant attempt time (${participantDuration} min). Participants may not get the full allotted time.`
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Timing Check
        </h4>
        <Badge color={meta.color}>{meta.label}</Badge>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            className="flex items-center justify-between"
          >
            <span className="text-xs text-text-secondary">{row.label}</span>
            <span className="text-xs font-semibold text-text-primary">
              {row.value}
            </span>
          </motion.div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((w) => (
            <div
              key={w}
              className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {w}
              </p>
            </div>
          ))}
        </div>
      )}

      {warnings.length === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Everything looks good. Participants will be able to start the quiz
            during the configured window and will receive the configured attempt
            duration.
          </p>
        </div>
      )}
    </div>
  );
}
