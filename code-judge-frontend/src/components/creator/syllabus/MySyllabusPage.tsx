"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/apiError";
import { useSyllabusImportAccess } from "@/hooks/useSyllabusImportAccess";
import {
  deleteSyllabus,
  getSyllabus,
  listSyllabi,
  renameSyllabus,
  type GeneratedSyllabusVariant,
  type SyllabusImportJob,
  type SyllabusSummary,
  type SyllabusTree,
  type SyllabusVariantKey,
} from "@/services/syllabus";
import { SyllabusEditor } from "./SyllabusEditor";
import { SyllabusImportDialog } from "./SyllabusImportDialog";
import { SyllabusMultiImportDialog } from "./SyllabusMultiImportDialog";

interface EditorState {
  mode: "create" | "edit" | "import";
  initial?: SyllabusTree | null;
  variants?: Record<SyllabusVariantKey, GeneratedSyllabusVariant[]> | null;
  importJobId?: string | null;
  importFilename?: string | null;
  targetId?: number | null;
}

interface MySyllabusPageProps {
  onboarding?: boolean;
}

const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_SEC =
  "inline-flex items-center justify-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50";

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MySyllabusPage({ onboarding = false }: MySyllabusPageProps) {
  const { requestImport } = useSyllabusImportAccess();
  const [syllabi, setSyllabi] = useState<SyllabusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [multiReview, setMultiReview] = useState<{
    variants: Record<SyllabusVariantKey, GeneratedSyllabusVariant[]>;
    filename: string;
    importJobId: string;
    targetId: number | null;
  } | null>(null);
  const [reimportTarget, setReimportTarget] = useState<SyllabusSummary | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [renameTarget, setRenameTarget] = useState<SyllabusSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SyllabusSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSyllabi(await listSyllabi());
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load your syllabi."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    listSyllabi()
      .then((rows) => {
        if (!cancelled) setSyllabi(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(getApiErrorMessage(error, "Could not load your syllabi."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return syllabi;
    return syllabi.filter(
      (syllabus) =>
        syllabus.name.toLowerCase().includes(q) ||
        syllabus.subject.toLowerCase().includes(q) ||
        (syllabus.board ?? "").toLowerCase().includes(q) ||
        (syllabus.classLevel ?? "").toLowerCase().includes(q)
    );
  }, [syllabi, query]);

  const stats = useMemo(
    () =>
      syllabi.reduce(
        (totals, syllabus) => ({
          syllabi: totals.syllabi + 1,
          chapters: totals.chapters + syllabus.chapterCount,
          topics: totals.topics + syllabus.topicCount,
        }),
        { syllabi: 0, chapters: 0, topics: 0 }
      ),
    [syllabi]
  );

  const openEdit = async (syllabus: SyllabusSummary) => {
    setOpeningId(syllabus.id);
    try {
      const tree = await getSyllabus(syllabus.id);
      setEditor({ mode: "edit", initial: tree, targetId: tree.id });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not open this syllabus."));
    } finally {
      setOpeningId(null);
    }
  };

  const openImport = (target: SyllabusSummary | null = null) => {
    requestImport(() => {
      setReimportTarget(target);
      setImportOpen(true);
    });
  };

  const handleImportReady = (job: SyllabusImportJob) => {
    if (!job.variants) {
      toast.error("The import finished without a generated syllabus. Please try again.");
      return;
    }
    const target = reimportTarget;
    const hasMultipleSubjects = Object.values(job.variants).some((list) => list.length > 1);
    setImportOpen(false);
    setReimportTarget(null);
    if (hasMultipleSubjects) {
      setEditor(null);
      setMultiReview({
        variants: job.variants,
        filename: job.originalFilename,
        importJobId: job.id,
        targetId: target?.id ?? null,
      });
      return;
    }
    setEditor({
      mode: "import",
      variants: job.variants,
      importJobId: job.id,
      importFilename: job.originalFilename,
      targetId: target?.id ?? null,
    });
  };

  const handleSaved = () => {
    setEditor(null);
    void load();
  };

  const startRename = (syllabus: SyllabusSummary) => {
    setRenameTarget(syllabus);
    setRenameValue(syllabus.name);
  };

  const submitRename = async () => {
    if (!renameTarget || renaming) return;
    const name = renameValue.trim();
    if (!name) {
      toast.error("Enter a syllabus name.");
      return;
    }
    setRenaming(true);
    try {
      const updated = await renameSyllabus(renameTarget.id, name);
      setSyllabi((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, name: updated.name, updatedAt: updated.updatedAt } : item
        )
      );
      setRenameTarget(null);
      toast.success("Syllabus renamed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not rename this syllabus."));
    } finally {
      setRenaming(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteSyllabus(deleteTarget.id);
      setSyllabi((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Syllabus removed. Existing quizzes keep their old references.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not remove this syllabus."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-[22px] pb-6">
      {onboarding && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)]/20 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#a85d00]" />
            <div>
              <p className="text-[13px] font-extrabold text-[var(--qs-ink)]">
                Add your first syllabus
              </p>
              <p className="text-[12px] font-medium text-[var(--qs-muted)]">
                Import a document or create one manually. You can skip and do this later.
              </p>
            </div>
          </div>
          <Link
            href="/creator"
            className="rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--qs-ink)]"
          >
            Skip for now
          </Link>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--qs-muted)]">
            Library
          </p>
          <h1 className="qs-display mt-1 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--qs-ink)] sm:text-[40px]">
            My Syllabus
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] font-medium text-[var(--qs-muted)]">
            Import, review, and edit your own chapter/topic trees. Your syllabi power every quiz,
            test, and question-bank dropdown.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setEditor({ mode: "create" })} className={BTN_SEC}>
            <Plus className="h-3.5 w-3.5" /> New syllabus
          </button>
          <button type="button" onClick={() => openImport(null)} className={BTN_PRI}>
            <Upload className="h-4 w-4" /> Import syllabus
          </button>
        </div>
      </header>

      <section className="relative grid gap-6 overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-6 text-[var(--qs-on-brand)] shadow-[8px_8px_0_var(--qs-sun)] sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[60px] -top-[80px] h-[260px] w-[260px] rounded-full bg-white/[0.08]"
        />
        <div className="relative min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-ink)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-sun)]">
            <Sparkles className="h-3 w-3 fill-current" />
            Your curriculum
          </span>
          <h2 className="mt-4 mb-3 text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[42px]">
            Teach from your own{" "}
            <em className="not-italic text-[var(--qs-sun)]">syllabus</em>
          </h2>
          <p className="max-w-[460px] text-[15px] font-medium leading-relaxed text-white/[0.88]">
            Import a PDF, DOCX, or TXT once. Review the chapter and topic tree, then reuse it across
            quizzes, tests, and the question bank.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => openImport(null)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-5 text-[14px] font-extrabold text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--qs-ink)] active:translate-y-px active:shadow-none"
            >
              <Upload className="h-4 w-4" /> Import syllabus
            </button>
            <button
              type="button"
              onClick={() => setEditor({ mode: "create" })}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 text-[14px] font-extrabold text-[var(--qs-ink)] transition-all hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-px active:shadow-none"
            >
              <Plus className="h-4 w-4" /> New syllabus
            </button>
          </div>
        </div>
        <div className="relative grid gap-3.5 sm:grid-cols-3 lg:grid-cols-1">
          <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)]">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <small className="block text-[12px] font-bold text-[var(--qs-muted)]">
                Your syllabi
              </small>
              <b className="block text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] tabular-nums">
                {stats.syllabi}
              </b>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] p-4 text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)] lg:ml-[22px]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-white">
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <small className="block text-[12px] font-bold text-[#5b4a10]">
                Chapters mapped
              </small>
              <b className="block text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] tabular-nums">
                {stats.chapters}
              </b>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 text-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-ink)] lg:ml-[44px]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <small className="block text-[12px] font-bold text-[var(--qs-muted)]">
                Topics ready
              </small>
              <b className="block text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] tabular-nums">
                {stats.topics}
              </b>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your syllabi…"
            className="h-10 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-9 pr-9 text-[13px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="rounded-full border-2 border-[var(--qs-line)] px-3 py-1 text-[11px] font-bold text-[var(--qs-muted)]">
          {syllabi.length} {syllabi.length === 1 ? "syllabus" : "syllabi"}
        </span>
      </div>

      <section>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[22px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-pink-500/10 text-pink-500">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="mt-3 text-[15px] font-extrabold text-[var(--qs-ink)]">
              {query ? "No matching syllabi" : "No custom syllabus yet"}
            </p>
            <p className="mx-auto mt-1 max-w-md text-[12px] font-medium leading-5 text-[var(--qs-muted)]">
              {query
                ? "Try a different name, subject, board, or class."
                : "Upload a PDF, DOCX, or TXT document and review the AI-generated syllabus before saving."}
            </p>
            {!query && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={() => setEditor({ mode: "create" })} className={BTN_SEC}>
                  <Plus className="h-3.5 w-3.5" /> Create manually
                </button>
                <button type="button" onClick={() => openImport(null)} className={BTN_PRI}>
                  <Upload className="h-4 w-4" /> Import syllabus
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((syllabus, index) => {
              const isDraft = syllabus.status === "draft";
              const initials = syllabus.subject
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0]?.toUpperCase() ?? "")
                .join("") || "S";
              const accent = ["var(--qs-sun)", "var(--qs-brand)", "var(--qs-ok)"][index % 3];
              const meta = [syllabus.board, syllabus.classLevel].filter(Boolean).join(" · ");
              return (
                <article
                  key={syllabus.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[5px_5px_0_var(--qs-sun)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--qs-sun)]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-1.5"
                    style={{ backgroundColor: accent }}
                  />

                  <div className="flex items-start gap-3">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] text-[15px] font-black tracking-[-0.02em] text-[var(--qs-ink)] shadow-[2px_2px_0_var(--qs-ink)]"
                      style={{ backgroundColor: accent }}
                    >
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2
                        className="truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-[var(--qs-ink)]"
                        title={syllabus.name}
                      >
                        {syllabus.name}
                      </h2>
                      <p className="mt-1 truncate text-[12px] font-semibold text-[var(--qs-muted)]">
                        {syllabus.subject}
                        {meta ? ` · ${meta}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border-2 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em]",
                        isDraft
                          ? "border-[#a85d00] bg-[var(--qs-sun)]/20 text-[#a85d00]"
                          : "border-[var(--qs-ok)] bg-[var(--qs-ok)]/10 text-[var(--qs-ok)]"
                      )}
                    >
                      {isDraft ? "Draft" : "Active"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                        Chapters
                      </p>
                      <p className="text-[20px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
                        {syllabus.chapterCount}
                      </p>
                    </div>
                    <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                        Topics
                      </p>
                      <p className="text-[20px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
                        {syllabus.topicCount}
                      </p>
                    </div>
                  </div>

                  {syllabus.level && (
                    <span className="mt-3 inline-flex w-fit rounded-md bg-[var(--qs-brand)]/10 px-2 py-1 text-[10px] font-bold text-[var(--qs-brand)]">
                      {syllabus.level}
                    </span>
                  )}

                  <p className="mt-auto pt-4 text-[11px] font-semibold text-[var(--qs-muted)]">
                    Updated {formatUpdated(syllabus.updatedAt)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t-2 border-dashed border-[var(--qs-line)] pt-3">
                    <button
                      type="button"
                      onClick={() => void openEdit(syllabus)}
                      disabled={openingId === syllabus.id}
                      className={cn(BTN_PRI, "flex-1 px-3 py-2 text-[12px] shadow-[2px_2px_0_var(--qs-ink)]")}
                    >
                      {openingId === syllabus.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => startRename(syllabus)}
                      className={cn(BTN_SEC, "px-2.5 py-2")}
                      title="Rename"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => openImport(syllabus)}
                      className={cn(BTN_SEC, "px-2.5 py-2")}
                      title="Import a new document and replace this syllabus tree"
                    >
                      <RefreshCw className="h-3 w-3" /> Re-import
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(syllabus)}
                      aria-label={`Remove ${syllabus.name}`}
                      title="Remove syllabus"
                      className="grid h-[34px] w-[34px] place-items-center rounded-[10px] border-2 border-red-500/40 bg-red-500/5 text-red-500 transition-colors hover:border-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {importOpen && (
        <SyllabusImportDialog
          onClose={() => {
            setImportOpen(false);
            setReimportTarget(null);
          }}
          onReady={handleImportReady}
        />
      )}

      {multiReview && (
        <SyllabusMultiImportDialog
          key={multiReview.importJobId}
          variants={multiReview.variants}
          filename={multiReview.filename}
          importJobId={multiReview.importJobId}
          targetId={multiReview.targetId}
          onClose={() => setMultiReview(null)}
          onSaved={() => {
            setMultiReview(null);
            void load();
          }}
        />
      )}

      {editor && (
        <SyllabusEditor
          key={`${editor.mode}-${editor.targetId ?? "new"}-${editor.importJobId ?? "manual"}`}
          mode={editor.mode}
          initial={editor.initial}
          variants={editor.variants}
          importJobId={editor.importJobId}
          importFilename={editor.importFilename}
          targetId={editor.targetId}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}

      {renameTarget && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-extrabold text-[var(--qs-ink)]">Rename syllabus</h2>
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
                aria-label="Close rename dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value.slice(0, 255))}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitRename();
              }}
              autoFocus
              className="mt-3 h-10 w-full rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 text-[13px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setRenameTarget(null)} className={BTN_SEC}>
                Cancel
              </button>
              <button type="button" onClick={() => void submitRename()} disabled={renaming} className={BTN_PRI}>
                {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save name
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[85] grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] p-4 shadow-2xl">
            <h2 className="text-[15px] font-extrabold text-[var(--qs-ink)]">Remove syllabus?</h2>
            <p className="mt-1 text-[12px] font-medium leading-5 text-[var(--qs-muted)]">
              <span className="font-bold text-[var(--qs-ink)]">{deleteTarget.name}</span> will disappear
              from your dropdowns. Existing quizzes and saved papers keep their old references.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className={BTN_SEC}>
                Keep it
              </button>
              <button
                type="button"
                onClick={() => void submitDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-red-600 bg-red-500 px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MySyllabusPage;
