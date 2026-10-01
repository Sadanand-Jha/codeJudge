"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/helpers";
import { getQuestionGeneratorCatalog } from "@/services/aiGenerate";
import type { QuestionGeneratorCatalog } from "@/services/aiGenerate";

interface PaperScopeProps {
  subjectId: number | null;
  chapterIds: number[];
  topicIds: number[];
  onSubjectChange: (value: number | null) => void;
  onChapterIdsChange: (values: number[]) => void;
  onTopicIdsChange: (values: number[]) => void;
  disabled?: boolean;
}

const fieldButton =
  "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left text-[13px] font-medium text-text-primary outline-none transition-all hover:border-border-hover focus:border-pink-500/50 disabled:cursor-not-allowed disabled:opacity-50";

/** Outside-click commits (multi) or cancels (single); Escape always cancels. */
function useDismiss(active: boolean, onOutside: () => void, onEscape: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const outsideRef = useRef(onOutside);
  const escapeRef = useRef(onEscape);
  outsideRef.current = onOutside;
  escapeRef.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) outsideRef.current();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") escapeRef.current();
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [active]);
  return ref;
}

function Panel({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={cn(
        "absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:left-auto sm:right-0",
        wide ? "sm:w-[420px]" : "sm:w-[360px]"
      )}
    >
      {children}
    </div>
  );
}

function SearchRow({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3">
      <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
      />
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
        checked ? "border-transparent bg-gradient-to-br from-pink-500 to-violet-600 text-white" : "border-border-hover"
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </span>
  );
}

/* ================= Subject (searchable single-select) ================= */

function SubjectSelect({
  catalog,
  loading,
  subjectId,
  onSubjectChange,
  disabled,
}: {
  catalog: QuestionGeneratorCatalog | null;
  loading: boolean;
  subjectId: number | null;
  onSubjectChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useDismiss(open, () => setOpen(false), () => setOpen(false));

  const subjects = catalog?.subjects ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, query]);
  const selected = subjects.find((s) => s.id === subjectId) ?? null;

  const openPanel = () => {
    if (disabled) return;
    setQuery("");
    setActive(0);
    setOpen(true);
  };
  const choose = (id: number) => {
    onSubjectChange(id);
    setOpen(false);
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-text-primary">Subject</span>
      <div ref={wrapRef} className="relative">
        <button type="button" onClick={() => (open ? setOpen(false) : openPanel())} disabled={disabled} className={fieldButton} aria-haspopup="listbox" aria-expanded={open}>
          <span className={cn("truncate", !selected && "text-text-muted")}>
            {loading ? "Loading subjects…" : selected ? selected.name : "Select subject"}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <Panel>
            <SearchRow value={query} onChange={(v) => { setQuery(v); setActive(0); }} placeholder="Search subjects..." />
            <div role="listbox" className="max-h-64 overflow-y-auto p-1.5" onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && filtered[active]) { e.preventDefault(); choose(filtered[active].id); }
            }} tabIndex={-1}>
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-text-muted">No subjects found</p>
              ) : (
                filtered.map((s, i) => {
                  const isSelected = s.id === subjectId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                        i === active ? "bg-card-hover" : "",
                        isSelected ? "font-bold text-text-primary" : "font-medium text-text-secondary"
                      )}
                    >
                      <span className="truncate">{s.name}</span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-pink-500" />}
                    </button>
                  );
                })
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ================= Chapter (searchable multi-select) ================= */

function ChapterMultiSelect({
  catalog,
  subjectId,
  chapterIds,
  onApply,
  disabled,
}: {
  catalog: QuestionGeneratorCatalog | null;
  subjectId: number | null;
  chapterIds: number[];
  onApply: (chapters: number[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [staged, setStaged] = useState<number[]>([]);

  const chapters = useMemo(
    () => catalog?.chapters.filter((c) => c.subjectId === subjectId) ?? [],
    [catalog, subjectId]
  );
  const allIds = useMemo(() => chapters.map((c) => c.id), [chapters]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter((c) => c.name.toLowerCase().includes(q));
  }, [chapters, query]);

  const openPanel = () => {
    if (disabled || !subjectId) return;
    setStaged(chapterIds);
    setQuery("");
    setOpen(true);
  };
  const commit = (values: number[]) => {
    // Selecting everything (or nothing) means "no filter".
    onApply(values.length === 0 || (allIds.length > 0 && values.length === allIds.length) ? [] : values);
    setOpen(false);
  };
  const wrapRef = useDismiss(open, () => commit(staged), () => setOpen(false));

  const toggle = (id: number) =>
    setStaged((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleFiltered = () =>
    setStaged((prev) => {
      const ids = filtered.map((c) => c.id);
      const allIn = ids.length > 0 && ids.every((id) => prev.includes(id));
      return allIn ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])];
    });

  const label = !subjectId
    ? "Select subject first"
    : chapterIds.length === 0 || (allIds.length > 0 && chapterIds.length === allIds.length)
      ? "All chapters"
      : chapterIds.length === 1
        ? (chapters.find((c) => c.id === chapterIds[0])?.name ?? "1 chapter selected")
        : `${chapterIds.length} chapters selected`;

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-text-primary">Chapters</span>
      <div ref={wrapRef} className="relative">
        <button type="button" onClick={() => (open ? commit(staged) : openPanel())} disabled={disabled || !subjectId} className={fieldButton}>
          <span className="truncate text-text-primary">{label}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <Panel wide>
            <div className="border-b border-border px-3 pt-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-primary">Chapters</p>
              <div className="flex items-center gap-2 py-1">
                <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search chapters..."
                  className="h-9 w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={toggleFiltered}
              className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-card-hover"
            >
              <span className="flex items-center gap-2.5 text-[13px] font-semibold text-text-primary">
                <CheckBox checked={filtered.length > 0 && filtered.every((c) => staged.includes(c.id))} />
                Select all
              </span>
              <span className="text-[11px] text-text-muted tabular-nums">{filtered.length} chapters</span>
            </button>
            <div className="max-h-60 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-text-muted">No chapters found</p>
              ) : (
                filtered.map((c) => {
                  const on = staged.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-card-hover",
                        on ? "bg-pink-500/[0.06] font-semibold text-text-primary" : "font-medium text-text-secondary"
                      )}
                    >
                      <CheckBox checked={on} />
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
              <button type="button" onClick={() => setStaged([])} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-text-muted transition-colors hover:text-text-primary">
                Clear
              </button>
              <button
                type="button"
                onClick={() => commit(staged)}
                className="rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
              >
                Apply ({staged.length})
              </button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ================= Topic (grouped multi-select) ================= */

function TopicMultiSelect({
  catalog,
  subjectId,
  chapterIds,
  topicIds,
  onApply,
  disabled,
}: {
  catalog: QuestionGeneratorCatalog | null;
  subjectId: number | null;
  chapterIds: number[];
  topicIds: number[];
  onApply: (topics: number[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [staged, setStaged] = useState<number[]>([]);

  const subjectChapters = useMemo(
    () => catalog?.chapters.filter((c) => c.subjectId === subjectId) ?? [],
    [catalog, subjectId]
  );
  // Scope = selected chapters, or all subject chapters when none selected.
  const scopeChapters = useMemo(
    () => (chapterIds.length > 0 ? subjectChapters.filter((c) => chapterIds.includes(c.id)) : subjectChapters),
    [subjectChapters, chapterIds]
  );
  const scopeTopics = useMemo(
    () => catalog?.topics.filter((t) => scopeChapters.some((c) => c.id === t.chapterId)) ?? [],
    [catalog, scopeChapters]
  );
  const scopeIds = useMemo(() => scopeTopics.map((t) => t.id), [scopeTopics]);
  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      scopeChapters
        .map((c) => ({
          chapter: c,
          topics: scopeTopics.filter((t) => t.chapterId === c.id && (!q || t.name.toLowerCase().includes(q))),
        }))
        .filter((g) => g.topics.length > 0),
    [scopeChapters, scopeTopics, q]
  );
  const visibleIds = useMemo(() => visibleGroups.flatMap((g) => g.topics.map((t) => t.id)), [visibleGroups]);

  const openPanel = () => {
    if (disabled || !subjectId) return;
    setStaged(topicIds);
    setQuery("");
    setOpen(true);
  };
  const commit = (values: number[]) => {
    onApply(values.length === 0 || (scopeIds.length > 0 && values.length === scopeIds.length) ? [] : values);
    setOpen(false);
  };
  const wrapRef = useDismiss(open, () => commit(staged), () => setOpen(false));

  const toggle = (id: number) =>
    setStaged((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleVisible = () =>
    setStaged((prev) => {
      const allIn = visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
      return allIn ? prev.filter((id) => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])];
    });

  const allActive = scopeIds.length > 0 && topicIds.length !== 0 && scopeIds.every((id) => topicIds.includes(id));
  const label = !subjectId
    ? "Select subject first"
    : topicIds.length === 0 || allActive
      ? "All topics"
      : topicIds.length === 1
        ? (scopeTopics.find((t) => t.id === topicIds[0])?.name ?? "1 topic selected")
        : `${topicIds.length} topics selected`;

  return (
    <div>
      <span className="mb-1.5 block text-xs font-bold text-text-primary">Topics</span>
      <div ref={wrapRef} className="relative">
        <button type="button" onClick={() => (open ? commit(staged) : openPanel())} disabled={disabled || !subjectId} className={fieldButton}>
          <span className="truncate text-text-primary">{label}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <Panel wide>
            <div className="border-b border-border px-3 pt-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-primary">Topics</p>
              <div className="flex items-center gap-2 py-1">
                <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search topics..."
                  className="h-9 w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={toggleVisible}
              className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-card-hover"
            >
              <span className="flex items-center gap-2.5 text-[13px] font-semibold text-text-primary">
                <CheckBox checked={visibleIds.length > 0 && visibleIds.every((id) => staged.includes(id))} />
                Select all topics
              </span>
              <span className="text-[11px] text-text-muted tabular-nums">{scopeIds.length} topics</span>
            </button>
            <div className="max-h-60 overflow-y-auto p-1.5">
              {visibleGroups.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-text-muted">No topics found</p>
              ) : (
                visibleGroups.map((g) => (
                  <div key={g.chapter.id}>
                    <p className="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-wider text-text-muted">
                      {g.chapter.name}
                    </p>
                    {g.topics.map((t) => {
                      const on = staged.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggle(t.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg py-2 pl-6 pr-3 text-left text-[13px] transition-colors hover:bg-card-hover",
                            on ? "bg-pink-500/[0.06] font-semibold text-text-primary" : "font-medium text-text-secondary"
                          )}
                        >
                          <CheckBox checked={on} />
                          <span className="truncate">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
              <button type="button" onClick={() => setStaged([])} className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-text-muted transition-colors hover:text-text-primary">
                Clear
              </button>
              <button
                type="button"
                onClick={() => commit(staged)}
                className="rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
              >
                Apply ({staged.length})
              </button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ================= Section (fetch + grid + summary) ================= */

export function PaperScopeFilters(props: PaperScopeProps) {
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

  const subjectChapters = useMemo(
    () => catalog?.chapters.filter((c) => c.subjectId === props.subjectId) ?? [],
    [catalog, props.subjectId]
  );
  const scopeTopics = useMemo(() => {
    const chapters = props.chapterIds.length > 0
      ? subjectChapters.filter((c) => props.chapterIds.includes(c.id))
      : subjectChapters;
    return catalog?.topics.filter((t) => chapters.some((c) => c.id === t.chapterId)) ?? [];
  }, [catalog, subjectChapters, props.chapterIds]);

  const handleSubjectChange = (value: number | null) => {
    props.onSubjectChange(value);
    props.onChapterIdsChange([]);
    props.onTopicIdsChange([]);
  };

  const handleChapterApply = (chapters: number[]) => {
    props.onChapterIdsChange(chapters);
    const scope = chapters.length > 0
      ? subjectChapters.filter((c) => chapters.includes(c.id))
      : subjectChapters;
    const valid = new Set(
      (catalog?.topics ?? []).filter((t) => scope.some((c) => c.id === t.chapterId)).map((t) => t.id)
    );
    props.onTopicIdsChange(props.topicIds.filter((id) => valid.has(id)));
  };

  const chapterPart =
    props.chapterIds.length === 0 || (subjectChapters.length > 0 && props.chapterIds.length >= subjectChapters.length)
      ? "All chapters"
      : `${props.chapterIds.length} chapter${props.chapterIds.length === 1 ? "" : "s"}`;
  const allTopicsActive =
    scopeTopics.length > 0 && props.topicIds.length !== 0 && scopeTopics.every((t) => props.topicIds.includes(t.id));
  const topicPart =
    props.topicIds.length === 0 || allTopicsActive
      ? "All topics"
      : `${props.topicIds.length} topic${props.topicIds.length === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[25fr_35fr_40fr]">
        <SubjectSelect
          catalog={catalog}
          loading={!catalog && !error}
          subjectId={props.subjectId}
          onSubjectChange={handleSubjectChange}
          disabled={props.disabled}
        />
        <ChapterMultiSelect
          catalog={catalog}
          subjectId={props.subjectId}
          chapterIds={props.chapterIds}
          onApply={handleChapterApply}
          disabled={props.disabled}
        />
        <TopicMultiSelect
          catalog={catalog}
          subjectId={props.subjectId}
          chapterIds={props.chapterIds}
          topicIds={props.topicIds}
          onApply={props.onTopicIdsChange}
          disabled={props.disabled}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-semibold text-rose-500">{error}</p>
      ) : (
        props.subjectId !== null && (
          <p className="mt-1.5 text-[11px] text-text-muted">
            {chapterPart} · {topicPart} selected
          </p>
        )
      )}
    </div>
  );
}
