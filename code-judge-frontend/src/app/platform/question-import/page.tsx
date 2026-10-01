"use client";

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight, ClipboardCheck, Database, FileText, FileUp, Layers3, RotateCcw, SlidersHorizontal, Sparkles, UploadCloud, Zap } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { QuestionImportCatalog, SubjectiveImportPreview } from "@/services/platform";
import { SectionSkeleton, EmptyState, ErrorState, fmtInt } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";
import { getApiErrorMessage } from "@/lib/apiError";

/* /platform/question-import — calls /question-import/* only. */
export default function QuestionImportPage() {
  const catalogQ = useAsync(() => platformApi.questionImportCatalog(), "question-import-catalog");
  return (
    <div className="space-y-4">
      <PageHeader title="Question ingestion" detail="Upload documents, let AI map each question to your curriculum, then review before anything reaches the database." />
      <QuestionImportPanel query={catalogQ} />
    </div>
  );
}

function QuestionImportPanel({ query }: {
  query: { data: QuestionImportCatalog | null; error: { message: string } | null; loading: boolean; retry: () => void };
}) {
  const [file, setFile] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<SubjectiveImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; skippedDuplicates: number } | null>(null);

  const catalog = query.data;
  const chapters = (catalog?.chapters ?? []).filter((chapter) => String(chapter.subject_id) === subjectId);
  const topics = (catalog?.topics ?? []).filter((topic) => String(topic.chapter_id) === chapterId);

  const resetPreview = () => {
    setPreview(null);
    setSelected(new Set());
    setResult(null);
    setError(null);
  };

  const createPreview = async () => {
    if (!file || !subjectId) {
      setError("Choose a document and subject first.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Document must be 4 MB or smaller for the Vercel upload path.");
      return;
    }
    setPreviewing(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subjectId", subjectId);
      if (chapterId) form.append("chapterId", chapterId);
      if (topicId) form.append("topicId", topicId);
      const generated = await platformApi.previewQuestionImport(form);
      setPreview(generated);
      setSelected(new Set(generated.questions.map((_, index) => index)));
    } catch (cause) {
      setError(getApiErrorMessage(cause, "AI could not create a valid preview from this document."));
    } finally {
      setPreviewing(false);
    }
  };

  const commit = async () => {
    if (!preview || selected.size === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const imported = await platformApi.commitQuestionImport(preview.batchId, [...selected].sort((a, b) => a - b));
      setResult(imported);
    } catch (cause) {
      setError(getApiErrorMessage(cause, "Questions could not be inserted."));
    } finally {
      setCommitting(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const selectedSubject = catalog?.subjects.find((subject) => String(subject.id) === subjectId);
  const selectedChapter = chapters.find((chapter) => String(chapter.id) === chapterId);
  const selectedTopic = topics.find((topic) => String(topic.id) === topicId);
  const activeStep = result ? 3 : preview ? 2 : file && subjectId ? 1 : 0;
  const allSelected = Boolean(preview?.questions.length) && selected.size === preview?.questions.length;

  return (
    <section id="question-import" className="scroll-mt-24 space-y-4">
      <div className="relative overflow-hidden rounded-[18px] border border-[#EC4899]/20 bg-[var(--card)] px-5 py-5 shadow-[var(--platform-shadow)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#EC4899]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-20 top-2 h-40 w-40 rounded-full bg-[#8B5CF6]/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#EC4899] to-[#8B5CF6] text-white shadow-[0_8px_20px_rgba(236,72,153,.25)]"><Sparkles size={17} /></span>
              <span className="rounded-full border border-[#EC4899]/20 bg-[#EC4899]/[.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-[#EC4899]">AI question bank</span>
            </div>
            <h2 className="text-[20px] font-semibold tracking-[-.02em] text-[var(--text-primary)] sm:text-[23px]">Turn documents into review-ready questions</h2>
            <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-[var(--text-secondary)] sm:text-[13px]">Upload the original document, let AI map each question to your curriculum, then review the formatted HTML before anything reaches the database.</p>
          </div>
          <div className="grid min-w-0 grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 xl:min-w-[430px]">
            <ImportStep icon={<UploadCloud size={14} />} number="01" label="Document" active={activeStep >= 0} complete={activeStep > 0} />
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
            <ImportStep icon={<SlidersHorizontal size={14} />} number="02" label="Classify" active={activeStep >= 1} complete={activeStep > 1} />
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
            <ImportStep icon={<ClipboardCheck size={14} />} number="03" label="Approve" active={activeStep >= 2} complete={activeStep > 2} />
          </div>
        </div>
      </div>
      {query.loading ? <SectionSkeleton rows={5} /> : query.error ? <ErrorState message={query.error.message} onRetry={query.retry} /> : !catalog ? <EmptyState message="Import catalog unavailable" /> : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[15px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--platform-shadow)] xl:sticky xl:top-20">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#8B5CF6]/10 text-[#8B5CF6]"><FileUp size={15} /></span><div><h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Source & classification</h3><p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Choose the curriculum boundary for AI.</p></div></div>
            </div>
            <div className="space-y-5 p-5">
              <label className={`group relative grid min-h-[150px] cursor-pointer place-items-center overflow-hidden rounded-[13px] border border-dashed p-5 text-center transition-all ${file ? "border-[#EC4899]/40 bg-[#EC4899]/[.045]" : "border-[var(--border-hover)] bg-[var(--platform-input)] hover:border-[#EC4899]/45 hover:bg-[#EC4899]/[.025]"}`}>
                <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#EC4899]/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span>
                  <span className={`mx-auto grid h-12 w-12 place-items-center rounded-[13px] transition-transform group-hover:-translate-y-0.5 ${file ? "bg-[#EC4899]/12 text-[#EC4899]" : "bg-[var(--platform-soft-strong)] text-[var(--text-secondary)]"}`}>{file ? <FileText size={21} /> : <UploadCloud size={21} />}</span>
                  <span className="mt-3 block max-w-[260px] truncate text-[12px] font-semibold text-[var(--text-primary)]">{file?.name ?? "Drop or choose a document"}</span>
                  <span className="mt-1 block text-[9px] leading-relaxed text-[var(--text-muted)]">PDF, DOCX, TXT, MD, RTF, PPTX · up to 4 MB</span>
                  {file && <span className="mt-2 inline-flex rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[9px] font-medium text-[var(--text-secondary)]">{formatFileSize(file.size)} · Change file</span>}
                </span>
                <input type="file" className="sr-only" accept=".pdf,.docx,.txt,.md,.rtf,.pptx" onChange={(event) => { setFile(event.target.files?.[0] ?? null); resetPreview(); }} />
              </label>

              <div className="space-y-3">
                <ImportSelect label="Subject" required value={subjectId} onChange={(value) => { setSubjectId(value); setChapterId(""); setTopicId(""); resetPreview(); }} options={catalog.subjects} placeholder="Select subject" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <ImportSelect label="Chapter" value={chapterId} onChange={(value) => { setChapterId(value); setTopicId(""); resetPreview(); }} options={chapters} placeholder="Let AI decide" disabled={!subjectId} />
                  <ImportSelect label="Topic" value={topicId} onChange={(value) => { setTopicId(value); resetPreview(); }} options={topics} placeholder="Let AI decide" disabled={!chapterId} />
                </div>
                <div className="flex items-center justify-between rounded-[10px] border border-emerald-500/20 bg-emerald-500/[.055] px-3 py-2.5"><span><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-emerald-500">Entire document</span><span className="mt-0.5 block text-[9px] text-[var(--text-muted)]">Every detected question will be included.</span></span><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[.1em] text-emerald-500">No count limit</span></div>
              </div>

              {(selectedSubject || selectedChapter || selectedTopic) && <div className="rounded-[11px] border border-[var(--border)] bg-[var(--platform-soft)] p-3"><div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]"><Layers3 size={12} /> Selected scope</div><div className="flex flex-wrap items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)]">{selectedSubject && <span>{selectedSubject.name}</span>}{selectedChapter && <><ChevronRight size={11} /><span>{selectedChapter.name}</span></>}{selectedTopic && <><ChevronRight size={11} /><span>{selectedTopic.name}</span></>}</div></div>}

              <div className="flex gap-2.5 rounded-[11px] border border-[#8B5CF6]/15 bg-[#8B5CF6]/[.045] p-3 text-[10px] leading-relaxed text-[var(--text-muted)]"><Sparkles size={14} className="mt-0.5 shrink-0 text-[#8B5CF6]" /><span>The original file and related curriculum IDs go directly to AI. Returned hierarchy and lookup IDs are validated by the server.</span></div>
              {error && <div role="alert" className="flex gap-2 rounded-[10px] border border-[var(--danger)]/25 bg-[var(--danger)]/[.06] px-3 py-2.5 text-[10px] leading-relaxed text-[var(--danger)]"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{error}</div>}
              <button type="button" onClick={createPreview} disabled={previewing || !file || !subjectId} className="pf-focus flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(236,72,153,.2)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"><Zap size={14} className={previewing ? "animate-pulse" : ""} />{previewing ? "AI is analysing the document…" : preview ? "Regenerate HTML preview" : "Generate question preview"}</button>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[15px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--platform-shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#EC4899]/10 text-[#EC4899]"><ClipboardCheck size={15} /></span><div><h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Review & approve</h3><p className="mt-0.5 max-w-[420px] truncate text-[10px] text-[var(--text-muted)]">{preview ? `${preview.questions.length} questions from ${preview.sourceFilename}` : "No database write happens before your approval."}</p></div></div>
              {preview && !result && <div className="flex items-center gap-2"><span className="rounded-full bg-[#EC4899]/10 px-2.5 py-1 text-[9px] font-bold text-[#EC4899]">{selected.size}/{preview.questions.length} selected</span>{preview.usage?.totalTokens != null && <span className="hidden rounded-full border border-[var(--border)] px-2.5 py-1 text-[9px] text-[var(--text-muted)] sm:inline">{fmtInt(preview.usage.totalTokens)} tokens</span>}</div>}
            </div>
            {!preview ? (
              <div className="grid min-h-[480px] place-items-center px-6 text-center"><div className="max-w-sm"><span className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] border border-[var(--border)] bg-[var(--platform-soft)] text-[var(--text-muted)]"><FileText size={25} /></span><h3 className="mt-4 text-[14px] font-semibold text-[var(--text-primary)]">Your preview will appear here</h3><p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">Choose a source document and subject. AI will return clean HTML questions with chapter, topic, difficulty and category mappings.</p><div className="mx-auto mt-5 flex w-fit items-center gap-2 text-[9px] font-medium uppercase tracking-[.1em] text-[var(--text-muted)]"><span className="h-px w-8 bg-[var(--border)]" /> Nothing inserted yet <span className="h-px w-8 bg-[var(--border)]" /></div></div></div>
            ) : result ? (
              <div className="grid min-h-[480px] place-items-center px-6 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--success)]/10 text-[var(--success)]"><Check size={27} /></span><h3 className="mt-4 text-[16px] font-semibold text-[var(--text-primary)]">Question bank updated</h3><p className="mt-1.5 text-[11px] text-[var(--text-secondary)]"><b className="text-[var(--text-primary)]">{result.inserted}</b> questions inserted · {result.skippedDuplicates} duplicates skipped</p><button onClick={() => { setFile(null); resetPreview(); }} className="pf-focus mt-5 inline-flex items-center gap-2 rounded-[9px] border border-[var(--border)] px-3.5 py-2 text-[10px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--card-hover)]"><RotateCcw size={13} /> Start another import</button></div></div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--platform-soft)] px-5 py-3"><div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-[var(--text-muted)]"><span className="font-semibold text-[var(--text-primary)]">{preview.scope.subject_name}</span>{preview.scope.chapter_name && <><ChevronRight size={11} /><span>{preview.scope.chapter_name}</span></>}{preview.scope.topic_name && <><ChevronRight size={11} /><span>{preview.scope.topic_name}</span></>}</div><button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(preview.questions.map((_, index) => index)))} className="pf-focus rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-[#EC4899] hover:bg-[#EC4899]/10">{allSelected ? "Clear selection" : "Select all"}</button></div>
                <div className="max-h-[590px] space-y-3 overflow-y-auto p-4 sm:p-5">
                  {preview.questions.map((question, index) => {
                    const isSelected = selected.has(index);
                    return <label key={`${index}-${question.question_text.slice(0, 24)}`} className={`group flex cursor-pointer gap-3 rounded-[13px] border p-4 transition-all ${isSelected ? "border-[#EC4899]/30 bg-[#EC4899]/[.035] shadow-[0_8px_22px_rgba(0,0,0,.05)]" : "border-[var(--border)] bg-[var(--platform-input)] opacity-60 hover:opacity-85"}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleQuestion(index)} className="sr-only" />
                      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px] border text-[9px] font-bold transition-colors ${isSelected ? "border-[#EC4899] bg-[#EC4899] text-white" : "border-[var(--border-hover)] text-[var(--text-muted)]"}`}>{isSelected ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-3 flex flex-wrap items-center gap-1.5"><QuestionMetaPill label={question.difficulty_name} tone={difficultyTone(question.difficulty_name)} /><QuestionMetaPill label={question.category_name} tone="violet" /><span className="ml-auto text-[8px] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">HTML preview</span></span>
                        <span className="block text-[12px] leading-[1.7] text-[var(--text-primary)] [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-[#EC4899]/40 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-[var(--platform-soft-strong)] [&_code]:px-1 [&_code]:py-0.5 [&_li]:ml-5 [&_ol]:my-2 [&_ol]:list-decimal [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-[var(--platform-input)] [&_pre]:p-3 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--border)] [&_td]:p-2 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--platform-soft)] [&_th]:p-2 [&_ul]:my-2 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: question.question_html }} />
                        <span className="mt-3 flex flex-wrap items-center gap-1 text-[9px] text-[var(--text-muted)]"><Layers3 size={11} /><span>Subject #{question.subject_id}</span>{question.chapter_name && <><ChevronRight size={10} /><span>{question.chapter_name}</span></>}{question.topic_name && <><ChevronRight size={10} /><span>{question.topic_name}</span></>}<span className="ml-auto font-mono opacity-70">D#{question.difficulty_id} · C#{question.category_id}</span></span>
                      </span>
                    </label>;
                  })}
                </div>
                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--card)]/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold text-[var(--text-primary)]">{selected.size} question{selected.size === 1 ? "" : "s"} ready</p><p className="mt-0.5 text-[9px] text-[var(--text-muted)]">Insert runs as one validated database transaction.</p></div><button type="button" onClick={commit} disabled={committing || selected.size === 0} className="pf-focus flex min-h-10 items-center justify-center gap-2 rounded-[9px] bg-[var(--success)] px-5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(34,197,94,.18)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40"><Database size={13} />{committing ? "Inserting transaction…" : `Insert ${selected.size} into question bank`}</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ImportSelect({ label, value, onChange, options, placeholder, disabled = false, required = false }: { label: string; value: string; onChange: (value: string) => void; options: { id: number; name: string }[]; placeholder: string; disabled?: boolean; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">{label}{required && <span className="text-[#EC4899]">*</span>}</span><div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="h-11 w-full appearance-none rounded-[10px] border border-[var(--border)] bg-[var(--platform-input)] px-3 pr-9 text-[11px] font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[#EC4899]/60 disabled:cursor-not-allowed disabled:opacity-40"><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /></div></label>;
}

function ImportStep({ icon, number, label, active, complete }: { icon: React.ReactNode; number: string; label: string; active: boolean; complete: boolean }) {
  return <div className={`min-w-0 rounded-[11px] border px-3 py-2.5 transition-colors ${active ? "border-[#EC4899]/25 bg-[#EC4899]/[.055]" : "border-[var(--border)] bg-[var(--platform-soft)] opacity-55"}`}><div className="flex items-center gap-2"><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[7px] ${complete ? "bg-[var(--success)] text-white" : active ? "bg-[#EC4899] text-white" : "bg-[var(--platform-soft-strong)] text-[var(--text-muted)]"}`}>{complete ? <Check size={12} /> : icon}</span><span className="min-w-0"><span className="block text-[8px] font-bold tracking-[.12em] text-[var(--text-muted)]">{number}</span><span className="block truncate text-[10px] font-semibold text-[var(--text-primary)]">{label}</span></span></div></div>;
}

function QuestionMetaPill({ label, tone }: { label: string; tone: "green" | "amber" | "red" | "violet" }) {
  const colors = { green: "border-emerald-500/20 bg-emerald-500/[.08] text-emerald-500", amber: "border-amber-500/20 bg-amber-500/[.08] text-amber-500", red: "border-red-500/20 bg-red-500/[.08] text-red-500", violet: "border-violet-500/20 bg-violet-500/[.08] text-violet-500" };
  return <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.08em] ${colors[tone]}`}>{label}</span>;
}

function difficultyTone(value: string): "green" | "amber" | "red" {
  const difficulty = value.toLowerCase();
  if (difficulty === "easy") return "green";
  if (difficulty === "hard") return "red";
  return "amber";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
