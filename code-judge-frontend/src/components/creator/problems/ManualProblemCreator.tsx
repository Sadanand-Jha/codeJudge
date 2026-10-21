"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, PenLine, Plus, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { getAllSubjects } from "@/services/quiz";
import { QsSelect, type QsSelectOption } from "@/components/creator/problems/QsSelect";

interface ManualOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

const DIFFICULTIES = [
  { label: "Easy", dot: "bg-[var(--qs-ok)]" },
  { label: "Medium", dot: "bg-[#a85d00]" },
  { label: "Hard", dot: "bg-[var(--qs-bad)]" },
  { label: "Expert", dot: "bg-[var(--qs-ink)]" },
];

const FIELD_CLASS =
  "h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 text-sm text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

const LABEL_CLASS = "block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]";

const newOption = (): ManualOption => ({
  id: `opt_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
  text: "",
  isCorrect: false,
});

export function ManualProblemCreator() {
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<QsSelectOption<number>[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [subjectsReloadKey, setSubjectsReloadKey] = useState(0);
  const [difficulty, setDifficulty] = useState("Medium");
  const [marks, setMarks] = useState(1);
  const [options, setOptions] = useState<ManualOption[]>([newOption(), newOption()]);
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    getAllSubjects(undefined, controller.signal)
      .then((results) => {
        if (!active) return;
        setSubjectOptions(results.map((s) => ({ value: s.id, label: s.subject_name })));
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof Error && err.name === "AbortError")) return;
        setSubjectsError(err instanceof Error ? err.message : "Unable to load subjects.");
      })
      .finally(() => {
        if (active) setSubjectsLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [subjectsReloadKey]);

  const retrySubjects = () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    setSubjectsReloadKey((key) => key + 1);
  };

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
    setSubjectId(null);
    setDifficulty("Medium");
    setMarks(1);
    setOptions([newOption(), newOption()]);
    setExplanation("");
    toast.success({ title: "Problem saved", description: "Your problem has been saved to your draft bank." });
  };

  return (
    <div className="w-full">
      <div className="qs-shadow mt-0 mb-6 mr-4">
        <div className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--qs-brand)] px-5 py-4 text-[var(--qs-on-brand)] sm:px-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--qs-sun)] text-[#1a1240]">
                <PenLine className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold">Write it yourself</h2>
                <p className="text-[13px] opacity-90">
                  Write the question, options and answer key in your own words.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className={LABEL_CLASS}>Problem Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                  maxLength={120}
                  placeholder="e.g. Deadlock necessary conditions"
                  className={FIELD_CLASS}
                />
              </div>
              <div className="space-y-2">
                <label className={LABEL_CLASS}>Subject</label>
                <QsSelect
                  value={subjectId}
                  options={subjectOptions}
                  onChange={setSubjectId}
                  placeholder={subjectsLoading ? "Loading subjects…" : "Select subject"}
                  disabled={subjectsLoading}
                  ariaLabel="Subject"
                  searchable
                  triggerClassName={cn(FIELD_CLASS, "flex items-center justify-between gap-2")}
                  menuClassName="w-full min-w-[240px]"
                />
                {subjectsError && (
                  <div className="flex items-start gap-1.5 text-[12px] font-semibold text-[var(--qs-bad)]">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {subjectsError}{" "}
                      <button
                        type="button"
                        onClick={retrySubjects}
                        className="underline"
                      >
                        Retry
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className={LABEL_CLASS}>Problem Statement</label>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value.slice(0, 2000))}
                rows={4}
                maxLength={2000}
                placeholder="Write the full question here…"
                className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-3 text-sm text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className={LABEL_CLASS}>Difficulty</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setDifficulty(d.label)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-[12px] border-2 px-2 py-2 text-[11px] font-extrabold transition-colors",
                        difficulty === d.label
                          ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          difficulty === d.label ? "bg-[var(--qs-sun)]" : d.dot
                        )}
                      />
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className={LABEL_CLASS}>Marks</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={marks}
                  onChange={(e) => setMarks(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className={cn(
                    FIELD_CLASS,
                    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  )}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className={LABEL_CLASS}>
                Options <span className="font-bold normal-case tracking-normal">(tick the correct one)</span>
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
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors",
                        option.isCorrect
                          ? "border-[var(--qs-ok)] bg-[var(--qs-ok)] text-[var(--qs-on-brand)]"
                          : "border-[var(--qs-line)] text-transparent hover:border-[var(--qs-ok)]"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <input
                      value={option.text}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((o) => (o.id === option.id ? { ...o, text: e.target.value } : o))
                        )
                      }
                      placeholder={`Option ${index + 1}`}
                      className={FIELD_CLASS}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setOptions((prev) => prev.filter((o) => o.id !== option.id))}
                        aria-label={`Remove option ${index + 1}`}
                        className="rounded-[10px] p-2 text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bad)]/10 hover:text-[var(--qs-bad)]"
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
                className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-dashed border-[var(--qs-line)] px-3.5 py-2 text-xs font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)]"
              >
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className={LABEL_CLASS}>
                Explanation <span className="font-bold normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value.slice(0, 1000))}
                rows={2}
                maxLength={1000}
                placeholder="Why is this the right answer?"
                className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-3 text-sm text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-6 py-3 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition hover:brightness-105 sm:w-auto"
            >
              <Check className="h-4 w-4" /> Save Problem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
