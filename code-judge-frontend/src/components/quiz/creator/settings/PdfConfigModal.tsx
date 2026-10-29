"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, Download, X, KeyRound, Shuffle } from "lucide-react";
import { cn } from "@/lib/helpers";
import { type PdfStudent, type PdfGenerationMode } from "@/utils/pdfConfig";
import { getQuizResponses, type QuizResponseStudent } from "@/services/quiz";
import {
  buildPaperPreviewDocument,
  loadPaperFontCss,
  paperInstructionLines,
  preparePaperQuestions,
  type PaperMeta,
  type PaperOptions,
  type PaperQuestion,
} from "@/utils/paperHtml";
import { type PaperDownloadKind, type PaperDownloadMode } from "@/utils/paperPdf";
import { toast } from "@/lib/toast";

const A4_WIDTH_PX = 794;

interface SectionProps {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, summary, open, onToggle, children }: SectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-card-hover/50"
        aria-expanded={open}
      >
        <span className="text-[13px] font-semibold text-text-primary">{title}</span>
        <span className="flex items-center gap-2">
          {!open && summary && (
            <span className="max-w-[140px] truncate text-[11px] text-text-muted">{summary}</span>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {open && <div className="border-t border-border px-4 py-4">{children}</div>}
    </div>
  );
}

const RADIO = {
  base: "relative flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all",
  active: "border-pink-500/50 bg-pink-500/[0.06] text-text-primary",
  idle: "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover",
};

function RadioRow({
  label,
  hint,
  checked,
  onClick,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      className={cn(RADIO.base, checked ? RADIO.active : RADIO.idle)}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-pink-500" : "border-border-hover"
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-pink-500" />}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-[10px] font-normal text-text-muted">{hint}</span>}
      </span>
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-card-hover/40 px-3 py-2.5 text-xs text-text-primary transition-colors hover:border-border-hover">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-pink-500"
      />
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-[10px] font-normal text-text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function mapRegistered(students: QuizResponseStudent[]): PdfStudent[] {
  return students
    .filter((s) => s.first_name || s.username || s.rollno)
    .map((s) => ({
      id: s.user_id,
      name: [s.first_name, s.last_name].filter(Boolean).join(" ").trim() || undefined,
      username: s.username || undefined,
      rollNo: s.rollno || undefined,
    }));
}

export interface PaperDownloadConfig {
  options: PaperOptions;
  mode: PaperDownloadMode;
  students: PdfStudent[];
  instructions: string;
}

export default function PdfConfigModal({
  open,
  onClose,
  questions,
  meta,
  quizId,
  shuffleDefaults,
  generating,
  onDownload,
}: {
  open: boolean;
  onClose: () => void;
  questions: PaperQuestion[];
  meta: PaperMeta;
  quizId?: string | number | null;
  shuffleDefaults?: { shuffleQuestions?: boolean; shuffleOptions?: boolean };
  generating?: boolean;
  onDownload: (kind: PaperDownloadKind, config: PaperDownloadConfig) => void;
}) {
  const [options, setOptions] = useState<PaperOptions>({
    includeAnswerKey: false,
    showStudentBlock: true,
    shuffleQuestions: shuffleDefaults?.shuffleQuestions ?? false,
    shuffleOptions: shuffleDefaults?.shuffleOptions ?? false,
    layout: "single",
  });
  const [mode, setMode] = useState<PdfGenerationMode>("single");
  const [registered, setRegistered] = useState<PdfStudent[]>([]);
  const [manualMode, setManualMode] = useState<"all" | "manual">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [instructionsDraft, setInstructionsDraft] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    content: true,
    instructions: true,
    layout: false,
    generation: false,
  });

  const [fontCss, setFontCss] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [scale, setScale] = useState(0.6);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const defaultInstructions = useMemo(
    () =>
      meta.instructions?.trim() ? meta.instructions : paperInstructionLines(meta, questions).join("\n"),
    [meta, questions]
  );
  const instructions = instructionsDraft ?? defaultInstructions;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadPaperFontCss()
      .then((css) => {
        if (!cancelled) setFontCss(css);
      })
      .catch(() => {
        if (!cancelled) toast.error({ title: "Fonts failed to load", description: "Could not load the print fonts." });
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !quizId) return;
    getQuizResponses(String(quizId))
      .then((res) => setRegistered(mapRegistered(res.students)))
      .catch(() => setRegistered([]))
      .finally(() => setLoadingStudents(false));
  }, [open, quizId]);

  const takingStudents = useMemo(() => {
    if (mode === "single") return [];
    const pool = registered;
    if (manualMode === "all") return pool;
    return pool.filter((s) => selectedIds.includes(s.id));
  }, [mode, registered, manualMode, selectedIds]);

  const previewStudent = useMemo(() => {
    if (options.showStudentBlock === false) return null;
    if (mode === "single") return null;
    return takingStudents[0] ?? null;
  }, [options.showStudentBlock, mode, takingStudents]);

  const prepared = useMemo(
    () => preparePaperQuestions(questions, options),
    // Re-shuffle intentionally when shuffle toggles flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions, options.shuffleQuestions, options.shuffleOptions]
  );

  const previewMeta = useMemo(() => ({ ...meta, instructions }), [meta, instructions]);

  useEffect(() => {
    if (!open || !fontCss) return;
    const timer = setTimeout(() => {
      setPreviewHtml(
        buildPaperPreviewDocument(
          {
            meta: previewMeta,
            questions: prepared,
            options,
            students: previewStudent ? [previewStudent] : null,
          },
          fontCss,
          "paper"
        )
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [open, fontCss, previewMeta, prepared, options, previewStudent]);

  useEffect(() => {
    if (!open) return;
    const el = previewWrapRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth - 8;
      setScale(Math.max(0.25, Math.min(1, width / A4_WIDTH_PX)));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const handleDownload = (kind: PaperDownloadKind) => {
    const students = mode === "single" ? [] : takingStudents;
    if (mode !== "single" && students.length === 0) {
      toast.error({
        title: "No students selected",
        description: "Add registered students or choose a single question paper.",
        timestamp: "Just now",
      });
      return;
    }
    onDownload(kind, { options, mode, students, instructions });
  };

  const summary = [
    mode === "single" ? "Single paper" : `${takingStudents.length} student paper${takingStudents.length !== 1 ? "s" : ""}`,
    options.layout === "two-column" ? "Two columns" : "Single column",
    options.includeAnswerKey ? "Answer key page" : "No answers",
    options.showStudentBlock ? "Student block" : "No student block",
    options.shuffleQuestions || options.shuffleOptions ? "Shuffled" : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Configure question paper PDF"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[calc(100dvh-3rem)] w-full max-w-[1060px] flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_30px_90px_-20px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card-hover/60 text-accent">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Download Question Paper</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Print-ready A4 PDF with the live preview below.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2">
              <div className="space-y-3 overflow-y-auto border-b border-border p-5 lg:border-b-0 lg:border-r">
                <Section
                  title="Content"
                  summary={options.includeAnswerKey ? "With answer key" : "Questions only"}
                  open={openSections.content}
                  onToggle={() => setOpenSections((s) => ({ ...s, content: !s.content }))}
                >
                  <div className="space-y-1.5">
                    <ToggleRow
                      label="Include answer key"
                      hint="Adds a separate answer key page at the end of the PDF."
                      checked={!!options.includeAnswerKey}
                      onChange={(value) => setOptions((o) => ({ ...o, includeAnswerKey: value }))}
                    />
                    <ToggleRow
                      label="Include student details block"
                      hint="Name / Roll No / Section lines at the top of the paper."
                      checked={options.showStudentBlock !== false}
                      onChange={(value) => setOptions((o) => ({ ...o, showStudentBlock: value }))}
                    />
                    <ToggleRow
                      label="MCQ answer bubbles"
                      hint="Print a ○ before each option for circling or ticking."
                      checked={!!options.mcqBubbles}
                      onChange={(value) => setOptions((o) => ({ ...o, mcqBubbles: value }))}
                    />
                    <ToggleRow
                      label="Shuffle questions"
                      hint="Change the question order in the generated paper."
                      checked={!!options.shuffleQuestions}
                      onChange={(value) => setOptions((o) => ({ ...o, shuffleQuestions: value }))}
                    />
                    <ToggleRow
                      label="Shuffle options"
                      hint="Change the option order inside each question."
                      checked={!!options.shuffleOptions}
                      onChange={(value) => setOptions((o) => ({ ...o, shuffleOptions: value }))}
                    />
                  </div>
                </Section>

                <Section
                  title="Instructions"
                  summary="General instructions"
                  open={openSections.instructions}
                  onToggle={() => setOpenSections((s) => ({ ...s, instructions: !s.instructions }))}
                >
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-text-primary">
                      General instructions
                    </span>
                    <textarea
                      value={instructions}
                      onChange={(event) => setInstructionsDraft(event.target.value)}
                      rows={5}
                      className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent/60"
                    />
                    <span className="mt-1.5 block text-[10px] text-text-muted">
                      These instructions are already used on the paper. Edit them if you want different wording — one
                      instruction per line. Clear the box to use the defaults.
                    </span>
                  </label>
                </Section>

                <Section
                  title="Layout"
                  summary={options.layout === "two-column" ? "Two columns" : "Single column"}
                  open={openSections.layout}
                  onToggle={() => setOpenSections((s) => ({ ...s, layout: !s.layout }))}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <RadioRow
                      label="Single Column"
                      hint="One question per row, full width."
                      checked={options.layout !== "two-column"}
                      onClick={() => setOptions((o) => ({ ...o, layout: "single" }))}
                    />
                    <RadioRow
                      label="Two Columns"
                      hint="Compact layout; wide content spans fully."
                      checked={options.layout === "two-column"}
                      onClick={() => setOptions((o) => ({ ...o, layout: "two-column" }))}
                    />
                  </div>
                </Section>

                <Section
                  title="PDF Generation"
                  summary={mode}
                  open={openSections.generation}
                  onToggle={() => setOpenSections((s) => ({ ...s, generation: !s.generation }))}
                >
                  <div className="grid gap-2">
                    <RadioRow label="Single Question Paper" hint="One generic PDF, no student details." checked={mode === "single"} onClick={() => setMode("single" as PdfGenerationMode)} />
                    <RadioRow label="Individual Student PDFs" hint="One PDF per selected student." checked={mode === "individual"} onClick={() => setMode("individual" as PdfGenerationMode)} />
                    <RadioRow label="Combined PDF" hint="All selected students in one PDF, one section per student." checked={mode === "combined"} onClick={() => setMode("combined" as PdfGenerationMode)} />
                  </div>

                  {mode !== "single" && (
                    <div className="mt-3 space-y-2">
                      {loadingStudents && (
                        <p className="text-[11px] text-text-muted">Loading registered students…</p>
                      )}
                      {!loadingStudents && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <RadioRow label="All registered students" checked={manualMode === "all"} onClick={() => setManualMode("all")} />
                            <RadioRow label="Select students manually" checked={manualMode === "manual"} onClick={() => setManualMode("manual")} />
                          </div>

                          {manualMode === "manual" && (
                            <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-card-hover/30 p-2.5">
                              {registered.length === 0 && (
                                <p className="text-[11px] text-text-muted">No registered students found.</p>
                              )}
                              {registered.map((s) => (
                                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-primary hover:bg-card-hover/70">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(s.id)}
                                    onChange={(e) => {
                                      const id = s.id;
                                      setSelectedIds((ids) => (e.target.checked ? [...ids, id] : ids.filter((x) => x !== id)));
                                    }}
                                    className="h-3.5 w-3.5 accent-pink-500"
                                  />
                                  <span className="min-w-0 truncate">
                                    <span className="block font-medium">{s.name || "Student"}</span>
                                    <span className="block truncate text-[10px] text-text-muted">
                                      {[s.username, s.rollNo].filter(Boolean).join(" • ")}
                                    </span>
                                  </span>
                                </label>
                              ))}
                              {registered.length > 0 && (
                                <div className="flex items-center justify-between pt-1">
                                  <button type="button" onClick={() => setSelectedIds(registered.map((s) => s.id))} className="text-[11px] font-semibold text-accent hover:underline">
                                    Select All
                                  </button>
                                  <button type="button" onClick={() => setSelectedIds([])} className="text-[11px] font-semibold text-text-muted hover:underline">
                                    Clear All
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-[11px] font-medium text-text-muted">
                            {takingStudents.length} student{takingStudents.length !== 1 ? "s" : ""} selected
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </Section>

                <div className="flex items-start gap-2 rounded-xl border border-border bg-card-hover/30 px-3 py-2.5 text-[11px] text-text-muted">
                  <Shuffle className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Tip: use the separate <span className="font-semibold text-text-secondary">Answer Key</span> button below
                    to download a key-only file without question pages.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-card-hover/30 p-5">
                <div
                  ref={previewWrapRef}
                  className="relative w-full overflow-hidden rounded-xl border border-border bg-[#E6E6E6]"
                  style={{ aspectRatio: "210 / 297" }}
                >
                  {previewHtml ? (
                    <iframe
                      title="Question paper preview"
                      srcDoc={previewHtml}
                      sandbox="allow-same-origin"
                      style={{
                        width: A4_WIDTH_PX,
                        height: `${100 / scale}%`,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        border: 0,
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">
                      Loading preview…
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-text-muted">Preview of the first pages. Final PDF is paginated on A4.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-text-muted">{summary}</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-5 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDownload("key")}
                  disabled={generating}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-5 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover disabled:opacity-40"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Answer Key
                </button>
                <button
                  onClick={() => handleDownload("paper")}
                  disabled={generating}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-xs font-bold text-white transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  {generating ? "Generating…" : "Question Paper"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
