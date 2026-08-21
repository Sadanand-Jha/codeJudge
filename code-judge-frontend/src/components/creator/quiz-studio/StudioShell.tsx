"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Rocket,
  Eye,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { STEPS } from "./types";
import { useStudio, useSaveStatus } from "./StudioProvider";
import { toast } from "@/lib/toast";

export { STEPS };

export function StudioHeader() {
  const { state, goToStep, updateInfo } = useStudio();
  const { status, lastSaved } = useSaveStatus();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.info.title);

  const startEditing = () => {
    setDraft(state.info.title);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== state.info.title) updateInfo({ title: next });
  };

  const label =
    state.info.title.trim() === ""
      ? "Untitled Quiz"
      : state.info.title;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-300 dark:bg-indigo-300">
          <Rocket className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  if (e.key === "Enter") commit();
                  else setDraft(state.info.title);
                  setEditing(false);
                }
              }}
              className="w-60 min-w-[180px] rounded border-0 bg-transparent text-sm font-semibold text-text-primary placeholder-text-muted outline-none"
              placeholder="Untitled Quiz"
            />
          ) : (
            <p
              className="group inline-flex cursor-text items-center truncate text-sm font-semibold text-text-primary"
              title="Click to edit title"
              onClick={() => setEditing(true)}
            >
              {label}
              <span className="ml-1.5 hidden h-3.5 w-px bg-border group-hover:inline-block" />
            </p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Draft
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
        {status === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
            <span>Saving…</span>
          </>
        )}
        {status === "saved" && (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span>Saved {formatTime(lastSaved)}</span>
          </>
        )}
        {status === "unsaved" && (
          <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
        )}
      </div>

      <div className="hidden h-5 w-px bg-border sm:block" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goToStep("review")}
          className="rounded-md p-2 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
          title="AI Assist"
        >
          <Sparkles className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="rounded-md p-2 text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary"
          title="Preview quiz"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function formatTime(d: Date | string | null): string {
  if (!d) return "";
  const time = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  if (isNaN(time)) return "";
  const diff = Math.floor((Date.now() - time) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function StudioStepper() {
  const { state, goToStep, stepIndex } = useStudio();
  const completed = useMemo(() => STEPS.slice(0, stepIndex).map((s) => s.id), [stepIndex]);
  const progressPct = Math.round(((stepIndex) / (STEPS.length - 1)) * 100);

  return (
    <div className="border-b border-border bg-card">
      <div className="h-0.5 w-full overflow-hidden bg-border/50">
        <div
          className="h-full bg-indigo-300 transition-all duration-200 dark:bg-indigo-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <nav className="flex items-stretch overflow-x-auto px-2 sm:px-4" aria-label="Quiz creation steps">
        {STEPS.map((step, i) => {
          const active = state.step === step.id;
          const done = completed.includes(step.id) || i < stepIndex;
          const clickable = i <= stepIndex;
          return (
            <div key={step.id} className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => (clickable ? goToStep(step.id as typeof step.id) : null)}
                disabled={!clickable}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-3 text-xs transition-colors duration-150",
                  active
                    ? "font-semibold text-indigo-600 dark:text-indigo-400"
                    : done
                    ? "font-medium text-text-primary hover:text-text-primary"
                    : "font-medium text-text-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-150",
                    active
                      ? "bg-indigo-300 text-white dark:bg-indigo-300"
                      : done
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-card-hover text-text-secondary"
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                </span>
                <span>{step.label}</span>
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-indigo-300 dark:bg-indigo-300" />
                )}
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "mx-1 h-px w-6 shrink-0 sm:w-8",
                    done ? "bg-emerald-500/40" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export function StudioFooter() {
  const { state, prevStep, nextStep, stepIndex, summary, publish, saveToServer } = useStudio();
  const [savingDraft, setSavingDraft] = useState(false);

  const handleSaveDraft = async () => {
    if (savingDraft) return;
    setSavingDraft(true);
    try {
      await saveToServer();
      toast.success({ title: "Saved to server", description: "Your quiz draft and questions are saved." });
    } catch (err) {
      toast.error({
        title: "Could not save draft",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const canContinue = () => {
    if (state.step === "setup") return state.info.title.trim().length >= 3;
    if (state.step === "questions") return summary.validQuestions > 0;
    return true;
  };

  const isLast = stepIndex === STEPS.length - 1;
  const isQuestions = state.step === "questions";
  const activeIdx = state.questions.findIndex((q) => q.id === state.activeQuestionId) + 1;
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleConfirmPublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      await saveToServer({ publish: true });
      toast.success({
        title: state.info.title || "Quiz published",
        description: "Your quiz is now live.",
      });
      publish();
    } catch (err) {
      toast.error({
        title: "Could not publish quiz",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <footer className="sticky bottom-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-4 sm:px-6">
      <button
        type="button"
        onClick={prevStep}
        disabled={stepIndex === 0}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-card-hover hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-2">
        {isQuestions && (
          <span className="mr-1 text-xs text-text-secondary">
            Question {activeIdx || 0} of {state.questions.length}
          </span>
        )}
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover disabled:opacity-60"
        >
          {savingDraft ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save Draft"
          )}
        </button>
        {isLast ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmPublish(true)}
              disabled={publishing}
              className="inline-flex w-36 items-center justify-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 px-4 py-1.5 text-sm font-semibold transition-colors duration-150 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25 disabled:opacity-60"
            >
              <Rocket className="h-4 w-4" /> Publish Quiz
            </button>

            {/* Publish confirmation */}
            {confirmPublish && (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                onClick={() => !publishing && setConfirmPublish(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                >
                  <div className="border-b border-border px-6 py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Rocket className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-text-primary">Publish this quiz?</h3>
                        <p className="mt-0.5 text-xs text-text-secondary">
                          It will go live immediately for eligible students.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-5">
                    <dl className="divide-y divide-border rounded-lg border border-border">
                      {[
                        { label: "Quiz", value: state.info.title || "Untitled Quiz" },
                        { label: "Code", value: state.info.code },
                        { label: "Questions", value: `${summary.questionCount} · ${summary.totalMarks} marks` },
                        { label: "Duration", value: `${state.info.duration} min` },
                      ].map((r) => (
                        <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                          <dt className="text-text-secondary">{r.label}</dt>
                          <dd className="max-w-[60%] truncate font-medium text-text-primary">{r.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                      Once students start attempting, questions and key settings
                      become locked. You can unpublish later if needed.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setConfirmPublish(false)}
                      disabled={publishing}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-150 hover:bg-card-hover disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmPublish}
                      disabled={publishing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-900 transition-colors duration-150 hover:bg-indigo-100 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25 disabled:opacity-60"
                    >
                      {publishing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Publishing…
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Yes, Publish
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canContinue()}
            className={cn(
              "inline-flex w-36 items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-150",
              canContinue()
                ? "border border-indigo-500/40 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border dark:border-pink-400/50 dark:bg-pink-500/15 dark:text-pink-200 dark:hover:bg-pink-500/25"
                : "cursor-not-allowed bg-card-hover text-text-muted"
            )}
          >
            Continue <span className="hidden sm:inline">→</span>
          </button>
        )}
      </div>
    </footer>
  );
}

export function StudioShell({ children }: { children: React.ReactNode }) {
  const { state, publish } = useStudio();
  const title = state.info.title.trim() || "Untitled Quiz";

  useEffect(() => {
    if (typeof document !== "undefined") {
      const tagline = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (tagline) tagline.content = `Creator Studio — ${title}`;
    }
  }, [title]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background text-foreground">
      <StudioHeader />
      <StudioStepper />
      <AnimatePresence mode="wait">
        <motion.main
          key={state.step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex-1 overflow-y-auto bg-background px-3 py-5 sm:px-5"
        >
          {/* Big content card — keeps step content on a clean white surface */}
          <div
            className={cn(
              "mx-auto min-h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm",
              state.step === "setup" ? "max-w-5xl" : "max-w-[1400px]"
            )}
          >
            {children}
          </div>
        </motion.main>
      </AnimatePresence>
      <StudioFooter />
    </div>
  );
}
