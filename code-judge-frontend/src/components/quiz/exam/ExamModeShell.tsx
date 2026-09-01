"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, Maximize2, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/helpers";

type ViolationType = "fullscreen_exit" | "tab_switch" | "window_blur";

interface ExamModeShellProps {
  quizName: string;
  progressLabel: string; // e.g. "Q 1 / 3"
  timeLeft: number; // seconds
  maxViolations?: number;
  onExitPreview: () => void;
  onTerminate?: () => void;
  children: React.ReactNode;
}

export default function ExamModeShell({
  quizName,
  progressLabel,
  timeLeft,
  maxViolations = 3,
  onExitPreview,
  onTerminate,
  children,
}: ExamModeShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [examActive, setExamActive] = useState(false);
  const [violations, setViolations] = useState(0);
  const [activeViolation, setActiveViolation] = useState<{ type: ViolationType; title: string; desc: string } | null>(null);
  const [terminated, setTerminated] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const lastViolationRef = useRef<number>(0);
  const violationCountRef = useRef(0);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
      setViolations(next);

      if (next >= maxViolations) {
        setTerminated(true);
        setActiveViolation(null);
        setWarning(null);
        // exit fullscreen if still in it
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onTerminate?.();
        return;
      }

      setActiveViolation({ type, title, desc });
    },
    [examActive, terminated, maxViolations, onTerminate]
  );

  const enterExamMode = useCallback(async () => {
    setExamActive(true);
    violationCountRef.current = 0;
    setViolations(0);
    setTerminated(false);
    setActiveViolation(null);
    // push dummy history to trap back
    try {
      window.history.pushState(null, "", window.location.href);
    } catch {}
    // request fullscreen on container
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      try {
        await el.requestFullscreen();
      } catch {
        // if denied, still continue but record as violation? For preview we allow
      }
    }
  }, []);

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

  // Cleanup warning timer on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  // If examActive, render as fullscreen overlay; otherwise show entry screen
  if (!examActive) {
    return (
      <div className="mx-auto max-w-3xl p-3 sm:p-6">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 shadow-sm">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 sm:h-12 sm:w-12">
              <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h1 className="mt-3 text-lg font-bold tracking-tight sm:mt-4 sm:text-xl">You&apos;re entering Exam Mode</h1>
            <p className="mt-1.5 text-xs text-text-secondary sm:mt-2 sm:text-sm">This preview simulates the student exam experience. Your current quiz will open in a distraction-free exam environment.</p>

            <div className="mt-4 space-y-1.5 rounded-xl border border-border bg-background p-3 text-left sm:mt-6 sm:space-y-2 sm:p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted sm:text-xs">Before you continue</p>
              <ul className="space-y-1.5 text-xs text-text-secondary sm:space-y-2 sm:text-sm">
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:mt-1" /> Fullscreen is required and will be requested automatically.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:mt-1" /> Switching tabs/windows may be recorded as a violation.</li>
                <li className="hidden gap-2 sm:flex"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" /> Leaving fullscreen (Esc) may be recorded as a violation.</li>
                <li className="hidden gap-2 sm:flex"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" /> Your progress will be preserved during temporary warnings.</li>
                <li className="flex gap-2"><span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500 sm:mt-1" /> After {maxViolations} violations the session will be terminated.</li>
              </ul>
              <p className="hidden pt-2 text-[11px] text-text-muted sm:block">A real exam cannot fully block OS shortcuts like Ctrl+T / Alt+Tab. We detect and record their effects instead.</p>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-center">
              <button
                onClick={enterExamMode}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(236,72,153,0.35)] hover:bg-pink-600 sm:px-6 sm:py-3"
              >
                <Maximize2 className="h-4 w-4" /> Enter Exam Mode
              </button>
              <button onClick={onExitPreview} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-card-hover sm:px-6 sm:py-3">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-gray-50 dark:bg-[#0A0A0F] text-gray-900 dark:text-white overflow-hidden"
      // subtle exam background — light: light gray, dark: near-black (unchanged dark)
    >
      {/* Exam header - minimal */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-2.5 backdrop-blur sm:h-14 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold tracking-wider text-gray-700 dark:text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" /> EXAM MODE
          </span>
          <span className="rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-gray-700 dark:text-white sm:px-2 sm:text-[10px]">EXAM</span>
          <span className="truncate text-xs font-semibold text-gray-900 dark:text-white sm:text-sm">{quizName}</span>
          <span className="hidden text-xs text-gray-500 dark:text-white/50 sm:inline">{progressLabel}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] px-2.5 py-1 text-xs font-mono font-semibold text-gray-900 dark:text-white">
            <Clock className="h-3.5 w-3.5 text-amber-400" /> {formatTime(timeLeft)}
          </span>
          <span className={cn("font-mono text-[11px] font-bold sm:text-xs", timeLeft <= 60 ? "text-red-500" : timeLeft <= 300 ? "text-amber-500" : "text-gray-900 dark:text-white")}>{formatTime(timeLeft)}</span>
          <span className="hidden md:inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-400">
            Violation {violations} / {maxViolations}
          </span>
          <button onClick={exitExamMode} className="rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.06] px-2 py-1 text-[11px] font-semibold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/[0.10] sm:px-3 sm:py-1.5 sm:text-xs">
            Exit
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
            <div className="flex items-center justify-center gap-1.5 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{warning}</span>
              <span className="ml-1 shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold">⚠ {violations}/{maxViolations}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Always-on monitoring notice */}
      <div className="flex shrink-0 items-center justify-center gap-1 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-600/80 dark:text-amber-400/70">
        <span className="h-1 w-1 rounded-full bg-amber-500/60 animate-pulse" />
        Tab switching &amp; window changes are monitored
      </div>

      {/* Content - viewport-based on mobile, scrollable on desktop */}
      <div className={cn("flex-1 min-h-0 flex flex-col overflow-hidden bg-gray-50 dark:bg-[#0A0A0F] p-0 sm:block sm:overflow-y-auto sm:overflow-x-hidden sm:p-4", activeViolation && "blur-[6px] pointer-events-none select-none")}>
        <div className="mx-auto h-full min-h-0 w-full max-w-6xl sm:h-auto sm:block">{children}</div>
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-center text-base font-bold text-gray-900 dark:text-white">{activeViolation.title}</h3>
              <p className="mt-1 text-center text-sm text-gray-500 dark:text-white/70">{activeViolation.desc}</p>
              <div className="mx-auto mt-3 inline-flex w-full justify-center">
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">Violation {violations} of {maxViolations}</span>
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

      {/* Terminated modal */}
      <AnimatePresence>
        {terminated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} className="w-full max-w-md rounded-2xl border border-red-500/20 bg-white dark:bg-[#1a0f0f] p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                <X className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">Maximum violations reached</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/70">This preview session has been terminated after {maxViolations} violations.</p>
              <button onClick={exitExamMode} className="mt-5 w-full rounded-xl border border-white/15 bg-white py-2.5 text-sm font-bold text-black hover:bg-white/90">
                Exit Preview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
