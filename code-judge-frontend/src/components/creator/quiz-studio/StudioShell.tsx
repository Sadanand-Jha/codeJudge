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
import Link from "next/link";
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

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== state.info.title) updateInfo({ title: draft });
  };

  const label =
    state.info.title.trim() === ""
      ? "Untitled Quiz"
      : state.info.title;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <Link
        href="/creator"
        className="shrink-0 rounded-lg border border-border bg-white/[0.03] px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.06]"
      >
        ← Back to Studio
      </Link>

      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600">
          <Rocket className="h-4 w-4 text-white" />
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
              className="w-60 min-w-[180px] border-0 bg-transparent text-sm font-semibold text-text-primary placeholder-text-muted outline-none focus:bg-white/[0.03] rounded"
              placeholder="Untitled Quiz"
            />
          ) : (
            <p
              className="group relative inline-flex cursor-text items-center text-sm font-semibold text-text-primary"
              title="Click to edit title"
              onDoubleClick={() => setEditing(true)}
            >
              {label}
              <span className="ml-1 hidden group-hover:inline-block h-4 w-px bg-border" />
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Draft
            </span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 text-xs text-text-secondary">
        {status === "saving" && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-pink-500" />
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
          <span className="text-amber-500">Unsaved changes</span>
        )}
      </div>

      <div className="h-5 w-px bg-border" />

      <button
        type="button"
        onClick={() => goToStep("review")}
        className="rounded-lg border border-pink-500/30 bg-pink-500/8 px-2 py-1.5 text-xs font-semibold text-pink-600 hover:bg-pink-500/12 dark:text-pink-400"
        title="AI Assist"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="rounded-lg border border-border bg-white/[0.03] px-2 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary"
        title="Preview quiz"
      >
        <Eye className="h-4 w-4" />
      </button>
    </header>
  );
}

function formatTime(d: Date | null): string {
  if (!d) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function StudioStepper() {
  const { state, goToStep, stepIndex } = useStudio();
  const completed = useMemo(() => STEPS.slice(0, stepIndex).map((s) => s.id), [stepIndex]);
  const progressPct = Math.round(((stepIndex) / (STEPS.length - 1)) * 100);

  return (
    <div className="border-b border-border bg-card/60">
      <nav className="flex items-center overflow-x-auto px-2 py-3 sm:px-4" aria-label="Quiz creation steps">
        {STEPS.map((step, i) => {
          const active = state.step === step.id;
          const done = completed.includes(step.id) || i < stepIndex;
          const upcoming = i > stepIndex;
          return (
            <div key={step.id} className="relative flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => (i < stepIndex || i === stepIndex ? goToStep(step.id as typeof step.id) : null)}
                className={cn(
                  "relative z-10 flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition-all",
                  active
                    ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
                    : done
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/15"
                    : "border-border bg-background/60 text-text-secondary hover:text-text-primary"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-white/20 text-white"
                      : done
                      ? "bg-emerald-500 text-white"
                      : "bg-white/[0.06] text-text-secondary"
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "mx-1 hidden h-0.5 w-6 sm:mx-2",
                    done ? "bg-emerald-500/40" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </nav>
      <div className="h-1 w-full overflow-hidden bg-border/40">
        <div
          className="h-full w-[var(--prog)] bg-gradient-to-r from-pink-500 to-violet-600 transition-all duration-300"
          style={{ "--prog": progressPct + "%" } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

export function StudioFooter() {
  const { state, prevStep, nextStep, stepIndex, summary, publish } = useStudio();

  const canContinue = () => {
    if (state.step === "setup") return state.info.title.trim().length >= 3;
    if (state.step === "questions") return summary.validQuestions > 0;
    return true;
  };

  const isLast = stepIndex === STEPS.length - 1;
  const isQuestions = state.step === "questions";
  const activeIdx = state.questions.findIndex((q) => q.id === state.activeQuestionId) + 1;

  const handlePublish = () => {
    publish();
  };

  return (
    <footer className="sticky bottom-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        onClick={prevStep}
        disabled={stepIndex === 0}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
        )}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-2.5">
        {isQuestions && (
          <span className="text-xs font-medium text-text-secondary">
            Question {activeIdx || 0} of {state.questions.length}
          </span>
        )}
        <button
          type="button"
          onClick={() => toast.success({ title: "Saved to draft", description: "You can continue editing later." })}
          className="rounded-xl border border-border bg-white/[0.03] px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-white/[0.06]"
        >
          Save Draft
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={handlePublish}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2 text-sm font-bold text-white transition-all hover:brightness-105 hover:shadow-[0_8px_24px_rgba(236,72,153,0.45)]"
          >
            <Rocket className="h-4 w-4" /> Publish Quiz
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canContinue()}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2 text-sm font-bold text-white transition-all",
              canContinue()
                ? "bg-gradient-to-r from-pink-500 to-violet-600 shadow-[0_8px_24px_rgba(236,72,153,0.35)] hover:brightness-105"
                : "cursor-not-allowed bg-white/[0.08] text-text-muted"
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
  const { state } = useStudio();
  const title = state.info.title.trim() || "Untitled Quiz";

  useEffect(() => {
    if (typeof document !== "undefined") {
      const tagline = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (tagline) tagline.content = `Creator Studio — ${title}`;
    }
  }, [title]);

  return (
    <div className="flex min-h-[calc(100vh-112px)] h-full flex-col bg-background text-foreground">
      <StudioHeader />
      <StudioStepper />
      <AnimatePresence mode="wait">
        <motion.main
          key={state.step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <StudioFooter />
    </div>
  );
}
