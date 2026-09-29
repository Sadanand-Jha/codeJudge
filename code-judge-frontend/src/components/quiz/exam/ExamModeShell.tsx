"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, Clock, Loader2, Maximize2, Radio, Rocket, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/helpers";
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
  /** Called (after user gesture) when exam mode is entered. */
  onEnterExam?: () => boolean | void | Promise<boolean | void>;
  onExitPreview: () => void;
  /** An access/start failure shown before Exam Mode is activated. */
  entryError?: string | null;
  /** Called with the violation summary once maxViolations is reached. */
  onTerminate?: (summary: ViolationSummary) => void;
  autoEnter?: boolean;
  fullWidth?: boolean;
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
  entryError = null,
  onTerminate,
  autoEnter = false,
  fullWidth = false,
  children,
}: ExamModeShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [examActive, setExamActive] = useState(false);
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

  const enterExamMode = useCallback(async () => {
    if (entering) return;
    setEntering(true);

    try {
      // Access and attempt-limit checks must finish before the protected exam
      // UI is activated. Returning false keeps the student on this screen.
      const canEnter = await onEnterExam?.();
      if (canEnter === false) return;

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
    } finally {
      setEntering(false);
    }
  }, [entering, onEnterExam]);

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

  // If examActive, render as fullscreen overlay; otherwise show entry screen
  if (!examActive) {
    return (
      <div className="relative mx-auto max-w-3xl overflow-hidden p-3 sm:p-6">
        <div className="relative overflow-hidden rounded-[28px] border border-pink-200/80 bg-white/90 p-4 shadow-[0_30px_90px_-50px_rgba(244,114,182,.7)] dark:border-violet-400/20 dark:bg-[#111624]/95 dark:shadow-[0_32px_95px_-48px_rgba(124,92,255,.6)] sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-pink-300/25 blur-3xl dark:bg-violet-500/15" />
          <div className="mx-auto max-w-xl text-center">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-orange-400 to-amber-300 text-white shadow-[0_16px_34px_-16px_rgba(244,114,182,.9)] dark:from-violet-500 dark:via-indigo-500 dark:to-cyan-500 sm:h-16 sm:w-16">
              <Rocket className="h-6 w-6 sm:h-7 sm:w-7" />
              <ShieldCheck className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full border-2 border-white bg-emerald-500 p-1 text-white dark:border-[#111624]" />
            </div>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500 dark:text-violet-300">Secure launch sequence</p>
            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">You&apos;re entering Exam Mode</h1>
            <p className="mt-1 truncate text-xs font-semibold text-text-muted">{quizName}</p>
            <p className="mt-1.5 text-xs text-text-secondary sm:mt-2 sm:text-sm">{isLive ? "Your attempt will be monitored to keep the exam fair. Stay in fullscreen until you submit." : "This preview simulates the student exam experience. Your current quiz will open in a distraction-free exam environment."}</p>

            <div className="mt-4 space-y-1.5 rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/70 p-3 text-left dark:border-white/[0.07] dark:from-white/[0.04] dark:to-violet-500/[0.04] sm:mt-6 sm:space-y-2 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted sm:text-xs">Before you continue</p>
              <ul className="space-y-1.5 text-xs text-text-secondary sm:space-y-2 sm:text-sm">
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:mt-1" /> Fullscreen is required and will be requested automatically.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:mt-1" /> Switching tabs/windows may be recorded as a violation.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:mt-1" /> Copying, cutting or pasting is blocked and recorded as a violation.</li>
                <li className="hidden gap-2 sm:flex"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" /> Leaving fullscreen (Esc) may be recorded as a violation.</li>
                <li className="hidden gap-2 sm:flex"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" /> Your progress will be preserved during temporary warnings.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:mt-1" /> After {maxViolations} violations {isLive ? "your attempt will be submitted automatically and flagged for review" : "the session will be terminated"}.</li>
              </ul>
              <p className="hidden pt-2 text-[11px] text-text-muted sm:block">A real exam cannot fully block OS shortcuts like Ctrl+T / Alt+Tab. We detect and record their effects instead.</p>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-center">
              <button
                onClick={enterExamMode}
                disabled={entering}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_28px_-14px_rgba(244,114,182,.9)] hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 dark:from-violet-500 dark:via-indigo-500 dark:to-cyan-500 sm:px-6 sm:py-3"
              >
                {entering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Maximize2 className="h-4 w-4" />}
                {entering ? "Checking eligibility…" : "Enter Exam Mode"}
              </button>
              <button onClick={onExitPreview} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-card-hover sm:px-6 sm:py-3">
                Cancel
              </button>
            </div>
            {entryError && (
              <div className="mx-auto mt-3 flex max-w-md items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3 text-left text-xs leading-5 text-red-600 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{entryError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="student-quiz-theme fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#fff9f5] text-gray-900 dark:bg-[#060913] dark:text-white"
      // subtle exam background — light: light gray, dark: near-black (unchanged dark)
    >
      {/* Exam command bar */}
      <header className="exam-command-bar relative flex h-16 shrink-0 items-center justify-between gap-2 overflow-hidden border-b border-pink-200/70 bg-white/95 px-3 shadow-[0_12px_35px_-30px_rgba(219,39,119,.7)] dark:border-violet-400/15 dark:bg-[#080C18]/96 dark:shadow-[0_14px_40px_-28px_rgba(124,92,255,.65)] sm:h-[4.5rem] sm:px-5">
        <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-36 w-52 rounded-full bg-pink-300/20 blur-3xl dark:bg-violet-500/15" />
        <div className="relative flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 via-orange-400 to-amber-300 text-white shadow-[0_10px_22px_-12px_rgba(244,114,182,.9)] dark:from-violet-500 dark:via-indigo-500 dark:to-cyan-500"><Rocket className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-pink-500 dark:text-violet-300"><Radio className="h-3 w-3" /> Live mission</span>
            <span className="mt-0.5 block truncate text-xs font-bold text-gray-900 dark:text-white sm:text-sm">Question navigator</span>
          </span>
          <span className="ml-1 inline-flex shrink-0 items-center rounded-full border border-pink-200 bg-pink-50 px-2 py-1 text-[10px] font-bold text-pink-600 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200 sm:px-2.5 sm:text-xs">{progressLabel}</span>
        </div>

        <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-3">
          <span className={cn("inline-flex h-11 items-center gap-2 rounded-2xl border px-2.5 shadow-sm sm:px-3", timeCritical ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-cyan-400/20 dark:bg-cyan-400/[0.07] dark:text-cyan-100")}>
            <span className={cn("grid h-7 w-7 place-items-center rounded-xl", timeCritical ? "bg-rose-500 text-white" : "bg-amber-400 text-white dark:bg-cyan-400/15 dark:text-cyan-300")}><Clock className="h-3.5 w-3.5" /></span>
            <span className="text-left"><span className="hidden text-[8px] font-bold uppercase tracking-[0.13em] opacity-65 sm:block">Time remaining</span><span className="block font-mono text-sm font-black leading-none tabular-nums sm:text-base">{formatTime(timeLeft)}</span></span>
          </span>
          <span className="hidden items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white/65 md:inline-flex">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span>Warnings</span>
            <span className="font-black text-gray-900 dark:text-white">{violations}/{maxViolations}</span>
          </span>
          <button onClick={exitExamMode} className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-white/[0.09] dark:bg-white/[0.04] dark:text-white/65 dark:hover:border-rose-400/25 dark:hover:bg-rose-500/10" aria-label="Exit exam mode" title="Exit exam mode">
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
            <div className="flex items-center justify-center gap-1.5 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{warning}</span>
              <span className="ml-1 shrink-0 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold">⚠ {violations}/{maxViolations}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always-on monitoring notice */}
      <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-amber-200/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700 dark:border-amber-400/10 dark:from-amber-400/[0.055] dark:via-orange-400/[0.035] dark:to-amber-400/[0.055] dark:text-amber-300/80">
        <ShieldCheck className="h-3 w-3" /> Tab switching &amp; window changes are monitored
      </div>

      {/* Content - viewport-based on mobile, scrollable on desktop */}
      <div className={cn("flex-1 min-h-0 flex flex-col overflow-hidden bg-[#fff9f5] dark:bg-[#060913] p-0 sm:block sm:overflow-y-auto sm:overflow-x-hidden sm:p-0", activeViolation && "blur-[6px] pointer-events-none select-none")}>
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
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#14141f] p-6 shadow-2xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-center text-base font-bold text-gray-900 dark:text-white">{activeViolation.title}</h3>
              <p className="mt-1 text-center text-sm text-gray-500 dark:text-white/70">{activeViolation.desc}</p>
              <div className="mx-auto mt-3 inline-flex w-full justify-center">
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">Violation {violations} of {maxViolations}</span>
              </div>
              <p className="mt-3 text-center text-xs text-gray-500 dark:text-white/50">Your progress is preserved. Return to continue.</p>
              <button
                onClick={handleReturn}
                className="mt-5 w-full rounded-xl bg-pink-500 py-3 text-sm font-bold text-white hover:bg-pink-600"
              >
                Return to Quiz
              </button>
              <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-white/40">Fullscreen will be restored automatically.</p>
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
              className="w-full max-w-[380px] rounded-[20px] border border-pink-500/10 dark:border-pink-500/20 bg-white dark:bg-[#14141f] p-8 text-center shadow-[0_20px_60px_rgba(236,72,153,0.18)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10 dark:bg-pink-500/15">
                <X className="h-5 w-5 text-pink-500 dark:text-pink-400 stroke-[2.5]" />
              </div>
              <h3 className="mt-4 text-[15px] font-bold tracking-tight text-gray-900 dark:text-white">Maximum violations reached</h3>
              <p className="mt-1.5 text-[13px] leading-5 text-gray-500 dark:text-white/70">{isLive ? `Your attempt has been submitted automatically after ${maxViolations} violations and flagged for review.` : `This preview session has been terminated after ${maxViolations} violations.`}</p>
              <button onClick={exitExamMode} className="mt-6 w-full rounded-xl bg-pink-500 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(236,72,153,0.35)] hover:bg-pink-600 transition-colors">
                {isLive ? "View Result" : "Exit Preview"}
              </button>
              <p className="mt-2 text-[11px] text-pink-500/60 dark:text-pink-400/60">{isLive ? "Attempt auto-submitted due to policy violations" : "Preview ended due to policy violation"}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
