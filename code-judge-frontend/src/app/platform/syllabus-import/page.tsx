"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Database,
  FileText,
  Layers3,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { platformApi } from "@/services/platform";
import type {
  SyllabusImportChapterPreview,
  SyllabusImportCommitResult,
  SyllabusImportPreview,
  SyllabusImportSubjectPreview,
} from "@/services/platform";
import { PageHeader } from "@/components/platform/subpage-blocks";
import { getApiErrorMessage } from "@/lib/apiError";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/* /platform/syllabus-import — upload a syllabus, let AI summarize and generate the
   subject → chapter → topic tree, then create only the missing records. */
export default function SyllabusImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SyllabusImportPreview | null>(null);
  const [result, setResult] = useState<SyllabusImportCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!generating) return;
    const startedAt = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [generating]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setElapsed(0);
  };

  const chooseFile = (next: File | null) => {
    setFile(next);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const generate = async () => {
    if (!file) {
      setError("Choose a syllabus document first.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Document must be 10 MB or smaller.");
      return;
    }
    setGenerating(true);
    setElapsed(0);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const generated = await platformApi.previewSyllabusImport(form);
      setPreview(generated);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "AI could not generate a syllabus hierarchy from this document."));
    } finally {
      setGenerating(false);
    }
  };

  const commit = async () => {
    if (!preview || preview.summary.totalNew === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const imported = await platformApi.commitSyllabusImport(preview.batchId);
      setResult(imported);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "The curriculum hierarchy could not be created."));
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Syllabus ingestion"
        title="Grow the curriculum from a syllabus"
        detail="Upload a syllabus document. AI summarizes it into 5–10 chapters per subject and 3–7 topics per chapter, then the importer creates only what is missing — existing records are reused, never duplicated."
      />

      <div className="qs-offset">
        <div className="relative overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-5 py-5 sm:px-6 sm:py-6">
          <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                  <BookOpen size={17} />
                </span>
                <span className="qs-pill" style={{ color: "var(--qs-brand)" }}>AI syllabus ingestion</span>
              </div>
              <h2
                className="font-extrabold tracking-tight text-[var(--qs-ink)]"
                style={{ fontSize: "clamp(20px,2.5vw,26px)", lineHeight: 1.1 }}
              >
                One document in, a clean curriculum out
              </h2>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--qs-muted)]">
                The AI summarizes the syllabus, generates 5–10 chapters per subject and 3–7 topics per chapter,
                deduplicates names, and maps every topic to its chapter. Nothing is written until you review the tree.
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 xl:min-w-[430px]">
              <IngestStep icon={<UploadCloud size={14} />} number="01" label="Syllabus" active={Boolean(file)} complete={Boolean(preview || result)} />
              <ChevronRight size={14} className="text-[var(--qs-muted)]" />
              <IngestStep icon={<Sparkles size={14} />} number="02" label="AI summarize" active={generating || Boolean(preview)} complete={Boolean(preview)} />
              <ChevronRight size={14} className="text-[var(--qs-muted)]" />
              <IngestStep icon={<Layers3 size={14} />} number="03" label="Create" active={Boolean(preview)} complete={Boolean(result)} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] xl:sticky xl:top-20">
          <div className="border-b-2 border-[var(--qs-line)] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[color-mix(in_srgb,var(--qs-brand)_12%,transparent)] text-[var(--qs-brand)]">
                <FileText size={15} />
              </span>
              <div>
                <h3 className="text-[13px] font-extrabold text-[var(--qs-ink)]">Source syllabus</h3>
                <p className="mt-0.5 text-[10px] text-[var(--qs-muted)]">PDF, DOCX, TXT, MD or RTF · up to 10 MB.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <label
              className={`group relative grid min-h-[160px] cursor-pointer place-items-center overflow-hidden rounded-[14px] border-2 border-dashed p-5 text-center transition-all ${
                file
                  ? "border-[var(--qs-brand)] bg-[color-mix(in_srgb,var(--qs-brand)_8%,transparent)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-field)] hover:border-[var(--qs-brand)] hover:bg-[color-mix(in_srgb,var(--qs-brand)_5%,transparent)]"
              }`}
            >
              <span>
                <span
                  className={`mx-auto grid h-12 w-12 place-items-center rounded-[13px] transition-transform group-hover:-translate-y-0.5 ${
                    file
                      ? "bg-[color-mix(in_srgb,var(--qs-brand)_14%,transparent)] text-[var(--qs-brand)]"
                      : "bg-[var(--qs-sun)]/25 text-[var(--qs-ink)]"
                  }`}
                >
                  {file ? <FileText size={21} /> : <UploadCloud size={21} />}
                </span>
                <span className="mt-3 block max-w-[260px] truncate text-[12px] font-bold text-[var(--qs-ink)]">
                  {file?.name ?? "Drop or choose a syllabus"}
                </span>
                <span className="mt-1 block text-[10px] leading-relaxed text-[var(--qs-muted)]">
                  The source document is read in memory and never stored.
                </span>
                {file && (
                  <span className="mt-2 inline-flex rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1 text-[9px] font-medium text-[var(--qs-muted)]">
                    {formatFileSize(file.size)} · Change file
                  </span>
                )}
              </span>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.docx,.txt,.md,.rtf"
                disabled={generating}
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--qs-muted)]">
                <Layers3 size={12} /> Hierarchy AI will build
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-[var(--qs-ink)]">
                <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1">Subject</span>
                <ChevronRight size={11} className="text-[var(--qs-muted)]" />
                <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1">Chapter</span>
                <ChevronRight size={11} className="text-[var(--qs-muted)]" />
                <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1">Topics</span>
              </div>
            </div>

            <div className="flex gap-2.5 rounded-[14px] border-2 border-[color-mix(in_srgb,var(--qs-ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--qs-ok)_8%,transparent)] p-3 text-[10px] leading-relaxed text-[var(--qs-muted)]">
              <Check size={14} className="mt-0.5 shrink-0 text-[var(--qs-ok)]" />
              <span>
                Subjects that already have chapters and topics are sent to the AI and skipped. For new subjects, a
                record is inserted only when the exact subject → chapter → topic combination does not already exist.
                Existing subjects and chapters are reused, and nothing is overwritten.
              </span>
            </div>

            {generating && (
              <div className="rounded-[14px] border-2 border-[color-mix(in_srgb,var(--qs-brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--qs-brand)_8%,transparent)] p-3">
                <div className="flex items-center gap-2 text-[11px] font-extrabold text-[var(--qs-brand)]">
                  <Loader2 size={14} className="animate-spin" />
                  AI is summarizing your syllabus
                  <span className="ml-auto tabular-nums text-[10px] font-bold text-[var(--qs-muted)]">{elapsed}s</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--qs-brand)_16%,transparent)]">
                  <div className="pf-pulse h-full w-2/3 rounded-full bg-[var(--qs-brand)]" />
                </div>
                <p className="mt-2 text-[9px] leading-relaxed text-[var(--qs-muted)]">
                  Generating 5–10 chapters per subject and 3–7 topics per chapter. Local models can take a few minutes for a long document.
                </p>
              </div>
            )}

            {error && (
              <div role="alert" className="flex gap-2 whitespace-pre-line break-words rounded-[12px] border-2 border-[color-mix(in_srgb,var(--qs-bad)_35%,transparent)] bg-[color-mix(in_srgb,var(--qs-bad)_6%,transparent)] px-3 py-2.5 text-[10px] leading-relaxed text-[var(--qs-bad)]">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={generate}
              disabled={generating || !file}
              className="b b-pri b-full"
            >
              <Sparkles size={14} className={generating ? "animate-pulse" : ""} />
              {generating ? "AI is summarizing and generating…" : preview ? "Re-run AI generation" : "Summarize & generate curriculum"}
            </button>
            {preview && !generating && (
              <button type="button" onClick={reset} className="b b-ghost b-full">
                <RotateCcw size={13} /> Start over
              </button>
            )}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[color-mix(in_srgb,var(--qs-brand)_12%,transparent)] text-[var(--qs-brand)]">
                <Layers3 size={15} />
              </span>
              <div>
                <h3 className="text-[13px] font-extrabold text-[var(--qs-ink)]">Review the hierarchy</h3>
                <p className="mt-0.5 max-w-[460px] truncate text-[10px] text-[var(--qs-muted)]">
                  {preview
                    ? `${preview.sourceFilename} · ${preview.summary.totalNew} new · ${preview.summary.totalExisting} already exist`
                    : "Existing records are marked and will not be created again."}
                </p>
              </div>
            </div>
            {preview && !result && (
              <span className="rounded-full border-2 border-[color-mix(in_srgb,var(--qs-brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--qs-brand)_10%,transparent)] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.1em] text-[var(--qs-brand)]">
                {preview.summary.totalNew} to create
              </span>
            )}
          </div>

          {!preview ? (
            <div className="grid min-h-[520px] place-items-center px-6 text-center">
              <div className="max-w-sm">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]">
                  <BookOpen size={25} />
                </span>
                <h3 className="mt-4 text-[14px] font-extrabold text-[var(--qs-ink)]">Your syllabus tree will appear here</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--qs-muted)]">
                  Choose a syllabus and run AI generation. You will see every subject, chapter and topic before
                  anything reaches the database.
                </p>
                <div className="mx-auto mt-5 flex w-fit items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--qs-muted)]">
                  <span className="h-px w-8 bg-[var(--qs-line)]" /> Nothing created yet <span className="h-px w-8 bg-[var(--qs-line)]" />
                </div>
              </div>
            </div>
          ) : result ? (
            <div className="grid min-h-[520px] place-items-center px-6 text-center">
              <div className="max-w-md">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-[color-mix(in_srgb,var(--qs-ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--qs-ok)_10%,transparent)] text-[var(--qs-ok)]">
                  <CircleCheck size={27} />
                </span>
                <h3 className="mt-4 text-[16px] font-extrabold text-[var(--qs-ink)]">Curriculum updated</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--qs-muted)]">
                  Created{" "}
                  <b className="text-[var(--qs-ink)]">{result.subjectsCreated}</b> subjects,{" "}
                  <b className="text-[var(--qs-ink)]">{result.chaptersCreated}</b> chapters and{" "}
                  <b className="text-[var(--qs-ink)]">{result.topicsCreated}</b> topics.
                </p>
                <p className="mt-1 text-[10px] text-[var(--qs-muted)]">
                  Reused {result.subjectsReused} subjects, {result.chaptersReused} chapters and {result.topicsReused} topics
                  that already existed.
                </p>
                <button onClick={reset} className="b mt-5">
                  <RotateCcw size={13} /> Ingest another syllabus
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-3 gap-2 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3 sm:px-5">
                <SummaryStat label="Subjects" counts={preview.summary.subjects} />
                <SummaryStat label="Chapters" counts={preview.summary.chapters} />
                <SummaryStat label="Topics" counts={preview.summary.topics} />
              </div>

              {preview.subjects.length === 0 ? (
                <div className="grid min-h-[320px] place-items-center px-6 py-10 text-center">
                  <div className="max-w-sm">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[color-mix(in_srgb,var(--qs-ok)_35%,transparent)] bg-[color-mix(in_srgb,var(--qs-ok)_10%,transparent)] text-[var(--qs-ok)]">
                      <Check size={24} />
                    </span>
                    <h3 className="mt-4 text-[14px] font-extrabold text-[var(--qs-ink)]">
                      Everything is already in the curriculum
                    </h3>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--qs-muted)]">
                      The AI skipped subjects that already have chapters and topics. Nothing will be created from this
                      document.
                    </p>
                  </div>
                </div>
              ) : (
              <div className="max-h-[620px] space-y-3 overflow-y-auto p-4 sm:p-5">
                {preview.subjects.map((subject) => {
                  const status = subjectStatus(subject);
                  const additions = describeAdditions(subject);
                  return (
                    <div key={`${subject.existingId ?? "new"}-${subject.name}`} className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 ${
                            status === "existing"
                              ? "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                              : status === "partial"
                                ? "border-[color-mix(in_srgb,var(--qs-brand)_40%,transparent)] bg-[color-mix(in_srgb,var(--qs-brand)_10%,transparent)] text-[var(--qs-brand)]"
                                : "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]"
                          }`}
                        >
                          {status === "existing" ? <Check size={15} /> : status === "partial" ? <Plus size={15} /> : <BookOpen size={15} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[14px] font-extrabold text-[var(--qs-ink)]">{subject.name}</h4>
                            <NodeBadge status={status} />
                          </div>
                          <p className="mt-0.5 text-[10px] text-[var(--qs-muted)]">
                            {subject.chapters.length} chapter{subject.chapters.length === 1 ? "" : "s"} ·{" "}
                            {countTopics(subject.chapters)} topic{countTopics(subject.chapters) === 1 ? "" : "s"}
                          </p>
                          {status === "partial" && (
                            <p className="mt-0.5 text-[10px] font-semibold text-[var(--qs-brand)]">
                              Existing subject reused · adding {additions}
                            </p>
                          )}
                        </div>
                      </div>

                      {subject.chapters.length > 0 && (
                        <div className="mt-3 space-y-3 border-l-2 border-[var(--qs-line)] pl-3">
                          {subject.chapters.map((chapter) => {
                            const cStatus = chapterStatus(chapter);
                            return (
                              <div key={`${chapter.existingId ?? "new"}-${chapter.name}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-2 ${
                                      cStatus === "existing"
                                        ? "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                                        : "border-[color-mix(in_srgb,var(--qs-brand)_40%,transparent)] bg-[color-mix(in_srgb,var(--qs-brand)_10%,transparent)] text-[var(--qs-brand)]"
                                    }`}
                                  >
                                    {cStatus === "existing" ? <Check size={10} /> : <Plus size={10} />}
                                  </span>
                                  <span className={`text-[12px] font-bold ${cStatus === "existing" ? "text-[var(--qs-muted)]" : "text-[var(--qs-ink)]"}`}>
                                    {chapter.name}
                                  </span>
                                  <NodeBadge status={cStatus} />
                                </div>
                                {chapter.topics.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                                    {chapter.topics.map((topic) => (
                                      <span
                                        key={`${topic.existingId ?? "new"}-${topic.name}`}
                                        className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-semibold ${
                                          topic.existing
                                            ? "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                                            : "border-[color-mix(in_srgb,var(--qs-brand)_25%,transparent)] bg-[color-mix(in_srgb,var(--qs-brand)_7%,transparent)] text-[var(--qs-ink)]"
                                        }`}
                                      >
                                        {topic.existing ? <Check size={9} /> : <Plus size={9} />}
                                        {topic.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}

              <div className="sticky bottom-0 flex flex-col gap-3 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)]/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--qs-ink)]">
                    {preview.summary.totalNew === 0 ? "Everything in this syllabus already exists" : `${preview.summary.totalNew} new records ready`}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[var(--qs-muted)]">
                    {preview.summary.totalExisting} existing records will be reused. Nothing is overwritten.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={commit}
                  disabled={committing || preview.summary.totalNew === 0}
                  className="b b-pri"
                >
                  {committing ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
                  {committing
                    ? "Creating records…"
                    : preview.summary.totalNew === 0
                      ? "Nothing new to create"
                      : `Create ${preview.summary.totalNew} records`}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryStat({ label, counts }: { label: string; counts: { total: number; existing: number; new: number } }) {
  return (
    <div className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-2">
      <p className="text-[9px] font-extrabold uppercase tracking-[.12em] text-[var(--qs-muted)]">{label}</p>
      <p className="mt-0.5 text-[15px] font-extrabold leading-none text-[var(--qs-ink)]">{counts.total}</p>
      <p className="mt-1 text-[9px] text-[var(--qs-muted)]">
        <span className="font-bold text-[var(--qs-brand)]">{counts.new} new</span> · {counts.existing} existing
      </p>
    </div>
  );
}

function NodeBadge({ status }: { status: NodeStatus }) {
  const existing = status === "existing";
  const label = status === "new" ? "New" : status === "partial" ? "Partial" : "Exists";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[.1em] ${
        existing
          ? "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
          : "border-[color-mix(in_srgb,var(--qs-brand)_30%,transparent)] bg-[color-mix(in_srgb,var(--qs-brand)_10%,transparent)] text-[var(--qs-brand)]"
      }`}
    >
      {existing ? <Check size={8} /> : <Plus size={8} />}
      {label}
    </span>
  );
}

function IngestStep({ icon, number, label, active, complete }: {
  icon: ReactNode;
  number: string;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-[11px] border px-3 py-2.5 transition-colors ${active ? "border-[color-mix(in_srgb,var(--qs-brand)_35%,transparent)] bg-[color-mix(in_srgb,var(--qs-brand)_6%,transparent)]" : "border-[var(--qs-line)] bg-[var(--qs-bg)] opacity-55"}`}>
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] ${complete ? "bg-[var(--qs-ok)] text-white" : active ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "bg-[var(--qs-line)] text-[var(--qs-muted)]"}`}>
          {complete ? <Check size={12} /> : icon}
        </span>
        <span className="min-w-0">
          <span className="block text-[8px] font-bold tracking-[.12em] text-[var(--qs-muted)]">{number}</span>
          <span className="block truncate text-[10px] font-semibold text-[var(--qs-ink)]">{label}</span>
        </span>
      </div>
    </div>
  );
}

function countTopics(chapters: { topics: unknown[] }[]): number {
  return chapters.reduce((total, chapter) => total + chapter.topics.length, 0);
}

type NodeStatus = "new" | "existing" | "partial";

function countNewChapters(subject: SyllabusImportSubjectPreview): number {
  return subject.chapters.filter((chapter) => !chapter.existing).length;
}

function countNewTopics(subject: SyllabusImportSubjectPreview): number {
  return subject.chapters.reduce(
    (total, chapter) => total + chapter.topics.filter((topic) => !topic.existing).length,
    0
  );
}

function subjectStatus(subject: SyllabusImportSubjectPreview): NodeStatus {
  if (!subject.existing) return "new";
  return countNewChapters(subject) + countNewTopics(subject) > 0 ? "partial" : "existing";
}

function chapterStatus(chapter: SyllabusImportChapterPreview): NodeStatus {
  if (!chapter.existing) return "new";
  return chapter.topics.some((topic) => !topic.existing) ? "partial" : "existing";
}

function describeAdditions(subject: SyllabusImportSubjectPreview): string {
  const chapters = countNewChapters(subject);
  const topics = countNewTopics(subject);
  const parts: string[] = [];
  if (chapters > 0) parts.push(`${chapters} chapter${chapters === 1 ? "" : "s"}`);
  if (topics > 0) parts.push(`${topics} topic${topics === 1 ? "" : "s"}`);
  return parts.join(" and ");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
