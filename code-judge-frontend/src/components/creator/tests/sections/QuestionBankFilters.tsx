"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ListTree, X } from "lucide-react";
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
  /** Show a nested "selected coverage" tree beside the dropdowns. */
  showSelectionTree?: boolean;
}

function SinglePicker<T extends string | number>({ label, sub, placeholder, options, value, onChange, disabled }: {
  label: string;
  sub?: string;
  placeholder: string;
  options: Array<{ id: T; name: string }>;
  value: T | null;
  onChange: (value: T | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open ]);

  const selected = options.find((option) => option.id === value) ?? null;

  const pick = (next: T | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="text-xs font-bold text-text-primary">
      <span>{label} {sub ? <span className="font-medium text-text-muted">{sub}</span> : null}</span>
      <div ref={wrapRef} className={`relative mt-1.5 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-primary outline-none transition-all hover:border-border-hover",
            open && "border-pink-500/50"
          )}
        >
          <span className={cn("truncate", !selected && "font-medium text-text-muted")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-text-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => pick(null)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                selected === null
                  ? "bg-pink-500/10 text-pink-600 dark:text-pink-300"
                  : "text-text-muted hover:bg-card-hover hover:text-text-primary"
              )}
            >
              <span className="truncate">{placeholder}</span>
              {selected === null && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
            {options.map((option) => {
              const isSelected = selected?.id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => pick(option.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-pink-500/10 text-pink-600 dark:text-pink-300"
                      : "text-text-primary hover:bg-card-hover"
                  )}
                >
                  <span className="truncate">{option.name}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

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

  const allSelected = options.length > 0 && values.length === options.length;

  return (
    <div className="text-xs font-bold text-text-primary">
      <span>{label} <span className="font-medium text-text-muted">(multiple)</span></span>
      <details ref={detailsRef} className={`group relative mt-1.5 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-primary outline-none transition-all hover:border-border-hover group-open:border-pink-500/50">
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] font-medium text-text-muted">No options available</p>
          ) : (
          <>
          <button
            type="button"
            onClick={() => onChange(allSelected ? [] : options.map((option) => option.id))}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-pink-600 transition-colors hover:bg-pink-500/10 dark:text-pink-300"
          >
            <span className="truncate">{allSelected ? "Clear all" : "Select all"}</span>
            <span className="shrink-0 rounded-md bg-pink-500/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {values.length}/{options.length}
            </span>
          </button>
          <div className="mx-2 my-1 border-t border-border" />
          {options.map((option) => {
            const isSelected = values.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-pink-500/10 text-pink-600 dark:text-pink-300"
                    : "text-text-primary hover:bg-card-hover"
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onChange(isSelected ? values.filter((id) => id !== option.id) : [...values, option.id])}
                  className="sr-only"
                />
                <span className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-md border transition-colors",
                  isSelected ? "border-pink-500 bg-pink-500 text-white" : "border-border text-transparent"
                )}>
                  <Check className="h-3 w-3" />
                </span>
                <span className="truncate">{option.name}</span>
              </label>
            );
          })}
          </>
          )}
        </div>
      </details>
    </div>
  );
}

function SelectionCoverage({ subjectName, chapters, chapterIds, topicIds, singleChapterId, singleTopicId, multiple, onRemoveSubject, onRemoveChapter, onRemoveTopic }: {
  subjectName: string | null;
  chapters: Array<{ id: number; name: string; topics: Array<{ id: number; name: string }> }>;
  chapterIds: number[];
  topicIds: number[];
  singleChapterId?: number | null;
  singleTopicId?: number | null;
  multiple: boolean;
  onRemoveSubject: () => void;
  onRemoveChapter: (id: number | null) => void;
  onRemoveTopic: (id: number | null) => void;
}) {
  const visibleChapters = !subjectName
    ? []
    : multiple
      ? chapters.filter((chapter) => chapterIds.includes(chapter.id))
      : singleChapterId
        ? chapters.filter((chapter) => chapter.id === singleChapterId)
        : [];
  const topicsFor = (chapterId: number, topics: Array<{ id: number; name: string }>) =>
    multiple
      ? topics.filter((topic) => topicIds.includes(topic.id))
      : singleTopicId
        ? topics.filter((topic) => topic.id === singleTopicId)
        : [];
  const totalTopics = visibleChapters.reduce((sum, chapter) => sum + topicsFor(chapter.id, chapter.topics).length, 0);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-text-primary">
          <ListTree className="h-3.5 w-3.5 shrink-0 text-violet-500" />
          <span className="truncate">Selected coverage</span>
        </span>
        {subjectName && (
          <span className="shrink-0 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-violet-600 dark:text-violet-300">
            {visibleChapters.length === 0 ? "All" : `${visibleChapters.length} ch · ${totalTopics === 0 ? "all" : totalTopics} tp`}
          </span>
        )}
      </div>
      {!subjectName ? (
        <p className="px-3 py-2.5 text-[11px] leading-5 text-text-muted">
          Select a subject to see your coverage here.
        </p>
      ) : (
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5 py-1">
            <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">{subjectName}</span>
            <button
              type="button"
              onClick={onRemoveSubject}
              aria-label="Clear subject"
              className="rounded p-0.5 text-text-muted transition-colors hover:bg-card-hover hover:text-rose-500"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {visibleChapters.length === 0 ? (
            <p className="py-1 text-[11px] font-medium text-text-muted">
              All chapters · all topics included
            </p>
          ) : (
            <div className="grid gap-2 py-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleChapters.map((chapter) => {
                const chapterTopics = topicsFor(chapter.id, chapter.topics);
                return (
                  <div key={chapter.id} className="min-w-0 rounded-lg border border-border bg-white/[0.02] p-2">
                    <div className="group flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-text-primary">{chapter.name}</span>
                      <button
                        type="button"
                        onClick={() => onRemoveChapter(multiple ? chapter.id : null)}
                        aria-label={`Remove ${chapter.name}`}
                        className="rounded p-0.5 text-text-muted opacity-0 transition-all hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {chapterTopics.length === 0 ? (
                      <p className="mt-1 text-[10px] font-medium text-text-muted">
                        All topics included
                      </p>
                    ) : (
                      <div className="mt-1 space-y-0.5">
                        {chapterTopics.map((topic) => (
                          <div key={topic.id} className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-card-hover">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">{topic.name}</span>
                            <button
                              type="button"
                              onClick={() => onRemoveTopic(multiple ? topic.id : null)}
                              aria-label={`Remove ${topic.name}`}
                              className="rounded p-0.5 text-text-muted opacity-0 transition-all hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
  const subjectName = catalog?.subjects.find((subject) => subject.id === props.subjectId)?.name ?? null;
  const treeChapters = chapters.map((chapter) => ({
    id: chapter.id,
    name: chapter.name,
    topics: (catalog?.topics ?? [])
      .filter((topic) => topic.chapterId === chapter.id)
      .map((topic) => ({ id: topic.id, name: topic.name })),
  }));
  const clearTreeSubject = () => {
    props.onSubjectChange(null);
    props.onChapterChange?.(null);
    props.onTopicChange?.(null);
    props.onChapterIdsChange?.([]);
    props.onTopicIdsChange?.([]);
  };
  const removeTreeChapter = (id: number | null) => {
    if (!props.multiple || id === null) {
      props.onChapterChange?.(null);
      props.onTopicChange?.(null);
      return;
    }
    const next = (props.chapterIds ?? []).filter((chapterId) => chapterId !== id);
    props.onChapterIdsChange?.(next);
    const validTopicIds = (catalog?.topics ?? [])
      .filter((topic) => next.includes(topic.chapterId))
      .map((topic) => topic.id);
    props.onTopicIdsChange?.((props.topicIds ?? []).filter((topicId) => validTopicIds.includes(topicId)));
  };
  const removeTreeTopic = (id: number | null) => {
    if (!props.multiple || id === null) {
      props.onTopicChange?.(null);
      return;
    }
    props.onTopicIdsChange?.((props.topicIds ?? []).filter((topicId) => topicId !== id));
  };

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-3", props.columns ?? "sm:grid-cols-3")}>
        <SinglePicker
          label="Subject"
          placeholder="Select subject"
          options={catalog?.subjects ?? []}
          value={props.subjectId}
          disabled={props.disabled || !catalog}
          onChange={(next) => {
            props.onSubjectChange(next);
            props.onChapterChange?.(null);
            props.onTopicChange?.(null);
            props.onChapterIdsChange?.([]);
            props.onTopicIdsChange?.([]);
          }}
        />
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
        ) : <SinglePicker
          label="Chapter"
          sub="(optional)"
          placeholder="All chapters"
          options={chapters}
          value={props.chapterId ?? null}
          disabled={props.disabled || !props.subjectId}
          onChange={(next) => {
            props.onChapterChange?.(next);
            props.onTopicChange?.(null);
          }}
        />}
        {props.multiple ? (
          <MultiPicker
            label="Topic"
            emptyLabel={(props.chapterIds ?? []).length ? "All selected-chapter topics" : "Select chapters first"}
            options={topics}
            values={props.topicIds ?? []}
            onChange={(values) => props.onTopicIdsChange?.(values)}
            disabled={props.disabled || !(props.chapterIds ?? []).length}
          />
        ) : <SinglePicker
          label="Topic"
          sub="(optional)"
          placeholder="All topics"
          options={topics}
          value={props.topicId ?? null}
          disabled={props.disabled || !props.chapterId}
          onChange={(next) => props.onTopicChange?.(next)}
        />}
      </div>
      {props.showSelectionTree && (
        <SelectionCoverage
          subjectName={subjectName}
          chapters={treeChapters}
          chapterIds={props.chapterIds ?? []}
          topicIds={props.topicIds ?? []}
          singleChapterId={props.chapterId}
          singleTopicId={props.topicId}
          multiple={!!props.multiple}
          onRemoveSubject={clearTreeSubject}
          onRemoveChapter={removeTreeChapter}
          onRemoveTopic={removeTreeTopic}
        />
      )}

      {(props.onDifficultyChange || props.onKindChange) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {props.onDifficultyChange && (
            <SinglePicker
              label="Hardness"
              placeholder="Any hardness"
              options={[
                { id: "easy" as Difficulty, name: "Easy" },
                { id: "medium" as Difficulty, name: "Medium" },
                { id: "hard" as Difficulty, name: "Hard" },
              ]}
              value={props.difficulty ?? "any"}
              disabled={props.disabled}
              onChange={(next) => props.onDifficultyChange?.(next ?? "any")}
            />
          )}
          {props.onKindChange && (
            <SinglePicker
              label="Category"
              placeholder="Any category"
              options={[
                { id: "theory" as Kind, name: "Theory" },
                { id: "numerical" as Kind, name: "Numerical" },
              ]}
              value={props.kind && props.kind !== "any" ? props.kind : null}
              disabled={props.disabled}
              onChange={(next) => props.onKindChange?.(next ?? "any")}
            />
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
