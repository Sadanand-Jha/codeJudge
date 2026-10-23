"use client";

import { motion } from "framer-motion";
import { ArrowRight, Clock, User, CheckCircle2 } from "lucide-react";
import { formatTime12, toTimeString } from "./helpers";
import type { TimingState } from "./types";

export function ParticipantPreview({ state }: { state: TimingState }) {
  const { mode, schedule, manual } = state;

  const quizStart =
    mode === "schedule" && schedule.startDate && schedule.startTime
      ? formatTime12(schedule.startTime)
      : manual.startedAt
        ? formatTime12(toTimeString(new Date(manual.startedAt)))
        : null;

  const participantStart = quizStart ? "When they join" : null;

  const scheduledEnd =
    mode === "schedule" && schedule.endDate && schedule.endTime
      ? formatTime12(schedule.endTime)
      : null;

  const attemptEnd = mode === "schedule"
    ? scheduledEnd || "When the quiz ends"
    : participantStart
      ? "When you end the quiz"
      : null;

  const sessionEnd = null;

  return (
    <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-4 w-4 text-[var(--qs-brand)]" />
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--qs-muted)]">
          What participants will experience
        </h4>
      </div>

      <div className="flex flex-col items-start gap-0">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
        <PreviewStep
          icon={<Clock className="h-3 w-3" />}
          label="Quiz starts"
          time={quizStart || "Not set"}
          active={!!quizStart}
        />
        </motion.div>

        <div className="ml-[11px] h-4 w-px bg-[var(--qs-line)]" />

        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
        <PreviewStep
          icon={<User className="h-3 w-3" />}
          label="Participant starts"
          time={participantStart || "After you start the quiz"}
          active={!!participantStart}
        />
        </motion.div>

        <div className="ml-[11px] h-4 w-px bg-[var(--qs-line)]" />

        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
        <PreviewStep
          icon={<Clock className="h-3 w-3" />}
          label="Time per student"
          time={mode === "schedule" ? "Until the quiz ends" : `${participantDuration} minutes`}
          active={true}
        />
        </motion.div>

        <div className="ml-[11px] h-4 w-px bg-[var(--qs-line)]" />

        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        >
        <PreviewStep
          icon={<CheckCircle2 className="h-3 w-3" />}
          label="Attempt deadline"
          time={(participantStart ? attemptEnd : "Depends on start time") ?? "Depends on start time"}
          active={!!participantStart}
        />
        </motion.div>

        {sessionEnd && (
          <>
            <div className="ml-[11px] h-4 w-px bg-[var(--qs-line)]" />
            <PreviewStep
              icon={<Clock className="h-3 w-3" />}
              label="Quiz session ends"
              time={sessionEnd}
              active={true}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PreviewStep({
  icon,
  label,
  time,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]">
        {icon}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--qs-muted)]">{label}</span>
        <ArrowRight className="h-3 w-3 text-[var(--qs-muted)]" />
        <span
          className={
            active
              ? "text-xs font-bold text-[var(--qs-ink)]"
              : "text-xs font-medium italic text-[var(--qs-muted)]"
          }
        >
          {time}
        </span>
      </div>
    </div>
  );
}
