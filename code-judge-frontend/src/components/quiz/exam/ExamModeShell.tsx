"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, ArrowLeft, ClipboardList, Clock, Maximize2, Radio, Rocket, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { QuizLoader } from "@/components/quiz/live/StudentQuizShell";
import { reportViolation } from "@/services/quiz";

export const MAX_EXAM_VIOLATIONS = 3;

type ViolationType =
  | "fullscreen_exit"
  | "tab_switch"
  | "window_blur"
  | "copy_attempt"
  | "cut_attempt"
  | "paste_attempt";

export interface ViolationSummary {
  violations: number;
  types: ViolationType[];
}

interface ExamModeShellProps {
  quizName: string;
  progressLabel: string; // e.g. "Q 1 / 3"
  timeLeft: number | null; // seconds; null = no time limit
  maxViolations?: number;
  /** Live exam-cell mode: entry/termination copy refers to a real attempt. */
  isLive?: boolean;
  /** Attempt id — when provided, every violation is reported to the backend. */
  attemptId?: string | null;
  /** Called (after user gesture) when exam mode is entered. Receives the
   * registration form values when the quiz collects them. */
  onEnterExam?: (registrationData?: Record<string, string>) => boolean | void | Promise<boolean | void>;
  onExitPreview: () => void;
  /** When provided (live attempts), the terminated modal's primary button
   * routes the student to their result instead of exiting to the quiz hub. */
  onViewResult?: () => void;
  /** An access/start failure shown before Exam Mode is activated. */
  entryError?: string | null;
  /** Called with the violation summary once maxViolations is reached. */
  onTerminate?: (summary: ViolationSummary) => void;
  autoEnter?: boolean;
  fullWidth?: boolean;
  /** Creator-defined field names. When non-empty, a registration form is
   * shown after "Enter Exam Mode" and the attempt starts only on submit. */
  registrationFields?: string[];
  children: React.ReactNode;
}

export default function ExamModeShell({
  quizName,
  progressLabel,
  timeLeft,
  maxViolations = MAX_EXAM_VIOLATIONS,
  isLive = false,
  attemptId = null,
  onEnterExam,
  onExitPreview,
  onViewResult,
  entryError = null,
  onTerminate,
  autoEnter = false,
  fullWidth = false,
  registrationFields = [],
  children,
}: ExamModeShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [examActive, setExamActive] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationValues, setRegistrationValues] = useState<Record<string, string>>({});
  const registrationComplete =
    registrationFields.length > 0 && registrationFields.every((name) => registrationValues[name]?.trim());
  const [entering, setEntering] = useState(false);
  const [violations, setViolations] = useState(0);
  const [activeViolation, setActiveViolation] = useState<{ type: ViolationType; title: string; desc: string } | null>(null);
  const [terminated, setTerminated] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const lastViolationRef = useRef<number>(0);
  const violationCountRef = useRef(0);
  const violationTypesRef = useRef<ViolationType[]>([]);
  const attemptIdRef = useRef<string | null>(attemptId);
  useEffect(() => {
    attemptIdRef.current = attemptId;
  }, [attemptId]);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (s: number | null) => {
    if (s === null) return "No limit";
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const timeCritical = timeLeft !== null && timeLeft <= 300;

  const recordViolation = useCallback(
    (type: ViolationType, title: string, desc: string) => {
      const now = Date.now();
      if (now - lastViolationRef.current < 1200) return; // debounce blur+visibility double fire
      lastViolationRef.current = now;

      // Don't record if not in exam or already terminated
      if (!examActive || terminated) return;

      // Show small warning banner
      setWarning(desc);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warningTimerRef.current = setTimeout(() => setWarning(null), 3000);

      const next = violationCountRef.current + 1;
      violationCountRef.current = next;
      violationTypesRef.current = [...violationTypesRef.current, type];
      setViolations(next);

      // Persist to the backend (fire-and-forget — the count also travels
      // with the final submit as a fallback).
      const id = attemptIdRef.current;
      if (id) {
        reportViolation(id, type).catch(() => {});
      }

      if (next >= maxViolations) {
        setTerminated(true);
        setActiveViolation(null);
        setWarning(null);
        // exit fullscreen if still in it
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onTerminate?.({ violations: next, types: violationTypesRef.current });
        return;
      }

      setActiveViolation({ type, title, desc });
    },
    [examActive, terminated, maxViolations, onTerminate]
  );

  const enterExamMode = useCallback(async (registrationData?: Record<string, string>): Promise<boolean> => {
    if (entering) return false;
    setEntering(true);

    try {
      // Access and attempt-limit checks must finish before the protected exam
      // UI is activated. Returning false keeps the student on this screen.
      const canEnter = await onEnterExam?.(registrationData);
      if (canEnter === false) return false;

      setShowRegistration(false);
      setExamActive(true);
      violationCountRef.current = 0;
      violationTypesRef.current = [];
      setViolations(0);
      setTerminated(false);
      setActiveViolation(null);
      // Push dummy history to trap back navigation during the attempt.
      try {
        window.history.pushState(null, "", window.location.href);
      } catch {}

      // Request fullscreen when the active exam container is already mounted.
      const el = containerRef.current;
      if (el && el.requestFullscreen) {
        try {
          await el.requestFullscreen();
        } catch {
          // If denied, the protected exam UI still remains usable.
        }
      }
      return true;
    } finally {
      setEntering(false);
    }
  }, [entering, onEnterExam]);

  const submitRegistration = useCallback(async () => {
    if (!registrationComplete) return;
    const data: Record<string, string> = {};
    for (const name of registrationFields) data[name] = registrationValues[name].trim();
    await enterExamMode(data);
  }, [registrationComplete, registrationFields, registrationValues, enterExamMode]);

  const exitExamMode = useCallback(async () => {
    setExamActive(false);
    setActiveViolation(null);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
    onExitPreview();
  }, [onExitPreview]);

  const handleReturn = useCallback(async () => {
    setActiveViolation(null);
    // re-enter fullscreen
    const el = containerRef.current;
    if (el && !document.fullscreenElement && document.visibilityState === "visible") {
      try {
        await el.requestFullscreen();
      } catch {}
    }
  }, []);

  // Fullscreen change -> violation if user pressed Esc
  useEffect(() => {
    if (!examActive || terminated) return;
    const onFsChange = () => {
      if (!document.fullscreenElement && examActive && !activeViolation && !terminated) {
        recordViolation("fullscreen_exit", "Fullscreen exited", "You left fullscreen. This has been recorded as a violation.");
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [examActive, activeViolation, terminated, recordViolation]);

  // visibilitychange + blur -> tab/window switch
  useEffect(() => {
    if (!examActive || terminated) return;
    const onVisibility = () => {
      if (document.hidden) {
        recordViolation("tab_switch", "Tab switching detected", "You moved away from the exam. Your quiz content has been hidden.");
      }
    };
    const onBlur = () => {
      // window blur fires when switching apps; document.hidden may not yet be true
      if (!document.hidden) {
        recordViolation("window_blur", "Window switch detected", "You switched to another window or application.");
      }
    };
    const onFocus = () => {
      // focus return does not itself count, but ensures modal stays until Return clicked
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [examActive, terminated, recordViolation]);

  // beforeunload + popstate protection
  useEffect(() => {
    if (!examActive || terminated) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    const onPopState = () => {
      // trap back navigation inside exam
      window.history.pushState(null, "", window.location.href);
      recordViolation("tab_switch", "Navigation detected", "Attempting to leave the exam is recorded as a violation.");
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    // push initial
    window.history.pushState(null, "", window.location.href);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [examActive, terminated, recordViolation]);

  // Block copy / cut / paste and right-click inside the exam. Copy & paste
  // attempts are cheating vectors, so each blocked attempt counts as a
  // violation; right-click is blocked silently to avoid false positives.
  useEffect(() => {
    if (!examActive || terminated) return;
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("copy_attempt", "Copying blocked", "Copying exam content is not allowed and has been recorded.");
    };
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("cut_attempt", "Cutting blocked", "Cutting exam content is not allowed and has been recorded.");
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation("paste_attempt", "Pasting blocked", "Pasting into the exam is not allowed and has been recorded.");
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      // Best-effort block of devtools/view-source shortcuts.
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(e.key.toLowerCase())) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [examActive, terminated, recordViolation]);

  // Cleanup warning timer on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // Auto-enter exam mode on mount (for preview)
  useEffect(() => {
    if (autoEnter && !examActive && !terminated) {
      const timer = window.setTimeout(() => void enterExamMode(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [autoEnter, examActive, terminated, enterExamMode]);

  // Registration gate — shown after "Enter Exam Mode" when the creator
  // collects registration details. The attempt (and its timer) starts only
  // once this form is submitted.
  if (!examActive && showRegistration) {
    return (
      <div className="qs-ui relative mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center overflow-hidden p-3 sm:p-6">
        <div className="qs-shadow w-full">
        <div className="qs-card overflow-hidden p-4 sm:p-8">
          <div className="mx-auto max-w-xl">
            <div className="text-center">
              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)] sm:h-16 sm:w-16">
                <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--qs-brand)]">Registration required</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-[var(--qs-ink)] sm:text-2xl">Fill your details to begin</h1>
              <p className="mt-1 truncate text-xs font-semibold text-[var(--qs-muted)]">{quizName}</p>
              <p className="mt-1.5 text-xs text-[var(--qs-muted)] sm:mt-2 sm:text-sm">Your timer starts only after you submit this form.</p>
            </div>

            <form
              className="mt-5 space-y-3.5 sm:mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void submitRegistration();
              }}
            >
              {registrationFields.map((name) => (
                <label key={name} className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--qs-muted)] sm:text-xs">
                    {name} <span className="text-[var(--qs-bad)]">*</span>
                  </span>
                  <input
                    type="text"
                    value={registrationValues[name] ?? ""}
                    maxLength={500}
                    autoComplete="off"
                    placeholder={`Enter ${name.toLowerCase()}`}
                    onChange={(e) =>
                      setRegistrationValues((previous) => ({ ...previous, [name]: e.target.value }))
                    }
                    className="qs-input h-12 py-0 text-sm tracking-[0.02em]"
                  />
                </label>
              ))}

              <div className="flex flex-col gap-2 pt-1.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowRegistration(false)}
                  disabled={entering}
                  className="qs-btn qs-btn-ghost h-11 w-full gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-auto sm:flex-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={entering || !registrationComplete}
                  className="qs-btn h-11 w-full gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:w-auto sm:flex-[1.4]"
                >
                  {entering ? <QuizLoader size={16} /> : <Rocket className="h-4 w-4" />}
                  {entering ? "Starting your attempt…" : "Start Exam"}
                </button>
              </div>
              <p className="text-center text-[11px] text-[var(--qs-muted)]">All fields are required to start.</p>
            </form>

            {entryError && (
              <div className="mx-auto mt-3 flex max-w-md items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3.5 py-3 text-left text-xs leading-5 text-[var(--qs-bad)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{entryError}</span>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  // If examActive, render as fullscreen overlay; otherwise show entry screen
  if (!examActive) {
    return (
      <div className="qs-ui relative mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center overflow-hidden p-3 sm:p-6">
        <div className="qs-shadow w-full">
        <div className="qs-card overflow-hidden p-4 sm:p-8">
          <div className="mx-auto max-w-xl text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)] sm:h-16 sm:w-16">
              <Rocket className="h-6 w-6 sm:h-7 sm:w-7" />
              <ShieldCheck className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-ok)] p-1 text-[var(--qs-on-brand)]" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--qs-brand)]">Secure launch sequence</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-[var(--qs-ink)] sm:text-2xl">You&apos;re entering Exam Mode</h1>
            <p className="mt-1 truncate text-xs font-semibold text-[var(--qs-muted)]">{quizName}</p>
            <p className="mt-1.5 text-xs text-[var(--qs-muted)] sm:mt-2 sm:text-sm">{isLive ? "Your attempt will be monitored to keep the exam fair. Stay in fullscreen until you submit." : "This preview simulates the student exam experience. Your current quiz will open in a distraction-free exam environment."}</p>

            <div className="mt-4 space-y-1.5 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-left sm:mt-6 sm:space-y-2 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--qs-muted)] sm:text-xs">Before you continue</p>
              <ul className="space-y-1.5 text-xs text-[var(--qs-muted)] sm:space-y-2 sm:text-sm">
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-brand)] sm:mt-1" /> Fullscreen is required and will be requested automatically.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-brand)] sm:mt-1" /> Switching tabs/windows may be recorded as a violation.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-brand)] sm:mt-1" /> Copying, cutting or pasting is blocked and recorded as a violation.</li>
                <li className="hidden gap-2 sm:flex"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-brand)]" /> Leaving fullscreen (Esc) may be recorded as a violation.</li>
                <li className="hidden gap-2 sm:flex"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-brand)]" /> Your progress will be preserved during temporary warnings.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--qs-brand)] sm:mt-1" /> After {maxViolations} violations {isLive ? "your attempt will be submitted automatically and flagged for review" : "the session will be terminated"}.</li>
              </ul>
              <p className="hidden pt-2 text-[11px] text-[var(--qs-muted)] sm:block">A real exam cannot fully block OS shortcuts like Ctrl+T / Alt+Tab. We detect and record their effects instead.</p>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-center">
              <button
                onClick={() => {
                  if (registrationFields.length > 0) {
                    setShowRegistration(true);
                    return;
                  }
                  void enterExamMode();
                }}
                disabled={entering}
                className="qs-btn h-14 w-full gap-2 text-sm disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:px-6"
              >
                {entering ? <QuizLoader size={16} /> : <Maximize2 className="h-4 w-4" />}
                {entering ? "Checking eligibility…" : "Enter Exam Mode"}
              </button>
              <button onClick={onExitPreview} className="qs-btn qs-btn-ghost h-14 w-full text-sm sm:w-auto sm:px-6">
                Cancel
              </button>
            </div>
            {entryError && (
              <div className="mx-auto mt-3 flex max-w-md items-start gap-2 rounded-xl border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3.5 py-3 text-left text-xs leading-5 text-[var(--qs-bad)]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{entryError}</span>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="qs-ui student-quiz-theme fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[var(--qs-bg)] text-[var(--qs-ink)]"
    >
      {/* Exam command bar */}
      <header className="exam-command-bar relative flex h-16 shrink-0 items-center justify-between gap-2 overflow-hidden border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 sm:h-[4.5rem] sm:px-5">
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"><Rocket className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-[var(--qs-brand)]"><Radio className="h-3 w-3" /> Live mission</span>
            <span className="mt-0.5 block truncate text-xs font-bold text-[var(--qs-ink)] sm:text-sm">Question navigator</span>
          </span>
          <span className="ml-1 inline-flex shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-1 text-[10px] font-bold text-[var(--qs-brand)] sm:px-2.5 sm:text-xs">{progressLabel}</span>
        </div>

        <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-3">
          <span className={cn("inline-flex h-11 items-center gap-2 rounded-2xl border-2 px-2.5 sm:px-3", timeCritical ? "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]" : "border-[var(--qs-sun)] bg-[var(--qs-sun)]/20 text-[var(--qs-ink)]")}>
            <span className={cn("grid h-7 w-7 place-items-center rounded-xl", timeCritical ? "bg-[var(--qs-bad)] text-[var(--qs-on-brand)]" : "bg-[var(--qs-sun)] text-[var(--qs-ink)]")}><Clock className="h-3.5 w-3.5" /></span>
            <span className="text-left"><span className="hidden text-[8px] font-bold uppercase tracking-[0.13em] opacity-65 sm:block">Time remaining</span><span className="block font-mono text-sm font-black leading-none tabular-nums sm:text-base">{formatTime(timeLeft)}</span></span>
          </span>
          <span className="hidden items-center gap-2 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[10px] font-semibold text-[var(--qs-muted)] md:inline-flex">
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--qs-bad)]" />
            <span>Warnings</span>
            <span className="font-black text-[var(--qs-ink)]">{violations}/{maxViolations}</span>
          </span>
          <button onClick={exitExamMode} className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] transition hover:border-[var(--qs-bad)] hover:bg-[var(--qs-badbg)] hover:text-[var(--qs-bad)]" aria-label="Exit exam mode" title="Exit exam mode">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Warning banner — small, auto-dismiss */}
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-1.5 bg-[var(--qs-badbg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--qs-bad)]">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{warning}</span>
              <span className="ml-1 shrink-0 rounded-full bg-[var(--qs-bad)]/15 px-1.5 py-0.5 text-[9px] font-bold">⚠ {violations}/{maxViolations}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always-on monitoring notice */}
      <div className="flex shrink-0 items-center justify-center gap-1.5 border-b-2 border-[var(--qs-line)] bg-[var(--qs-sun)]/25 px-2 py-1 text-[9px] font-bold text-[var(--qs-ink)]">
        <ShieldCheck className="h-3 w-3" /> Tab switching &amp; window changes are monitored
      </div>

      {/* Content - viewport-based on mobile, scrollable on desktop */}
      <div className={cn("flex-1 min-h-0 flex flex-col overflow-hidden bg-[var(--qs-bg)] p-0 sm:block sm:overflow-y-auto sm:overflow-x-hidden sm:p-0", activeViolation && "blur-[6px] pointer-events-none select-none")}>
        <div className={cn("mx-auto h-full min-h-0 w-full sm:h-full sm:block", fullWidth ? "" : "max-w-[1600px]")}>{children}</div>
      </div>

      {/* Violation modal */}
      <AnimatePresence>
        {activeViolation && !terminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-6 shadow-[0_8px_0_rgba(26,18,64,0.2)]"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--qs-badbg)] text-[var(--qs-bad)]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-center text-base font-bold text-[var(--qs-ink)]">{activeViolation.title}</h3>
              <p className="mt-1 text-center text-sm text-[var(--qs-muted)]">{activeViolation.desc}</p>
              <div className="mx-auto mt-3 inline-flex w-full justify-center">
                <span className="rounded-full border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-1 text-xs font-bold text-[var(--qs-bad)]">Violation {violations} of {maxViolations}</span>
              </div>
              <p className="mt-3 text-center text-xs text-[var(--qs-muted)]">Your progress is preserved. Return to continue.</p>
              <button
                onClick={handleReturn}
                className="qs-btn mt-5 w-full py-3 text-sm"
              >
                Return to Quiz
              </button>
              <p className="mt-2 text-center text-[11px] text-[var(--qs-muted)]">Fullscreen will be restored automatically.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminated modal — Maximum violations reached (matches preview image) */}
      <AnimatePresence>
        {terminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-[380px] rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-8 text-center shadow-[0_8px_0_rgba(26,18,64,0.25)]"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--qs-badbg)]">
                <X className="h-5 w-5 text-[var(--qs-bad)] stroke-[2.5]" />
              </div>
              <h3 className="mt-4 text-[15px] font-bold tracking-tight text-[var(--qs-ink)]">Maximum violations reached</h3>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--qs-muted)]">{isLive ? `Your attempt has been submitted automatically after ${maxViolations} violations and flagged for review.` : `This preview session has been terminated after ${maxViolations} violations.`}</p>
              <button onClick={isLive && onViewResult ? onViewResult : exitExamMode} className="qs-btn mt-6 w-full py-3 text-sm">
                {isLive ? "View Result" : "Exit Preview"}
              </button>
              <p className="mt-2 text-[11px] text-[var(--qs-muted)]">{isLive ? "Attempt auto-submitted due to policy violations" : "Preview ended due to policy violation"}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
