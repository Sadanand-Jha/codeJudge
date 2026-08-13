"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  FileText,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  PDF_QUESTION_SIZES,
  PDF_OPTION_SIZES,
  makeDefaultConfig,
  toBaseFont,
  MARGIN_MM,
  pageSizeMm,
  type PdfConfig,
  type PdfStudent,
  type PdfAnswerPlacement,
  type PdfGenerationMode,
} from "@/utils/pdfConfig";
import { getQuizResponses, type QuizResponseStudent } from "@/services/quiz";
import { useQuizSettings } from "@/components/quiz/creator/settings/QuizSettingsContext";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import { type QuizPdfMeta } from "@/utils/quizPdf";
import { toast } from "@/lib/toast";
import PdfPreview from "@/components/quiz/creator/settings/PdfPreview";

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

const CHECK =
  "rounded border border-border bg-card-hover/40 text-xs font-semibold text-text-primary";

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

const FOOTER_OPTIONS: Array<[keyof PdfConfig["footer"], string]> = [
  ["enabled", "Show footer"],
  ["showDateTime", "Date and time"],
  ["showQuizId", "Quiz ID"],
  ["showPageNumber", "Page X of Y"],
];

const PLACEMENTS: { id: PdfConfig["studentDetails"]["placement"]; label: string }[] = [
  { id: "top-left", label: "Top Left" },
  { id: "top-center", label: "Top Center" },
  { id: "top-right", label: "Top Right" },
  { id: "below-header", label: "Below Quiz Header" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right", label: "Bottom Right" },
];

const STUDENT_FIELDS: Array<{ id: PdfConfig["studentDetails"]["fields"][number]; label: string }> = [
  { id: "name", label: "Name" },
  { id: "username", label: "Username" },
  { id: "rollNo", label: "Roll Number" },
];

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

const toSummary = (c: PdfConfig, registeredCount: number, taking: number) => {
  const parts: string[] = [];
  parts.push(c.page.orientation === "portrait" ? "Portrait" : "Landscape");
  parts.push(c.page.size.toUpperCase());
  parts.push(c.page.margins);
  parts.push(c.page.layout === "two-column" ? "2-column" : "Full width");
  parts.push(c.content.includeAnswers ? "With answers" : "Without answers");
  if (c.generation.mode !== "single") {
    parts.push(`${taking} student paper${taking !== 1 ? "s" : ""}`);
  }
  return parts.join(" • ");
};

export default function PdfConfigModal({
  open,
  onClose,
  questions,
  generating,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  questions: import("@/components/quiz/creator/types").CreatorQuestion[];
  generating?: boolean;
  onGenerate: (config: PdfConfig, students: PdfStudent[]) => void;
}) {
  const { quiz, quizId, details } = useQuizSettings();
  const hydrate = useQuizProblemsStore((s) => s.hydrate);

  const [config, setConfig] = useState<PdfConfig>(makeDefaultConfig());
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    content: true,
    layout: false,
    typography: false,
    header: false,
    student: false,
    footer: false,
    generation: false,
  });
  const [registered, setRegistered] = useState<PdfStudent[]>([]);
  const [manualMode, setManualMode] = useState<"all" | "manual">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    getQuizResponses(String(quizId ?? ""))
      .then((res) => setRegistered(mapRegistered(res.students)))
      .catch(() => setRegistered([]))
      .finally(() => setLoadingStudents(false));
  }, [open, quizId]);

  const set = <K extends keyof PdfConfig>(key: K, value: PdfConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const meta: QuizPdfMeta = useMemo(
    () => ({
      quizName: details.name || quiz?.name || "Quiz",
      subject: details.subject,
      difficulty: details.difficulty,
      timeLimit: details.timeLimit ? `${details.timeLimit} min` : undefined,
      topic: details.topic,
      visibility: details.visibility,
      quizId: quiz?.code || quizId,
      creatorName: quiz?.creator_name ?? undefined,
      totalQuestions: questions.length,
      totalMarks: questions.reduce((s, q) => s + (q.marks || 0), 0),
    }),
    [details, quiz, quizId, questions]
  );

  hydrate();

  const takingStudents = useMemo(() => {
    if (config.generation.mode === "single") return [];
    const pool = config.studentDetails.source === "registered" ? registered : [];
    if (manualMode === "all") return pool;
    return pool.filter((s) => selectedIds.includes(s.id));
  }, [config.generation.mode, config.studentDetails.source, registered, manualMode, selectedIds]);

  const previewStudent = useMemo(() => {
    if (!config.studentDetails.enabled) return null;
    if (config.studentDetails.source === "blank") return null;
    return takingStudents[0] ?? registered[0] ?? null;
  }, [config.studentDetails.enabled, config.studentDetails.source, takingStudents, registered]);

  const layout = pageSizeMm(config.page.size, config.page.orientation);

  const handleGenerate = () => {
    const withStudents = config.generation.mode !== "single";
    const list = withStudents ? takingStudents : [];
    if (withStudents && list.length === 0) {
      toast.error({
        title: "No students selected",
        description: "Add registered students or choose a single question paper.",
        timestamp: "Just now",
      });
      return;
    }
    const finalConfig: PdfConfig = {
      ...config,
      generation: {
        ...config.generation,
        selectedStudentIds:
          config.generation.mode === "single" || manualMode === "all"
            ? null
            : selectedIds,
      },
    };
    onGenerate(finalConfig, list);
  };

  const toggleSection = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

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
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card-hover/60 text-accent">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Configure Question Paper</h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Adjust the settings, watch the live preview, then generate.
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

            {/* Body */}
            <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-2">
              {/* Settings */}
              <div className="space-y-3 overflow-y-auto border-b border-border p-5 lg:border-b-0 lg:border-r">
                {/* Content */}
                <Section
                  title="Content"
                  summary={config.content.includeAnswers ? "With answers" : "Without answers"}
                  open={openSections.content}
                  onToggle={() => toggleSection("content")}
                >
                  <div className="grid gap-2">
                    <RadioRow
                      label="Without Answers"
                      hint="Questions and options only."
                      checked={!config.content.includeAnswers}
                      onClick={() => set("content", { ...config.content, includeAnswers: false })}
                    />
                    <RadioRow
                      label="With Answers"
                      hint="Questions + answers + explanations + hints."
                      checked={config.content.includeAnswers}
                      onClick={() => set("content", { ...config.content, includeAnswers: true })}
                    />
                  </div>
                  {config.content.includeAnswers && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Answer placement
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <RadioRow
                          label="After each question"
                          checked={config.content.answerPlacement === "after-question"}
                          onClick={() => set("content", { ...config.content, answerPlacement: "after-question" as PdfAnswerPlacement })}
                        />
                        <RadioRow
                          label="Answer key at end"
                          checked={config.content.answerPlacement === "end"}
                          onClick={() => set("content", { ...config.content, answerPlacement: "end" as PdfAnswerPlacement })}
                        />
                      </div>
                    </div>
                  )}
                </Section>

                {/* Layout */}
                <Section
                  title="Page Layout"
                  summary={`${layout.width}×${layout.height} · ${config.page.margins} margins`}
                  open={openSections.layout}
                  onToggle={() => toggleSection("layout")}
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Layout
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <RadioRow
                      label="Full Width"
                      hint="Single column."
                      checked={config.page.layout === "full-width"}
                      onClick={() => set("page", { ...config.page, layout: "full-width" })}
                    />
                    <RadioRow
                      label="Two Columns"
                      hint="Compact question paper."
                      checked={config.page.layout === "two-column"}
                      onClick={() => set("page", { ...config.page, layout: "two-column" })}
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Page size
                      </label>
                      <div className="grid gap-1.5">
                        {(["a4", "letter"] as const).map((s) => (
                          <button key={s} type="button" onClick={() => set("page", { ...config.page, size: s })} className={cn(CHECK, "flex items-center justify-between px-2.5 py-1.5", config.page.size === s && "border-pink-500/50 bg-pink-500/[0.06] text-accent")}>
                            {s === "a4" ? "A4" : "Letter"}
                            {config.page.size === s && <Check className="h-3 w-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Orientation
                      </label>
                      <div className="grid gap-1.5">
                        {(["portrait", "landscape"] as const).map((o) => (
                          <button key={o} type="button" onClick={() => set("page", { ...config.page, orientation: o })} className={cn(CHECK, "flex items-center justify-between px-2.5 py-1.5", config.page.orientation === o && "border-pink-500/50 bg-pink-500/[0.06] text-accent")}>
                            {o === "portrait" ? "Portrait" : "Landscape"}
                            {config.page.orientation === o && <Check className="h-3 w-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Margins
                      </label>
                      <div className="grid gap-1.5">
                        {(["narrow", "normal", "wide"] as const).map((m) => (
                          <button key={m} type="button" onClick={() => set("page", { ...config.page, margins: m })} className={cn(CHECK, "flex items-center justify-between px-2.5 py-1.5", config.page.margins === m && "border-pink-500/50 bg-pink-500/[0.06] text-accent")}>
                            {m[0].toUpperCase() + m.slice(1)}
                            {m === "normal" && <span className="text-[10px] text-text-muted">{MARGIN_MM[m]}mm</span>}
                            {config.page.margins === m && <Check className="h-3 w-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Typography */}
                <Section
                  title="Typography"
                  summary={`${toBaseFont(config.typography.fontFamily).base} · ${config.typography.questionSize}/${config.typography.optionSize}pt`}
                  open={openSections.typography}
                  onToggle={() => toggleSection("typography")}
                >
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Font family
                  </label>
                  <select
                    value={config.typography.fontFamily}
                    onChange={(e) => set("typography", { ...config.typography, fontFamily: e.target.value as PdfConfig["typography"]["fontFamily"] })}
                    className="w-full rounded-lg border border-border bg-card-hover/40 px-3 py-2 text-xs text-text-primary focus:border-pink-500/50 focus:outline-none"
                  >
                    {["inter", "arial", "times", "georgia", "helvetica"].map((f) => (
                      <option key={f} value={f}>
                        {f === "times" ? "Times New Roman" : f === "helvetica" ? "Helvetica" : f[0].toUpperCase() + f.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Question text
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PDF_QUESTION_SIZES.map((s) => (
                          <button key={s} type="button" onClick={() => set("typography", { ...config.typography, questionSize: s })} className={cn("h-7 min-w-7 rounded-md border px-1.5 text-[11px] font-semibold", config.typography.questionSize === s ? "border-pink-500/50 bg-pink-500/10 text-accent" : "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover")}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Options
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PDF_OPTION_SIZES.map((s) => (
                          <button key={s} type="button" onClick={() => set("typography", { ...config.typography, optionSize: s })} className={cn("h-7 min-w-7 rounded-md border px-1.5 text-[11px] font-semibold", config.typography.optionSize === s ? "border-pink-500/50 bg-pink-500/10 text-accent" : "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover")}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Heading
                      </label>
                      <select value={config.typography.headingSize} onChange={(e) => set("typography", { ...config.typography, headingSize: e.target.value as PdfConfig["typography"]["headingSize"] })} className="w-full rounded-lg border border-border bg-card-hover/40 px-2 py-1.5 text-xs text-text-primary focus:border-pink-500/50 focus:outline-none">
                        {["small", "medium", "large"].map((h) => (
                          <option key={h} value={h}>{h[0].toUpperCase() + h.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Line spacing
                      </label>
                      <select value={config.typography.lineSpacing} onChange={(e) => set("typography", { ...config.typography, lineSpacing: e.target.value as PdfConfig["typography"]["lineSpacing"] })} className="w-full rounded-lg border border-border bg-card-hover/40 px-2 py-1.5 text-xs text-text-primary focus:border-pink-500/50 focus:outline-none">
                        {["compact", "normal", "relaxed"].map((h) => (
                          <option key={h} value={h}>{h[0].toUpperCase() + h.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        Question gap
                      </label>
                      <select value={config.typography.questionSpacing} onChange={(e) => set("typography", { ...config.typography, questionSpacing: e.target.value as PdfConfig["typography"]["questionSpacing"] })} className="w-full rounded-lg border border-border bg-card-hover/40 px-2 py-1.5 text-xs text-text-primary focus:border-pink-500/50 focus:outline-none">
                        {["compact", "normal", "spacious"].map((h) => (
                          <option key={h} value={h}>{h[0].toUpperCase() + h.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </Section>

                {/* Quiz Header */}
                <Section
                  title="Quiz Header"
                  summary="Metadata shown on page 1"
                  open={openSections.header}
                  onToggle={() => toggleSection("header")}
                >
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {(
                      [
                        ["showQuizName", "Quiz Name"],
                        ["showSubject", "Subject"],
                        ["showQuestionCount", "Total Questions"],
                        ["showMarks", "Total Marks"],
                        ["showDuration", "Duration"],
                        ["showDifficulty", "Difficulty"],
                        ["showVisibility", "Visibility"],
                        ["showQuizId", "Quiz ID"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card-hover/40 px-3 py-2 text-xs text-text-primary transition-colors hover:border-border-hover">
                        <input
                          type="checkbox"
                          checked={config.header[key]}
                          onChange={(e) => set("header", { ...config.header, [key]: e.target.checked })}
                          className="h-3.5 w-3.5 accent-pink-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </Section>

                {/* Student Details */}
                <Section
                  title="Student Details"
                  summary={config.studentDetails.enabled ? "Enabled" : "Off"}
                  open={openSections.student}
                  onToggle={() => toggleSection("student")}
                >
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-primary">
                    <input
                      type="checkbox"
                      checked={config.studentDetails.enabled}
                      onChange={(e) => set("studentDetails", { ...config.studentDetails, enabled: e.target.checked })}
                      className="h-3.5 w-3.5 accent-pink-500"
                    />
                    Add student details
                  </label>

                  {config.studentDetails.enabled && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Source</p>
                        <div className="grid grid-cols-2 gap-2">
                          <RadioRow label="Registered Students" checked={config.studentDetails.source === "registered"} onClick={() => set("studentDetails", { ...config.studentDetails, source: "registered" })} />
                          <RadioRow label="Blank fields" checked={config.studentDetails.source === "blank"} onClick={() => set("studentDetails", { ...config.studentDetails, source: "blank" })} />
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Fields</p>
                        <div className="flex flex-wrap gap-1.5">
                          {STUDENT_FIELDS.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                const has = config.studentDetails.fields.includes(f.id);
                                const fields = has
                                  ? config.studentDetails.fields.filter((x) => x !== f.id)
                                  : [...config.studentDetails.fields, f.id];
                                if (fields.length === 0) return;
                                set("studentDetails", { ...config.studentDetails, fields });
                              }}
                              className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", config.studentDetails.fields.includes(f.id) ? "border-pink-500/50 bg-pink-500/10 text-accent" : "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover")}
                            >
                              ✓ {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Placement</p>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {PLACEMENTS.map((p) => (
                            <button key={p.id} type="button" onClick={() => set("studentDetails", { ...config.studentDetails, placement: p.id })} className={cn("rounded-lg border px-2 py-1.5 text-[11px] font-medium", config.studentDetails.placement === p.id ? "border-pink-500/50 bg-pink-500/10 text-accent" : "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover")}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Format</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["inline", "separate-lines", "blank"] as const).map((f) => (
                            <button key={f} type="button" onClick={() => set("studentDetails", { ...config.studentDetails, format: f })} className={cn("rounded-lg border px-2 py-2 text-[10px] font-medium leading-tight", config.studentDetails.format === f ? "border-pink-500/50 bg-pink-500/10 text-accent" : "border-border bg-card-hover/40 text-text-secondary hover:border-border-hover")}>
                              {f === "inline" ? "Inline" : f === "separate-lines" ? "Separate lines" : "Fillable blank"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Section>

                {/* Generation */}
                <Section
                  title="PDF Generation"
                  summary={config.generation.mode}
                  open={openSections.generation}
                  onToggle={() => toggleSection("generation")}
                >
                  <div className="grid gap-2">
                    <RadioRow label="Single Question Paper" hint="One generic PDF, no student details." checked={config.generation.mode === "single"} onClick={() => set("generation", { ...config.generation, mode: "single" as PdfGenerationMode })} />
                    <RadioRow label="Individual Student PDFs" hint="One PDF per selected student." checked={config.generation.mode === "individual"} onClick={() => set("generation", { ...config.generation, mode: "individual" as PdfGenerationMode })} />
                    <RadioRow label="Combined PDF" hint="All selected students in one PDF, one section per student." checked={config.generation.mode === "combined"} onClick={() => set("generation", { ...config.generation, mode: "combined" as PdfGenerationMode })} />
                  </div>

                  {config.generation.mode !== "single" && (
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

                {/* Footer */}
                <Section
                  title="Footer"
                  summary={config.footer.enabled ? "Footer enabled" : "Footer disabled"}
                  open={openSections.footer}
                  onToggle={() => toggleSection("footer")}
                >
                  <div className="space-y-1.5">
                    {FOOTER_OPTIONS.map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card-hover/40 px-3 py-2 text-xs text-text-primary transition-colors hover:border-border-hover">
                        <input
                          type="checkbox"
                          checked={config.footer[key]}
                          onChange={(e) => set("footer", { ...config.footer, [key]: e.target.checked })}
                          className="h-3.5 w-3.5 accent-pink-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </Section>
              </div>

              {/* Preview */}
              <div className="flex flex-col overflow-y-auto bg-card-hover/30 p-5">
                <PdfPreview config={config} meta={meta} questions={questions} student={previewStudent} />
              </div>
            </div>

            {/* Footer / actions */}
            <div className="flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-text-muted">{toSummary(config, registered.length, takingStudents.length)}</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-5 text-xs font-semibold text-text-primary transition-colors hover:bg-card-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-xs font-bold text-white transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  {generating ? "Generating…" : "Generate PDF"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}