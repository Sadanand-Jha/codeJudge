"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, X, Settings2, ChevronDown, ChevronRight } from "lucide-react";
import { useStudio } from "../StudioProvider";
import { getQuestionStatus } from "@/components/quiz/creator/types";
import { getQuizDifficultyOptions } from "@/services/quiz";

/**
 * LiveRail — right sidebar in the quiz studio showing question properties,
 * status checks, warnings, and a student preview button. The preview button
 * is disabled until the question has enough data to show a meaningful preview
 * (e.g., choice questions need options + correct answer, matching needs items).
 */
export function LiveRail({ onDownloadPdf, onStudentPreview, collapsed, onToggle }: { onDownloadPdf?: () => void; onStudentPreview?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { state, updateQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [difficultyOptions, setDifficultyOptions] = useState<{ id: number; heading: string }[]>([]);
  const fetchedDiffRef = useRef(false);

  useEffect(() => {
    if (fetchedDiffRef.current) return;
    fetchedDiffRef.current = true;
    getQuizDifficultyOptions().then(setDifficultyOptions).catch(() => {});
  }, []);

  if (collapsed) {
    return (
      <div className="hidden lg:flex w-10 shrink-0 rounded-xl border border-border bg-card flex-col items-center py-4" onClick={(e)=>e.stopPropagation()}>
        <button
          type="button"
          onClick={(e)=>{e.preventDefault(); e.stopPropagation(); onToggle?.();}}
          className="rotate-90 whitespace-nowrap text-[11px] font-medium text-text-secondary hover:text-text-primary"
        >
          Properties →
        </button>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="hidden lg:flex w-[340px] shrink-0 flex-col rounded-xl border border-border bg-card">
        <div className="p-4 text-xs text-text-muted">Select a question</div>
      </div>
    );
  }

  // ── Determine if the question has enough data to show a meaningful preview ──
  const hasTitle = q.title.replace(/<[^>]*>/g, "").trim().length > 0;
  const isChoice = q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false";
  const isMatching = q.type === "match_following";

  // For choice types: need at least 2 options with content and one marked correct
  const hasOptions = q.options.length >= 2 && q.options.every((o) => o.content.trim() !== "");
  const hasCorrect = q.options.some((o) => o.isCorrect) || (q.correctAnswer !== "" && q.correctAnswer !== undefined && q.correctAnswer !== -1);

  // For matching type: need at least 2 items in each column
  const hasMatchItems = (q.matchItems ?? []).length >= 2;
  const hasMatchMatches = (q.matchMatches ?? []).length >= 2;

  const hasMarks = (q.marks || 0) > 0;

  // Preview is available when the question has a title AND the type-specific content is filled
  const canPreview = hasTitle && (
    (isChoice && hasOptions && hasCorrect) ||
    (isMatching && hasMatchItems && hasMatchMatches) ||
    (!isChoice && !isMatching) // free-text types only need a title
  );

  const warnings: string[] = [];
  if (!hasTitle) warnings.push("Question text required");
  if (isChoice && !hasCorrect) warnings.push("No correct answer selected");
  if (isChoice && q.options.length < 2) warnings.push("At least 2 options required");
  if (isMatching && !hasMatchItems) warnings.push("Add at least 2 Column A items");
  if (isMatching && !hasMatchMatches) warnings.push("Add at least 2 Column B matches");
  if (!q.explanation.trim()) warnings.push("Explanation missing");

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col rounded-xl border border-border bg-card text-center" onClick={(e)=>e.stopPropagation()}>
      <div className="flex items-center justify-center px-4 py-3 border-b border-border shrink-0 text-center">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5 justify-center">
          <Settings2 className="h-3.5 w-3.5" /> Properties
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 text-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-primary text-center">Question Properties</h3>
            <button type="button" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setPropsCollapsed(!propsCollapsed);}} className="text-text-muted hover:text-text-primary">
              {propsCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          {!propsCollapsed && (
            <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-text-secondary">Marks</label>
              <input
                value={q.marks}
                onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-text-primary focus:border-pink-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Difficulty</label>
              <div className="mt-1 relative">
                <select
                  value={q.difficulty}
                  onChange={(e) => updateQuestion(q.id, { difficulty: e.target.value as any })}
                  className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-1.5 pr-8 text-xs text-text-primary focus:border-pink-300 focus:outline-none"
                >
                  {difficultyOptions.length === 0 ? (
                    <option>Loading…</option>
                  ) : (
                    difficultyOptions.map((opt) => (
                      <option key={opt.id} value={opt.heading}>{opt.heading}</option>
                    ))
                  )}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted">⌄</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary">Time</label>
              <div className="mt-1 flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5">
                <input
                  value={q.expectedTime}
                  onChange={(e) => updateQuestion(q.id, { expectedTime: Number(e.target.value) || 0 })}
                  className="w-full bg-transparent text-xs text-text-primary focus:outline-none"
                />
                <span className="text-xs text-text-muted">min</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary">Negative Marking</label>
              <input
                value={q.negativeMarks ?? 0}
                onChange={(e) => updateQuestion(q.id, { negativeMarks: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-text-primary focus:border-pink-300 focus:outline-none"
              />
            </div>
          </div>
          )}
        </div>

        <div className="text-center">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted text-center">Question Status</h3>
          <div className="mt-3 space-y-2 text-xs flex flex-col items-center">
            <StatusRow done={hasTitle} label="Question text" />
            <StatusRow
              done={isChoice ? q.options.every((o) => o.content.trim() !== "") : isMatching ? hasMatchItems && hasMatchMatches : String(q.correctAnswer ?? "").trim().length > 0}
              label={isChoice ? `${q.options.length} options` : isMatching ? `${q.matchItems?.length ?? 0} × ${q.matchMatches?.length ?? 0} pairs` : "Correct answer"}
            />
            <StatusRow done={hasCorrect || isMatching} label={isMatching ? "Line-wise matching" : "Correct answer"} />
            <StatusRow done={hasMarks} label="Marks assigned" />
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted text-center">Warnings</h3>
          <div className="mt-3 space-y-2">
            {warnings.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> No warnings
              </div>
            ) : (
              warnings.map((w) => (
                <div key={w} className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {w}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2 text-center">
          <label className="text-[11px] font-medium text-text-secondary text-center block">
            Topic
            <div className="mt-1 text-xs text-text-primary rounded-lg border border-border bg-card-hover px-2.5 py-2 text-center">
              {q.topic || <span className="text-text-muted">—</span>}
            </div>
          </label>
          {q.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {q.tags.map((t) => (
                <span key={t} className="rounded-full border border-border bg-card-hover px-2 py-0.5 text-[10px] text-text-secondary">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-pink-200 dark:border-pink-400/30 bg-pink-50 dark:bg-pink-500/10 p-3 text-center">
          <p className="text-xs font-bold text-pink-700 text-center">Preview</p>
          <div className="mt-2 rounded-lg border border-pink-200 bg-card p-3 text-center">
            <p className="text-xs font-semibold text-pink-700 text-center">As Student</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary text-center">
              {canPreview
                ? "This is how the question will appear to students."
                : "Fill in the question details before previewing."}
            </p>
            <button
              type="button"
              onClick={(e)=>{e.preventDefault(); e.stopPropagation(); onStudentPreview?.();}}
              disabled={!canPreview}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-pink-200 dark:border-pink-400/30 bg-card px-2.5 py-1 text-xs font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              👁 Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${done ? "text-emerald-700 dark:text-emerald-400" : "text-text-muted"}`}>
      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <span className="h-3.5 w-3.5 rounded-full border border-border" />}
      <span className="text-xs">{label}</span>
    </div>
  );
}
