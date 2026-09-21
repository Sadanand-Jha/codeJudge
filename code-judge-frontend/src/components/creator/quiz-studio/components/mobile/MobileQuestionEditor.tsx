"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Check,
  Trash2,
  Plus,
  GripVertical,
  ImageIcon,
  MoreVertical,
  ChevronUp,
  Copy,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../../StudioProvider";
import { EditableContent, RichToolbar } from "../RichToolbar";
import type { CreatorQuestion, CreatorOption, CreatorQuestionType } from "../../types";
import { useQuizReferenceStore } from "@/store/quizReferenceStore";

// Reuse type constants
const TYPE_LABEL: Record<CreatorQuestionType, string> = {
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  fill_blanks: "Fill in the Blank",
  text: "Short Answer",
  match_following: "Match the Following",
  integer: "Integer",
  paragraph: "Long Answer",
  code_output: "Code",
};

const TYPE_SHORT: Record<CreatorQuestionType, string> = {
  single_choice: "Single Choice",
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  fill_blanks: "Fill Blank",
  text: "Short",
  match_following: "Match",
  integer: "Int",
  paragraph: "Long",
  code_output: "Code",
};

export function MobileQuestionEditor({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
}) {
  const { state, updateQuestion, duplicateQuestion, removeQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);
  const [showType, setShowType] = useState(false);
  const [showAfter, setShowAfter] = useState(false);
  const [afterTab, setAfterTab] = useState<"explanation" | "hint" | "solution">("explanation");
  const [showMenu, setShowMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageOption = useRef<string | null>(null);
  const [draggedOpt, setDraggedOpt] = useState<string | null>(null);

  if (!q) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-zinc-500">
        Select a question to edit.
      </div>
    );
  }

  if (q.type === "match_following") {
    // Matching is desktop-only — hide editor on mobile per requirement
    const handleSwitchToMcq = () => updateQuestion(q.id, { type: "single_choice" } as any);
    return (
      <div className="flex w-full max-w-full min-w-0 flex-1 flex-col gap-3 overflow-x-hidden">
        <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-amber-200">
              <span className="text-sm">🖥️</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-zinc-900">Match the Following</h3>
              <p className="mt-1 break-words text-xs leading-relaxed text-zinc-600">
                This question type is available only on desktop. Please open this quiz on a larger screen to create or edit matching pairs.
              </p>
              <p className="mt-2 text-xs font-medium text-zinc-700">
                Question {String(state.questions.findIndex((x) => x.id === q.id) + 1).padStart(2, "0")} · {q.matchItems?.length ?? 0} pairs
              </p>
              <button
                onClick={handleSwitchToMcq}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Switch to Single Choice on mobile
              </button>
            </div>
          </div>
        </div>
        <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 text-center">
          <p className="text-xs text-zinc-500">Preview and editing for matching is disabled on mobile to keep the flow simple.</p>
          <p className="mt-1 text-[11px] text-zinc-400">Open on desktop to continue — your data is saved.</p>
        </div>
      </div>
    );
  }

  const update = (patch: Partial<CreatorQuestion>) => updateQuestion(q.id, patch);
  const activeIdx = state.questions.findIndex((x) => x.id === q.id);
  const isMcq = q.type === "single_choice" || q.type === "multiple_choice" || q.type === "true_false";
  const isSingle = q.type === "single_choice" || q.type === "true_false";

  const setCorrect = (optId: string) => {
    if (isSingle) {
      update({ options: q.options.map((o) => ({ ...o, isCorrect: o.id === optId })) });
    } else {
      const next = q.options.map((o) => (o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o));
      update({ options: next });
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

  // Mobile: hide matching — desktop-only per requirement
  const SELECTABLE: CreatorQuestionType[] = ["single_choice", "multiple_choice", "true_false", "fill_blanks"];

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-4 overflow-x-hidden pb-4">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleOptionImagePicked} />

      {/* Top meta bar — question number + type selector + menu */}
      <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-2">
        <h2 className="shrink-0 text-sm font-bold text-zinc-900 whitespace-nowrap">Question {String(activeIdx + 1).padStart(2, "0")}</h2>
        <div className="flex min-w-0 shrink items-center gap-1.5">
          <div className="relative min-w-0">
            <button
              onClick={() => setShowType(!showType)}
              className="flex max-w-[128px] items-center gap-1 truncate rounded-xl border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 sm:max-w-none sm:px-3 sm:py-2"
            >
              <span className="truncate">{TYPE_SHORT[q.type]}</span> <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            </button>
            {showType && (
              <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                {SELECTABLE.map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      if (t !== q.type) update({ type: t } as any);
                      setShowType(false);
                    }}
                    className={cn("flex w-full items-center justify-between px-3 py-3 text-left text-sm hover:bg-zinc-50", t === q.type && "bg-pink-50 text-[#E91E63]")}
                  >
                    <span className="text-xs font-medium">{TYPE_LABEL[t]}</span>
                    {t === q.type && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                <button
                  onClick={() => {
                    duplicateQuestion(q.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-zinc-50"
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <button
                  onClick={() => {
                    removeQuestion(q.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {(showType || showMenu) && <div className="fixed inset-0 z-30" onClick={() => { setShowType(false); setShowMenu(false); }} />}

      {/* QUESTION card */}
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Question</h3>
        </div>
        <div className="px-2 sm:px-3 pb-3 min-w-0">
          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <RichToolbar />
            <EditableContent
              value={q.title}
              onChange={(html) => update({ title: html })}
              placeholder="Write your question..."
              minHeight="min-h-[110px]"
            />
          </div>
        </div>
      </div>

      {/* ANSWER OPTIONS card */}
      {isMcq ? (
        <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm p-3 sm:p-4">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h3 className="shrink-0 text-xs font-bold uppercase tracking-wider text-zinc-500">Answer Options</h3>
            <span className="min-w-0 truncate text-right text-[11px] sm:text-xs text-zinc-400">
              {q.type === "single_choice" ? "Single" : q.type === "multiple_choice" ? "Multiple" : "T/F"}
            </span>
          </div>
          <div className="mt-3 space-y-2.5">
            {q.options.map((o) => {
              if (q.type === "true_false") {
                return (
                  <button
                    key={o.id}
                    onClick={() => setCorrect(o.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left",
                      o.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"
                    )}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", o.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 bg-white")}>
                      {o.isCorrect && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold", o.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-200 bg-zinc-100 text-zinc-700")}>
                      {o.label}
                    </span>
                    <span className="text-sm font-medium text-zinc-900">{o.content}</span>
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
                    "flex w-full max-w-full min-w-0 items-center gap-1.5 sm:gap-2 rounded-xl border px-2 sm:px-3 py-2.5 overflow-hidden",
                    o.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-white"
                  )}
                >
                  <button
                    onClick={() => setCorrect(o.id)}
                    className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2", o.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 bg-white")}
                  >
                    {o.isCorrect && <Check className="h-4 w-4" />}
                  </button>
                  <span className={cn("hidden xs:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold sm:flex", o.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-200 bg-zinc-100 text-zinc-700")}>
                    {o.label}
                  </span>
                  <input
                    value={o.content}
                    onChange={(e) => {
                      if (e.target.value.length <= 250) updateOption(o.id, { content: e.target.value });
                    }}
                    placeholder={`Option ${o.label}`}
                    maxLength={250}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                  />
                  <button onClick={() => openImageAssistant(o.id)} className="hidden sm:flex shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100">
                    <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <button onClick={() => removeOption(o.id)} className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <span className="hidden sm:flex cursor-grab p-1 text-zinc-400 shrink-0">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  {o.imageUrl && <img src={o.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover border" />}
                </div>
              );
            })}
          </div>
          {q.type !== "true_false" && (
            <button
              onClick={addOption}
              disabled={q.options.length >= 6}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-pink-200 bg-pink-50 py-3 text-sm font-semibold text-[#E91E63] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add option
            </button>
          )}
          <p className="mt-2 text-center text-xs text-zinc-400">Tap the circle to mark the correct answer</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Answer</h3>
          <input
            value={String(q.correctAnswer ?? "")}
            onChange={(e) => update({ correctAnswer: e.target.value as any })}
            placeholder="Enter the correct answer"
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm focus:border-pink-300 focus:outline-none"
          />
        </div>
      )}

      {/* QUESTION SETTINGS collapsible */}
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center justify-between px-4 py-4"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-zinc-900">
            <Settings2 className="h-4 w-4 text-zinc-500" /> Question Settings
          </span>
          {settingsOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>
        <AnimatePresence initial={false}>
          {settingsOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-zinc-100"
            >
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <span className="text-xs font-medium text-zinc-500">Marks</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={q.marks}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");
                        update({ marks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold focus:border-pink-300 focus:outline-none"
                    />
                  </label>
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <span className="text-xs font-medium text-zinc-500">Negative</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={q.negativeMarks ?? 0}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");
                        update({ negativeMarks: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold focus:border-pink-300 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <span className="text-xs font-medium text-zinc-500">Time</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={q.expectedTime}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "");
                          update({ expectedTime: v === "" ? 0 : Math.max(0, Number(v) || 0) });
                        }}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold focus:border-pink-300 focus:outline-none"
                      />
                      <span className="text-xs text-zinc-500">min</span>
                    </div>
                  </label>
                  <label className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <span className="text-xs font-medium text-zinc-500">Difficulty</span>
                    <select
                      value={q.difficulty}
                      onChange={(e) => update({ difficulty: e.target.value as any })}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold focus:border-pink-300 focus:outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </label>
                </div>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700"
                  >
                    Open full settings
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!settingsOpen && (
          <div className="px-4 pb-3 -mt-1">
            <p className="text-xs text-zinc-500">
              {q.marks} marks · {q.negativeMarks ?? 0} negative · {q.expectedTime} min · {q.difficulty}
            </p>
          </div>
        )}
      </div>

      {/* After Answer (explanation etc.) — also collapsible but secondary */}
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <button onClick={() => setShowAfter(!showAfter)} className="flex w-full items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">
            After Answer <span className="font-normal text-zinc-400">(Explanation, Hint, Solution)</span>
          </span>
          {showAfter ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </button>
        <AnimatePresence initial={false}>
          {showAfter && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-zinc-100">
              <div className="p-3">
                <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
                  {(["explanation", "hint", "solution"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setAfterTab(t)}
                      className={cn("flex-1 rounded-lg px-3 py-2 text-xs font-semibold capitalize", afterTab === t ? "bg-[#E91E63] text-white" : "text-zinc-600")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  {afterTab === "explanation" && (
                    <textarea
                      value={q.explanation}
                      onChange={(e) => update({ explanation: e.target.value })}
                      placeholder="Explain why the correct answer is right."
                      rows={3}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-pink-300 focus:outline-none"
                    />
                  )}
                  {afterTab === "hint" && (
                    <textarea
                      value={q.hint}
                      onChange={(e) => update({ hint: e.target.value })}
                      placeholder="Optional hint"
                      rows={3}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-pink-300 focus:outline-none"
                    />
                  )}
                  {afterTab === "solution" && (
                    <textarea
                      value={q.solution ?? ""}
                      onChange={(e) => update({ solution: e.target.value })}
                      placeholder="Step-by-step solution"
                      rows={3}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-pink-300 focus:outline-none"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
