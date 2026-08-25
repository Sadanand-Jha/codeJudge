"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleDot,
  ListChecks,
  ToggleRight,
  FileText,
  Hash,
  Type,
  AlignLeft,
  Code2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  ImageIcon,
  Clock,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { CreatorQuestion, CreatorOption, CreatorQuestionType } from "../types";
import { useStudio } from "../StudioProvider";
import { EditableContent, RichToolbar } from "./RichToolbar";
import { MatchFollowingEditor } from "./MatchFollowingEditor";
import { motion, AnimatePresence } from "framer-motion";
import { getQuizDifficultyOptions } from "@/services/quiz";

const TYPE_ICON: Record<CreatorQuestionType, React.ComponentType<{ className?: string }>> = {
  single_choice: CircleDot,
  multiple_choice: ListChecks,
  true_false: ToggleRight,
  fill_blanks: FileText,
  integer: Hash,
  text: Type,
  paragraph: AlignLeft,
  code_output: Code2,
  match_following: ListChecks,
};

const TYPE_SHORT: Record<CreatorQuestionType, string> = {
  single_choice: "MCQ",
  multiple_choice: "Multi",
  true_false: "T/F",
  fill_blanks: "Fill",
  integer: "Int",
  text: "Short",
  paragraph: "Long",
  code_output: "Code",
  match_following: "Match",
};

const TYPE_DESC: Record<CreatorQuestionType, string> = {
  single_choice: "Single correct answer",
  multiple_choice: "Multiple correct answers",
  true_false: "True / False",
  fill_blanks: "Fill in the Blank",
  integer: "Numerical",
  text: "Short Answer",
  paragraph: "Long Answer",
  code_output: "Coding",
  match_following: "Match the Following",
};

export function QuestionEditor() {
  const { state, updateQuestion, duplicateQuestion, removeQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);

  const [showAfter, setShowAfter] = useState(false);
  const [afterTab, setAfterTab] = useState<"explanation" | "hint" | "solution">("explanation");
  const [showType, setShowType] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageOption = useRef<string | null>(null);
  const [draggedOpt, setDraggedOpt] = useState<string | null>(null);
  const [difficultyOptions, setDifficultyOptions] = useState<{ id: number; heading: string }[]>([]);
  const fetchedDiffRef = useRef(false);

  useEffect(() => {
    if (fetchedDiffRef.current) return;
    fetchedDiffRef.current = true;
    getQuizDifficultyOptions().then(setDifficultyOptions).catch(() => {});
  }, []);

  if (!q) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-text-muted">Select a question to start editing.</p>
      </div>
    );
  }

  const update = (patch: Partial<CreatorQuestion>) => updateQuestion(q.id, patch);
  const isMcq = q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false";
  const isSingle = q.type === "single_choice" || q.type === "true_false";

  const setCorrect = (optId: string) => {
    if (q.type === "single_choice" || q.type === "true_false") {
      update({
        options: q.options.map((o) => ({ ...o, isCorrect: o.id === optId })),
        correctAnswer: q.options.findIndex((o) => o.id === optId),
      });
    } else {
      const next = q.options.map((o) => (o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o));
      update({
        options: next,
        correctAnswer: next.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1) as any,
      });
    }
  };

  const updateOption = (id: string, patch: Partial<CreatorOption>) =>
    update({ options: q.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  const addOption = () => {
    if (q.options.length >= 6) return;
    const label = String.fromCharCode(65 + q.options.length);
    update({
      options: [...q.options, { id: `${q.id}_opt_${Date.now()}`, label, content: "", isCorrect: false }],
    });
  };

  const removeOption = (id: string) => {
    if (q.options.length <= 2) return;
    const remaining = q.options.filter((o) => o.id !== id).map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
    update({ options: remaining });
  };

  const reorderOptions = (fromId: string, toId: string) => {
    const fromIdx = q.options.findIndex((o) => o.id === fromId);
    const toIdx = q.options.findIndex((o) => o.id === toId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const next = [...q.options];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    update({ options: next.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) });
  };

  const openImageAssistant = (optId: string) => {
    pendingImageOption.current = optId;
    imageInputRef.current?.click();
  };

  const handleOptionImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optId = pendingImageOption.current;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!optId || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") updateOption(optId, { imageUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const activeIdx = state.questions.findIndex((x) => x.id === q.id);

  // Premium Match the Following — full-bleed editor per spec
  if (q.type === "match_following") {
    return <MatchFollowingEditor />;
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-card">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleOptionImagePicked} />

      <div className="shrink-0 border-b border-border bg-card px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold text-text-primary">Question {String(activeIdx + 1).padStart(2, "0")}</h2>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowType(!showType)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-card-hover"
              >
                {TYPE_SHORT[q.type]} <ChevronDown className="h-3 w-3 text-text-muted" />
              </button>
              {showType && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  {(Object.keys(TYPE_SHORT) as CreatorQuestionType[]).map((t) => {
                    const Icon = TYPE_ICON[t];
                    const active = t === q.type;
                    const handlePick = () => {
                      if (t === "match_following") {
                        const base = q.id;
                        update({
                          type: t,
                          matchItems: q.matchItems ?? [
                            { id: `${base}_left_1`, content: "Stack" },
                            { id: `${base}_left_2`, content: "Queue" },
                            { id: `${base}_left_3`, content: "Hash Table" },
                            { id: `${base}_left_4`, content: "Graph" },
                          ],
                          matchMatches: q.matchMatches ?? [
                            { id: `${base}_right_1`, content: "LIFO" },
                            { id: `${base}_right_2`, content: "FIFO" },
                            { id: `${base}_right_3`, content: "Key-value lookup" },
                            { id: `${base}_right_4`, content: "Connected relationships" },
                          ],
                          matchMapping: q.matchMapping ?? {},
                          shuffleColumnA: q.shuffleColumnA ?? true,
                          shuffleColumnB: q.shuffleColumnB ?? true,
                          marks: q.marks ?? 1,
                        } as any);
                      } else update({ type: t } as any);
                      setShowType(false);
                    };
                    return (
                      <button
                        key={t}
                        onClick={handlePick}
                        className={cn("flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-card-hover", active && "bg-pink-50 dark:bg-pink-500/10")}
                      >
                        <Icon className={cn("h-4 w-4 mt-0.5", active ? "text-[#E91E63]" : "text-text-muted")} />
                        <div>
                          <p className={cn("text-xs font-medium", active ? "text-[#E91E63]" : "text-text-primary")}>
                            {TYPE_SHORT[t]} — {TYPE_DESC[t]}
                          </p>
                        </div>
                        {active && <Check className="ml-auto h-4 w-4 text-[#E91E63]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => duplicateQuestion(q.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-muted hover:bg-card-hover"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
              </svg>
            </button>
            <button
              onClick={() => removeQuestion(q.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-text-muted hover:bg-card-hover hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center divide-x divide-border rounded-lg border border-border bg-card text-xs">
          <div className="relative flex items-center gap-1.5 px-3 py-2">
            <span className="text-text-muted">Difficulty</span>
            <span className={cn("h-2 w-2 rounded-full", q.difficulty === "Easy" ? "bg-emerald-500" : q.difficulty === "Medium" ? "bg-amber-500" : q.difficulty === "Hard" ? "bg-orange-500" : "bg-rose-500")} />
            <button onClick={() => setShowDiff(!showDiff)} className="inline-flex items-center gap-1 font-medium text-text-primary">
              {q.difficulty} <ChevronDown className="h-3 w-3 text-text-muted" />
            </button>
            {showDiff && (
              <div className="absolute left-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                {difficultyOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-text-muted">Loading…</div>
                ) : (
                  difficultyOptions.map((opt) => {
                    const active = q.difficulty === opt.heading;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          update({ difficulty: opt.heading, difficultyId: opt.id } as any);
                          setShowDiff(false);
                        }}
                        className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-card-hover", active && "bg-pink-50 dark:bg-pink-500/10")}
                      >
                        <span className={cn("h-2.5 w-2.5 rounded-full", opt.heading === "Easy" ? "bg-emerald-500" : opt.heading === "Medium" ? "bg-amber-500" : opt.heading === "Hard" ? "bg-orange-500" : "bg-rose-500")} />
                        <span className={cn("text-xs font-medium", active ? "text-[#E91E63]" : "text-text-primary")}>
                          {opt.heading}
                        </span>
                        {active && <Check className="ml-auto h-4 w-4 text-[#E91E63]" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="text-text-muted">Marks</span>
            <input
              type="text"
              inputMode="numeric"
              value={q.marks}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                update({ marks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
              }}
              className="w-12 bg-transparent text-xs font-medium text-text-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="text-text-muted">Negative</span>
            <input
              type="text"
              inputMode="decimal"
              value={q.negativeMarks ?? 0}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                update({ negativeMarks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
              }}
              className="w-12 bg-transparent text-xs font-medium text-text-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="text-text-muted">Time</span>
            <input
              type="text"
              inputMode="numeric"
              value={q.expectedTime}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, "");
                update({ expectedTime: v === "" ? 0 : Math.max(0, Number(v) || 0) });
              }}
              className="w-12 bg-transparent text-xs font-medium text-text-primary focus:outline-none"
            />
            <span className="text-xs text-text-muted">min</span>
          </div>
        </div>
        {(showType || showDiff) && <div className="fixed inset-0 z-40" onClick={() => { setShowType(false); setShowDiff(false); }} />}
      </div>

      <div className="p-6">
        <div className="mx-auto w-full max-w-[720px] space-y-6">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Question</label>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <RichToolbar />
              <EditableContent
                value={q.title}
                onChange={(html) => update({ title: html })}
                placeholder="Write your question..."
                minHeight="min-h-[140px]"
              />
            </div>
          </div>

          {isMcq ? (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Answer Options</h3>
                <span className="text-xs text-text-muted">
                  {q.type === "single_choice" ? "Single answer" : q.type === "multiple_choice" ? "Multiple answers" : "True / False"}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {q.options.map((o) => (
                  <div
                    key={o.id}
                    draggable
                    onDragStart={() => setDraggedOpt(o.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedOpt && draggedOpt !== o.id) reorderOptions(draggedOpt, o.id);
                      setDraggedOpt(null);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-3",
                      o.isCorrect ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10" : "border-border bg-card hover:border-border"
                    )}
                  >
                    <button
                      onClick={() => {
                        const isSingle = q.type === "single_choice" || q.type === "true_false";
                        if (isSingle) update({ options: q.options.map((x) => ({ ...x, isCorrect: x.id === o.id })) });
                        else update({ options: q.options.map((x) => (x.id === o.id ? { ...x, isCorrect: !x.isCorrect } : x)) });
                      }}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                        o.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-card"
                      )}
                    >
                      {o.isCorrect && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold", o.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-card-hover text-text-primary")}>
                      {o.label}
                    </span>
                    <input
                      value={o.content}
                      onChange={(e) => { if (e.target.value.length <= 250) update({ options: q.options.map((x) => (x.id === o.id ? { ...x, content: e.target.value } : x)) }); }}
                      placeholder={`Option ${o.label}`}
                      maxLength={250}
                      className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                    <div className="flex shrink-0 items-center gap-0.5 sm:flex">
                      <button onClick={() => openImageAssistant(o.id)} className="rounded p-1.5 text-text-muted hover:bg-card-hover">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeOption(o.id)} className="rounded p-1.5 text-text-muted hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="cursor-grab p-1.5 text-text-muted">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    {o.imageUrl && <img src={o.imageUrl} alt="" className="h-8 w-8 rounded object-cover border" />}
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <button
                  onClick={addOption}
                  disabled={q.options.length >= 6}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-pink-300 dark:border-pink-400/30 bg-pink-50/50 dark:bg-pink-500/10 py-2.5 text-xs font-medium text-[#E91E63] hover:bg-pink-50 dark:hover:bg-pink-500/15 disabled:opacity-40"
                >
                  + Add option
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">Correct Answer</label>
              <input
                value={String(q.correctAnswer ?? "")}
                onChange={(e) => update({ correctAnswer: e.target.value as any })}
                placeholder="Enter the correct answer"
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:border-border focus:outline-none"
              />
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <button onClick={() => setShowAfter(!showAfter)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-card-hover">
              <span className="text-xs font-medium text-text-primary">After Answer <span className="text-text-muted">(Explanation, Hint, Solution)</span></span>
              {showAfter ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
            </button>
            <AnimatePresence initial={false}>
              {showAfter && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="border-t border-border">
                    <div className="flex gap-1 border-b border-border p-2">
                      {(["explanation", "hint", "solution"] as const).map((t) => (
                        <button key={t} onClick={() => setAfterTab(t)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium capitalize", afterTab === t ? "bg-pink-500 font-bold text-background" : "text-text-secondary hover:bg-card-hover")}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="p-4">
                      {afterTab === "explanation" && (
                        <textarea
                          value={q.explanation}
                          onChange={(e) => update({ explanation: e.target.value })}
                          placeholder="Explain why the correct answer is right."
                          rows={3}
                          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-border"
                        />
                      )}
                      {afterTab === "hint" && (
                        <textarea
                          value={q.hint}
                          onChange={(e) => update({ hint: e.target.value })}
                          placeholder="Optional hint"
                          rows={3}
                          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-border"
                        />
                      )}
                      {afterTab === "solution" && (
                        <textarea
                          value={q.solution ?? ""}
                          onChange={(e) => update({ solution: e.target.value })}
                          placeholder="Step-by-step solution"
                          rows={3}
                          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-border"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Question-specific game mechanics are now managed at quiz level — see Game Mechanics page */}
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              <span className="font-medium text-text-primary">🎮 Game Mechanics</span> — lifelines & power-ups are now configured per-quiz.
            </p>
            <a href={state.serverQuizId ? `/creator/quizzes/${state.serverQuizId}/game-mechanics` : "#"} className="text-xs font-medium text-[#E91E63] hover:underline">
              Open Game Mechanics →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
