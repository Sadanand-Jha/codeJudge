"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Layers3, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { BankQuestion, BankQuestionsData } from "@/services/platform";
import { EmptyState, ErrorState, SectionCard, SectionSkeleton, fmtInt } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "@/lib/toast";

/* /platform/questions — reads the curated subjective question bank
   subject-wise / chapter-wise / topic-wise and deletes a single question. */

type GroupBy = "subject" | "chapter" | "topic";

const GROUP_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: "subject", label: "Subject-wise" },
  { key: "chapter", label: "Chapter-wise" },
  { key: "topic", label: "Topic-wise" },
];

const PAGE_SIZE = 50;

export default function QuestionBankPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("topic");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [difficultyId, setDifficultyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<BankQuestion | null>(null);
  const [editText, setEditText] = useState("");
  const [editDifficultyId, setEditDifficultyId] = useState<number | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const queryKey = [subjectId, chapterId, topicId, difficultyId, debounced, page].join(":");
  const q = useAsync<BankQuestionsData>(
    () => platformApi.questions({ subjectId, chapterId, topicId, difficultyId, search: debounced, page, limit: PAGE_SIZE }),
    queryKey
  );

  const data = q.data;
  const facets = data?.facets;

  const chapters = useMemo(
    () => (facets?.chapters ?? []).filter((chapter) => (subjectId ? chapter.subjectId === subjectId : true)),
    [facets, subjectId]
  );

  const topics = useMemo(() => {
    const all = facets?.topics ?? [];
    if (chapterId) return all.filter((topic) => topic.chapterId === chapterId);
    if (subjectId) {
      const subjectChapters = new Set(chapters.map((chapter) => chapter.id));
      return all.filter((topic) => subjectChapters.has(topic.chapterId));
    }
    return all;
  }, [facets, chapterId, subjectId, chapters]);

  const groups = useMemo(() => {
    const questions = data?.questions ?? [];
    const map = new Map<string, { key: string; title: string; context: string; items: BankQuestion[] }>();
    for (const question of questions) {
      let key = "";
      let title = "";
      let context = "";
      if (groupBy === "subject") {
        key = `subject:${question.subjectId}`;
        title = question.subjectName;
        context = "Subject";
      } else if (groupBy === "chapter") {
        key = `chapter:${question.chapterId ?? "none"}`;
        title = question.chapterName ?? "Unassigned chapter";
        context = question.subjectName;
      } else {
        key = `topic:${question.topicId ?? "none"}`;
        title = question.topicName ?? "Unassigned topic";
        context = [question.subjectName, question.chapterName].filter(Boolean).join(" · ");
      }
      const group = map.get(key) ?? { key, title, context, items: [] as BankQuestion[] };
      group.items.push(question);
      map.set(key, group);
    }
    return [...map.values()];
  }, [data, groupBy]);

  const hasFilters =
    subjectId !== null || chapterId !== null || topicId !== null || difficultyId !== null || debounced !== "";

  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const resetFilters = () => {
    setSubjectId(null);
    setChapterId(null);
    setTopicId(null);
    setDifficultyId(null);
    setSearch("");
    setPage(1);
  };

  const removeQuestion = async (question: BankQuestion) => {
    // No confirmation — delete immediately on click.
    setDeletingId(question.id);
    try {
      await platformApi.deleteQuestion(question.id);
      toast.success({ title: "Question deleted", description: `#${question.id} removed from the bank.` });
      q.retry();
    } catch (error) {
      toast.error({ title: "Delete failed", description: getApiErrorMessage(error, "Unable to delete this question.") });
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (question: BankQuestion) => {
    setEditing(question);
    setEditText(question.questionText);
    setEditDifficultyId(question.difficultyId);
    setEditCategoryId(question.categoryId);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const text = editText.trim();
    if (!text) {
      toast.error({ title: "Question is empty", description: "Write the question text before saving." });
      return;
    }
    setSavingEdit(true);
    try {
      await platformApi.updateQuestion(editing.id, {
        questionText: text,
        difficultyId: editDifficultyId,
        categoryId: editCategoryId,
      });
      toast.success({ title: "Question updated", description: `#${editing.id} saved.` });
      setEditing(null);
      q.retry();
    } catch (error) {
      toast.error({ title: "Update failed", description: getApiErrorMessage(error, "Unable to update this question.") });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Question bank"
        detail="Read the curated question bank subject-wise, chapter-wise or topic-wise — and delete any question that should not ship."
      />

      <SectionCard
        title="Find questions"
        subtitle="Narrow the bank, then read it grouped the way you think."
        right={
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="pf-focus inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={12} /> Reset
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BankSelect
            label="Subject"
            value={subjectId}
            placeholder="All subjects"
            onChange={(value) => { setSubjectId(value); setChapterId(null); setTopicId(null); setPage(1); }}
            options={(facets?.subjects ?? []).map((s) => ({ id: s.id, name: s.name, count: s.count }))}
          />
          <BankSelect
            label="Chapter"
            value={chapterId}
            placeholder="All chapters"
            onChange={(value) => { setChapterId(value); setTopicId(null); setPage(1); }}
            options={chapters.map((c) => ({ id: c.id, name: c.name, count: c.count }))}
            disabled={chapters.length === 0}
          />
          <BankSelect
            label="Topic"
            value={topicId}
            placeholder="All topics"
            onChange={(value) => { setTopicId(value); setPage(1); }}
            options={topics.map((t) => ({ id: t.id, name: t.name, count: t.count }))}
            disabled={topics.length === 0}
          />
          <BankSelect
            label="Difficulty"
            value={difficultyId}
            placeholder="Any difficulty"
            onChange={(value) => { setDifficultyId(value); setPage(1); }}
            options={(facets?.difficulties ?? []).map((d) => ({ id: d.id, name: d.name }))}
          />
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] px-3 py-2">
          <Search size={13} className="shrink-0 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search question text…"
            className="w-full bg-transparent text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </label>
      </SectionCard>

      <SectionCard
        title="Questions"
        subtitle={data ? `${fmtInt(data.total)} question${data.total === 1 ? "" : "s"} · grouped ${groupBy}-wise` : "Reading the bank…"}
        right={
          <div className="flex flex-wrap gap-1">
            {GROUP_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setGroupBy(option.key)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${groupBy === option.key ? "bg-[var(--card-hover)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        {q.loading ? (
          <SectionSkeleton rows={6} />
        ) : q.error ? (
          <ErrorState message={q.error.message} onRetry={q.retry} />
        ) : !data || data.questions.length === 0 ? (
          <EmptyState message="No questions match these filters" detail="Clear a filter or import questions from the ingestion page." />
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key);
              return (
                <div key={group.key} className="overflow-hidden rounded-[12px] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center gap-2 bg-[var(--platform-soft)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--card-hover)]"
                  >
                    <ChevronDown size={14} className={`shrink-0 text-[var(--text-muted)] transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    <Layers3 size={13} className="shrink-0 text-[#EC4899]" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--text-primary)]">{group.title}</span>
                    <span className="hidden truncate text-[10px] uppercase tracking-wide text-[var(--text-muted)] sm:block">{group.context}</span>
                    <span className="shrink-0 rounded-full bg-[var(--platform-soft-strong)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">{group.items.length}</span>
                  </button>
                  {!isCollapsed && (
                    <ul className="divide-y divide-[var(--border)]">
                      {group.items.map((question) => (
                        <li key={question.id} className="flex items-start gap-3 px-3 py-3">
                          <div className="min-w-0 flex-1">
                            {question.questionHtml ? (
                              <div
                                className="text-[13px] leading-relaxed text-[var(--text-primary)] [&_ol]:list-decimal [&_p]:mb-1 [&_p:last-child]:mb-0 [&_table]:w-full [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5"
                                dangerouslySetInnerHTML={{ __html: question.questionHtml }}
                              />
                            ) : (
                              <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{question.questionText}</p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <Pill tone={difficultyTone(question.difficulty)}>{question.difficulty}</Pill>
                              <Pill tone="neutral">{question.category}</Pill>
                              <span className="text-[var(--text-muted)]">
                                {question.subjectName}
                                {question.chapterName ? ` · ${question.chapterName}` : ""}
                                {question.topicName ? ` · ${question.topicName}` : ""}
                              </span>
                              <span className="pf-mono text-[var(--text-muted)]">#{question.id}</span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEdit(question)}
                              aria-label={`Edit question ${question.id}`}
                              title="Edit question"
                              className="pf-focus rounded-[8px] border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text-primary)]"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(question)}
                              disabled={deletingId === question.id}
                              aria-label={`Delete question ${question.id}`}
                              title="Delete immediately"
                              className="pf-focus shrink-0 rounded-[8px] border border-[var(--danger)]/25 p-1.5 text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10 disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {data.totalPages > 1 && (
              <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                <span>Page {data.page} of {data.totalPages}</span>
                <div className="flex gap-1.5">
                  <button type="button" disabled={data.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 disabled:opacity-40">Prev</button>
                  <button type="button" disabled={data.page >= data.totalPages} onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {editing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !savingEdit && setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit question ${editing.id}`}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--card)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Edit question #{editing.id}</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {[editing.subjectName, editing.chapterName, editing.topicName].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className="rounded-[8px] border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <label className="block">
                <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">Question text</span>
                <textarea
                  value={editText}
                  onChange={(event) => setEditText(event.target.value)}
                  rows={5}
                  disabled={savingEdit}
                  className="pf-focus min-h-[120px] w-full resize-y rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] p-3 text-[13px] leading-relaxed text-[var(--text-primary)] outline-none disabled:opacity-50"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">Difficulty</span>
                  <select
                    value={editDifficultyId ?? ""}
                    onChange={(event) => setEditDifficultyId(event.target.value ? Number(event.target.value) : null)}
                    disabled={savingEdit}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] px-3 text-[12px] font-medium text-[var(--text-primary)] outline-none disabled:opacity-50"
                  >
                    {(facets?.difficulties ?? []).map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">Category</span>
                  <select
                    value={editCategoryId ?? ""}
                    onChange={(event) => setEditCategoryId(event.target.value ? Number(event.target.value) : null)}
                    disabled={savingEdit}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] px-3 text-[12px] font-medium text-[var(--text-primary)] outline-none disabled:opacity-50"
                  >
                    {(facets?.categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className="rounded-[10px] border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-[10px] bg-[var(--accent)] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankSelect({ label, value, onChange, options, placeholder, disabled = false }: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  options: { id: number; name: string; count?: number }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">{label}</span>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
          disabled={disabled}
          className="pf-focus h-10 w-full appearance-none rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] px-3 pr-9 text-[12px] font-medium text-[var(--text-primary)] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}{option.count !== undefined ? ` (${option.count})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
      </div>
    </label>
  );
}

function Pill({ tone, children }: { tone: "green" | "amber" | "red" | "neutral"; children: ReactNode }) {
  const colors = {
    green: "border-emerald-500/20 bg-emerald-500/[.08] text-emerald-500",
    amber: "border-amber-500/20 bg-amber-500/[.08] text-amber-500",
    red: "border-red-500/20 bg-red-500/[.08] text-red-500",
    neutral: "border-[var(--border)] bg-[var(--platform-soft)] text-[var(--text-secondary)]",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.08em] ${colors[tone]}`}>{children}</span>;
}

function difficultyTone(value: string): "green" | "amber" | "red" {
  const difficulty = value.toLowerCase();
  if (difficulty === "easy") return "green";
  if (difficulty === "hard") return "red";
  return "amber";
}