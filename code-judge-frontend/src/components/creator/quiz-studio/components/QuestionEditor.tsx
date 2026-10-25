"use client";

import { useState } from "react";
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
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { CreatorQuestion, CreatorQuestionType } from "../types";
import { useStudio } from "../StudioProvider";
import { EditableContent, RichToolbar } from "./RichToolbar";
import { MatchFollowingEditor } from "./MatchFollowingEditor";
import { motion, AnimatePresence } from "framer-motion";

const SELECTABLE_TYPES: CreatorQuestionType[] = [
  "single_choice", "multiple_choice", "true_false", "fill_blanks", "match_following",
];

const TYPE_ICON: Record<CreatorQuestionType, React.ComponentType<{ className?: string }>> = {
  single_choice: CircleDot,
  multiple_choice: ListChecks,
  true_false: ToggleRight,
  fill_blanks: FileText,
  text: Type,
  match_following: ListChecks,
  integer: Hash,
  paragraph: AlignLeft,
  code_output: Code2,
};

const TYPE_SHORT: Record<CreatorQuestionType, string> = {
  single_choice: "MCQ",
  multiple_choice: "Multi",
  true_false: "T/F",
  fill_blanks: "Fill",
  text: "Short",
  match_following: "Match",
  integer: "Int",
  paragraph: "Long",
  code_output: "Code",
};

const TYPE_DESC: Record<CreatorQuestionType, string> = {
  single_choice: "Single correct answer",
  multiple_choice: "Multiple correct answers",
  true_false: "True / False",
  fill_blanks: "Fill in the Blank",
  text: "Short Answer",
  match_following: "Match the Following",
  integer: "Numerical",
  paragraph: "Long Answer",
  code_output: "Coding",
};

export function QuestionEditor() {
  const { state, updateQuestion, duplicateQuestion, removeQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);

  const [showAfter, setShowAfter] = useState(false);
  const [afterTab, setAfterTab] = useState<"explanation" | "hint" | "solution">("explanation");
  const [showType, setShowType] = useState(false);
  const [pendingType, setPendingType] = useState<CreatorQuestionType | null>(null);
  const [draggedOpt, setDraggedOpt] = useState<string | null>(null);

  const hasDataToLose = (qq: CreatorQuestion) => {
    const hasTitle = qq.title.replace(/<[^>]*>/g, "").trim().length > 0;
    const hasOptions = qq.options.some((o) => o.content.trim().length > 0 || o.isCorrect);
    const hasAnswer = String(qq.correctAnswer ?? "").trim().length > 0 && String(qq.correctAnswer) !== "-1";
    const hasMatch = (qq.matchItems?.some((m) => m.content.trim().length > 0) || qq.matchMatches?.some((m) => m.content.trim().length > 0) || (qq.matchMapping && Object.keys(qq.matchMapping).length > 0));
    const hasExplain = qq.explanation.trim().length > 0 || qq.hint.trim().length > 0 || (qq.solution && qq.solution.trim().length > 0);
    return hasTitle || hasOptions || hasAnswer || !!hasMatch || !!hasExplain;
  };

  const doSwitchType = (t: CreatorQuestionType) => {
    if (t === "match_following") {
      const base = q!.id;
      update({
        type: t,
        matchItems: q!.matchItems ?? [
          { id: `${base}_left_1`, content: "" },
          { id: `${base}_left_2`, content: "" },
          { id: `${base}_left_3`, content: "" },
          { id: `${base}_left_4`, content: "" },
        ],
        matchMatches: q!.matchMatches ?? [
          { id: `${base}_right_1`, content: "" },
          { id: `${base}_right_2`, content: "" },
          { id: `${base}_right_3`, content: "" },
          { id: `${base}_right_4`, content: "" },
        ],
        matchMapping: {},
        shuffleColumnA: q!.shuffleColumnA ?? true,
        shuffleColumnB: q!.shuffleColumnB ?? true,
        marks: q!.marks ?? 1,
      } as any);
    } else if (t === "true_false") {
      update({
        type: t,
        options: [
          { id: `${q!.id}_tf_true`, label: "A", content: "True", isCorrect: true },
          { id: `${q!.id}_tf_false`, label: "B", content: "False", isCorrect: false },
        ],
      } as any);
    } else update({ type: t } as any);
    setShowType(false);
  };

  const requestTypeChange = (t: CreatorQuestionType) => {
    if (t === q!.type) { setShowType(false); return; }
    if (q && hasDataToLose(q)) {
      setPendingType(t);
    } else {
      doSwitchType(t);
    }
  };

  if (!q) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm font-medium text-[var(--qs-muted)]">Select a question to start editing.</p>
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

  // Premium Match the Following — full-bleed editor per spec
  if (q.type === "match_following") {
    return <MatchFollowingEditor />;
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--qs-surface)]">
      <div className="shrink-0 rounded-t-[22px] border-b-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 py-4 text-[var(--qs-on-brand)] sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative ml-auto shrink-0">
            <button
              onClick={() => setShowType(!showType)}
              className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 py-1.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[#1a1240]"
            >
              {TYPE_SHORT[q.type]} <ChevronDown className="h-3 w-3" />
            </button>
            {showType && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[4px_4px_0_var(--qs-sun)]">
                {SELECTABLE_TYPES.map((t) => {
                  const Icon = TYPE_ICON[t];
                  const active = t === q.type;
                  const handlePick = () => requestTypeChange(t);
                  return (
                    <button
                      key={t}
                      onClick={handlePick}
                      className={cn("flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--qs-poly-1)]", active && "bg-[var(--qs-poly-1)]")}
                    >
                      <Icon className={cn("mt-0.5 h-4 w-4", active ? "text-[var(--qs-brand)]" : "text-[var(--qs-muted)]")} />
                      <div>
                        <p className={cn("text-xs font-bold", active ? "text-[var(--qs-brand)]" : "text-[var(--qs-ink)]")}>
                          {TYPE_SHORT[t]} — {TYPE_DESC[t]}
                        </p>
                      </div>
                      {active && <Check className="ml-auto h-4 w-4 text-[var(--qs-brand)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => duplicateQuestion(q.id)}
            aria-label="Duplicate question"
            title="Duplicate question"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-sun)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" />
            </svg>
          </button>
          <button
            onClick={() => removeQuestion(q.id)}
            aria-label="Delete question"
            title="Delete question"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-bad)] hover:bg-[var(--qs-bad)] hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-y-3">
          {[
            { label: "Difficulty", value: q.difficulty },
            { label: "Type", value: TYPE_SHORT[q.type] },
            { label: "Options", value: isMcq ? q.options.length : "—" },
          ].map((stat, index) => (
            <div key={stat.label} className={cn("min-w-0", index > 0 && "sm:border-l-2 sm:border-white/25 sm:pl-4")}>
              <b className="block truncate text-lg font-extrabold leading-tight sm:text-[22px]">{stat.value}</b>
              <small className="text-[10px] font-extrabold uppercase tracking-[0.08em] opacity-80">{stat.label}</small>
            </div>
          ))}
        </div>
        {showType && <div className="fixed inset-0 z-40" onClick={() => setShowType(false)} />}
      </div>

      <div className="p-3 sm:p-6">
        <div className="mx-auto w-full max-w-[720px] space-y-4 sm:space-y-6 min-w-0">
          <div>
            <div className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
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
            <div className="border-t-2 border-[var(--qs-line)] pt-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-extrabold leading-tight text-[var(--qs-ink)]">Answer options</h3>
                  <p className="text-[12px] font-medium text-[var(--qs-muted)]">
                    {q.type === "single_choice" ? "Tick the one correct answer." : q.type === "multiple_choice" ? "Tick every correct answer." : "Choose the correct answer."}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-[var(--qs-muted)]">
                  {q.type === "single_choice" ? "Single answer" : q.type === "multiple_choice" ? "Multiple answers" : "True / False"}
                </span>
              </div>
              <div className="space-y-2">
                {q.options.map((o) => {
                  if (q.type === "true_false") {
                    return (
                      <button
                        key={o.id}
                        onClick={() => setCorrect(o.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[14px] border-2 px-3 py-3 transition-colors",
                          o.isCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                        )}
                      >
                        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", o.isCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white" : "border-[var(--qs-line)] bg-[var(--qs-surface)]")}>
                          {o.isCorrect && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border-2 text-xs font-extrabold", o.isCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white" : "border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-ink)]")}>
                          {o.label}
                        </span>
                        <span className="text-sm font-semibold text-[var(--qs-ink)]">{o.content}</span>
                      </button>
                    );
                  }
                  return (
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
                        "flex items-start gap-3 rounded-[14px] border-2 px-3 py-3 transition-colors",
                        o.isCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                      )}
                    >
                      <button
                        onClick={() => {
                          const isSingle = q.type === "single_choice";
                          if (isSingle) update({ options: q.options.map((x) => ({ ...x, isCorrect: x.id === o.id })) });
                          else update({ options: q.options.map((x) => (x.id === o.id ? { ...x, isCorrect: !x.isCorrect } : x)) });
                        }}
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          o.isCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white" : "border-[var(--qs-line)] bg-[var(--qs-surface)]"
                        )}
                      >
                        {o.isCorrect && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border-2 text-xs font-extrabold", o.isCorrect ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-white" : "border-[var(--qs-line)] bg-[var(--qs-poly-1)] text-[var(--qs-ink)]")}>
                        {o.label}
                      </span>
                      <textarea
                        value={o.content}
                        onChange={(e) => { if (e.target.value.length <= 250) update({ options: q.options.map((x) => (x.id === o.id ? { ...x, content: e.target.value, contentHtml: undefined } : x)) }); }}
                        placeholder={`Option ${o.label}`}
                        maxLength={250}
                        rows={Math.max(1, Math.ceil(Math.max(o.content.length, 1) / 48))}
                        className="min-h-7 min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-1 text-sm font-medium leading-5 text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)] focus:outline-none"
                      />
                      <div className="mt-0.5 flex shrink-0 items-center gap-0.5 sm:flex">
                        <button onClick={() => removeOption(o.id)} className="rounded-[8px] p-1.5 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-badbg)] hover:text-[var(--qs-bad)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <span className="cursor-grab p-1.5 text-[var(--qs-muted)]">
                          <GripVertical className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      {o.imageUrl && <img src={o.imageUrl} alt="" className="h-8 w-8 rounded-[8px] border-2 border-[var(--qs-line)] object-cover" />}
                    </div>
                  );
                })}
              </div>
              {q.type !== "true_false" && (
                <div className="mt-3">
                  <button
                    onClick={addOption}
                    disabled={q.options.length >= 6}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-dashed border-[var(--qs-brand)]/50 bg-[var(--qs-bg)] py-2.5 text-xs font-bold text-[var(--qs-brand)] transition-colors hover:bg-[var(--qs-poly-1)] disabled:opacity-40"
                  >
                    + Add option
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">Correct Answer</label>
              <input
                value={String(q.correctAnswer ?? "")}
                onChange={(e) => update({ correctAnswer: e.target.value as any })}
                placeholder="Enter the correct answer"
                className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
              />
            </div>
          )}

          <div className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
            <button onClick={() => setShowAfter(!showAfter)} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--qs-poly-1)]">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ink)]">After Answer <span className="text-[var(--qs-muted)]">(Explanation, Hint, Solution)</span></span>
              {showAfter ? <ChevronUp className="h-4 w-4 text-[var(--qs-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--qs-muted)]" />}
            </button>
            <AnimatePresence initial={false}>
              {showAfter && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="border-t-2 border-[var(--qs-line)]">
                    <div className="flex gap-1 border-b-2 border-[var(--qs-line)] p-2">
                      {(["explanation", "hint", "solution"] as const).map((t) => (
                        <button key={t} onClick={() => setAfterTab(t)} className={cn("rounded-[10px] border-2 px-3 py-1.5 text-xs font-bold capitalize transition-colors", afterTab === t ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]" : "border-transparent text-[var(--qs-muted)] hover:bg-[var(--qs-poly-1)] hover:text-[var(--qs-ink)]")}>
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
                          className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                        />
                      )}
                      {afterTab === "hint" && (
                        <textarea
                          value={q.hint}
                          onChange={(e) => update({ hint: e.target.value })}
                          placeholder="Optional hint"
                          rows={3}
                          className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                        />
                      )}
                      {afterTab === "solution" && (
                        <textarea
                          value={q.solution ?? ""}
                          onChange={(e) => update({ solution: e.target.value })}
                          placeholder="Step-by-step solution"
                          rows={3}
                          className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-sm font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {pendingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1240]/60 p-4" onClick={() => setPendingType(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-6 shadow-[8px_8px_0_var(--qs-sun)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-[#a85d00]/40 bg-[#fff3d6]">
                <AlertTriangle className="h-5 w-5 text-[#a85d00]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">Change question type?</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--qs-muted)]">
                  You have written data for <span className="font-bold text-[var(--qs-ink)]">{q.type === "single_choice" ? "MCQ" : (q.type as string).replace("_", " ")}</span>. Switching to <span className="font-bold text-[var(--qs-brand)]">{pendingType === "single_choice" ? "MCQ" : (pendingType as string)?.replace("_", " ")}</span> will remove existing options / matching pairs / correct answer. <span className="font-bold">Kyoki phir options type etc mei dikkat ho jayega.</span> This cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingType(null)} className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2 text-xs font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]">Cancel</button>
              <button type="button" onClick={() => { doSwitchType(pendingType); setPendingType(null); }} className="rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)] px-4 py-2 text-xs font-extrabold text-white shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none">Continue, remove data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
