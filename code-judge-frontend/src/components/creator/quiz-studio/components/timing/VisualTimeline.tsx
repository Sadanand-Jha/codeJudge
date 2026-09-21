"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  formatDateTime,
  formatTime12,
  toTimeString,
} from "./helpers";
import type { TimingState } from "./types";

export function VisualTimeline({ state }: { state: TimingState }) {
  const { mode, schedule, manual } = state;
  const isScheduled = mode === "schedule";

  const steps = useMemo(() => {
    if (isScheduled) {
      return [
        {
          label: "Scheduled",
          time: schedule.startDate
            ? formatDateTime(schedule.startDate, schedule.startTime)
            : "\u2014",
          active: false,
          done: true,
        },
        {
          label: "Live",
          time: schedule.startTime
            ? formatTime12(schedule.startTime)
            : "\u2014",
          active: manual.status === "live",
          done: manual.status === "live" || manual.status === "ended",
        },
        {
          label: "Ends",
          time: schedule.endDate
            ? formatTime12(schedule.endTime || "23:59")
            : "Manual",
          active: false,
          done: manual.status === "ended",
        },
      ];
    }
    return [
      {
        label: "Live",
        time: manual.startedAt
          ? formatTime12(toTimeString(new Date(manual.startedAt)))
          : "",
        active: manual.status === "live",
        done: manual.status === "ended",
      },
      {
        label: "Ended",
        time: manual.endedAt
          ? formatTime12(toTimeString(new Date(manual.endedAt)))
          : "",
        active: false,
        done: manual.status === "ended",
      },
    ];
  }, [isScheduled, schedule, manual]);

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-3">
      {steps.map((step, i) => (
        <motion.div
          key={`${step.label}-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: i * 0.1 }}
          className="flex items-center"
        >
          <div className="flex flex-col items-center min-w-[80px]">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                step.active
                  ? "border-pink-500 bg-pink-500 text-white"
                  : step.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-border bg-card text-text-muted"
              )}
            >
              {step.done && !step.active ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            <p
              className={cn(
                "mt-1.5 text-[10px] font-semibold",
                step.active
                  ? "text-pink-500"
                  : step.done
                    ? "text-emerald-500"
                    : "text-text-muted"
              )}
            >
              {step.label}
            </p>
            {step.time && (
              <p className="text-[9px] text-text-muted">{step.time}</p>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-1 h-0.5 w-8 min-w-[20px] sm:w-12",
                step.done ? "bg-emerald-500" : "bg-border"
              )}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
