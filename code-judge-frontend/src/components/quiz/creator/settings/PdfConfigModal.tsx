"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Download,
  FileImage,
  FileText,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Shuffle,
  SlidersHorizontal,
  Crown,
  X,
} from "lucide-react";
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
import { useMySubscription } from "@/hooks/useMySubscription";
import { canUseCustomHeader } from "@/lib/planAccess";
import { showCustomHeaderUpgrade } from "@/lib/customHeaderUpgrade";
import { getMySubscription } from "@/services/user";
import {
  LETTERHEADS_CHANGED_EVENT,
  listLetterheads,
  updateLetterhead,
} from "@/services/letterheads";
import { useHeaderPlacement } from "@/hooks/useHeaderPlacement";
import { useLetterheadChoice } from "@/hooks/useLetterheadChoice";
import { HeaderAdjustControls } from "@/components/letterheads/HeaderAdjustControls";
import SelectMenu from "@/components/ui/SelectMenu";
import type { HeaderConfig, HeaderPlacement, Letterhead } from "@/types/letterhead";

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
    <div
      className={cn(
        "overflow-hidden rounded-[16px] border-2 bg-[var(--qs-surface)] transition-[border-color,box-shadow]",
        open
          ? "border-[var(--qs-ink)] shadow-[4px_4px_0_var(--qs-sun)]"
          : "border-[var(--qs-line)]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] font-extrabold text-[var(--qs-ink)]">{title}</span>
        <span className="ml-auto flex min-w-0 items-center gap-2">
          {!open && summary && (
            <span className="max-w-[150px] truncate text-[12.5px] font-semibold text-[var(--qs-brand)]">
              {summary}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform",
              open && "rotate-180"
            )}
          />
        </span>
      </button>
      {open && <div className="grid gap-2.5 px-3.5 pb-3.5 pt-1">{children}</div>}
    </div>
  );
}

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
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[12px] border-2 px-3.5 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--qs-ink)]",
        checked
          ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-sun)] dark:border-[var(--qs-sun)] dark:bg-[var(--qs-sun)] dark:text-[#1a1240]"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] hover:border-[var(--qs-brand)]/50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
          checked
            ? "border-[var(--qs-sun)] dark:border-[#1a1240]"
            : "border-[var(--qs-muted)]"
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-[var(--qs-sun)] dark:bg-[#1a1240]" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold leading-snug">{label}</span>
        {hint && (
          <span
            className={cn(
              "mt-0.5 block text-[11px] font-medium leading-snug",
              checked ? "text-[var(--qs-sun)]/80 dark:text-[#1a1240]/75" : "text-[var(--qs-muted)]"
            )}
          >
            {hint}
          </span>
        )}
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
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3 rounded-[14px] border-2 px-3.5 py-3 transition-colors",
        checked
          ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/[0.08]"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]/50"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer pointer-events-none absolute opacity-0"
      />
      <span
        className={cn(
          "mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] border-2 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--qs-ink)]",
          checked
            ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
            : "border-[var(--qs-ink)] bg-[var(--qs-surface)] text-transparent"
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-[var(--qs-ink)]">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[12.5px] font-medium leading-[1.35] text-[var(--qs-muted)]">
            {hint}
          </span>
        )}
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
  header?: HeaderPlacement | null;
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
    optionsPerLine: 1,
  });
  const [mode, setMode] = useState<PdfGenerationMode>("single");
  const [registered, setRegistered] = useState<PdfStudent[]>([]);
  const [manualMode, setManualMode] = useState<"all" | "manual">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [instructionsDraft, setInstructionsDraft] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    content: true,
    instructions: false,
    layout: false,
    generation: false,
  });

  const { subscription, isLoading: planLoading } = useMySubscription();
  const isPro = canUseCustomHeader(subscription);
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [headersLoading, setHeadersLoading] = useState(false);
  const [headersError, setHeadersError] = useState<string | null>(null);
  const [selectedHeaderId, setSelectedHeaderId] = useState<number | null>(null);
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [savingPlacement, setSavingPlacement] = useState(false);
  const headerInitializedRef = useRef(false);
  const headerErrorShownRef = useRef(false);

  const [fontCss, setFontCss] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [scale, setScale] = useState(0.6);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    setSelectedHeaderId(null);
    setHeaderConfig(null);
    setAdjustOpen(false);
    headerInitializedRef.current = false;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

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

  const selectedHeader = useMemo(
    () => letterheads.find((header) => header.id === selectedHeaderId) ?? null,
    [letterheads, selectedHeaderId]
  );

  const {
    placement: headerPlacement,
    loading: headerLoading,
    error: headerError,
    retry: retryHeader,
  } = useHeaderPlacement(
    selectedHeader?.cloudinary,
    headerConfig,
    open && Boolean(isPro && selectedHeader)
  );

  const { chooseHeader: chooseDownloadHeader, dialog: headerChoiceDialog } = useLetterheadChoice();

  useEffect(() => {
    if (!headerError) {
      headerErrorShownRef.current = false;
      return;
    }
    if (headerErrorShownRef.current) return;
    headerErrorShownRef.current = true;
    toast.error({
      title: "Header preview failed",
      description: `${headerError} The standard paper will be used.`,
    });
  }, [headerError]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadHeaders = async (showSpinner: boolean) => {
      if (showSpinner) setHeadersLoading(true);
      setHeadersError(null);
      try {
        const result = await listLetterheads();
        if (cancelled) return;
        setLetterheads(result.letterheads);
        if (!isPro) {
          headerInitializedRef.current = false;
          setSelectedHeaderId(null);
          setHeaderConfig(null);
          setAdjustOpen(false);
          return;
        }
        if (!headerInitializedRef.current) {
          headerInitializedRef.current = true;
          const preferred =
            result.letterheads.find((header) => header.isDefault) ??
            result.letterheads[0] ??
            null;
          if (preferred) {
            setSelectedHeaderId(preferred.id);
            setHeaderConfig(preferred.headerConfig);
          }
        }
      } catch {
        if (!cancelled) setHeadersError("Could not load your saved headers.");
      } finally {
        if (!cancelled && showSpinner) setHeadersLoading(false);
      }
    };
    void loadHeaders(true);
    const onChanged = () => void loadHeaders(false);
    window.addEventListener(LETTERHEADS_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(LETTERHEADS_CHANGED_EVENT, onChanged);
    };
  }, [open, isPro]);

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
            header: headerPlacement,
          },
          fontCss,
          "paper"
        )
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [open, fontCss, previewMeta, prepared, options, previewStudent, headerPlacement]);

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

  const runDownload = (kind: PaperDownloadKind, header: HeaderPlacement | null) => {
    const students = mode === "single" ? [] : takingStudents;
    if (mode !== "single" && students.length === 0) {
      toast.error({
        title: "No students selected",
        description: "Add registered students or choose a single question paper.",
        timestamp: "Just now",
      });
      return;
    }
    onDownload(kind, { options, mode, students, instructions, header });
  };

  const chooseHeader = (value: string) => {
    if (value === "standard") {
      setSelectedHeaderId(null);
      setHeaderConfig(null);
      setAdjustOpen(false);
      headerInitializedRef.current = true;
      return;
    }
    if (value === "add") {
      if (!isPro) {
        showCustomHeaderUpgrade();
        return;
      }
      window.open("/creator/headers", "_blank", "noopener,noreferrer");
      return;
    }
    if (!isPro) {
      showCustomHeaderUpgrade({
        onContinueStandard: () => {
          setSelectedHeaderId(null);
          setHeaderConfig(null);
        },
      });
      return;
    }
    const next = letterheads.find((header) => String(header.id) === value);
    if (!next) return;
    setSelectedHeaderId(next.id);
    setHeaderConfig(next.headerConfig);
    headerInitializedRef.current = true;
  };

  const saveHeaderPlacement = async () => {
    if (!selectedHeader || !headerConfig || savingPlacement) return;
    setSavingPlacement(true);
    try {
      const updated = await updateLetterhead(selectedHeader.id, {
        headerConfig,
      });
      setLetterheads((current) =>
        current.map((header) => (header.id === updated.id ? updated : header))
      );
      setHeaderConfig(updated.headerConfig);
      setAdjustOpen(false);
      toast.success("Header placement saved.");
    } catch {
      toast.error({
        title: "Could not save placement",
        description: "Your PDF can still use this placement. Please try again to save it.",
      });
    } finally {
      setSavingPlacement(false);
    }
  };

  const handleDownload = async (kind: PaperDownloadKind) => {
    if (kind === "key") {
      runDownload(kind, null);
      return;
    }

    if (isPro && letterheads.length > 1) {
      const choice = await chooseDownloadHeader(letterheads);
      if (choice.status === "cancelled") return;
      runDownload(kind, choice.placement);
      return;
    }

    if (!selectedHeader || !isPro) {
      runDownload(kind, null);
      return;
    }

    try {
      const fresh = await getMySubscription();
      if (!canUseCustomHeader(fresh)) {
        showCustomHeaderUpgrade({
          onContinueStandard: () => runDownload(kind, null),
        });
        return;
      }
    } catch {
      // Keep the current session value when the plan check cannot be reached.
    }

    if (headerLoading) {
      toast.info({
        title: "Preparing your header",
        description: "The placement preview is still updating. Try again in a moment.",
      });
      return;
    }
    if (headerError || !headerPlacement) {
      toast.error({
        title: "Header could not be used",
        description: "Downloading the standard paper instead.",
      });
      runDownload(kind, null);
      return;
    }
    runDownload(kind, headerPlacement);
  };

  const summaryChips = [
    mode === "single" ? "Single paper" : `${takingStudents.length} student paper${takingStudents.length !== 1 ? "s" : ""}`,
    options.layout === "two-column" ? "Two columns" : "Single column",
    options.includeAnswerKey ? "Answer key page" : "No answers",
    options.showStudentBlock ? "Student block" : "No student block",
    options.shuffleQuestions || options.shuffleOptions ? "Shuffled" : "",
  ].filter(Boolean);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5"
            onClick={handleClose}
          >
            <div
              aria-hidden="true"
              className="absolute -inset-4 blur-[14px]"
              style={{
                background:
                  "radial-gradient(40% 30% at 15% 20%, #cfc4ff, transparent 70%), radial-gradient(35% 30% at 85% 80%, #ffe58a, transparent 70%), var(--qs-bg)",
              }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-[#1d1840]/55" />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Configure question paper PDF"
              onClick={(e) => e.stopPropagation()}
              className="qs-ui relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1080px] flex-col overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[8px_8px_0_var(--qs-sun)] sm:max-h-[calc(100dvh-2.5rem)]"
            >
              <header className="flex items-center gap-3.5 border-b-2 border-[var(--qs-line)] px-4 py-3.5 sm:px-[22px] sm:py-[18px]">
                <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240] shadow-[2px_2px_0_var(--qs-ink)]">
                  <FileText className="h-[22px] w-[22px]" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold leading-tight tracking-[-0.02em] text-[var(--qs-ink)] sm:text-[22px]">
                    Download Question Paper
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)] sm:text-[13px]">
                    Print-ready A4 PDF with the live preview on the right.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-ink)] hover:bg-[var(--qs-bg)]"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2.4} />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[1fr_1.08fr] lg:overflow-hidden">
                <div className="min-h-0 space-y-3 bg-[var(--qs-bg)] p-4 sm:p-[22px] lg:overflow-y-auto">
                  <Section
                    title="Content"
                    summary={options.includeAnswerKey ? "With answer key" : "Questions only"}
                    open={openSections.content}
                    onToggle={() => setOpenSections((s) => ({ ...s, content: !s.content }))}
                  >
                    <div className="grid gap-2">
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
                      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        General instructions
                      </span>
                      <textarea
                        value={instructions}
                        onChange={(event) => setInstructionsDraft(event.target.value)}
                        rows={5}
                        className="w-full resize-y rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2.5 text-xs font-medium leading-relaxed text-[var(--qs-ink)] outline-none transition placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                      />
                      <span className="mt-1.5 block text-[10.5px] font-medium leading-relaxed text-[var(--qs-muted)]">
                        These instructions are already used on the paper. Edit them if you want different wording — one
                        instruction per line. Clear the box to use the defaults.
                      </span>
                    </label>
                  </Section>

                  <Section
                    title="Layout"
                    summary={`${
                      options.layout === "two-column" ? "Two columns" : "Single column"
                    } · ${options.optionsPerLine ?? 1}/line`}
                    open={openSections.layout}
                    onToggle={() => setOpenSections((s) => ({ ...s, layout: !s.layout }))}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
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
                    <div className="mt-1 border-t-2 border-[var(--qs-line)] pt-3">
                      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        MCQ answer options
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <RadioRow
                          label="1 per line"
                          checked={options.optionsPerLine === 1}
                          onClick={() => setOptions((o) => ({ ...o, optionsPerLine: 1 }))}
                        />
                        <RadioRow
                          label="2 per line"
                          checked={options.optionsPerLine === 2}
                          onClick={() => setOptions((o) => ({ ...o, optionsPerLine: 2 }))}
                        />
                        <RadioRow
                          label="4 per line"
                          checked={options.optionsPerLine === 4}
                          onClick={() => setOptions((o) => ({ ...o, optionsPerLine: 4 }))}
                        />
                      </div>
                      <p className="mt-1.5 text-[10.5px] font-medium text-[var(--qs-muted)]">
                        Long options wrap inside their column instead of running off the page.
                      </p>
                    </div>
                  </Section>

                  <Section
                    title="PDF Generation"
                    summary={
                      mode === "single"
                        ? "Single paper"
                        : mode === "individual"
                          ? "Individual PDFs"
                          : "Combined PDF"
                    }
                    open={openSections.generation}
                    onToggle={() => setOpenSections((s) => ({ ...s, generation: !s.generation }))}
                  >
                    <div className="grid gap-2">
                      <RadioRow label="Single Question Paper" hint="One generic PDF, no student details." checked={mode === "single"} onClick={() => setMode("single" as PdfGenerationMode)} />
                      <RadioRow label="Individual Student PDFs" hint="One PDF per selected student." checked={mode === "individual"} onClick={() => setMode("individual" as PdfGenerationMode)} />
                      <RadioRow label="Combined PDF" hint="All selected students in one PDF, one section per student." checked={mode === "combined"} onClick={() => setMode("combined" as PdfGenerationMode)} />
                    </div>

                    {mode !== "single" && (
                      <div className="mt-1 grid gap-2.5">
                        {loadingStudents && (
                          <p className="text-[11px] font-medium text-[var(--qs-muted)]">Loading registered students…</p>
                        )}
                        {!loadingStudents && (
                          <>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <RadioRow label="All registered students" checked={manualMode === "all"} onClick={() => setManualMode("all")} />
                              <RadioRow label="Select students manually" checked={manualMode === "manual"} onClick={() => setManualMode("manual")} />
                            </div>

                            {manualMode === "manual" && (
                              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2.5">
                                {registered.length === 0 && (
                                  <p className="text-[11px] font-medium text-[var(--qs-muted)]">No registered students found.</p>
                                )}
                                {registered.map((s) => (
                                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-xs text-[var(--qs-ink)] hover:bg-[var(--qs-surface)]">
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(s.id)}
                                      onChange={(e) => {
                                        const id = s.id;
                                        setSelectedIds((ids) => (e.target.checked ? [...ids, id] : ids.filter((x) => x !== id)));
                                      }}
                                      className="h-3.5 w-3.5 accent-[var(--qs-brand)]"
                                    />
                                    <span className="min-w-0 truncate">
                                      <span className="block font-extrabold">{s.name || "Student"}</span>
                                      <span className="block truncate text-[10px] font-medium text-[var(--qs-muted)]">
                                        {[s.username, s.rollNo].filter(Boolean).join(" • ")}
                                      </span>
                                    </span>
                                  </label>
                                ))}
                                {registered.length > 0 && (
                                  <div className="flex items-center justify-between pt-1">
                                    <button type="button" onClick={() => setSelectedIds(registered.map((s) => s.id))} className="text-[11px] font-extrabold text-[var(--qs-brand)] hover:underline">
                                      Select All
                                    </button>
                                    <button type="button" onClick={() => setSelectedIds([])} className="text-[11px] font-extrabold text-[var(--qs-muted)] hover:underline">
                                      Clear All
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-[11px] font-semibold text-[var(--qs-muted)]">
                              {takingStudents.length} student{takingStudents.length !== 1 ? "s" : ""} selected
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </Section>

                  <div className="flex items-start gap-2.5 rounded-[14px] border-2 border-dashed border-[var(--qs-brand)]/40 px-3.5 py-3 text-[12.5px] font-medium leading-[1.45] text-[var(--qs-muted)]">
                    <Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
                    <span>
                      Tip: use the separate <span className="font-extrabold text-[var(--qs-ink)]">Answer Key</span> button
                      below to download a key-only file without question pages.
                    </span>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col gap-3.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 sm:p-[22px] lg:overflow-y-auto lg:border-l-2 lg:border-t-0">
                  <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-[var(--qs-ink)]">
                        <FileImage className="h-4 w-4 text-[var(--qs-brand)]" />
                        Letterhead
                      </span>
                      {isPro ? (
                        <span className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                          <Crown className="h-3 w-3" />
                          Paid
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => showCustomHeaderUpgrade()}
                          className="inline-flex items-center gap-1 rounded-full border-2 border-[var(--qs-line)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)]/50 hover:text-[var(--qs-brand)]"
                        >
                          <Lock className="h-3 w-3" />
                          Paid feature
                        </button>
                      )}
                    </div>

                    <SelectMenu
                      value={selectedHeader ? String(selectedHeader.id) : "standard"}
                      onChange={chooseHeader}
                      disabled={planLoading || headersLoading}
                      ariaLabel="Choose a letterhead"
                      placeholder="Standard — no custom header"
                      className="mt-2 [&>button]:h-10! [&>button]:rounded-[12px]! [&>button]:border-2! [&>button]:border-[var(--qs-line)]! [&>button]:bg-[var(--qs-surface)]! [&>button]:px-3.5! [&>button]:text-[13px]! [&>button]:font-extrabold! [&>button]:text-[var(--qs-ink)]! [&>button:hover]:border-[var(--qs-ink)]!"
                      menuClassName="rounded-[12px]! border-2! border-[var(--qs-line)]! bg-[var(--qs-surface)]!"
                      items={[
                        { value: "standard", label: "Standard — no custom header" },
                        ...letterheads.map((header) => ({
                          value: String(header.id),
                          label: `${header.name}${header.isDefault ? " (default)" : ""}${
                            !isPro ? " — Paid plan required" : ""
                          }`,
                        })),
                        {
                          value: "add",
                          label: isPro ? "Add new header" : "Add new header (Paid)",
                          action: true,
                        icon: <Plus className="h-3.5 w-3.5" />,
                        },
                      ]}
                    />

                    {isPro && letterheads.length > 1 && (
                      <p className="mt-1 text-[10.5px] font-medium text-[var(--qs-muted)]">
                        Preview any header here. You&apos;ll choose which one to use each time you download.
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustOpen((value) => !value)}
                        disabled={!selectedHeader || !isPro || headerLoading}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 text-[12px] font-extrabold text-[var(--qs-ink)] transition hover:bg-[var(--qs-bg)] disabled:cursor-not-allowed disabled:border-[var(--qs-line)] disabled:text-[var(--qs-muted)] disabled:opacity-60"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Adjust
                      </button>
                      {selectedHeader && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--qs-muted)]">
                          {headerLoading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Preparing…
                            </>
                          ) : headerError ? (
                            <button type="button" onClick={retryHeader} className="font-extrabold text-[var(--qs-bad)] hover:underline">
                              Retry header
                            </button>
                          ) : (
                            <>
                              <FileImage className="h-3 w-3" />
                              {headerConfig?.repeatOnAllPages ? "Every page" : "First page"}
                            </>
                          )}
                        </span>
                      )}
                      {headersError && (
                        <span className="text-[10.5px] font-semibold text-[var(--qs-muted)]">{headersError}</span>
                      )}
                    </div>

                    {!isPro && !planLoading && (
                      <p className="mt-2 text-[10.5px] font-medium leading-relaxed text-[var(--qs-muted)]">
                        Standard papers still download normally. Upgrade to place your own letterhead.
                      </p>
                    )}

                    {adjustOpen && selectedHeader && headerConfig && isPro && (
                      <div className="mt-3 border-t-2 border-[var(--qs-line)] pt-3">
                        <HeaderAdjustControls
                          config={headerConfig}
                          onChange={setHeaderConfig}
                          disabled={savingPlacement}
                          compact
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setHeaderConfig(selectedHeader.headerConfig);
                              setAdjustOpen(false);
                            }}
                            disabled={savingPlacement}
                            className="inline-flex h-8 items-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11px] font-extrabold text-[var(--qs-ink)] hover:bg-[var(--qs-bg)] disabled:opacity-40"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveHeaderPlacement()}
                            disabled={savingPlacement}
                            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3 text-[11px] font-extrabold text-[var(--qs-on-brand)] hover:brightness-105 disabled:opacity-40"
                          >
                            {savingPlacement && <Loader2 className="h-3 w-3 animate-spin" />}
                            Save to this header
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)]">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-extrabold text-[var(--qs-brand)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--qs-ok)] shadow-[0_0_0_3px_var(--qs-okbg)]" />
                      Live preview
                    </div>
                    <div className="px-3 pb-3">
                      <div
                        ref={previewWrapRef}
                        className="relative w-full overflow-hidden rounded-[4px] border-2 border-[var(--qs-ink)] bg-white shadow-[5px_5px_0_var(--qs-sun)]"
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
                          <div className="flex h-full items-center justify-center text-xs font-semibold text-[var(--qs-muted)]">
                            Loading preview…
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10.5px] font-medium text-[var(--qs-muted)]">
                    Preview of the first pages. Final PDF is paginated on A4.
                  </p>
                </div>
              </div>

              <footer className="flex flex-wrap items-center gap-3.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5 sm:px-[22px]">
                <div className="flex min-w-[240px] flex-1 flex-wrap gap-1.5" aria-live="polite">
                  {summaryChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-[var(--qs-brand)]/10 px-2.5 py-1 text-[11px] font-extrabold text-[var(--qs-brand)]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <button
                    onClick={handleClose}
                    className="inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 text-xs font-extrabold text-[var(--qs-ink)] transition hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-px active:shadow-none sm:flex-none sm:px-4 sm:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDownload("key")}
                    disabled={generating}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 text-xs font-extrabold text-[var(--qs-ink)] transition hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
                  >
                    <KeyRound className="hidden h-4 w-4 sm:block" />
                    Answer Key
                  </button>
                  <button
                    onClick={() => handleDownload("paper")}
                    disabled={generating}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 text-xs font-extrabold text-[#1a1240] shadow-[0_4px_0_var(--qs-ink)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--qs-ink)] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
                  >
                    <Download className="hidden h-4 w-4 sm:block" />
                    {generating ? "Generating…" : "Question Paper"}
                  </button>
                </div>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {headerChoiceDialog}
    </>
  );
}

