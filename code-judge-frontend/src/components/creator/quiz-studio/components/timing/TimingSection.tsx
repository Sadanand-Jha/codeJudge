"use client";

import { useState, useCallback, useMemo } from "react";
import { Clock, Calendar, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../../StudioProvider";
import { ScheduleMode } from "./ScheduleMode";
import { ManualMode } from "./ManualMode";
import { AdvancedTiming } from "./AdvancedTiming";
import { DurationPicker } from "./DurationPicker";
import { VisualTimeline } from "./VisualTimeline";
import { TimingSummary } from "./TimingSummary";
import { ParticipantPreview } from "./ParticipantPreview";
import {
  DEFAULT_SCHEDULE,
  DEFAULT_MANUAL,
  DEFAULT_ADVANCED,
  DURATION_PRESETS,
} from "./types";
import type {
  TimingMode,
  ScheduleConfig,
  ManualConfig,
  AdvancedConfig,
  TimingState,
} from "./types";
import { isPast, formatTime12, isStartAfterEnd } from "./helpers";

/** Combine separate date + time fields into a datetime-local string. */
function combineDateTime(date: string, time: string, fallbackTime: string) {
  return date ? `${date}T${time || fallbackTime}` : "";
}

export function TimingSection() {
  const { state, updateInfo } = useStudio();

  const [mode, setMode] = useState<TimingMode>("manual");
  const [schedule, setSchedule] = useState<ScheduleConfig>(DEFAULT_SCHEDULE);
  const [manual, setManual] = useState<ManualConfig>(DEFAULT_MANUAL);
  const [participantDuration, setParticipantDuration] = useState(
    state.info.duration || 60
  );
  const [advanced, setAdvanced] = useState<AdvancedConfig>(DEFAULT_ADVANCED);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (mode === "schedule") {
      if (schedule.startDate && isPast(schedule.startDate, schedule.startTime)) {
        errs.push(
          'Start time cannot be in the past. Choose a future start time or switch to "Start when I\'m ready."'
        );
      }
      if (
        schedule.endDate &&
        isStartAfterEnd(
          schedule.startDate,
          schedule.startTime,
          schedule.endDate,
          schedule.endTime
        )
      ) {
        errs.push("End time must be after the scheduled start time.");
      }
    }
    if (participantDuration <= 0) {
      errs.push("Enter a valid duration.");
    }
    return errs;
  }, [mode, schedule, participantDuration]);

  const handleScheduleChange = useCallback(
    (patch: Partial<ScheduleConfig>) => {
      const next = { ...schedule, ...patch };
      setSchedule(next);
      // Sync into studio info so saveToServer persists starttime/endtime.
      updateInfo({
        startDate: combineDateTime(next.startDate, next.startTime, "00:00"),
        endDate: next.endDate
          ? combineDateTime(next.endDate, next.endTime, "23:59")
          : "",
      });
      if (mode === "schedule" && patch.startDate) {
        setManual((prev) => ({ ...prev, status: "scheduled" }));
      }
    },
    [mode, schedule, updateInfo]
  );

  const handleManualChange = useCallback((patch: Partial<ManualConfig>) => {
    setManual((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleAdvancedChange = useCallback((patch: Partial<AdvancedConfig>) => {
    setAdvanced((prev) => ({ ...prev, ...patch }));
  }, []);

  const switchMode = (newMode: TimingMode) => {
    setMode(newMode);
    if (newMode === "schedule") {
      setManual((prev) => ({ ...prev, status: "scheduled" }));
      // Re-sync any already-entered schedule into the saved info.
      updateInfo({
        startDate: combineDateTime(schedule.startDate, schedule.startTime, "00:00"),
        endDate: schedule.endDate
          ? combineDateTime(schedule.endDate, schedule.endTime, "23:59")
          : "",
      });
    } else {
      setManual((prev) => ({ ...prev, status: "draft" }));
      // Manual mode has no fixed window — drop any stale scheduled values.
      updateInfo({ startDate: "", endDate: "" });
    }
  };

  const timingState: TimingState = {
    mode,
    schedule,
    manual,
    participantDuration,
    advanced,
    validationErrors,
  };

  const hasScheduleStart =
    mode === "schedule" && schedule.startDate && schedule.startTime;

  return (
    <div className="space-y-6">
      {/* How quiz timing works */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-pink-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            How quiz timing works
          </h4>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed mb-4">
          Choose when your quiz becomes live, how long each participant gets,
          and when the quiz should stop accepting new attempts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TimingConcept
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="When the quiz starts"
            description="Determines when the assessment becomes live and participants can begin."
          />
          <TimingConcept
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Participant time"
            description="How long an individual participant gets after they start their attempt."
          />
          <TimingConcept
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="When the quiz ends"
            description="When the overall assessment stops accepting new attempts."
          />
        </div>
      </div>

      {/* Start mode selection */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-text-primary">
          When should this quiz run?
        </h3>
        <p className="text-xs text-text-secondary">
          Choose how participants access the quiz.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModeCard
          active={mode === "schedule"}
          onClick={() => switchMode("schedule")}
          title="Schedule for later"
          description="The quiz starts automatically at the date and time you choose."
          bestFor="College exams, scheduled assessments, competitions, and events."
          example={
            schedule.startDate && schedule.startTime
              ? `Starts: ${formatTime12(schedule.startTime)}`
              : "Starts: 10:00 AM"
          }
        />
        <ModeCard
          active={mode === "manual"}
          onClick={() => switchMode("manual")}
          title="Start when I'm ready"
          description="The quiz stays ready until you manually start it."
          bestFor="Live classrooms, interviews, practice sessions, and situations where you want to gather everyone before starting."
          example="Ready → Start Quiz → Live"
        />
      </div>

      <VisualTimeline state={timingState} />

      {/* Dynamic explanation */}
      {mode === "schedule" && hasScheduleStart && (
        <div className="flex items-start gap-2 rounded-lg border border-pink-500/20 bg-pink-500/[0.04] px-3 py-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-500" />
          <p className="text-[11px] leading-relaxed text-pink-600 dark:text-pink-400">
            Your quiz will automatically become available on{" "}
            <strong>
              {schedule.startDate &&
                new Date(schedule.startDate).toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "long",
                })}
              {" at "}
              {formatTime12(schedule.startTime)}
            </strong>
            .
          </p>
        </div>
      )}

      {mode === "manual" && (manual.status === "draft" || manual.status === "ready") && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <p className="text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-400">
            Your quiz will remain inactive until you click{" "}
            <strong>Publish Quiz</strong>. Saving this quiz will not make it live
            immediately.
          </p>
        </div>
      )}

      {mode === "schedule" ? (
        <ScheduleMode
          schedule={schedule}
          onChange={handleScheduleChange}
          manualStatus={manual.status}
          validationErrors={validationErrors}
        />
      ) : (
        <ManualMode
          manual={manual}
          onManualChange={handleManualChange}
          participantDuration={participantDuration}
        />
      )}

      {/* Participant duration */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            How long does each participant get?
          </p>
          <Tooltip content="This is the amount of time each participant gets after starting their attempt. It is separate from when the overall quiz starts or ends.">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-text-muted text-[10px] text-text-muted cursor-help">
              ?
            </span>
          </Tooltip>
        </div>
        <DurationPicker
          value={participantDuration}
          onChange={(v) => {
            setParticipantDuration(v);
            updateInfo({ duration: v });
          }}
          presets={DURATION_PRESETS}
          label="Attempt Duration"
          helperText="Each participant gets up to this time once they begin their attempt."
        />
        <div className="flex items-start gap-2 rounded-lg border border-border bg-card-hover px-3 py-2">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-text-muted" />
          <p className="text-[11px] text-text-secondary">
            Example: Quiz starts at 2:00 PM. Participant time is {participantDuration} minutes. A
            participant who starts at 2:10 PM gets {participantDuration} minutes for their
            attempt.
          </p>
        </div>
      </div>

      {/* Quiz session explanation */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Quiz Session
          </h4>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed mb-2">
          The quiz session represents the period during which participants can
          start the assessment.
        </p>
        {mode === "schedule" && schedule.startDate && schedule.startTime ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-text-primary">
              {formatTime12(schedule.startTime)}
            </span>
            <ArrowRight className="h-3 w-3 text-text-muted" />
            {schedule.endDate ? (
              <span className="font-semibold text-text-primary">
                {formatTime12(schedule.endTime || "23:59")}
              </span>
            ) : (
              <span className="text-text-muted">Manual end</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic">
            Will be determined when you start the quiz.
          </p>
        )}
        <p className="mt-2 text-[11px] text-text-secondary">
          Participants may start during this window. Their individual attempt
          timer is separate.
        </p>
      </div>

      <AdvancedTiming advanced={advanced} onChange={handleAdvancedChange} />

      {/* Live participant preview */}
      <ParticipantPreview state={timingState} />

      {validationErrors.length > 0 && (
        <div className="space-y-1">
          {validationErrors.map((err) => (
            <p key={err} className="text-xs text-rose-500">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Before You Publish */}
      <TimingSummary state={timingState} />
    </div>
  );
}

function TimingConcept({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card-hover p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-pink-500">{icon}</span>
        <p className="text-xs font-semibold text-text-primary">{label}</p>
      </div>
      <p className="text-[11px] text-text-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  description,
  bestFor,
  example,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  bestFor: string;
  example: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        active
          ? "border-pink-500/50 bg-pink-500/[0.06] ring-1 ring-pink-500/20"
          : "border-border bg-card hover:bg-card-hover"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border-2",
            active ? "border-pink-500 bg-pink-500" : "border-border"
          )}
        >
          {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
        <p
          className={cn(
            "text-sm font-semibold",
            active
              ? "text-pink-600 dark:text-pink-400"
              : "text-text-primary"
          )}
        >
          {title}
        </p>
      </div>
      <p className="mt-2 text-xs text-text-secondary pl-6">{description}</p>
      <div className="mt-2 pl-6 space-y-1">
        <p className="text-[10px] text-text-muted">
          <span className="font-medium">Best for:</span> {bestFor}
        </p>
        <p className="text-[11px] font-medium text-text-primary">
          {example}
        </p>
      </div>
    </button>
  );
}

function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-card p-3 shadow-lg">
          <span className="text-[11px] leading-relaxed text-text-secondary">
            {content}
          </span>
        </span>
      )}
    </span>
  );
}
