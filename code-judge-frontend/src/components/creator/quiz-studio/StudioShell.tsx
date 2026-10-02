"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, HelpCircle, Loader2, Rocket, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio, useSaveStatus, isQuestionValidationError } from "./StudioProvider";
import { toast } from "@/lib/toast";

const STEP_HELP: Record<string, { title: string; intro: string; items: string[] }> = {
  setup: {
    title: "Quiz setup",
    intro: "Add the basic details students will see before starting the quiz.",
    items: [
      "Enter a clear title and select the closest subject and exam.",
      "Duration is the total attempt time. Passing marks cannot exceed total question marks.",
      "You can start manually, import questions, duplicate a quiz, or use AI generation.",
    ],
  },
  questions: {
    title: "Questions",
    intro: "Build the question paper and mark the correct answers.",
    items: [
      "Add a question, choose its type, then enter the question and answer options.",
      "For single choice, select one correct answer. Multiple choice can have several correct answers.",
      "Use question settings for marks, difficulty, and time. Save before leaving this step.",
      "The question list lets you reorder, duplicate, search, or remove questions.",
    ],
  },
  gameMechanics: {
    title: "Game mechanics",
    intro: "Optional rules can make an attempt more interactive.",
    items: [
      "Enable only the mechanics you want students to use.",
      "Some mechanics require multiple-choice questions or a timed quiz.",
      "Leave every option off for a standard quiz experience.",
    ],
  },
  settings: {
    title: "Quiz settings",
    intro: "Control timing, question order, results, and attempt security.",
    items: [
      "Choose when the quiz starts and ends, or keep manual control.",
      "Randomization changes question or option order for each student.",
      "Security options help discourage tab switching, copying, and leaving full screen.",
    ],
  },
  audience: {
    title: "Audience and access",
    intro: "Choose who is allowed to find and attempt the quiz.",
    items: [
      "Public quizzes can be discovered by anyone.",
      "Private quizzes require the link or access code.",
      "Rooms restrict access to students from the rooms you select.",
    ],
  },
  registration: {
    title: "Registration",
    intro: "Choose what information participants must provide.",
    items: [
      "Add only the fields you need and mark required fields clearly.",
      "Reorder fields to control how the registration form appears.",
      "Platform identity and account contact information remain protected.",
    ],
  },
  pricing: {
    title: "Pricing",
    intro: "Choose whether students can join for free or must pay.",
    items: [
      "Free quizzes have no enrollment charge.",
      "Paid quiz support is marked as coming soon where it is unavailable.",
      "Any fee and earnings preview is an estimate until payment settings are configured.",
    ],
  },
  branding: {
    title: "Branding",
    intro: "Branding controls the visual identity of the student experience.",
    items: [
      "Logo, colors, and certificate options will appear here when available.",
      "Skipping this step does not prevent saving or publishing a quiz.",
    ],
  },
  review: {
    title: "Review",
    intro: "Check the quiz before publishing or finishing your edit.",
    items: [
      "Errors must be fixed before publishing.",
      "Warnings are recommendations and do not block publishing.",
      "Use Fix beside an item to return directly to the relevant step.",
    ],
  },
  publish: {
    title: "Publish",
    intro: "Confirm the final details and make the quiz available.",
    items: [
      "Review the title, question count, duration, audience, and schedule.",
      "Starting the quiz makes it live for eligible participants.",
      "Use the copy control to share the quiz code when needed.",
    ],
  },
};

// Mobile follows a focused subset of the Studio flow (see MOBILE_STEP_IDS).
// Desktop keeps the complete Studio navigation.
const LIFECYCLE_BADGE = {
  draft: { label: "Draft", className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400" },
  scheduled: { label: "Scheduled", className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300" },
  live: { label: "Live", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" },
  ended: { label: "Ended", className: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300" },
} as const;

function StudioHelpButton() {
  const { state } = useStudio();
  const [open, setOpen] = useState(false);
  const help = STEP_HELP[state.step] ?? STEP_HELP.setup;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-text-primary hover:bg-card-hover sm:px-3"
        aria-label="Open help"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Help</span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-stretch sm:justify-end">
                <motion.button
                  type="button"
                  aria-label="Close help"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
                  onClick={() => setOpen(false)}
                />
                <motion.aside
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 360, damping: 34 }}
                  className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-background p-5 shadow-2xl sm:h-full sm:max-h-none sm:max-w-sm sm:rounded-none sm:rounded-l-2xl sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-pink-500">Help</p>
                      <h2 className="mt-1 text-lg font-bold text-text-primary">{help.title}</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-card-hover hover:text-text-primary"
                      aria-label="Close help"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text-secondary">{help.intro}</p>
                  <ol className="mt-5 space-y-3">
                    {help.items.map((item, index) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed text-text-secondary">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500/10 text-[11px] font-bold text-pink-500">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

export function StudioHeader() {
  const router = useRouter();
  const { state, updateInfo, prevStep, nextStep, prevMobileStep, nextMobileStep, stepIndex, saveToServer, mobileSteps, mobileStepIndex, editMode } = useStudio();
  const { status, lastSaved } = useSaveStatus();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.info.title);
  const [continuing, setContinuing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isMobileLast = mobileStepIndex !== -1 && mobileStepIndex === mobileSteps.length - 1;
  const label = state.info.title.trim() === "" ? "Untitled Quiz" : state.info.title;
  const activeIdx = state.questions.findIndex((q) => q.id === state.activeQuestionId);
  const total = state.questions.length;
  const currentNum = activeIdx >= 0 ? activeIdx + 1 : total > 0 ? 1 : 0;
  const progress = total > 0 ? Math.round((currentNum / Math.max(total, 1)) * 100) : 0;
  const topCounter = total > 0 ? `${currentNum} / ${total} questions` : `0 / ${total} questions`;
  const lifecycleBadge = LIFECYCLE_BADGE[state.info.quizLifecycle] ?? LIFECYCLE_BADGE.draft;

  useEffect(() => setDraft(state.info.title), [state.info.title]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== state.info.title) updateInfo({ title: next });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveToServer();
      toast.success({ title: "Saved", description: "Your quiz has been saved." });
    } catch (err) {
      if (!isQuestionValidationError(err)) toast.error({ title: "Could not save", description: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-[56px] h-auto w-full max-w-full flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-2 sm:h-14 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-0 min-w-0 max-w-[100vw]">
      <button aria-label="Exit quiz studio" title="Exit quiz studio" onClick={() => router.push("/creator/quizzes")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:bg-card-hover transition-colors sm:h-9 sm:w-9 sm:rounded-xl">
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded-lg border border-input-border bg-input-bg px-2 py-1.5 text-sm font-semibold text-text-primary outline-none sm:min-w-[120px] sm:max-w-[40vw] sm:rounded-xl sm:px-3 sm:py-2"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="min-w-0 flex-1 whitespace-normal break-words text-left font-['Inter'] text-[13px] font-semibold leading-snug text-text-primary sm:max-w-none sm:truncate sm:text-[15px]">
            {label}
          </button>
        )}
        <span className={cn("inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold tracking-wide sm:px-2 sm:text-[10px]", lifecycleBadge.className)}>
          {lifecycleBadge.label}
        </span>
      </div>

      <div className="hidden items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 sm:flex ml-1 sm:ml-3 border-l border-border pl-2 sm:pl-3 shrink-0">
        {status === "saving" ? (
          <span className="flex items-center gap-1 text-text-muted"><Loader2 className="h-3 w-3 animate-spin" />Saving…</span>
        ) : status === "saved" && lastSaved ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Saved</span>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex w-full min-w-0 items-center gap-2 border-t border-border/70 pt-2 sm:w-auto sm:shrink-0 sm:justify-end sm:border-0 sm:pt-0">
        <button
          type="button"
          onClick={() => void prevMobileStep()}
          disabled={mobileStepIndex <= 0}
          title="Previous step"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-text-primary transition-colors hover:bg-card-hover disabled:pointer-events-none disabled:opacity-35 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => void prevStep()}
          disabled={stepIndex === 0}
          className="hidden h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover disabled:pointer-events-none disabled:opacity-35 lg:inline-flex"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <StudioHelpButton />
        {state.step === "questions" && (
          <div className="hidden items-center gap-2 lg:flex shrink-0">
            <span className="font-['Inter'] text-xs font-medium text-text-secondary whitespace-nowrap">{topCounter}</span>
            <div className="h-1.5 w-16 xl:w-20 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-[#E91E63] rounded-full transition-all" style={{ width: `${Math.max(8, Math.min(100, progress))}%` }} />
            </div>
          </div>
        )}
        {/* Mobile: Save + Continue compact */}
        <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
          {!editMode && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-text-primary disabled:opacity-50 sm:rounded-xl"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </button>
          )}
          <button
            onClick={async () => {
              if (continuing) return;
              setContinuing(true);
              try {
                if (isMobileLast && editMode) {
                  await saveToServer();
                  toast.success({ title: "Saved", description: "Your quiz has been saved." });
                  router.push("/creator/quizzes");
                  return;
                }
                await nextMobileStep();
              } finally {
                setContinuing(false);
              }
            }}
            disabled={continuing}
            className="inline-flex h-9 min-w-0 flex-[1.25] items-center justify-center gap-1 rounded-lg bg-[#E91E63] px-3 text-xs font-bold text-white shadow-sm disabled:opacity-60 sm:rounded-xl sm:px-4"
          >
            {continuing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Continue</>}
          </button>
        </div>
        {/* Desktop: Continue only */}
        <button
          onClick={async () => {
            if (continuing) return;
            setContinuing(true);
            try {
              await nextStep();
            } finally {
              setContinuing(false);
            }
          }}
          disabled={continuing}
          className="hidden lg:inline-flex h-8 items-center gap-1 rounded-lg bg-[#E91E63] px-4 text-xs font-semibold text-white hover:bg-[#D81B60] shadow-sm disabled:opacity-60"
        >
          {continuing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <>Continue <span>→</span></>}
        </button>
      </div>
    </header>
  );
}

export function StudioStepper() {
  const { state, goToStep, stepIndex, steps, mobileSteps, mobileStepIndex } = useStudio();
  const [stepMenuOpen, setStepMenuOpen] = useState(false);
  const stepMenuRef = useRef<HTMLDivElement>(null);
  const display = steps;
  const current = display[stepIndex] ?? display[0];
  const progress = ((stepIndex + 1) / Math.max(display.length, 1)) * 100;
  // Mobile follows only the mobile subset. If the current step isn't part of
  // it (e.g. reached via a Review "Fix" link), fall back to full numbering so
  // we never render nonsense like "Step 8 of 5".
  const onMobilePath = mobileStepIndex !== -1;
  const mobileCurrent = mobileSteps[mobileStepIndex] ?? current;
  const mobileProgress = onMobilePath
    ? ((mobileStepIndex + 1) / Math.max(mobileSteps.length, 1)) * 100
    : progress;

  useEffect(() => {
    if (!stepMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!stepMenuRef.current?.contains(event.target as Node)) setStepMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [stepMenuOpen]);

  return (
    <div className="shrink-0 border-b border-border bg-background px-3 py-2.5 sm:px-4">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {onMobilePath ? (
                <span className="lg:hidden">Step {mobileStepIndex + 1} of {mobileSteps.length}</span>
              ) : (
                <span className="lg:hidden">Step {stepIndex + 1} of {display.length}</span>
              )}
              <span className="hidden lg:inline">Step {stepIndex + 1} of {display.length}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-[#E91E63] transition-all lg:hidden" style={{ width: `${mobileProgress}%` }} />
            <div className="hidden h-full rounded-full bg-[#E91E63] transition-all lg:block" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div ref={stepMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setStepMenuOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={stepMenuOpen}
            className={cn(
              "flex h-9 max-w-[58vw] items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs font-semibold outline-none sm:max-w-none",
              stepMenuOpen ? "border-pink-500 text-pink-500" : "border-border text-text-primary"
            )}
          >
            <span className="truncate">
              {onMobilePath ? (
                <span className="lg:hidden">{mobileStepIndex + 1}.</span>
              ) : (
                <span className="lg:hidden">{stepIndex + 1}.</span>
              )}
              <span className="hidden lg:inline">{stepIndex + 1}.</span>{" "}{onMobilePath ? mobileCurrent?.label : current?.label}
            </span>
            <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 rotate-90 transition-transform", stepMenuOpen && "-rotate-90")} />
          </button>
          <AnimatePresence>
            {stepMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                role="menu"
                className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-2xl"
              >
                {/* Mobile menu: only the mobile subset */}
                <div className="lg:hidden">
                  {mobileSteps.map((step, index) => {
                    const active = step.id === state.step;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          goToStep(step.id);
                          setStepMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium",
                          active ? "bg-pink-500/10 text-pink-500" : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                        )}
                      >
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", active ? "bg-pink-500 text-white" : "bg-card-hover text-text-muted")}>
                          {index + 1}
                        </span>
                        <span className="truncate">{step.label}</span>
                        {active && <Check className="ml-auto h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
                {/* Desktop menu: full Studio navigation */}
                <div className="hidden lg:block">
                  {display.map((step, index) => {
                    const active = step.id === state.step;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          goToStep(step.id);
                          setStepMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium",
                          active ? "bg-pink-500/10 text-pink-500" : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                        )}
                      >
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", active ? "bg-pink-500 text-white" : "bg-card-hover text-text-muted")}>
                          {index + 1}
                        </span>
                        <span className="truncate">{step.label}</span>
                        {active && <Check className="ml-auto h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function StudioFooter() {
  const router = useRouter();
  const { state, prevStep, nextStep, stepIndex, steps, summary, publish, saveToServer, setActiveQuestion, editMode } = useStudio();
  const [savingDraft, setSavingDraft] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const isLast = stepIndex === steps.length - 1;

  const handleSaveDraft = async () => {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      await saveToServer();
      toast.success({ title: "Saved to server", description: "Your quiz draft and questions are saved." });
    } catch (err) {
      if (isQuestionValidationError(err)) return;
      toast.error({ title: "Could not save draft", description: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleContinue = async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      if (isLast && editMode) {
        await saveToServer();
        toast.success({ title: "Saved", description: "Your quiz has been saved." });
        router.push("/creator/quizzes");
        return;
      }
      await nextStep();
    } finally {
      setContinuing(false);
    }
  };

  const canContinue = () => {
    if (state.step === "setup") {
      if (state.info.title.trim().length < 3) return false;
      if (summary.totalMarks > 0 && state.info.passingMarks > summary.totalMarks) return false;
      return true;
    }
    if (state.step === "questions") return summary.validQuestions > 0;
    return true;
  };

  const isQuestions = state.step === "questions";
  const activeIdx = state.questions.findIndex((q) => q.id === state.activeQuestionId) + 1;
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleConfirmPublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      await saveToServer({ publish: true });
      toast.success({ title: state.info.title || "Quiz published", description: "Your quiz is now live." });
      publish();
    } catch (err) {
      if (!isQuestionValidationError(err)) toast.error({ title: "Could not start quiz", description: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <footer className="hidden lg:flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-4">
      <button
        type="button"
        onClick={() => void prevStep()}
        disabled={stepIndex === 0}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-text-primary hover:bg-card-hover disabled:opacity-40"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {isQuestions ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {state.questions.length === 0 ? "No questions yet" : `Question ${activeIdx || 1} of ${state.questions.length}`}
          </span>
          <div className={`ml-2 flex items-center gap-1.5 ${state.questions.length === 0 ? "hidden" : ""}`}>
            <button
              onClick={() => {
                const idx = state.questions.findIndex((q) => q.id === state.activeQuestionId);
                if (idx > 0) setActiveQuestion(state.questions[idx - 1].id);
              }}
              disabled={activeIdx <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-muted hover:bg-card-hover disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                const idx = state.questions.findIndex((q) => q.id === state.activeQuestionId);
                if (idx < state.questions.length - 1) setActiveQuestion(state.questions[idx + 1].id);
              }}
              disabled={activeIdx >= state.questions.length}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-[#E91E63] hover:bg-card-hover disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2">
        {isLast && !editMode ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmPublish(true)}
              disabled={publishing}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:opacity-60"
            >
              <Rocket className="h-3.5 w-3.5" /> Start Quiz
            </button>
            {confirmPublish && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={() => !publishing && setConfirmPublish(false)}>
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
                  <h3 className="font-semibold text-text-primary">Start this quiz?</h3>
                  <p className="mt-1 text-xs text-text-secondary">It will go live immediately for eligible students.</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setConfirmPublish(false)} className="rounded-lg border border-border bg-card px-4 py-2 text-xs text-text-primary hover:bg-card-hover">Cancel</button>
                    <button onClick={handleConfirmPublish} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110">
                      {publishing ? "Starting…" : "Yes, Start Quiz"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue() || continuing}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1 rounded-lg px-5 text-xs font-semibold",
              canContinue() && !continuing ? "bg-[#E91E63] text-white hover:bg-[#D81B60]" : "bg-card-hover text-text-muted cursor-not-allowed"
            )}
          >
            {continuing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <>Continue <span>→</span></>}
          </button>
        )}
      </div>
    </footer>
  );
}

export function StudioShell({ children }: { children: React.ReactNode }) {
  const { state } = useStudio();
  const title = state.info.title.trim() || "Untitled Quiz";
  useEffect(() => {
    const tagline = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (tagline) tagline.content = `Creator Studio — ${title}`;
  }, [title]);

  return (
    <div
      data-studio="true"
      className="creator-mobile-calm flex flex-1 min-h-0 flex-col bg-background text-foreground font-['Inter'] min-w-0 overflow-hidden dark:[&_.bg-white]:bg-card dark:[&_.bg-zinc-50]:bg-background dark:[&_.bg-zinc-100]:bg-card-hover dark:[&_.border-zinc-200]:border-border dark:[&_.border-zinc-300]:border-border-hover dark:[&_.text-zinc-900]:text-text-primary dark:[&_.text-zinc-700]:text-text-secondary dark:[&_.text-zinc-600]:text-text-secondary dark:[&_.text-zinc-500]:text-text-muted"
    >
      <StudioHeader />
      <StudioStepper />
      <AnimatePresence mode="wait">
        <motion.main
          data-creator-step-panel
          key={state.step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1 min-h-0 flex flex-col bg-background min-w-0 overflow-hidden"
        >
          <div
            className="mx-auto flex flex-1 min-h-0 w-full max-w-none flex-col overflow-y-auto overflow-x-hidden p-2 sm:p-3 min-w-0 lg:w-[96%] xl:w-[95%] max-w-[430px] lg:max-w-none"
          >
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
