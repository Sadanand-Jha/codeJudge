"use client";

import { ArrowRight, Clock, User, CheckCircle2 } from "lucide-react";
import { formatTime12 } from "./helpers";
import type { TimingState } from "./types";

export function ParticipantPreview({ state }: { state: TimingState }) {
  const { mode, schedule, manual, participantDuration } = state;

  const quizStart =
    mode === "schedule" && schedule.startDate && schedule.startTime
      ? formatTime12(schedule.startTime)
      : manual.startedAt
        ? formatTime12(
            new Date(manual.startedAt).toTimeString().slice(0, 5)
          )
        : null;

  const participantStart = quizStart ? "2:12 PM" : null;

  const attemptEndMinutes = participantDuration;
  const attemptEndHour = 14;
  const attemptEndMin = 12 + attemptEndMinutes;
  const attemptEnd =
    attemptEndMinutes <= 60
      ? `${attemptEndHour}:${String(attemptEndMin).padStart(2, "0")} PM`
      : "3:12 PM";

  const sessionEnd =
    mode === "schedule" && schedule.autoEnd && schedule.endTime
      ? formatTime12(schedule.endTime)
      : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-4 w-4 text-indigo-500" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          What participants will experience
        </h4>
      </div>

      <div className="flex flex-col items-start gap-0">
        <PreviewStep
          icon={<Clock className="h-3 w-3" />}
          label="Quiz starts"
          time={quizStart || "Not set"}
          active={!!quizStart}
        />

        <div className="ml-[11px] h-4 w-px bg-border" />

        <PreviewStep
          icon={<User className="h-3 w-3" />}
          label="Participant starts"
          time={participantStart || "After you start the quiz"}
          active={!!participantStart}
        />

        <div className="ml-[11px] h-4 w-px bg-border" />

        <PreviewStep
          icon={<Clock className="h-3 w-3" />}
          label="Participant gets"
          time={`${participantDuration} minutes`}
          active={true}
        />

        <div className="ml-[11px] h-4 w-px bg-border" />

        <PreviewStep
          icon={<CheckCircle2 className="h-3 w-3" />}
          label="Attempt deadline"
          time={participantStart ? attemptEnd : "Depends on start time"}
          active={!!participantStart}
        />

        {sessionEnd && (
          <>
            <div className="ml-[11px] h-4 w-px bg-border" />
            <PreviewStep
              icon={<Clock className="h-3 w-3" />}
              label="Quiz session ends"
              time={sessionEnd}
              active={true}
            />
          </>
        )}
      </div>

      <p className="mt-4 text-[11px] text-text-secondary leading-relaxed">
        {mode === "schedule" && schedule.startDate ? (
          <>
            Participants can start their attempt during the quiz window. Each
            participant gets {participantDuration} minutes once they begin.
          </>
        ) : manual.status === "live" ? (
          <>
            The quiz is currently live. Each participant gets{" "}
            {participantDuration} minutes once they begin their attempt.
          </>
        ) : (
          <>
            Once you start the quiz, participants will be able to begin their
            attempts. Each participant gets {participantDuration} minutes.
          </>
        )}
      </p>
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
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-text-muted">
        {icon}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-secondary">{label}</span>
        <ArrowRight className="h-3 w-3 text-text-muted" />
        <span
          className={
            active
              ? "text-xs font-semibold text-text-primary"
              : "text-xs text-text-muted italic"
          }
        >
          {time}
        </span>
      </div>
    </div>
  );
}
