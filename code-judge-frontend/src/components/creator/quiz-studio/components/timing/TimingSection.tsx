"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CalendarClock, Clock, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../../StudioProvider";
import { updateQuizStatus } from "@/services/quiz";
import { ScheduleMode } from "./ScheduleMode";
import { ManualMode } from "./ManualMode";
// Advanced timing is temporarily hidden from the studio.
// import { AdvancedTiming } from "./AdvancedTiming";
import { TimingSummary } from "./TimingSummary";
import { ParticipantPreview } from "./ParticipantPreview";
import { ModeLockModal } from "./ModeLockModal";
import { ConfirmModal } from "./ConfirmModal";
import {
  DEFAULT_SCHEDULE,
  DEFAULT_MANUAL,
  DEFAULT_ADVANCED,
} from "./types";
import type {
  TimingMode,
  ScheduleConfig,
  ManualConfig,
  AdvancedConfig,
  TimingState,
} from "./types";
import { isPast, formatTime12, isStartAfterEnd, toISTDateTimeParts } from "./helpers";
import { zonedDateTimeToISO } from "@/lib/timezone";

/** Combine date + time fields into an absolute ISO instant in the user's timezone. */
function combineDateTime(date: string, time: string, fallbackTime: string) {
  return date ? zonedDateTimeToISO(date, time || fallbackTime) : "";
}

export function TimingSection({
  variant = "full",
  allowInlineStart,
  flat = false,
}: {
  variant?: "full" | "rules" | "availability";
  /** Keep the inline Start Quiz action visible (edit mode uses it). */
  allowInlineStart?: boolean;
  /** Render without the outer card so it can sit inside a combined panel. */
  flat?: boolean;
}) {
  const { state, updateInfo, setHelpExtra, saveToServer } = useStudio();
  const quizId = state.serverQuizId ?? undefined;

  const [mode, setMode] = useState<TimingMode>("manual");
  const [schedule, setSchedule] = useState<ScheduleConfig>(DEFAULT_SCHEDULE);
  const [manual, setManual] = useState<ManualConfig>(DEFAULT_MANUAL);
  const [advanced, setAdvanced] = useState<AdvancedConfig>(DEFAULT_ADVANCED);
  const [allowPastSchedule] = useState(() => {
    if (!state.serverQuizId || state.info.quizLifecycle !== "scheduled") {
      return false;
    }
    const start = toISTDateTimeParts(state.info.startDate);
    return Boolean(start.date) && isPast(start.date, start.time);
  });
  const [modeLockModal, setModeLockModal] = useState(false);
  const [modeSwitchConfirmOpen, setModeSwitchConfirmOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<TimingMode | null>(null);
  const showLifecycle = variant !== "rules";
  const canStartInline = allowInlineStart ?? variant !== "availability";

  // Hydrate manual/schedule mode from server-loaded quiz status
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    const lc = state.info.quizLifecycle;
    if (!state.editMode || !state.serverQuizId) return;
    // Wait until server data is loaded (title non-empty means data arrived)
    if (!state.info.title) return;

    hydratedRef.current = true;

    queueMicrotask(() => {
      if (lc === "live" || lc === "ended") {
        setManual((prev) => ({
          ...prev,
          status: lc,
          startedAt: state.info.startDate || prev.startedAt,
          endedAt: state.info.endDate || prev.endedAt,
        }));
      } else if (lc === "scheduled") {
        setMode("schedule");
        setSchedule((prev) => {
          const start = toISTDateTimeParts(state.info.startDate);
          const end = toISTDateTimeParts(state.info.endDate);
          return {
            ...prev,
            startDate: start.date || prev.startDate,
            startTime: start.time || prev.startTime,
            endDate: end.date || prev.endDate,
            endTime: end.time || prev.endTime,
          };
        });
      }
    });
    // "draft" → keep defaults
  }, [state.editMode, state.serverQuizId, state.info.title, state.info.quizLifecycle, state.info.startDate, state.info.endDate]);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (mode === "schedule") {
      if (!allowPastSchedule && schedule.startDate && isPast(schedule.startDate, schedule.startTime)) {
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
    return errs;
  }, [mode, schedule, allowPastSchedule]);

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
        quizLifecycle: mode === "schedule" && next.startDate ? "scheduled" : "draft",
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
      if (nextManual.endBehavior === "auto_duration" && nextManual.sessionDuration > 0) {
        const end = new Date(now.getTime() + nextManual.sessionDuration * 60 * 1000);
        updateInfo({ startDate: now.toISOString(), endDate: end.toISOString(), quizLifecycle: "live" });
      } else {
        updateInfo({ startDate: now.toISOString(), endDate: "", quizLifecycle: "live" });
      }
    } else if (patch.status === "ended" || (nextManual.status === "ended" && patch.endedAt)) {
      updateInfo({ endDate: new Date().toISOString(), quizLifecycle: "ended" });
    } else if (nextManual.status === "live" && nextManual.endBehavior === "auto_duration" && patch.sessionDuration !== undefined) {
      const startedAt = nextManual.startedAt ? new Date(nextManual.startedAt) : new Date();
      const end = new Date(startedAt.getTime() + nextManual.sessionDuration * 60 * 1000);
      updateInfo({ endDate: end.toISOString() });
    }
  }, [manual, updateInfo]);

  const handleAdvancedChange = useCallback((patch: Partial<AdvancedConfig>) => {
    setAdvanced((prev) => ({ ...prev, ...patch }));
  }, []);

  const switchMode = (newMode: TimingMode, force = false) => {
    if (isQuizActive && !force) return;
    if (newMode === mode) return;
    setMode(newMode);
    if (newMode === "schedule") {
      setManual((prev) => ({ ...prev, status: "scheduled" }));
      // Re-sync any already-entered schedule into the saved info.
      updateInfo({
        startDate: combineDateTime(schedule.startDate, schedule.startTime, "00:00"),
        endDate: schedule.endDate
          ? combineDateTime(schedule.endDate, schedule.endTime, "23:59")
          : "",
        quizLifecycle: schedule.startDate ? "scheduled" : "draft",
      });
    } else {
      setManual((prev) => ({ ...prev, status: "draft" }));
      // Manual mode has no fixed window — drop any stale scheduled values.
      updateInfo({ startDate: "", endDate: "", quizLifecycle: "draft" });
    }
  };

  useEffect(() => {
    // Rules only shows response-level timing; the lifecycle explanation
    // belongs to Review & publish.
    if (variant === "rules") return;

    const helpState: TimingState = {
      mode,
      schedule,
      manual,
      advanced,
      validationErrors,
    };
    setHelpExtra(
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-extrabold text-[var(--qs-ink)]">
            Quiz session
          </p>
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
            The quiz session is the period when participants can join and answer.
            Scheduled quizzes close automatically at their end time.
          </p>
          {mode === "schedule" && schedule.startDate && schedule.startTime ? (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="font-extrabold text-[var(--qs-ink)]">
                {formatTime12(schedule.startTime)}
              </span>
              <ArrowRight className="h-3 w-3 text-[var(--qs-muted)]" />
              {schedule.endDate ? (
                <span className="font-extrabold text-[var(--qs-ink)]">
                  {formatTime12(schedule.endTime || "23:59")}
                </span>
              ) : (
                <span className="font-medium text-[var(--qs-muted)]">Manual end</span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs font-medium italic text-[var(--qs-muted)]">
              Will be determined when you start the quiz.
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-extrabold text-[var(--qs-ink)]">
            Participant attempts
          </p>
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[var(--qs-muted)]">
            {mode === "schedule" && schedule.startDate
              ? "Participants can join and answer throughout the scheduled window. Responses stop automatically at the end time."
              : manual.status === "live"
                ? "The quiz is currently live. Participants can answer until you stop the quiz."
                : "Once you start the quiz, participants can begin answering. Responses remain open until you stop the quiz."}
          </p>
        </div>
        <ParticipantPreview state={helpState} />
        <TimingSummary state={helpState} />
      </div>
    );
    return () => setHelpExtra(null);
  }, [variant, mode, schedule, manual, advanced, validationErrors, handleAdvancedChange, setHelpExtra]);

  const isQuizActive = manual.status === "live";

  return (
    <div className="mx-auto w-full max-w-none min-w-0 overflow-x-hidden">
      <div className="min-w-0 space-y-4 sm:space-y-6 overflow-hidden">
        {/* Timing & lifecycle */}
        {showLifecycle && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={cn(
            "min-w-0 overflow-hidden",
            !flat && "rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 sm:p-5"
          )}
        >
          {!flat && (
            <div className="mb-4 flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="min-w-0 text-sm font-black text-[var(--qs-ink)]">
                {variant === "availability" ? "Availability" : "Timing & lifecycle"}
              </h3>
            </div>
          )}

          <p className="text-sm font-bold text-[var(--qs-ink)]">When should this quiz run?</p>

          {/* Segmented control */}
          <div className="mt-2.5 flex min-w-0 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-1">
            <button
              type="button"
              onClick={() => {
                if (mode === "schedule") return;
                setPendingMode("schedule");
                if (isQuizActive) setModeLockModal(true);
                else setModeSwitchConfirmOpen(true);
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] border-2 py-2 text-xs font-bold transition-colors sm:text-sm",
                mode === "schedule"
                  ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] font-extrabold text-[var(--qs-bg)]"
                  : "border-transparent text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
              )}
            >
              <CalendarClock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode === "manual") return;
                setPendingMode("manual");
                if (isQuizActive) setModeLockModal(true);
                else setModeSwitchConfirmOpen(true);
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] border-2 py-2 text-xs font-bold transition-colors sm:text-sm",
                mode === "manual"
                  ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] font-extrabold text-[var(--qs-bg)]"
                  : "border-transparent text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
              )}
            >
              <MousePointerClick className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Start manually
            </button>
          </div>

          <div className="mt-4">
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
                    quizId={quizId}
                    allowStart={canStartInline}
                    onBeforeStart={state.editMode ? async () => { await saveToServer(); } : undefined}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-3 space-y-1 rounded-[12px] border-2 border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] px-3.5 py-2.5">
              {validationErrors.map((err) => (
                <p key={err} className="text-xs font-bold text-[var(--qs-bad)]">
                  {err}
                </p>
              ))}
            </div>
          )}
        </motion.div>
        )}

        {/* Advanced timing temporarily hidden from the studio.
        {variant !== "availability" && (
          <AdvancedTiming advanced={advanced} onChange={handleAdvancedChange} />
        )}
        */}
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
            switchMode(pendingMode, true);
            setPendingMode(null);
          }
        }}
        currentModeLabel={mode === "schedule" ? "Schedule for later" : "Start when I'm ready"}
        status={manual.status === "ended" ? "ended" : "live"}
      />

      <ConfirmModal
        open={modeSwitchConfirmOpen}
        onClose={() => { setModeSwitchConfirmOpen(false); setPendingMode(null); }}
        onConfirm={() => {
          const next = pendingMode;
          setModeSwitchConfirmOpen(false);
          setPendingMode(null);
          if (next) switchMode(next);
        }}
        title="Switch availability mode?"
        description={
          pendingMode === "schedule"
            ? "The quiz will stop using manual start and switch to a scheduled window. You can review the dates before saving."
            : "The quiz will stop using a scheduled window and wait for you to start it manually."
        }
        details={[
          { label: "Current", value: mode === "schedule" ? "Schedule for later" : "Start when I'm ready" },
          { label: "New", value: pendingMode === "schedule" ? "Schedule for later" : "Start when I'm ready" },
        ]}
        confirmLabel="Switch mode"
        confirmColor="pink"
        icon={pendingMode === "schedule" ? CalendarClock : MousePointerClick}
      />
    </div>
  );
}

