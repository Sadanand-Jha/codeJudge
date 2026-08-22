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
  Settings2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { CreatorQuestion, CreatorOption, CreatorQuestionType } from "../types";
import { useStudio } from "../StudioProvider";
import { EditableContent, RichToolbar } from "./RichToolbar";
import { AiAssistantPanel } from "./AiAssistantPanel";

const noSpinCls =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const TYPE_ICON: Record<CreatorQuestionType, React.ComponentType<{ className?: string }>> = {  single_choice: CircleDot,
  multiple_choice: ListChecks,
  true_false: ToggleRight,
  fill_blanks: FileText,
  integer: Hash,
  text: Type,
  paragraph: AlignLeft,
  code_output: Code2,
};

export function QuestionEditor() {
  const { state, updateQuestion } = useStudio();
  const q = state.questions.find((x) => x.id === state.activeQuestionId);

  const [aiOpen, setAiOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageOption = useRef<string | null>(null);

  if (!q) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-text-secondary">Select a question to start editing.</p>
      </div>
    );
  }

  const update = (patch: Partial<CreatorQuestion>) => updateQuestion(q.id, patch);

  const isMcq =
    q.type === "single_choice" ||
    q.type === "multiple_choice" ||
    q.type === "true_false";
  const isSingle = q.type === "single_choice" || q.type === "true_false";

  const setCorrect = (optId: string) => {
    if (q.type === "single_choice") {
      update({
        options: q.options.map((o) => ({ ...o, isCorrect: o.id === optId })),
        correctAnswer: q.options.findIndex((o) => o.id === optId),
      });
    } else {
      const next = q.options.map((o) =>
        o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o
      );
      update({
        options: next,
        correctAnswer: next.map((o, i) => (o.isCorrect ? i : -1)).filter((i) => i !== -1),
      });
    }
  };

  const updateOption = (id: string, patch: Partial<CreatorOption>) =>
    update({ options: q.options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  const addOption = () => {
    if (q.options.length >= 6) return;
    const label = String.fromCharCode(65 + q.options.length);
    update({
      options: [
        ...q.options,
        { id: `${q.id}_opt_${Date.now()}`, label, content: "", isCorrect: false },
      ],
    });
  };

  const removeOption = (id: string) => {
    if (q.options.length <= 2) return;
    const remaining = q.options
      .filter((o) => o.id !== id)
      .map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
    update({ options: remaining });
  };

  const openImageAssistant = (optId: string) => {
    pendingImageOption.current = optId;
    imageInputRef.current?.click();
  };

  const handleOptionImagePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optId = pendingImageOption.current;
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange
    e.target.value = "";
    if (!optId || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") updateOption(optId, { imageUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const questionNumber = Number((state.activeQuestionId ?? "").match(/q_(\d+)/)?.[1] ?? "");
  const StemIcon = TYPE_ICON[q.type] ?? CircleDot;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Hidden file picker for option images */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleOptionImagePicked}
      />

      {/* Header */}
      <div className="flex w-full items-center justify-between gap-3 bg-pink-400 px-6 py-[5px]">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/30 bg-white/15 text-white">
            <StemIcon className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold !text-white">
            Question {questionNumber || ""}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-medium text-white/80">
            {q.marks} marks
          </span>
          <TypeSelect value={q.type} onChange={(t) => update({ type: t, correctAnswer: "" })} />
          {/* <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            aria-label="Question settings"
            className="rounded-lg border border-white/30 bg-white/15 p-1.5 text-xs text-white hover:bg-white/25"
          >
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
          </button> */}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {/* Stem */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Question
            </label>
            <div className="rounded-xl border border-input-border bg-input-bg">
              <RichToolbar />
              <EditableContent
                value={q.title}
                onChange={(html) => update({ title: html })}
                placeholder="Write your question here… Support bold, math \( x^2 \), tables, and images."
                minHeight="min-h-[120px]"
              />
            </div>
          </div>

          {/* Metadata row */}
          <MetadataRow q={q} update={update} />

          {/* Type-specific body */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              {q.type === "true_false" ? "Correct answer" : "Answer"}
            </label>
            {q.type === "true_false" ? (
              <TrueFalseEditor q={q} update={update} />
            ) : isMcq ? (
              <OptionsEditor
                options={q.options}
                isSingle={isSingle}
                setCorrect={setCorrect}
                updateOption={updateOption}
                addOption={addOption}
                removeOption={removeOption}
                openImageAssistant={openImageAssistant}
              />
            ) : (
              <OtherTypeEditor q={q} update={update} />
            )}
          </div>

          {/* After-answer block */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              After answer
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Explanation <span className="text-text-muted">(shown after submission)</span>
                </label>
                <textarea
                  value={q.explanation}
                  onChange={(e) => update({ explanation: e.target.value })}
                  rows={3}
                  placeholder="Explain why the correct answer is right."
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Hint <span className="text-text-muted">(optional)</span>
                </label>
                <textarea
                  value={q.hint}
                  onChange={(e) => update({ hint: e.target.value })}
                  rows={3}
                  placeholder="A scaffolded hint…"
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">
                  Solution <span className="text-text-muted">(optional, step-by-step)</span>
                </label>
                <textarea
                  value={q.solution ?? ""}
                  onChange={(e) => update({ solution: e.target.value })}
                  rows={3}
                  placeholder="Walk through the worked solution…"
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* AI Assistant */}
          <div>
            <button
              type="button"
              onClick={() => setAiOpen(!aiOpen)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                aiOpen
                  ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  : "border-border text-text-secondary hover:text-text-primary hover:bg-card-hover"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" /> AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Question Settings */}
      <div className="border-t border-border bg-card-hover/40">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex w-full items-center justify-between px-6 py-3 text-left"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Advanced Question Settings
          </span>
          {advancedOpen ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
        </button>
        {advancedOpen && (
          <div className="px-6 pb-4">
            <ConfigPanel q={q} update={update} />
          </div>
        )}
      </div>

      {aiOpen && (
        <AiAssistantPanel
          question={q}
          onApplySuggestion={(s) => update({ [s.field]: s.text })}
        />
      )}
    </div>
  );
}

function TypeSelect({
  value,
  onChange,
}: {
  value: CreatorQuestionType;
  onChange: (v: CreatorQuestionType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const labels: Record<CreatorQuestionType, string> = {
    single_choice: "MCQ",
    multiple_choice: "Multi",
    true_false: "True / False",
    fill_blanks: "Fill Blank",
    integer: "Integer",
    text: "Short Answer",
    paragraph: "Long Answer",
    code_output: "Coding",
  };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold !text-white transition-colors hover:bg-white/25"
      >
        {labels[value]}
        <ChevronDown className={cn("h-3 w-3 text-white transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {(Object.keys(labels) as CreatorQuestionType[]).map((type) => {
            const Icon = TYPE_ICON[type];
            const active = type === value;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onChange(type);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors",
                  active
                    ? "bg-pink-500/10 font-semibold text-pink-600 dark:text-pink-300"
                    : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{labels[type]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetadataRow({
  q,
  update,
}: {
  q: CreatorQuestion;
  update: (patch: Partial<CreatorQuestion>) => void;
}) {
  const [diffOpen, setDiffOpen] = useState(false);
  const diffRef = useRef<HTMLDivElement>(null);
  const diffOptions: Array<"Easy" | "Medium" | "Hard" | "Expert"> = ["Easy", "Medium", "Hard", "Expert"];
  const diffDot: Record<string, string> = {
    Easy: "bg-emerald-500",
    Medium: "bg-amber-500",
    Hard: "bg-orange-500",
    Expert: "bg-rose-500",
  };
  const diffTextColor: Record<string, string> = {
    Easy: "text-emerald-400",
    Medium: "text-amber-400",
    Hard: "text-orange-400",
    Expert: "text-rose-400",
  };

  useEffect(() => {
    if (!diffOpen) return;
    function handleClick(e: MouseEvent) {
      if (diffRef.current && !diffRef.current.contains(e.target as Node)) setDiffOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [diffOpen]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/50 px-3 py-2 text-xs">
      <div ref={diffRef} className="relative flex items-center gap-1.5">
        <span className="text-text-muted">Difficulty</span>
        <button
          type="button"
          onClick={() => setDiffOpen(!diffOpen)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold !text-white transition-colors hover:bg-white/25"
        >
          <span className={cn("h-2 w-2 rounded-full", diffDot[q.difficulty] ?? "bg-amber-500")} />
          {q.difficulty}
          <ChevronDown className={cn("h-3 w-3 text-white transition-transform", diffOpen && "rotate-180")} />
        </button>
        {diffOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            {diffOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  update({ difficulty: d });
                  setDiffOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                  q.difficulty === d
                    ? "bg-pink-500/10 font-semibold text-pink-600 dark:text-pink-300"
                    : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", diffDot[d])} />
                <span>{d}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">Marks</span>
        <input
          type="number"
          value={q.marks || ""}
          min={0}
          max={100}
          onChange={(e) =>
            update({ marks: Math.min(100, Math.max(0, Number(e.target.value))) })
          }
          className={cn("w-12 border-0 border-b border-input-border bg-transparent text-xs font-bold text-text-primary text-center outline-none", noSpinCls)}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">Negative</span>
        <input
          type="number"
          value={q.negativeMarks ?? 0}
          min={0}
          max={100}
          onChange={(e) =>
            update({ negativeMarks: Math.min(100, Math.max(0, Number(e.target.value))) })
          }
          className={cn("w-10 border-0 border-b border-input-border bg-transparent text-xs font-bold text-text-primary text-center outline-none", noSpinCls)}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">Time</span>
        <input
          type="number"
          value={q.expectedTime || ""}
          min={0}
          onChange={(e) => update({ expectedTime: Number(e.target.value) })}
          className={cn("w-12 border-0 border-b border-input-border bg-transparent text-xs font-bold text-text-primary text-center outline-none", noSpinCls)}
        />
        <span className="text-text-muted">min</span>
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  isSingle,
  setCorrect,
  updateOption,
  addOption,
  removeOption,
  openImageAssistant,
}: {
  options: CreatorOption[];
  isSingle: boolean;
  setCorrect: (id: string) => void;
  updateOption: (id: string, patch: Partial<CreatorOption>) => void;
  addOption: () => void;
  removeOption: (id: string) => void;
  openImageAssistant: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <OptionRow
          key={o.id}
          option={o}
          isSingle={isSingle}
          onCorrect={() => setCorrect(o.id)}
          onUpdate={(p) => updateOption(o.id, p)}
          onRemove={() => removeOption(o.id)}
          onImage={() => openImageAssistant(o.id)}
        />
      ))}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addOption}
          disabled={options.length >= 6}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors",
            options.length >= 6
              ? "cursor-not-allowed opacity-40"
              : "hover:border-indigo-500/30 hover:text-text-primary"
          )}
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </button>
        <span className="text-[10px] text-text-muted">
          {options.length} of 6 options
        </span>
      </div>
    </div>
  );
}

function OptionRow({
  option,
  isSingle,
  onCorrect,
  onUpdate,
  onRemove,
  onImage,
}: {
  option: CreatorOption;
  isSingle: boolean;
  onCorrect: () => void;
  onUpdate: (p: Partial<CreatorOption>) => void;
  onRemove: () => void;
  onImage: () => void;
}) {
  const selected = option.isCorrect;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 transition-all",
        selected
          ? "border-emerald-500/40 bg-emerald-500/[0.08]"
          : "border-border bg-card/40 hover:border-border-hover"
      )}
    >
      <button
        type="button"
        onClick={onCorrect}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
          selected
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border bg-transparent text-text-secondary group-hover:border-emerald-500"
        )}
        title={isSingle ? "Mark correct" : "Toggle correct"}
      >
        {selected ? <Check className="h-3 w-3" /> : ""}
      </button>
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
          selected
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border text-text-muted"
        )}
      >
        {option.label}
      </span>
      <input
        value={option.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="Option content"
        className="flex-1 border-0 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
      />
      <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
        {option.imageUrl ? (
          <img src={option.imageUrl} alt="" className="h-6 w-6 rounded" />
        ) : (
          <button
            type="button"
            onClick={onImage}
            title="Add image"
            className="rounded p-0.5 text-text-secondary hover:text-text-primary"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          title="Delete option"
          className="rounded p-0.5 text-text-secondary hover:text-rose-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {selected && (
        <span className="mt-1 flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
          <Check className="h-3 w-3" /> Correct answer
        </span>
      )}
    </div>
  );
}

function OtherTypeEditor({
  q,
  update,
}: {
  q: CreatorQuestion;
  update: (patch: Partial<CreatorQuestion>) => void;
}) {
  const isCode = q.type === "code_output";
  const isNumeric = q.type === "integer";

  let answerValue: string = "";
  if (isNumeric) {
    answerValue = q.correctAnswer !== "" && q.correctAnswer !== undefined ? String(q.correctAnswer) : "";
  } else if (typeof q.correctAnswer === "string") {
    answerValue = q.correctAnswer;
  }

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = isNumeric ? Number(e.target.value) : e.target.value;
    update({ correctAnswer: val as CreatorQuestion["correctAnswer"] });
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <label className="mb-1.5 block text-xs font-bold text-text-secondary">
        {q.type === "true_false" ? "Correct answer" : "Answer"}
      </label>
      {q.type === "true_false" ? (
        <div className="flex gap-2">
          {(["true", "false"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => update({ correctAnswer: v })}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                q.correctAnswer === v
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border text-text-secondary hover:text-text-primary"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      ) : (
        <input
          type={isNumeric ? "number" : "text"}
          value={answerValue}
          onChange={handleAnswerChange}
          placeholder={isNumeric ? "Numeric answer" : "Enter the answer"}
          className={cn(
            "w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-indigo-500/50",
            isCode && "font-mono"
          )}
        />
      )}
    </div>
  );
}

function ConfigPanel({
  q,
  update,
}: {
  q: CreatorQuestion;
  update: (patch: Partial<CreatorQuestion>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Topic</label>
        <input
          type="text"
          value={q.topic}
          onChange={(e) => update({ topic: e.target.value })}
          placeholder="e.g. Electrostatics"
          className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-sm text-text-primary"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Bloom level</label>
        <select
          value={q.bloomLevel}
          onChange={(e) => update({ bloomLevel: e.target.value as CreatorQuestion["bloomLevel"] })}
          className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-xs font-medium capitalize text-text-primary outline-none"
        >
          <option>Remember</option>
          <option>Understand</option>
          <option>Apply</option>
          <option>Analyze</option>
          <option>Evaluate</option>
          <option>Create</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Tags</label>
        <TagInput tags={q.tags} onChange={(tags) => update({ tags })} />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Negative</label>
        <input
          type="number"
          value={q.negativeMarks ?? 0}
          min={0}
          max={100}
          onChange={(e) =>
            update({ negativeMarks: Math.min(100, Math.max(0, Number(e.target.value))) })
          }
          className={cn("h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-sm text-text-primary outline-none", noSpinCls)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Time (min)</label>
        <input
          type="number"
          value={q.expectedTime || ""}
          min={0}
          onChange={(e) => update({ expectedTime: Number(e.target.value) })}
          className={cn("h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-sm text-text-primary outline-none", noSpinCls)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Question ID</label>
        <input
          type="text"
          value={q.id}
          readOnly
          className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-[10px] text-text-muted outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Visibility</label>
        <select
          value={q.visibility}
          onChange={(e) => update({ visibility: e.target.value as CreatorQuestion["visibility"] })}
          className="h-9 w-full rounded-lg border border-input-border bg-input-bg px-2 text-xs font-medium text-text-primary outline-none"
        >
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <label className="block text-[10px] font-bold uppercase text-text-secondary">Internal notes</label>
        <textarea
          value={q.tags.join(", ")}
          onChange={(e) => update({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
          rows={2}
          placeholder="Internal notes visible only to collaborators…"
          className="w-full rounded-lg border border-input-border bg-input-bg px-2.5 py-2 text-xs text-text-primary placeholder-text-muted outline-none"
        />
      </div>
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card-hover/40 px-1.5 py-0.5 text-[10px] font-medium text-text-primary"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="rounded p-0.25 hover:text-rose-500"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          if (e.target.value.includes(",")) add(e.target.value.replace(",", ""));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(input);
          }
        }}
        placeholder="Add tag…"
        className="h-6 min-w-[70px] flex-1 border-0 bg-transparent text-xs text-text-primary placeholder-text-muted outline-none"
      />
    </div>
  );
}

/* ── True / False ────────────────────────────────────────
   Exactly two fixed options: True and False. The creator only
   picks which one is correct. */

function TrueFalseEditor({
  q,
  update,
}: {
  q: CreatorQuestion;
  update: (patch: Partial<CreatorQuestion>) => void;
}) {
  const isTfPair =
    q.options.length === 2 &&
    q.options[0].content === "True" &&
    q.options[1].content === "False";

  useEffect(() => {
    if (!isTfPair) {
      update({
        options: [
          { id: `${q.id}_tf_true`, label: "A", content: "True", isCorrect: false },
          { id: `${q.id}_tf_false`, label: "B", content: "False", isCorrect: false },
        ],
        correctAnswer: -1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTfPair, q.id]);

  const selected = typeof q.correctAnswer === "number" ? q.correctAnswer : -1;

  const select = (i: number) => {
    update({
      options: q.options.map((o, idx) => ({ ...o, isCorrect: idx === i })),
      correctAnswer: i,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="grid grid-cols-2 gap-3">
        {(["True", "False"] as const).map((label, i) => {
          const active = selected === i;
          return (
            <button
              key={label}
              type="button"
              onClick={() => select(i)}
              aria-pressed={active}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition-colors duration-150",
                active
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border bg-input-bg text-text-secondary hover:border-emerald-500/40 hover:text-text-primary"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold",
                  active ? "border-white/70 text-white" : "border-border text-text-muted"
                )}
              >
                {active ? <Check className="h-3 w-3" /> : label === "True" ? "T" : "F"}
              </span>
              {label}
            </button>
          );
        })}
      </div>
      {selected === -1 && (
        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
          Select whether the statement is true or false.
        </p>
      )}
    </div>
  );
}
