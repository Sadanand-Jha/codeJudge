"use client";

import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDateTime, toTimeString } from "./helpers";
import type { TimingState } from "./types";
import { LIFECYCLE_META } from "./types";
import { Badge } from "../../primitives";

export function TimingSummary({ state }: { state: TimingState }) {
  const { mode, schedule, manual } = state;
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
    label: "Responses",
    value: mode === "schedule" ? "Until the quiz ends" : "Until you end the quiz",
  });

  // Advanced timing is temporarily hidden from the studio.
  // rows.push({
  //   label: "Late joining",
  //   value: advanced.lateJoining ? "Allowed" : "Disabled",
  // });
  //
  // rows.push({
  //   label: "Rejoining",
  //   value: advanced.rejoining ? "Allowed" : "Disabled",
  // });
  //
  // rows.push({
  //   label: "Auto-submit",
  //   value: advanced.autoSubmit ? "Enabled" : "Disabled",
  // });

  const warnings: string[] = [];

  return (
    <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
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
            <span className="text-xs font-medium text-[var(--qs-muted)]">{row.label}</span>
            <span className="text-xs font-bold text-[var(--qs-ink)]">
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
              className="flex items-start gap-2 rounded-[12px] border-2 border-[#a85d00]/30 bg-[#fff3d6] px-3 py-2"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a85d00]" />
              <p className="text-[11px] font-medium text-[#a85d00]">
                {w}
              </p>
            </div>
          ))}
        </div>
      )}

      {warnings.length === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-ok)]/30 bg-[var(--qs-okbg)] px-3 py-2.5">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-ok)]" />
          <p className="text-[11px] font-medium text-[var(--qs-ok)]">
            {mode === "schedule"
              ? "Participants can join and answer throughout the scheduled window. Responses close automatically at the end time."
              : "Everything looks good. Responses remain open until you end the quiz."}
          </p>
        </div>
      )}
    </div>
  );
}
