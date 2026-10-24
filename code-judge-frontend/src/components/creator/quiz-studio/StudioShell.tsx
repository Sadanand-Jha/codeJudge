"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Check, AlertTriangle, Rocket } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import { cn } from "@/lib/helpers";
import { useStudio, useSaveStatus, isQuestionValidationError } from "./StudioProvider";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";

export function StudioHeader() {
  const router = useRouter();
  const { state, updateInfo, prevMobileStep, nextMobileStep, saveToServer, mobileSteps, mobileStepIndex, editMode, questionsDirty, savingToServer } = useStudio();
  const { status, lastSaved } = useSaveStatus();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.info.title);
  const [continuing, setContinuing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isMobileLast = mobileStepIndex !== -1 && mobileStepIndex === mobileSteps.length - 1;
  const showContinue = !isMobileLast || editMode;
  const saveDisabled = state.step === "questions" && !questionsDirty;
  const label = state.info.title.trim();

  useEffect(() => {
    queueMicrotask(() => setDraft(state.info.title));
  }, [state.info.title]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== state.info.title) updateInfo({ title: next });
  };

  const handleSave = async () => {
    if (saving || savingToServer || saveDisabled) return;
    setSaving(true);
    try {
      await saveToServer();
      toast.success({ title: "Saved", description: "Your quiz has been saved." });
    } catch (err) {
      if (!isQuestionValidationError(err)) {
        toast.error({ title: "Could not save", description: getApiErrorMessage(err, "Something went wrong.") });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-[56px] h-auto w-full max-w-[100vw] min-w-0 flex-wrap items-center gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-2 sm:gap-3 sm:px-4 lg:h-11 lg:min-h-[44px] lg:flex-nowrap lg:justify-center lg:py-0">
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 lg:flex-none lg:max-w-[70%]">
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
            className="min-w-0 flex-1 rounded-[10px] border-2 border-[var(--qs-brand)] bg-[var(--qs-surface)] px-2 py-1.5 text-center text-sm font-bold text-[var(--qs-ink)] outline-none sm:min-w-[120px] sm:max-w-[40vw] sm:rounded-[12px] sm:px-3 sm:py-2"
          />
        ) : label !== "" ? (
          <button onClick={() => setEditing(true)} className="min-w-0 max-w-full whitespace-normal break-words text-center font-['Inter'] text-[13px] font-bold leading-snug text-[var(--qs-ink)] sm:text-[15px]">
            {label}
          </button>
        ) : null}
      </div>

      <div className="absolute left-4 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 text-xs text-[var(--qs-ok)] lg:flex">
        {status === "saving" ? (
          <span className="flex items-center gap-1 text-[var(--qs-muted)]"><SecureLogo variant="mark" size={12} className="animate-pulse motion-reduce:animate-none" />Saving…</span>
        ) : status === "saved" && lastSaved ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span className="hidden font-bold lg:inline">Saved</span>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex w-full min-w-0 items-center gap-2 border-t-2 border-[var(--qs-line)] pt-2 lg:hidden">
        <button
          type="button"
          onClick={() => void prevMobileStep()}
          disabled={mobileStepIndex <= 0}
          title="Previous step"
          aria-label="Previous step"
          className="b b-icon sm shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {/* Mobile: Save + Continue compact */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!editMode && (
            <button
              type="button"
              onClick={() => {
                if (saveDisabled) {
                  toast.info({ title: "Nothing to save", description: "You're already up to date." });
                  return;
                }
                void handleSave();
              }}
              disabled={saving || savingToServer}
              aria-disabled={saveDisabled || undefined}
              aria-busy={saving || undefined}
              title={saveDisabled ? "Nothing to save" : undefined}
              className={cn(
                "b sm min-w-0 flex-1 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[3px_3px_0_var(--qs-sun)]",
                "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
                (saving || savingToServer) && "loading",
                saveDisabled && "border-[var(--qs-line)] shadow-none"
              )}
            >
              {saving || savingToServer ? "Saving…" : saveDisabled ? "Saved" : "Save"}
            </button>
          )}
          {showContinue && (
            <button
              type="button"
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
              aria-busy={continuing || undefined}
              className={cn("b b-pri sm min-w-0 flex-[1.25]", continuing && "loading")}
            >
              {continuing ? "Saving…" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function StudioStepper() {
  const { goToStep, prevStep, nextStep, stepIndex, steps, questionsValid } = useStudio();

  return (
    <div className="relative z-30 shrink-0 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-2.5 sm:px-4">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-1.5 sm:gap-2">
        <p className="sr-only">
          Step {stepIndex + 1} of {steps.length}: {steps[stepIndex]?.label}
        </p>
        <button
          type="button"
          onClick={() => void prevStep()}
          disabled={stepIndex === 0}
          aria-label="Previous step"
          title="Previous step"
          className="group inline-flex h-8 shrink-0 items-center gap-1 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-ink)] shadow-[2px_2px_0_var(--qs-line)] transition-all hover:-translate-y-0.5 hover:border-[var(--qs-brand)] hover:shadow-[3px_3px_0_var(--qs-sun)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:px-2.5 sm:text-[11px]"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span className="hidden md:inline">Previous</span>
        </button>
        <ol className="flex min-w-0 flex-1 items-stretch gap-1.5 sm:gap-2">
          {steps.map((step, index) => {
            const done = index < stepIndex;
            const active = index === stepIndex;
            const needsAttention = done && step.id === "questions" && !questionsValid;
            return (
              <li key={step.id} className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Step ${index + 1}: ${step.label}`}
                  title={step.label}
                  className={cn(
                    "flex h-full w-full min-w-0 flex-col items-center justify-center gap-1 rounded-[10px] border-2 px-1 py-1.5 text-center transition-all sm:flex-row sm:gap-1.5 sm:rounded-[12px] sm:px-2 sm:py-2",
                    done && !needsAttention && "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
                    needsAttention && "border-[var(--qs-warn)] bg-[var(--qs-warnbg)] text-[var(--qs-warn)]",
                    active && "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)]",
                    !done && !active && "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold tabular-nums",
                      done && !needsAttention && "bg-[var(--qs-ok)] text-[var(--qs-bg)]",
                      needsAttention && "bg-[var(--qs-warn)] text-[var(--qs-bg)]",
                      active && "border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-brand)]",
                      !done && !active && "bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                    )}
                  >
                    {done && !needsAttention ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : needsAttention ? (
                      <AlertTriangle className="h-3 w-3" strokeWidth={3} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 text-[8px] font-extrabold uppercase leading-[1.15] tracking-[0.02em] sm:text-[10px] sm:leading-tight sm:tracking-normal lg:text-[11px]",
                      step.label.includes("&") ? "whitespace-normal" : "whitespace-nowrap"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -right-1.5 top-1/2 h-1 w-1.5 -translate-y-1/2 rounded-full sm:-right-2 sm:w-2",
                      index < stepIndex
                        ? step.id === "questions" && !questionsValid
                          ? "bg-[var(--qs-warn)]"
                          : "bg-[var(--qs-ok)]"
                        : "bg-[var(--qs-line)]"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() => void nextStep()}
          disabled={stepIndex === steps.length - 1}
          aria-label="Next step"
          title="Next step"
          className="group inline-flex h-8 shrink-0 items-center gap-1 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2 text-[10px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--qs-sun)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:px-2.5 sm:text-[11px]"
        >
          <span className="hidden md:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

export function StudioFooter() {
  const router = useRouter();
  const { state, prevStep, nextStep, stepIndex, steps, publish, saveToServer, setActiveQuestion, editMode } = useStudio();
  const [continuing, setContinuing] = useState(false);
  const isLast = stepIndex === steps.length - 1;

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
    if (state.step === "details") {
      if (state.info.title.trim().length < 3) return false;
      return true;
    }
    return true;
  };

  const isQuestions = state.step === "questions";
  const activeIdx = state.questions.findIndex((q) => q.id === state.activeQuestionId) + 1;
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const isScheduledPublish = Boolean(state.info.startDate);

  const handleConfirmPublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      await saveToServer({ publish: true });
      toast.success({
        title: state.info.title || "Quiz published",
        description: isScheduledPublish ? "Your quiz has been scheduled." : "Your quiz is now live.",
      });
      publish();
    } catch (err) {
      if (!isQuestionValidationError(err)) {
        toast.error({
          title: isScheduledPublish ? "Could not schedule quiz" : "Could not start quiz",
          description: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <footer className="hidden h-14 shrink-0 items-center justify-between gap-3 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 lg:flex">
      <button
        type="button"
        onClick={() => void prevStep()}
        disabled={stepIndex === 0}
        className="b b-ghost sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      {isQuestions ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--qs-muted)]">
            {state.questions.length === 0 ? "No questions yet" : `Question ${activeIdx || 1} of ${state.questions.length}`}
          </span>
          <div className={`ml-2 flex items-center gap-1.5 ${state.questions.length === 0 ? "hidden" : ""}`}>
            <button
              type="button"
              onClick={() => {
                const idx = state.questions.findIndex((q) => q.id === state.activeQuestionId);
                if (idx > 0) setActiveQuestion(state.questions[idx - 1].id);
              }}
              disabled={activeIdx <= 1}
              aria-label="Previous question"
              title="Previous question"
              className="b b-icon sm"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const idx = state.questions.findIndex((q) => q.id === state.activeQuestionId);
                if (idx < state.questions.length - 1) setActiveQuestion(state.questions[idx + 1].id);
              }}
              disabled={activeIdx >= state.questions.length}
              aria-label="Next question"
              title="Next question"
              className="b b-icon sm text-[var(--qs-brand)]"
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
              className="b b-pri sm"
            >
              <Rocket className="h-3.5 w-3.5" /> {isScheduledPublish ? "Schedule quiz" : "Start quiz"}
            </button>
            {confirmPublish && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1A1240]/60 p-4" onClick={() => !publishing && setConfirmPublish(false)}>
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 shadow-[6px_6px_0_var(--qs-sun)]">
                  <h3 className="text-base font-black text-[var(--qs-ink)]">
                    {isScheduledPublish ? "Schedule this quiz?" : "Start this quiz?"}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
                    {isScheduledPublish
                      ? "It will open automatically at the scheduled start time for eligible students."
                      : "It will go live immediately for eligible students."}
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => setConfirmPublish(false)} className="b sm">Cancel</button>
                    <button
                      type="button"
                      onClick={handleConfirmPublish}
                      disabled={publishing}
                      aria-busy={publishing || undefined}
                      className={cn("b b-pri sm", publishing && "loading")}
                    >
                      {publishing ? "Saving…" : isScheduledPublish ? "Schedule quiz" : "Start quiz"}
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
            aria-busy={continuing || undefined}
            className={cn("b b-pri sm", continuing && "loading")}
          >
            {continuing ? "Saving…" : <>Continue <ArrowRight className="h-3.5 w-3.5" /></>}
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
      className="creator-mobile-calm flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--qs-bg)] font-['Inter'] text-[var(--qs-ink)]"
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
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--qs-bg)]"
        >
          <div
            className="mx-auto flex min-h-0 w-full max-w-[430px] min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-2 sm:p-3 min-[900px]:w-[96%] min-[900px]:max-w-none min-[1240px]:w-[95%]"
          >
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
