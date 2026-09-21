"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, ArrowRight, Info } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../../StudioProvider";
import { updateQuizStatus } from "@/services/quiz";
import { ScheduleMode } from "./ScheduleMode";
import { ManualMode } from "./ManualMode";
import { AdvancedTiming } from "./AdvancedTiming";
import { DurationPicker } from "./DurationPicker";
import { VisualTimeline } from "./VisualTimeline";
import { TimingSummary } from "./TimingSummary";
import { ParticipantPreview } from "./ParticipantPreview";
import { ModeLockModal } from "./ModeLockModal";
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
  const quizId = state.serverQuizId ?? undefined;

  const [mode, setMode] = useState<TimingMode>("manual");
  const [schedule, setSchedule] = useState<ScheduleConfig>(DEFAULT_SCHEDULE);
  const [manual, setManual] = useState<ManualConfig>(DEFAULT_MANUAL);
  const [participantDuration, setParticipantDuration] = useState(
    state.info.duration || 60
  );
  const [advanced, setAdvanced] = useState<AdvancedConfig>(DEFAULT_ADVANCED);
  const [modeLockModal, setModeLockModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<TimingMode | null>(null);

  // Hydrate manual/schedule mode from server-loaded quiz status
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    const lc = state.info.quizLifecycle;
    if (!state.editMode || !state.serverQuizId) return;
    // Wait until server data is loaded (title non-empty means data arrived)
    if (!state.info.title) return;

    hydratedRef.current = true;

    if (lc === "live" || lc === "ended") {
      setManual((prev) => ({
        ...prev,
        status: lc,
        startedAt: state.info.startDate || prev.startedAt,
        endedAt: state.info.endDate || prev.endedAt,
      }));
    } else if (lc === "scheduled") {
      setMode("schedule");
      if (state.info.startDate) {
        const dt = new Date(state.info.startDate);
        setSchedule((prev) => ({
          ...prev,
          startDate: dt.toISOString().split("T")[0],
          startTime: dt.toTimeString().slice(0, 5),
        }));
      }
    }
    // "draft" → keep defaults
  }, [state.editMode, state.serverQuizId, state.info.title, state.info.quizLifecycle, state.info.startDate, state.info.endDate]);

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

    // Compute studio info updates outside setManual to avoid nested setState.
    const nextManual = { ...manual, ...patch };
    const isLiveTransition = patch.status === "live" || (nextManual.status === "live" && (patch.sessionDuration !== undefined || patch.endBehavior !== undefined || patch.startedAt));
    if (isLiveTransition && nextManual.status === "live") {
      const now = new Date();
      const startStr = now.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
      if (nextManual.endBehavior === "auto_duration" && nextManual.sessionDuration > 0) {
        const end = new Date(now.getTime() + nextManual.sessionDuration * 60 * 1000);
        const endStr = end.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
        updateInfo({ startDate: startStr, endDate: endStr });
      } else {
        updateInfo({ startDate: startStr, endDate: "" });
      }
    } else if (patch.status === "ended" || (nextManual.status === "ended" && patch.endedAt)) {
      const now = new Date();
      const endStr = now.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
      updateInfo({ endDate: endStr });
    } else if (nextManual.status === "live" && nextManual.endBehavior === "auto_duration" && patch.sessionDuration !== undefined) {
      const startedAt = nextManual.startedAt ? new Date(nextManual.startedAt) : new Date();
      const end = new Date(startedAt.getTime() + nextManual.sessionDuration * 60 * 1000);
      const endStr = end.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
      updateInfo({ endDate: endStr });
    }
  }, [manual, updateInfo]);

  const handleAdvancedChange = useCallback((patch: Partial<AdvancedConfig>) => {
    setAdvanced((prev) => ({ ...prev, ...patch }));
  }, []);

  const switchMode = (newMode: TimingMode) => {
    if (isQuizActive) return;
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

  const isQuizActive = manual.status === "live";

  return (
    <div className="mx-auto w-full max-w-none min-w-0 overflow-x-hidden">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.65fr_0.95fr] lg:items-start min-w-0">
        {/* LEFT — main flow */}
        <div className="min-w-0 space-y-4 sm:space-y-6 overflow-hidden">
          {/* How quiz timing works */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-xl border border-zinc-200 lg:border-border bg-zinc-50 lg:bg-card p-3 sm:p-5 min-w-0 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-3 min-w-0">
              <Clock className="h-4 w-4 text-pink-500 shrink-0" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary break-words">
                How quiz timing works
              </h4>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-4 break-words">
              Choose when your quiz becomes live, how long each participant gets,
              and when the quiz should stop accepting new attempts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
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
          </motion.div>

          {/* Start mode selection */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-1 min-w-0 px-1"
          >
            <h3 className="text-sm font-bold text-zinc-900 lg:text-text-primary break-words">
              When should this quiz run?
            </h3>
            <p className="text-xs text-text-secondary break-words">
              Choose how participants access the quiz.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 min-w-0"
          >
            <ModeCard
              active={mode === "schedule"}
              onClick={() => {
                if (isQuizActive) { setPendingMode("schedule"); setModeLockModal(true); return; }
                switchMode("schedule");
              }}
              title="Schedule for later"
              description="The quiz starts automatically at the date and time you choose."
              bestFor="College exams, scheduled assessments, competitions, and events."
              example={
                schedule.startDate && schedule.startTime
                  ? `Starts: ${formatTime12(schedule.startTime)}`
                  : "Starts: —"
              }
            />
            <ModeCard
              active={mode === "manual"}
              onClick={() => {
                if (isQuizActive) { setPendingMode("manual"); setModeLockModal(true); return; }
                switchMode("manual");
              }}
              title="Start when I'm ready"
              description="The quiz stays ready until you manually start it."
              bestFor="Live classrooms, interviews, practice sessions, and situations where you want to gather everyone before starting."
              example="Ready → Start Quiz → Live"
            />
          </motion.div>

          <div className="flex justify-center">
            <VisualTimeline state={timingState} />
          </div>

      {/* Dynamic explanation */}
      <AnimatePresence>
      {mode === "schedule" && hasScheduleStart && (
        <motion.div
          key="schedule-hint"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-2 rounded-lg border border-pink-500/20 bg-pink-500/[0.04] px-3 py-2.5"
        >
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
        </motion.div>
      )}

      {mode === "manual" && manual.status === "live" && (
        <motion.div
          key="manual-hint"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <p className="text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-400">
            Your quiz will remain inactive until you click{" "}
            <strong>Start Quiz</strong>. Saving this quiz will not make it live
            immediately.
          </p>
        </motion.div>
      )}
      </AnimatePresence>

          <AnimatePresence mode="wait">
            {mode === "schedule" ? (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
              >
                <ScheduleMode
                  schedule={schedule}
                  onChange={handleScheduleChange}
                  manualStatus={manual.status}
                  validationErrors={validationErrors}
                />
              </motion.div>
            ) : (
              <motion.div
                key="manual"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
              >
                <ManualMode
                  manual={manual}
                  onManualChange={handleManualChange}
                  participantDuration={participantDuration}
                  quizId={quizId}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Participant duration */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-2"
          >
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
          </motion.div>

          {validationErrors.length > 0 && (
            <div className="space-y-1">
              {validationErrors.map((err) => (
                <p key={err} className="text-xs text-rose-500">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — sticky rail */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-[72px]">
          {/* Quiz session explanation */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-5"
          >
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
          </motion.div>

          <ParticipantPreview state={timingState} />
          <TimingSummary state={timingState} />
          <AdvancedTiming advanced={advanced} onChange={handleAdvancedChange} />
        </aside>
      </div>

      {/* Mode lock modal */}
      <ModeLockModal
        open={modeLockModal}
        onClose={() => { setModeLockModal(false); setPendingMode(null); }}
        onConfirm={async () => {
          if (quizId) {
            try {
              await updateQuizStatus(quizId, "ended");
            } catch {
              /* ignore — proceed with local state change anyway */
            }
          }
          setManual((prev) => ({ ...prev, status: "ended", endedAt: new Date().toISOString() }));
          setModeLockModal(false);
          if (pendingMode) {
            switchMode(pendingMode);
            setPendingMode(null);
          }
        }}
        currentModeLabel={mode === "schedule" ? "Schedule for later" : "Start when I'm ready"}
        status={manual.status === "ended" ? "ended" : "live"}
      />
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-xl border border-zinc-200 lg:border-border bg-white lg:bg-card-hover p-3 min-w-0 overflow-hidden"
    >
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <span className="text-pink-500 shrink-0">{icon}</span>
        <p className="text-xs font-semibold text-zinc-900 lg:text-text-primary break-words min-w-0">{label}</p>
      </div>
      <p className="text-[11px] text-zinc-600 lg:text-text-secondary leading-relaxed break-words">
        {description}
      </p>
    </motion.div>
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
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "rounded-2xl lg:rounded-xl border p-3 sm:p-4 text-left transition-all min-w-0 overflow-hidden w-full",
        active
          ? "border-pink-500/50 bg-pink-50 lg:bg-pink-500/[0.06] ring-1 ring-pink-500/20"
          : "border-zinc-200 lg:border-border bg-white lg:bg-card hover:bg-zinc-50 lg:hover:bg-card-hover"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
            active ? "border-pink-500 bg-pink-500" : "border-zinc-300 lg:border-border"
          )}
        >
          {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
        </div>
        <p
          className={cn(
            "text-sm font-semibold break-words min-w-0",
            active
              ? "text-pink-600 dark:text-pink-400"
              : "text-zinc-900 lg:text-text-primary"
          )}
        >
          {title}
        </p>
      </div>
      <p className="mt-2 text-xs text-zinc-600 lg:text-text-secondary pl-6 break-words leading-relaxed">{description}</p>
      <div className="mt-2 pl-6 space-y-1 min-w-0">
        <p className="text-[10px] text-zinc-500 lg:text-text-muted break-words leading-relaxed">
          <span className="font-medium">Best for:</span> {bestFor}
        </p>
        <p className="text-[11px] font-medium text-zinc-900 lg:text-text-primary break-words">
          {example}
        </p>
      </div>
    </motion.button>
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
