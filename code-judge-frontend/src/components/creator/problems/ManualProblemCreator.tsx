"use client";

import { useState } from "react";
import { Check, PenLine, Plus, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { SearchableDropdown } from "@/components/ui";
import { getAllSubjects } from "@/services/quiz";

interface ManualOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

const DIFFICULTIES = [
  { label: "Easy", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { label: "Medium", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "Hard", dot: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { label: "Expert", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
];

const newOption = (): ManualOption => ({
  id: `opt_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
  text: "",
  isCorrect: false,
});

export function ManualProblemCreator() {
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [subject, setSubject] = useState("");
  const [subjectId, setSubjectId] = useState<string | number>("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [marks, setMarks] = useState(1);
  const [options, setOptions] = useState<ManualOption[]>([newOption(), newOption()]);
  const [explanation, setExplanation] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      toast.error({ title: "Title required", description: "Give your problem a short title first." });
      return;
    }
    if (!statement.trim()) {
      toast.error({ title: "Statement required", description: "Write the problem statement first." });
      return;
    }
    const filled = options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text);
    if (filled.length < 2) {
      toast.error({ title: "Add options", description: "At least two non-empty options are needed." });
      return;
    }
    if (!filled.some((o) => o.isCorrect)) {
      toast.error({ title: "Mark an answer", description: "Select the correct option first." });
      return;
    }
    setTitle("");
    setStatement("");
    setSubject("");
    setSubjectId("");
    setDifficulty("Medium");
    setMarks(1);
    setOptions([newOption(), newOption()]);
    setExplanation("");
    toast.success({ title: "Problem saved", description: "Your problem has been saved to your draft bank." });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
            <PenLine className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Write it yourself</h2>
            <p className="text-[11px] text-text-muted">Write the question, options and answer key in your own words.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Problem Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              maxLength={120}
              placeholder="e.g. Deadlock necessary conditions"
              className="h-10 w-full rounded-lg border border-gray-200 bg-[#F8FAFC] px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10 dark:border-input-border dark:bg-input-bg"
            />
          </div>
          <div className="space-y-2">
            <SearchableDropdown
              label="Subject"
              placeholder="Search subjects..."
              value={subject}
              selectedId={subjectId}
              onSelect={(option) => {
                setSubject(option.label);
                setSubjectId(option.id);
              }}
              onClear={() => {
                setSubject("");
                setSubjectId("");
              }}
              searchFn={async (query, signal) => {
                const results = await getAllSubjects(query, signal);
                return results.map((s) => ({ id: s.id, label: s.subject_name }));
              }}
              minChars={1}
              debounceMs={300}
              maxVisible={8}
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold text-text-secondary">Problem Statement</label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value.slice(0, 2000))}
            rows={4}
            maxLength={2000}
            placeholder="Write the full question here…"
            className="w-full rounded-lg border border-gray-200 bg-[#F8FAFC] px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10 dark:border-input-border dark:bg-input-bg"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Difficulty</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setDifficulty(d.label)}
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-bold transition-all",
                    difficulty === d.label
                      ? "border-transparent bg-text-primary text-white dark:bg-white dark:text-zinc-900"
                      : "border-border bg-card-hover/40 text-text-secondary hover:text-text-primary"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", d.dot)} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-secondary">Marks</label>
            <input
              type="number"
              min={1}
              max={100}
              value={marks}
              onChange={(e) => setMarks(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="h-10 w-full rounded-lg border border-gray-200 bg-[#F8FAFC] px-3.5 text-sm text-text-primary outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10 dark:border-input-border dark:bg-input-bg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold text-text-secondary">
            Options <span className="font-medium text-text-muted">(tick the correct one)</span>
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.id === option.id })))
                  }
                  aria-label={`Mark option ${index + 1} correct`}
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all",
                    option.isCorrect
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border text-transparent hover:border-emerald-500/50"
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <input
                  value={option.text}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o) => (o.id === option.id ? { ...o, text: e.target.value } : o)))
                  }
                  placeholder={`Option ${index + 1}`}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-[#F8FAFC] px-3.5 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10 dark:border-input-border dark:bg-input-bg"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => prev.filter((o) => o.id !== option.id))}
                    aria-label={`Remove option ${index + 1}`}
                    className="rounded-lg p-2 text-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, newOption()])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-pink-500/40 hover:text-pink-600"
          >
            <Plus className="h-3.5 w-3.5" /> Add option
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold text-text-secondary">
            Explanation <span className="font-medium text-text-muted">(optional)</span>
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value.slice(0, 1000))}
            rows={2}
            maxLength={1000}
            placeholder="Why is this the right answer?"
            className="w-full rounded-lg border border-gray-200 bg-[#F8FAFC] px-3.5 py-3 text-sm text-text-primary placeholder-text-muted outline-none focus:border-pink-500/60 focus:ring-2 focus:ring-pink-500/10 dark:border-input-border dark:bg-input-bg"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:brightness-110 sm:w-auto"
        >
          <Check className="h-4 w-4" /> Save Problem
        </button>
      </div>
    </div>
  );
}
