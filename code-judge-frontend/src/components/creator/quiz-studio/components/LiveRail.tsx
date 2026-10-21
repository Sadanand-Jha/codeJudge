"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Settings2, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { useQuizReferenceStore } from "@/store/quizReferenceStore";

/**
 * LiveRail — right sidebar in the quiz studio showing question properties,
 * status checks, warnings, and a student preview button. The preview button
 * is disabled until the question has enough data to show a meaningful preview
 * (e.g., choice questions need options + correct answer, matching needs items).
 */
export function LiveRail({ onStudentPreview, collapsed, onToggle }: { onDownloadPdf?: () => void; onStudentPreview?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { state, updateQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const { difficultyOptions, fetchAll } = useQuizReferenceStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (collapsed) {
    return (
      <div className="hidden lg:flex w-10 shrink-0 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] flex-col items-center py-4" onClick={(e)=>e.stopPropagation()}>
        <button
          type="button"
          onClick={(e)=>{e.preventDefault(); e.stopPropagation(); onToggle?.();}}
          className="rotate-90 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
        >
          Properties →
        </button>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="hidden lg:flex w-[340px] shrink-0 flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
        <div className="p-4 text-xs font-medium text-[var(--qs-muted)]">Select a question</div>
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

  const difficultyChoices = difficultyOptions.length > 0
    ? difficultyOptions.map((option) => option.heading)
    : ["Easy", "Medium", "Hard"];

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
    <div className="flex h-full w-[340px] shrink-0 flex-col rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-center" onClick={(e)=>e.stopPropagation()}>
      <div className="flex items-center justify-center px-4 py-3 border-b-2 border-[var(--qs-line)] shrink-0 text-center">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)] flex items-center gap-1.5 justify-center">
          <Settings2 className="h-3.5 w-3.5" /> Properties
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 text-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)] text-center">Question Properties</h3>
            <button type="button" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setPropsCollapsed(!propsCollapsed);}} className="rounded-[6px] p-0.5 text-[var(--qs-muted)] transition-colors hover:text-[var(--qs-ink)]">
              {propsCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          {!propsCollapsed && (
            <div className="mt-3 space-y-4 text-left">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Difficulty</label>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {difficultyChoices.map((difficulty) => {
                    const active = q.difficulty === difficulty;
                    return (
                      <button
                        key={difficulty}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateQuestion(q.id, { difficulty: difficulty as "Easy" | "Medium" | "Hard" | "Expert" })}
                        className={cn(
                          "rounded-full border-2 px-3 py-1.5 text-[11px] font-extrabold transition-colors",
                          active
                            ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                            : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]"
                        )}
                      >
                        {difficulty}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Time (min)</label>
                <div className="mt-1 flex items-center overflow-hidden rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
                  <button
                    type="button"
                    aria-label="Decrease time"
                    onClick={() => updateQuestion(q.id, { expectedTime: Math.max(1, (q.expectedTime || 0) - 1) })}
                    disabled={q.expectedTime <= 1}
                    className="grid h-9 w-11 place-items-center text-base font-extrabold text-[var(--qs-ink)] transition-colors hover:text-[var(--qs-brand)] disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center text-sm font-extrabold tabular-nums text-[var(--qs-ink)]">{q.expectedTime}</span>
                  <button
                    type="button"
                    aria-label="Increase time"
                    onClick={() => updateQuestion(q.id, { expectedTime: Math.min(30, (q.expectedTime || 0) + 1) })}
                    disabled={q.expectedTime >= 30}
                    className="grid h-9 w-11 place-items-center text-base font-extrabold text-[var(--qs-ink)] transition-colors hover:text-[var(--qs-brand)] disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)] text-center">Question Status</h3>
          <ul className="mt-3 space-y-2 text-left">
            <StatusRow done={hasTitle} label="Question text" />
            <StatusRow
              done={isChoice ? q.options.every((o) => o.content.trim() !== "") : isMatching ? hasMatchItems && hasMatchMatches : String(q.correctAnswer ?? "").trim().length > 0}
              label={isChoice ? `${q.options.length} options` : isMatching ? `${q.matchItems?.length ?? 0} × ${q.matchMatches?.length ?? 0} pairs` : "Correct answer"}
            />
            <StatusRow done={hasCorrect || isMatching} label={isMatching ? "Line-wise matching" : "Correct answer"} />
          </ul>
        </div>

        <div className="text-center">
          <h3 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)] text-center">Warnings</h3>
          <div className="mt-3 space-y-2">
            {warnings.length === 0 ? (
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--qs-ok)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> No warnings
              </div>
            ) : (
              warnings.map((w) => (
                <div key={w} className="flex items-start gap-2 rounded-[12px] border-2 border-[#a85d00]/40 bg-[#fff3d6] p-2.5 text-xs font-semibold text-[#a85d00]">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {w}
                </div>
              ))
            )}
          </div>
        </div>

        {q.tags.length > 0 && (
          <div className="pt-4 border-t-2 border-[var(--qs-line)]">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {q.tags.map((t) => (
                <span key={t} className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--qs-muted)]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 text-left shadow-[4px_4px_0_var(--qs-sun)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-brand)]">
            Preview as student
          </p>
          <p className="mt-1.5 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
            {canPreview
              ? "This is how the question will appear to students."
              : "Fill in the question details before previewing."}
          </p>
          <button
            type="button"
            onClick={(e)=>{e.preventDefault(); e.stopPropagation(); onStudentPreview?.();}}
            disabled={!canPreview}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-2 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2 text-[12px] font-bold", done ? "text-[var(--qs-ok)]" : "text-[var(--qs-warn)]")}>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-current text-[10px] font-extrabold">
        {done ? "✓" : "!"}
      </span>
      <span className="text-[var(--qs-ink)]">{label}</span>
    </li>
  );
}
