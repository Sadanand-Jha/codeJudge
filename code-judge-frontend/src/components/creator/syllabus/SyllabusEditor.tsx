"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  GripVertical,
  Loader2,
  Merge,
  Plus,
  Save,
  Scissors,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { QsSelect } from "@/components/creator/problems/QsSelect";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  createSyllabus,
  updateSyllabus,
  type GeneratedSyllabusVariant,
  type SyllabusChapterNode,
  type SyllabusSavePayload,
  type SyllabusStatus,
  type SyllabusTree,
  type SyllabusVariantKey,
} from "@/services/syllabus";

interface EditTopic {
  title: string;
}

interface EditChapter {
  title: string;
  description: string;
  open: boolean;
  topics: EditTopic[];
}

interface EditState {
  name: string;
  subject: string;
  board: string;
  classLevel: string;
  level: string;
  status: SyllabusStatus;
  chapters: EditChapter[];
}

interface SyllabusEditorProps {
  mode: "create" | "edit" | "import";
  initial?: SyllabusTree | null;
  variants?: Record<SyllabusVariantKey, GeneratedSyllabusVariant[]> | null;
  importJobId?: string | null;
  importFilename?: string | null;
  targetId?: number | null;
  onClose: () => void;
  onSaved: (tree: SyllabusTree) => void;
}

const STATUS_OPTIONS: Array<{ value: SyllabusStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
];

const EMPTY: EditState = {
  name: "",
  subject: "",
  board: "",
  classLevel: "",
  level: "",
  status: "active",
  chapters: [{ title: "Chapter 1", description: "", open: true, topics: [] }],
};

const fromTree = (tree: SyllabusTree): EditState => ({
  name: tree.name,
  subject: tree.subject,
  board: tree.board ?? "",
  classLevel: tree.classLevel ?? "",
  level: tree.level ?? "",
  status: tree.status,
  chapters: tree.chapters.map((chapter: SyllabusChapterNode) => ({
    title: chapter.title,
    description: chapter.description ?? "",
    open: true,
    topics: chapter.topics.map((topic) => ({ title: topic.title })),
  })),
});

const fromVariant = (variant: GeneratedSyllabusVariant): EditState => ({
  name: variant.name,
  subject: variant.subject,
  board: variant.board ?? "",
  classLevel: variant.classLevel ?? "",
  level: variant.level ?? "",
  status: "active",
  chapters: variant.chapters.length
    ? variant.chapters.map((chapter) => ({
        title: chapter.title,
        description: chapter.description ?? "",
        open: true,
        topics: chapter.topics.map((topic) => ({ title: topic.title })),
      }))
    : [{ title: "Chapter 1", description: "", open: true, topics: [] }],
});

const inputCls =
  "h-11 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-[13px] font-semibold text-[var(--qs-ink)] outline-none transition-colors placeholder:font-medium placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

const chapterInputCls =
  "h-10 w-full min-w-0 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-[13px] font-extrabold text-[var(--qs-ink)] outline-none transition-colors placeholder:font-semibold placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

const smallInputCls =
  "h-10 w-full min-w-0 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[12px] font-semibold text-[var(--qs-ink)] outline-none transition-colors placeholder:font-medium placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]";

const gripCls =
  "grid w-4 shrink-0 cursor-grab place-items-center text-[var(--qs-muted)] active:cursor-grabbing";

export function SyllabusEditor({
  mode,
  initial,
  variants,
  importJobId,
  importFilename,
  targetId,
  onClose,
  onSaved,
}: SyllabusEditorProps) {
  const initialVariant = variants?.balanced?.[0] ? fromVariant(variants.balanced[0]) : null;
  const [state, setState] = useState<EditState>(
    initial ? fromTree(initial) : initialVariant ?? EMPTY
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragChapter, setDragChapter] = useState<number | null>(null);
  const [dragTopic, setDragTopic] = useState<{ chapter: number; topic: number } | null>(null);

  const valid = Boolean(state.name.trim() && state.subject.trim());
  const chapterCount = state.chapters.length;
  const topicCount = state.chapters.reduce((total, chapter) => total + chapter.topics.length, 0);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const patch = (next: Partial<EditState>) => {
    setState((current) => ({ ...current, ...next }));
    setDirty(true);
  };

  const patchChapter = (index: number, next: Partial<EditChapter>) => {
    setState((current) => {
      const chapters = current.chapters.map((chapter, chapterIndex) =>
        chapterIndex === index ? { ...chapter, ...next } : chapter
      );
      return { ...current, chapters };
    });
    setDirty(true);
  };

  const toggleChapter = (index: number) => {
    setState((current) => ({
      ...current,
      chapters: current.chapters.map((chapter, chapterIndex) =>
        chapterIndex === index ? { ...chapter, open: !chapter.open } : chapter
      ),
    }));
  };

  const addChapter = () => {
    setState((current) => ({
      ...current,
      chapters: [
        ...current.chapters,
        {
          title: `Chapter ${current.chapters.length + 1}`,
          description: "",
          open: true,
          topics: [],
        },
      ],
    }));
    setDirty(true);
  };

  const removeChapter = (index: number) => {
    setState((current) => ({
      ...current,
      chapters: current.chapters.filter((_, chapterIndex) => chapterIndex !== index),
    }));
    setDirty(true);
  };

  const addTopic = (index: number) => {
    setState((current) => {
      const chapters = current.chapters.map((chapter, chapterIndex) =>
        chapterIndex === index
          ? {
              ...chapter,
              open: true,
              topics: [
                ...chapter.topics,
                { title: `Topic ${chapter.topics.length + 1}` },
              ],
            }
          : chapter
      );
      return { ...current, chapters };
    });
    setDirty(true);
  };

  const patchTopic = (chapterIndex: number, topicIndex: number, title: string) => {
    setState((current) => {
      const chapters = current.chapters.map((chapter, index) =>
        index === chapterIndex
          ? {
              ...chapter,
              topics: chapter.topics.map((topic, currentTopicIndex) =>
                currentTopicIndex === topicIndex ? { title } : topic
              ),
            }
          : chapter
      );
      return { ...current, chapters };
    });
    setDirty(true);
  };

  const removeTopic = (chapterIndex: number, topicIndex: number) => {
    setState((current) => {
      const chapters = current.chapters.map((chapter, index) =>
        index === chapterIndex
          ? {
              ...chapter,
              topics: chapter.topics.filter((_, currentTopicIndex) => currentTopicIndex !== topicIndex),
            }
          : chapter
      );
      return { ...current, chapters };
    });
    setDirty(true);
  };

  const moveTopic = (fromChapter: number, topicIndex: number, toChapter: number) => {
    if (fromChapter === toChapter) return;
    setState((current) => {
      const topic = current.chapters[fromChapter]?.topics[topicIndex];
      if (!topic) return current;
      const chapters = current.chapters.map((chapter, index) => {
        if (index === fromChapter) {
          return {
            ...chapter,
            topics: chapter.topics.filter((_, currentTopicIndex) => currentTopicIndex !== topicIndex),
          };
        }
        if (index === toChapter) {
          return { ...chapter, open: true, topics: [...chapter.topics, topic] };
        }
        return chapter;
      });
      return { ...current, chapters };
    });
    setDirty(true);
  };

  const mergeChapter = (index: number) => {
    setState((current) => {
      if (current.chapters.length < 2) return current;
      const target = index < current.chapters.length - 1 ? index + 1 : index - 1;
      const source = current.chapters[index];
      const destination = current.chapters[target];
      if (!source || !destination) return current;
      const merged: EditChapter = {
        ...source,
        description: source.description || destination.description,
        open: true,
        topics: [...source.topics, ...destination.topics],
      };
      const chapters = current.chapters
        .map((chapter, chapterIndex) => (chapterIndex === index ? merged : chapter))
        .filter((_, chapterIndex) => chapterIndex !== target);
      return { ...current, chapters };
    });
    setDirty(true);
  };

  const splitChapter = (index: number) => {
    setState((current) => {
      const chapter = current.chapters[index];
      if (!chapter) return current;
      const splitAt = Math.max(1, Math.ceil(chapter.topics.length / 2));
      const first: EditChapter = { ...chapter, topics: chapter.topics.slice(0, splitAt) };
      const second: EditChapter = {
        title: `${chapter.title} (part 2)`,
        description: "",
        open: true,
        topics: chapter.topics.slice(splitAt),
      };
      const chapters = [...current.chapters];
      chapters.splice(index, 1, first, second);
      return { ...current, chapters };
    });
    setDirty(true);
  };

  const dropChapter = (target: number) => {
    if (dragChapter == null || dragChapter === target) return;
    setState((current) => {
      const chapters = [...current.chapters];
      const [moved] = chapters.splice(dragChapter, 1);
      if (!moved) return current;
      chapters.splice(target, 0, moved);
      return { ...current, chapters };
    });
    setDragChapter(null);
    setDirty(true);
  };

  const dropTopic = (
    targetChapter: number,
    targetTopic: number | null,
    event: React.DragEvent
  ) => {
    event.stopPropagation();
    if (!dragTopic) return;
    const { chapter: fromChapter, topic: fromTopic } = dragTopic;
    setState((current) => {
      const chapters = current.chapters.map((chapter) => ({
        ...chapter,
        topics: [...chapter.topics],
      }));
      const source = chapters[fromChapter];
      const target = chapters[targetChapter];
      if (!source || !target) return current;
      const [moved] = source.topics.splice(fromTopic, 1);
      if (!moved) return current;
      const insertAt = targetTopic == null ? target.topics.length : targetTopic;
      target.topics.splice(Math.max(0, Math.min(insertAt, target.topics.length)), 0, moved);
      return { ...current, chapters };
    });
    setDragTopic(null);
    setDirty(true);
  };

  const requestClose = () => {
    if (dirty && !window.confirm("You have unsaved changes. Close without saving?")) return;
    onClose();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector('[role="listbox"]')) return;
      requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const save = async () => {
    const name = state.name.trim();
    const subject = state.subject.trim();
    if (!name || !subject) {
      toast.error("Add a syllabus name and subject.");
      return;
    }
    const chapters = state.chapters
      .map((chapter) => ({
        title: chapter.title.trim(),
        description: chapter.description.trim() || null,
        topics: chapter.topics
          .map((topic) => ({ title: topic.title.trim() }))
          .filter((topic) => topic.title.length > 0),
      }))
      .filter((chapter) => chapter.title.length > 0);
    if (chapters.length === 0) {
      toast.error("Add at least one chapter with a title.");
      return;
    }

    const payload: SyllabusSavePayload = {
      name,
      subject,
      board: state.board.trim() || null,
      classLevel: state.classLevel.trim() || null,
      level: state.level.trim() || null,
      status: state.status,
      importJobId: mode === "import" ? importJobId ?? null : null,
      chapters,
    };

    setSaving(true);
    try {
      const saved = targetId
        ? await updateSyllabus(targetId, payload)
        : await createSyllabus(payload);
      setDirty(false);
      toast.success(targetId ? "Syllabus updated." : "Syllabus saved.");
      onSaved(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save this syllabus."));
    } finally {
      setSaving(false);
    }
  };

  const statusText = !valid
    ? "Add a syllabus name and subject to save"
    : `${dirty ? "Unsaved changes" : "Ready to save"} · ${chapterCount} ${
        chapterCount === 1 ? "chapter" : "chapters"
      }, ${topicCount} ${topicCount === 1 ? "topic" : "topics"}`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[rgba(20,16,46,0.62)] p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="syllabus-editor-title"
        className="my-4 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[880px] flex-col overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[8px_8px_0_var(--qs-sun)]"
      >
        <header className="relative shrink-0 overflow-hidden bg-[var(--qs-brand)] px-5 py-5 text-[var(--qs-on-brand)] sm:px-7">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full bg-white/10"
          />
          <span className="relative inline-flex items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
            {mode === "import"
              ? "Review imported syllabus"
              : mode === "edit"
                ? "Edit syllabus"
                : "New syllabus"}
          </span>
          <h2
            id="syllabus-editor-title"
            className="relative mt-2.5 break-words text-[26px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[32px]"
          >
            {state.name.trim() || "Untitled syllabus"}
          </h2>
          <p className="relative mt-1 truncate text-[12.5px] font-semibold text-white/80">
            {mode === "import" && importFilename
              ? `From ${importFilename}`
              : mode === "edit"
                ? "Update details, chapters and topics"
                : "Build chapters and topics manually"}
          </p>
          <button
            type="button"
            onClick={requestClose}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-transform hover:-translate-y-0.5 sm:right-6 sm:top-5"
            aria-label="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-5">
            <section className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-5">
              <h3 className="text-[16px] font-extrabold tracking-[-0.015em] text-[var(--qs-ink)]">
                Details
              </h3>
              <div className="mt-3.5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-[var(--qs-ink)]">
                    Syllabus name <i className="not-italic text-[var(--qs-bad)]">*</i>
                  </span>
                  <input
                    value={state.name}
                    onChange={(event) => patch({ name: event.target.value.slice(0, 255) })}
                    placeholder="e.g. Class 11 Physics"
                    aria-invalid={!state.name.trim()}
                    className={cn(inputCls, !state.name.trim() && "border-[var(--qs-bad)]/60")}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-[var(--qs-ink)]">
                    Subject <i className="not-italic text-[var(--qs-bad)]">*</i>
                  </span>
                  <input
                    value={state.subject}
                    onChange={(event) => patch({ subject: event.target.value.slice(0, 255) })}
                    placeholder="e.g. Physics"
                    aria-invalid={!state.subject.trim()}
                    className={cn(inputCls, !state.subject.trim() && "border-[var(--qs-bad)]/60")}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-[var(--qs-ink)]">
                    Board
                  </span>
                  <input
                    value={state.board}
                    onChange={(event) => patch({ board: event.target.value.slice(0, 120) })}
                    placeholder="e.g. CBSE"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-[var(--qs-ink)]">
                    Class / year
                  </span>
                  <input
                    value={state.classLevel}
                    onChange={(event) => patch({ classLevel: event.target.value.slice(0, 120) })}
                    placeholder="e.g. Class 11"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-[var(--qs-ink)]">
                    Level
                  </span>
                  <input
                    value={state.level}
                    onChange={(event) => patch({ level: event.target.value.slice(0, 120) })}
                    placeholder="e.g. Senior secondary"
                    className={inputCls}
                  />
                </label>
                <div className="block">
                  <span className="mb-1.5 block text-[12.5px] font-bold text-[var(--qs-ink)]">
                    Status
                  </span>
                  <QsSelect<SyllabusStatus>
                    value={state.status}
                    options={STATUS_OPTIONS}
                    onChange={(value) => patch({ status: value })}
                    ariaLabel="Status"
                    triggerClassName={cn(inputCls, "flex items-center justify-between gap-2")}
                    menuClassName="w-full min-w-[180px]"
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-extrabold tracking-[-0.015em] text-[var(--qs-ink)]">
                    Chapters and topics
                  </h3>
                  <p className="mt-0.5 text-[12px] font-medium text-[var(--qs-muted)]">
                    Drag to reorder. Move topics between chapters, merge or split chapters, then save.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addChapter}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3.5 text-[12px] font-extrabold text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add chapter
                </button>
              </div>

              <div className="mt-3.5 grid gap-3.5">
                {state.chapters.map((chapter, chapterIndex) => (
                  <article
                    key={`chapter-${chapterIndex}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      if (dragTopic) {
                        dropTopic(chapterIndex, null, event);
                        return;
                      }
                      event.preventDefault();
                      dropChapter(chapterIndex);
                    }}
                    className={cn(
                      "rounded-[20px] border-2 bg-[var(--qs-surface)] p-3.5 transition-all",
                      dragChapter === chapterIndex
                        ? "border-[var(--qs-brand)]"
                        : "border-[var(--qs-line)]"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", "");
                          setDragChapter(chapterIndex);
                        }}
                        onDragEnd={() => setDragChapter(null)}
                        className={gripCls}
                        aria-hidden="true"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <input
                        value={chapter.title}
                        onChange={(event) =>
                          patchChapter(chapterIndex, { title: event.target.value.slice(0, 255) })
                        }
                        placeholder="Chapter title"
                        aria-label={`Chapter ${chapterIndex + 1} title`}
                        className={chapterInputCls}
                      />
                      <span className="hidden shrink-0 rounded-[10px] bg-[var(--qs-poly-1)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--qs-brand)] sm:inline-flex">
                        {chapter.topics.length}{" "}
                        {chapter.topics.length === 1 ? "topic" : "topics"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleChapter(chapterIndex)}
                        aria-expanded={chapter.open}
                        aria-label={chapter.open ? "Collapse chapter" : "Expand chapter"}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-transparent text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-line)] hover:text-[var(--qs-ink)]"
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", chapter.open && "rotate-180")}
                        />
                      </button>
                    </div>

                    <input
                      value={chapter.description}
                      onChange={(event) =>
                        patchChapter(chapterIndex, {
                          description: event.target.value.slice(0, 1000),
                        })
                      }
                      placeholder="Chapter summary (optional)"
                      aria-label={`Chapter ${chapterIndex + 1} summary`}
                      className={cn(smallInputCls, "mt-2 font-medium sm:ml-6 sm:w-[calc(100%-1.5rem)]")}
                    />

                    {chapter.open && (
                      <>
                        <div className="mt-3 grid gap-1.5 sm:ml-6">
                          {chapter.topics.map((topic, topicIndex) => (
                            <div
                              key={`topic-${chapterIndex}-${topicIndex}`}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => dropTopic(chapterIndex, topicIndex, event)}
                              className={cn(
                                "flex flex-wrap items-center gap-2 rounded-xl p-1 transition-opacity",
                                dragTopic?.chapter === chapterIndex &&
                                  dragTopic.topic === topicIndex &&
                                  "opacity-40"
                              )}
                            >
                              <span
                                draggable
                                onDragStart={(event) => {
                                  event.stopPropagation();
                                  event.dataTransfer.effectAllowed = "move";
                                  event.dataTransfer.setData("text/plain", "");
                                  setDragTopic({ chapter: chapterIndex, topic: topicIndex });
                                }}
                                onDragEnd={() => setDragTopic(null)}
                                className={gripCls}
                                aria-hidden="true"
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                              <input
                                value={topic.title}
                                onChange={(event) =>
                                  patchTopic(chapterIndex, topicIndex, event.target.value.slice(0, 255))
                                }
                                placeholder="Topic title"
                                aria-label={`Topic ${topicIndex + 1} in chapter ${chapterIndex + 1}`}
                                className={cn(smallInputCls, "min-w-0 flex-1")}
                              />
                              <div className="w-[150px] max-sm:w-full" title="Move topic to another chapter">
                                <QsSelect<number>
                                  value={chapterIndex}
                                  options={state.chapters.map((option, optionIndex) => ({
                                    value: optionIndex,
                                    label: `${optionIndex + 1}. ${option.title || `Chapter ${optionIndex + 1}`}`,
                                  }))}
                                  onChange={(value) => moveTopic(chapterIndex, topicIndex, value)}
                                  ariaLabel="Move topic to another chapter"
                                  triggerClassName="flex h-10 w-full items-center justify-between gap-1 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-[12px] font-extrabold text-[var(--qs-brand)] outline-none transition-colors hover:border-[var(--qs-brand)] focus:border-[var(--qs-brand)]"
                                  menuClassName="min-w-[220px]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTopic(chapterIndex, topicIndex)}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-transparent text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-line)] hover:text-[var(--qs-bad)]"
                                aria-label={`Remove topic ${topicIndex + 1} from chapter ${chapterIndex + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addTopic(chapterIndex)}
                          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 border-dashed border-[var(--qs-line)] px-3 text-[12px] font-extrabold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-brand)] sm:ml-6"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add topic
                        </button>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:ml-6">
                          <button
                            type="button"
                            onClick={() => mergeChapter(chapterIndex)}
                            disabled={state.chapters.length < 2}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-[var(--qs-line)] px-2 text-[10.5px] font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)] disabled:opacity-40"
                          >
                            <Merge className="h-3 w-3" />
                            {chapterIndex < state.chapters.length - 1 ? "Merge next" : "Merge previous"}
                          </button>
                          <button
                            type="button"
                            onClick={() => splitChapter(chapterIndex)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-[var(--qs-line)] px-2 text-[10.5px] font-bold text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
                          >
                            <Scissors className="h-3 w-3" /> Split chapter
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChapter(chapterIndex)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-[var(--qs-line)] px-2 text-[10.5px] font-bold text-[var(--qs-bad)] transition-colors hover:border-[var(--qs-bad)]/40 hover:bg-[var(--qs-badbg)]"
                          >
                            <Trash2 className="h-3 w-3" /> Delete chapter
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 py-3.5 sm:px-7">
          <span
            className={cn(
              "inline-flex items-center gap-2 text-[12px] font-bold",
              valid ? "text-[var(--qs-ok)]" : "text-[var(--qs-warn)]"
            )}
            aria-live="polite"
          >
            {!valid ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : saving ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Check className="h-4 w-4 shrink-0" />
            )}
            {statusText}
          </span>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              onClick={requestClose}
              className="h-11 flex-1 rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-4 text-[13px] font-extrabold text-[var(--qs-ink)] shadow-[0_3px_0_var(--qs-ink)] transition-transform hover:-translate-y-0.5 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!valid || saving}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 text-[13px] font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-transparent disabled:opacity-50 disabled:shadow-none sm:flex-none"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving…" : targetId ? "Save changes" : "Save syllabus"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default SyllabusEditor;
