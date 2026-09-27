"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../../StudioProvider";
import { updateQuizStatus } from "@/services/quiz";
import { ScheduleMode } from "./ScheduleMode";
import { ManualMode } from "./ManualMode";
import { AdvancedTiming } from "./AdvancedTiming";
import { DurationPicker } from "./DurationPicker";
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
        updateInfo({ startDate: startStr, endDate: endStr, quizLifecycle: "live" });
      } else {
        updateInfo({ startDate: startStr, endDate: "", quizLifecycle: "live" });
      }
    } else if (patch.status === "ended" || (nextManual.status === "ended" && patch.endedAt)) {
      const now = new Date();
      const endStr = now.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T");
      updateInfo({ endDate: endStr, quizLifecycle: "ended" });
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

  const isQuizActive = manual.status === "live";

  return (
    <div className="mx-auto w-full max-w-none min-w-0 overflow-x-hidden">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1.65fr_0.95fr] lg:items-start min-w-0">
        {/* LEFT — main flow */}
        <div className="min-w-0 space-y-4 sm:space-y-6 overflow-hidden">
          {/* Start mode selection */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-1 min-w-0 px-1"
          >
            <h3 className="text-sm font-bold text-text-primary break-words">
              When should this quiz run?
            </h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="grid grid-cols-2 gap-2.5 sm:gap-3 min-w-0"
          >
            <ModeCard
              active={mode === "schedule"}
              onClick={() => {
                if (isQuizActive) { setPendingMode("schedule"); setModeLockModal(true); return; }
                switchMode("schedule");
              }}
              title="Schedule"
            />
            <ModeCard
              active={mode === "manual"}
              onClick={() => {
                if (isQuizActive) { setPendingMode("manual"); setModeLockModal(true); return; }
                switchMode("manual");
              }}
              title="Start manually"
            />
          </motion.div>

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
            <p className="text-sm font-bold text-text-primary">Attempt duration</p>
            <DurationPicker
              value={participantDuration}
              onChange={(v) => {
                setParticipantDuration(v);
                updateInfo({ duration: v });
              }}
              presets={DURATION_PRESETS}
              label="Time limit"
            />
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
        <aside className="hidden min-w-0 space-y-4 lg:sticky lg:top-[72px] lg:block">
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

function ModeCard({
  active,
  onClick,
  title,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-xl border p-3 text-left transition-all sm:p-4",
        active
          ? "border-pink-500/50 bg-pink-500/[0.08] ring-1 ring-pink-500/20"
          : "border-border bg-card hover:bg-card-hover"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
            active ? "border-pink-500 bg-pink-500" : "border-border"
          )}
        >
          {active && <div className="h-1.5 w-1.5 rounded-full bg-white dark:!bg-white" />}
        </div>
        <p
          className={cn(
            "min-w-0 text-xs font-semibold sm:text-sm",
            active
              ? "text-pink-500"
              : "text-text-primary"
          )}
        >
          {title}
        </p>
      </div>
    </motion.button>
  );
}
