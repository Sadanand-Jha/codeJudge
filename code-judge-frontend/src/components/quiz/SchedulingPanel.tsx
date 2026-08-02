"use client";

import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { QuizSchedule } from "@/types/quiz";

interface SchedulingPanelProps {
  schedule: QuizSchedule;
  onChange: (schedule: QuizSchedule) => void;
}

export default function SchedulingPanel({ schedule, onChange }: SchedulingPanelProps) {
  const update = (field: keyof QuizSchedule, value: string) => {
    onChange({ ...schedule, [field]: value || undefined });
  };

  const updateAttemptWindow = (field: "start" | "end", value: string) => {
    onChange({
      ...schedule,
      attemptWindow: {
        ...schedule.attemptWindow,
        start: schedule.attemptWindow?.start || "",
        end: schedule.attemptWindow?.end || "",
        [field]: value || undefined,
      } as any,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-[#EC4899]" />
        <h3 className="text-sm font-semibold text-white">Scheduling</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Visible From</label>
          <input
            type="datetime-local"
            value={schedule.visibleFrom || ""}
            onChange={(e) => update("visibleFrom", e.target.value)}
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Visible Until</label>
          <input
            type="datetime-local"
            value={schedule.visibleUntil || ""}
            onChange={(e) => update("visibleUntil", e.target.value)}
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Registration Deadline</label>
          <input
            type="datetime-local"
            value={schedule.registrationDeadline || ""}
            onChange={(e) => update("registrationDeadline", e.target.value)}
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Attempt Window Start</label>
          <input
            type="datetime-local"
            value={schedule.attemptWindow?.start || ""}
            onChange={(e) => updateAttemptWindow("start", e.target.value)}
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[#9CA3AF]">Attempt Window End</label>
          <input
            type="datetime-local"
            value={schedule.attemptWindow?.end || ""}
            onChange={(e) => updateAttemptWindow("end", e.target.value)}
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#111827] px-3 text-xs text-white focus:border-[#EC4899] focus:outline-none"
          />
        </div>
      </div>
    </motion.div>
  );
}