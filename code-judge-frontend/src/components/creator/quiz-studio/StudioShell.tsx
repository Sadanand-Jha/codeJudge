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
  const { state, updateInfo, setActiveQuestion, nextStep, saveToServer } = useStudio();
  const { status, lastSaved } = useSaveStatus();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.info.title);
  const [savingDraft, setSavingDraft] = useState(false);
  const [continuing, setContinuing] = useState(false);
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

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 sm:gap-3 border-b border-border bg-background px-2 sm:px-4 min-w-0 overflow-hidden">
      <button onClick={() => router.push("/creator/quizzes")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:bg-card-hover transition-colors">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
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
            className="min-w-[120px] max-w-[40vw] sm:min-w-[160px] rounded border border-border bg-input-bg px-2 py-1 text-sm font-semibold text-text-primary outline-none flex-1"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="truncate text-left font-['Inter'] text-sm font-semibold text-text-primary min-w-0 max-w-[36vw] sm:max-w-none">
            {label}
          </button>
        )}
        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 sm:px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
          DRAFT
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

      <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
        {state.step === "questions" && (
          <div className="hidden items-center gap-2 lg:flex">
            <span className="font-['Inter'] text-xs font-medium text-text-secondary whitespace-nowrap">{topCounter}</span>
            <div className="h-1.5 w-16 xl:w-20 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-[#E91E63] rounded-full transition-all" style={{ width: `${Math.max(8, Math.min(100, progress))}%` }} />
            </div>
          </div>
        )}
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
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#E91E63] px-4 text-xs font-semibold text-white hover:bg-[#D81B60] shadow-sm disabled:opacity-60"
        >
          {continuing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <>Continue <span>→</span></>}
        </button>
      </div>
    </header>
  );
}

export function StudioStepper() {
  const { state, goToStep, stepIndex, steps } = useStudio();
  const labels = ["Setup", "Questions", "Game Mechanics", "Settings", "Audience", "Registration", "Pricing", "Branding", "Review", "Publish"];
  // map steps to labels if available, fallback to labels
  const display = steps.map((s, i) => ({ id: s.id, label: labels[i] ?? s.label }));

  return (
    <div className="shrink-0 border-b border-border bg-background overflow-hidden">
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
      {/* active underline */}
      <div className="relative h-0">
        <div className="absolute left-0 top-0 h-0.5 w-full bg-transparent" />
      </div>
    </div>
  );
}

export function StudioFooter() {
  const { state, prevStep, nextStep, stepIndex, steps, summary, publish, saveToServer, setActiveQuestion } = useStudio();
  const [savingDraft, setSavingDraft] = useState(false);
  const [continuing, setContinuing] = useState(false);

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
      await nextStep();
    } finally {
      setContinuing(false);
    }
  };

  const canContinue = () => {
    if (state.step === "setup") return state.info.title.trim().length >= 3;
    if (state.step === "questions") return summary.validQuestions > 0;
    return true;
  };

  const isLast = stepIndex === steps.length - 1;
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
      if (!isQuestionValidationError(err)) toast.error({ title: "Could not publish quiz", description: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <footer className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-4">
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
        {isLast ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmPublish(true)}
              disabled={publishing}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#E91E63] px-5 text-xs font-semibold text-white hover:bg-[#D81B60] disabled:opacity-60"
            >
              <Rocket className="h-3.5 w-3.5" /> Publish Quiz
            </button>
            {confirmPublish && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={() => !publishing && setConfirmPublish(false)}>
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
                  <h3 className="font-semibold text-text-primary">Publish this quiz?</h3>
                  <p className="mt-1 text-xs text-text-secondary">It will go live immediately for eligible students.</p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setConfirmPublish(false)} className="rounded-lg border border-border bg-card px-4 py-2 text-xs text-text-primary hover:bg-card-hover">Cancel</button>
                    <button onClick={handleConfirmPublish} className="rounded-lg bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white">
                      {publishing ? "Publishing…" : "Yes, Publish"}
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
    <div data-studio="true" className="flex flex-1 min-h-0 flex-col bg-background text-foreground font-['Inter'] min-w-0 overflow-hidden">
      <StudioHeader />
      <StudioStepper />
      <AnimatePresence mode="wait">
        <motion.main
          key={state.step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1 min-h-0 flex flex-col bg-background min-w-0 overflow-hidden"
        >
          <div
            className="mx-auto flex flex-1 min-h-0 w-full max-w-[1600px] flex-col overflow-y-auto overflow-x-hidden p-2 sm:p-3 min-w-0"
          >
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
