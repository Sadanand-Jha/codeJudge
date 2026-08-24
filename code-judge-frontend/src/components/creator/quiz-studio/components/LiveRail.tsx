"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, X, Settings2, ChevronDown, ChevronRight } from "lucide-react";
import { useStudio } from "../StudioProvider";
import { getQuestionStatus } from "@/components/quiz/creator/types";

export function LiveRail({ onDownloadPdf, collapsed, onToggle }: { onDownloadPdf?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const { state, updateQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);
  const [propsCollapsed, setPropsCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="hidden lg:flex w-10 shrink-0 rounded-xl border border-zinc-200 bg-white flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="rotate-90 whitespace-nowrap text-[11px] font-medium text-zinc-600 hover:text-zinc-900"
        >
          Properties →
        </button>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="hidden lg:flex w-[340px] shrink-0 flex-col rounded-xl border border-zinc-200 bg-white">
        <div className="p-4 text-xs text-zinc-500">Select a question</div>
      </div>
    );
  }

  const hasTitle = q.title.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasOptions = q.options.length >= 2 && q.options.every((o) => o.content.trim() !== "");
  const hasCorrect = q.options.some((o) => o.isCorrect) || (q.correctAnswer !== "" && q.correctAnswer !== undefined && q.correctAnswer !== -1);
  const hasMarks = (q.marks || 0) > 0;
  const isChoice = q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false";
  const warnings: string[] = [];
  if (!hasTitle) warnings.push("Question text required");
  if (isChoice && !hasCorrect) warnings.push("No correct answer selected");
  if (!q.explanation.trim()) warnings.push("Explanation missing");
  if (q.options.length < 2 && isChoice) warnings.push("At least 2 options required");

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
        <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Properties
        </span>
        {onToggle && (
          <button onClick={onToggle} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">Question Properties</h3>
            <button onClick={() => setPropsCollapsed(!propsCollapsed)} className="text-zinc-400 hover:text-zinc-600">
              {propsCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          {!propsCollapsed && (
            <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs text-zinc-600">Marks</label>
              <input
                value={q.marks}
                onChange={(e) => updateQuestion(q.id, { marks: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-pink-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">Difficulty</label>
              <div className="mt-1 relative">
                <select
                  value={q.difficulty}
                  onChange={(e) => updateQuestion(q.id, { difficulty: e.target.value as any })}
                  className="w-full appearance-none rounded-lg border border-zinc-200 bg-white px-3 py-1.5 pr-8 text-xs text-zinc-900 focus:border-pink-300 focus:outline-none"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Expert</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">⌄</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Time</label>
              <div className="mt-1 flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5">
                <input
                  value={q.expectedTime}
                  onChange={(e) => updateQuestion(q.id, { expectedTime: Number(e.target.value) || 0 })}
                  className="w-full bg-transparent text-xs text-zinc-900 focus:outline-none"
                />
                <span className="text-xs text-zinc-500">min</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-600">Negative Marking</label>
              <input
                value={q.negativeMarks ?? 0}
                onChange={(e) => updateQuestion(q.id, { negativeMarks: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-pink-300 focus:outline-none"
              />
            </div>
          </div>
          )}
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Question Status</h3>
          <div className="mt-3 space-y-2 text-xs">
            <StatusRow done={hasTitle} label="Question text" />
            <StatusRow
              done={isChoice ? q.options.every((o) => o.content.trim() !== "") : String(q.correctAnswer ?? "").trim().length > 0}
              label={isChoice ? `${q.options.length} options` : "Correct answer"}
            />
            <StatusRow done={hasCorrect} label="Correct answer" />
            <StatusRow done={hasMarks} label="Marks assigned" />
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Warnings</h3>
          <div className="mt-3 space-y-2">
            {warnings.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> No warnings
              </div>
            ) : (
              warnings.map((w) => (
                <div key={w} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {w}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 space-y-2">
          <label className="text-[11px] font-medium text-zinc-600">
            Topic
            <div className="mt-1 text-xs text-zinc-900 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
              {q.topic || <span className="text-zinc-400">—</span>}
            </div>
          </label>
          {q.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {q.tags.map((t) => (
                <span key={t} className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
          <p className="text-xs font-bold text-pink-700">Preview</p>
          <div className="mt-2 rounded-lg border border-pink-200 bg-white p-3">
            <p className="text-xs font-semibold text-pink-700">As Student</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">This is how the question will appear to students.</p>
            <button
              onClick={onDownloadPdf}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-white px-2.5 py-1 text-xs font-medium text-pink-600 hover:bg-pink-50"
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
    <div className={`flex items-center gap-2 ${done ? "text-emerald-700" : "text-zinc-500"}`}>
      {done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <span className="h-3.5 w-3.5 rounded-full border border-zinc-300" />}
      <span className="text-xs">{label}</span>
    </div>
  );
}
