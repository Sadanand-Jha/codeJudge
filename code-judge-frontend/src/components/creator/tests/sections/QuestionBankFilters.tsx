"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getQuestionGeneratorCatalog } from "@/services/aiGenerate";
import type { QuestionGeneratorCatalog } from "@/services/aiGenerate";
import { cn } from "@/lib/helpers";

type Kind = "any" | "theory" | "numerical";
type Difficulty = "any" | "easy" | "medium" | "hard";

interface Props {
  subjectId: number | null;
  chapterId?: number | null;
  topicId?: number | null;
  onSubjectChange: (value: number | null) => void;
  onChapterChange?: (value: number | null) => void;
  onTopicChange?: (value: number | null) => void;
  multiple?: boolean;
  chapterIds?: number[];
  topicIds?: number[];
  onChapterIdsChange?: (values: number[]) => void;
  onTopicIdsChange?: (values: number[]) => void;
  disabled?: boolean;
  kind?: Kind;
  onKindChange?: (value: Kind) => void;
  difficulty?: Difficulty;
  onDifficultyChange?: (value: Difficulty) => void;
  /** Tailwind grid-cols classes for the subject/chapter/topic row. */
  columns?: string;
}

const selectClass = "h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-primary outline-none transition-all focus:border-pink-500/50 disabled:opacity-50";

function MultiPicker({ label, emptyLabel, options, values, onChange, disabled }: {
  label: string;
  emptyLabel: string;
  options: Array<{ id: number; name: string }>;
  values: number[];
  onChange: (values: number[]) => void;
  disabled?: boolean;
}) {
  const selectedNames = options.filter((option) => values.includes(option.id)).map((option) => option.name);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const el = detailsRef.current;
      if (el?.open && !el.contains(event.target as Node)) {
        el.open = false;
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") detailsRef.current?.removeAttribute("open");
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const summary = selectedNames.length === 0
    ? emptyLabel
    : selectedNames.length <= 2
      ? selectedNames.join(", ")
      : `${selectedNames.length} selected`;

  return (
    <div className="text-xs font-bold text-text-primary">
      <span>{label} <span className="font-medium text-text-muted">(multiple)</span></span>
      <details ref={detailsRef} className={`group relative mt-1.5 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-primary outline-none transition-all hover:border-border-hover group-open:border-pink-500/50">
          <span className="truncate">{summary}</span>
          <span className="ml-2 text-text-muted">⌄</span>
        </summary>
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] font-medium text-text-muted">No options available</p>
          ) : options.map((option) => (
            <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-text-primary hover:bg-card-hover">
              <input
                type="checkbox"
                checked={values.includes(option.id)}
                onChange={() => onChange(values.includes(option.id) ? values.filter((id) => id !== option.id) : [...values, option.id])}
                className="h-3.5 w-3.5 accent-pink-500"
              />
              <span>{option.name}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

export function QuestionBankFilters(props: Props) {
  const [catalog, setCatalog] = useState<QuestionGeneratorCatalog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getQuestionGeneratorCatalog(controller.signal)
      .then(setCatalog)
      .catch((err) => {
        if (err?.name !== "AbortError") setError(err?.message || "Could not load subjects.");
      });
    return () => controller.abort();
  }, []);

  const chapters = useMemo(
    () => catalog?.chapters.filter((chapter) => chapter.subjectId === props.subjectId) ?? [],
    [catalog, props.subjectId]
  );
  const topics = useMemo(
    () => catalog?.topics.filter((topic) => props.multiple
      ? (props.chapterIds ?? []).includes(topic.chapterId)
      : topic.chapterId === props.chapterId) ?? [],
    [catalog, props.multiple, props.chapterIds, props.chapterId]
  );
  const parse = (value: string) => value ? Number(value) : null;

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-3", props.columns ?? "sm:grid-cols-3")}>
        <label className="text-xs font-bold text-text-primary">
          Subject
          <select
            value={props.subjectId ?? ""}
            onChange={(event) => {
              props.onSubjectChange(parse(event.target.value));
              props.onChapterChange?.(null);
              props.onTopicChange?.(null);
              props.onChapterIdsChange?.([]);
              props.onTopicIdsChange?.([]);
            }}
            disabled={props.disabled || !catalog}
            className={`${selectClass} mt-1.5`}
          >
            <option value="">Select subject</option>
            {catalog?.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        {props.multiple ? (
          <MultiPicker
            label="Chapter"
            emptyLabel="All chapters"
            options={chapters}
            values={props.chapterIds ?? []}
            disabled={props.disabled || !props.subjectId}
            onChange={(values) => {
              props.onChapterIdsChange?.(values);
              const validTopicIds = (catalog?.topics ?? [])
                .filter((topic) => values.includes(topic.chapterId))
                .map((topic) => topic.id);
              props.onTopicIdsChange?.((props.topicIds ?? []).filter((id) => validTopicIds.includes(id)));
            }}
          />
        ) : <label className="text-xs font-bold text-text-primary">
          Chapter <span className="font-medium text-text-muted">(optional)</span>
          <select
            value={props.chapterId ?? ""}
            onChange={(event) => {
              props.onChapterChange?.(parse(event.target.value));
              props.onTopicChange?.(null);
            }}
            disabled={props.disabled || !props.subjectId}
            className={`${selectClass} mt-1.5`}
          >
            <option value="">All chapters</option>
            {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
          </select>
        </label>}
        {props.multiple ? (
          <MultiPicker
            label="Topic"
            emptyLabel={(props.chapterIds ?? []).length ? "All selected-chapter topics" : "Select chapters first"}
            options={topics}
            values={props.topicIds ?? []}
            onChange={(values) => props.onTopicIdsChange?.(values)}
            disabled={props.disabled || !(props.chapterIds ?? []).length}
          />
        ) : <label className="text-xs font-bold text-text-primary">
          Topic <span className="font-medium text-text-muted">(optional)</span>
          <select
            value={props.topicId ?? ""}
            onChange={(event) => props.onTopicChange?.(parse(event.target.value))}
            disabled={props.disabled || !props.chapterId}
            className={`${selectClass} mt-1.5`}
          >
            <option value="">All topics</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
        </label>}
      </div>

      {(props.onDifficultyChange || props.onKindChange) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {props.onDifficultyChange && (
            <label className="text-xs font-bold text-text-primary">
              Hardness
              <select value={props.difficulty} onChange={(event) => props.onDifficultyChange?.(event.target.value as Difficulty)} disabled={props.disabled} className={`${selectClass} mt-1.5`}>
                <option value="any">Any hardness</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          )}
          {props.onKindChange && (
            <label className="text-xs font-bold text-text-primary">
              Category
              <select value={props.kind} onChange={(event) => props.onKindChange?.(event.target.value as Kind)} disabled={props.disabled} className={`${selectClass} mt-1.5`}>
                <option value="any">Any category</option>
                <option value="theory">Theory</option>
                <option value="numerical">Numerical</option>
              </select>
            </label>
          )}
        </div>
      )}

      {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
      {catalog && catalog.subjects.length === 0 && (
        <p className="text-xs text-text-muted">No subjects currently have chapters, topics, and question-bank entries.</p>
      )}
    </div>
  );
}
