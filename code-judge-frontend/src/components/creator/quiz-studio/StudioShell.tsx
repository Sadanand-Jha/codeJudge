"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Loader2, Rocket } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio, useSaveStatus, isQuestionValidationError } from "./StudioProvider";
import { toast } from "@/lib/toast";

export function StudioHeader() {
  const router = useRouter();
  const { state, updateInfo, setActiveQuestion, nextStep, saveToServer, stepIndex, steps, editMode } = useStudio();
  const { status, lastSaved } = useSaveStatus();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.info.title);
  const [savingDraft, setSavingDraft] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLast = stepIndex === steps.length - 1;
  const label = state.info.title.trim() === "" ? "Untitled Quiz" : state.info.title;
  const activeIdx = state.questions.findIndex((q) => q.id === state.activeQuestionId);
  const total = state.questions.length;
  const currentNum = activeIdx >= 0 ? activeIdx + 1 : total > 0 ? 1 : 0;
  const progress = total > 0 ? Math.round((currentNum / Math.max(total, 1)) * 100) : 0;
  const topCounter = total > 0 ? `${currentNum} / ${total} questions` : `0 / ${total} questions`;

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
    <header className="sticky top-0 z-20 flex h-[56px] w-full max-w-full items-center gap-1.5 border-b border-zinc-200 bg-white px-2 sm:h-14 sm:gap-3 sm:border-border sm:bg-background sm:px-4 min-w-0 max-w-[100vw] overflow-hidden">
      <button onClick={() => router.push("/creator/quizzes")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors sm:h-8 sm:rounded-lg sm:border-border sm:bg-card sm:text-text-secondary sm:h-9 sm:w-9 sm:rounded-xl">
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
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
            className="min-w-0 max-w-[42vw] sm:min-w-[120px] sm:max-w-[40vw] flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm font-semibold text-zinc-900 outline-none sm:rounded-xl sm:px-3 sm:py-2"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="truncate text-left font-['Inter'] text-[13px] sm:text-[15px] font-semibold text-zinc-900 min-w-0 max-w-[32vw] xs:max-w-[38vw] sm:max-w-none">
            {label}
          </button>
        )}
        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wide text-amber-700 sm:px-2 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          Draft
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

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        {state.step === "questions" && (
          <div className="hidden items-center gap-2 lg:flex shrink-0">
            <span className="font-['Inter'] text-xs font-medium text-text-secondary whitespace-nowrap">{topCounter}</span>
            <div className="h-1.5 w-16 xl:w-20 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-[#E91E63] rounded-full transition-all" style={{ width: `${Math.max(8, Math.min(100, progress))}%` }} />
            </div>
          </div>
        )}
        {/* Mobile: Save + Continue compact */}
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 lg:hidden">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 disabled:opacity-50 sm:h-9 sm:rounded-xl sm:px-3"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
          </button>
          <button
            onClick={async () => {
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
            }}
            disabled={continuing}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#E91E63] px-3 text-xs font-bold text-white shadow-sm disabled:opacity-60 sm:h-9 sm:rounded-xl sm:px-4"
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
  const { state, goToStep, stepIndex, steps, editMode } = useStudio();
  const labels = ["Setup", "Questions", "Game Mechanics", "Settings", "Audience", "Registration", "Pricing", "Branding", "Review", "Publish"];
  const display = steps.map((s, i) => ({ id: s.id, label: labels[i] ?? s.label }));

  // Mobile simplified flow — only essential steps, no gamification
  const MOBILE_STEPS: Array<{ id: string; label: string }> = [
    { id: "questions", label: "Questions" },
    { id: "settings", label: "Settings" },
    { id: "audience", label: "Audience" },
    { id: "review", label: "Review" },
    ...(!editMode ? [{ id: "publish", label: "Publish" }] : []),
  ];
  const mobileIndex = MOBILE_STEPS.findIndex((s) => s.id === state.step);
  // For excluded steps (setup, gameMechanics, etc.) map to nearest: setup -> Questions, gameMechanics -> Settings
  const effectiveMobileIndex = (() => {
    if (mobileIndex !== -1) return mobileIndex;
    if (state.step === "setup") return 0;
    if (state.step === "gameMechanics") return 1;
    if (state.step === "registration" || state.step === "pricing" || state.step === "branding") return 2;
    return -1;
  })();

  return (
    <>
      {/* Desktop: full 10-step timeline */}
      <div className="hidden lg:block shrink-0 border-b border-border bg-background overflow-hidden">
        <nav
          className="flex items-center gap-2 overflow-x-auto px-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x"
          aria-label="Quiz creation steps"
        >
          {display.map((step, i) => {
            const active = state.step === step.id;
            const done = i < stepIndex;
            const num = i + 1;
            return (
              <div key={step.id} className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => goToStep(step.id as any)}
                  className={cn(
                    "flex items-center gap-2 py-3 text-xs whitespace-nowrap",
                    active ? "font-semibold text-[#E91E63]" : done ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium text-text-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      active
                        ? "bg-[#E91E63] text-white"
                        : done
                          ? "bg-emerald-500 text-white"
                          : "bg-card-hover text-text-secondary border border-border"
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : num}
                  </span>
                  <span>{step.label}</span>
                </button>
                {i < display.length - 1 && <span className="mx-2 h-px w-8 bg-border" />}
                {active && <span className="absolute" />}
              </div>
            );
          })}
        </nav>
        <div className="relative h-0">
          <div className="absolute left-0 top-0 h-0.5 w-full bg-transparent" />
        </div>
      </div>

      {/* Mobile: compact single-step (Option A) — no horizontal overflow */}
      <div className="lg:hidden shrink-0 border-b border-zinc-200 bg-white min-w-0 w-full max-w-full overflow-hidden">
        <div className="px-4 pt-3 pb-3 space-y-2 min-w-0">
          <div className="flex items-center justify-between min-w-0 gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-400">
              {effectiveMobileIndex >= 0 ? `STEP ${effectiveMobileIndex + 1} OF ${MOBILE_STEPS.length}` : "STEP"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#E91E63] transition-all duration-300"
              style={{ width: `${effectiveMobileIndex >= 0 ? ((effectiveMobileIndex + 1) / MOBILE_STEPS.length) * 100 : 10}%` }}
            />
          </div>
          <div className="pt-1">
            {effectiveMobileIndex >= 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E91E63] text-[11px] font-bold text-white">
                  {effectiveMobileIndex + 1}
                </span>
                <span className="text-sm font-bold text-[#E91E63] break-words">
                  {MOBILE_STEPS[effectiveMobileIndex].label}
                </span>
                {effectiveMobileIndex > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
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
          <span className="text-xs text-text-secondary">Question {activeIdx || 1} of {state.questions.length}</span>
          <div className="ml-2 flex items-center gap-1.5">
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
    <div data-studio="true" className="flex flex-1 min-h-0 flex-col bg-zinc-50 lg:bg-background text-foreground font-['Inter'] min-w-0 overflow-hidden">
      <StudioHeader />
      <StudioStepper />
      <AnimatePresence mode="wait">
        <motion.main
          key={state.step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1 min-h-0 flex flex-col bg-zinc-50 lg:bg-background min-w-0 overflow-hidden"
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
