"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode2,
  FileImage,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  SlidersHorizontal,
  Target,
  Plus,
  Minus,
  Loader2,
  Lock,
  Clock,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { generateQuestionsFromFiles, generateFromQuestionBank, mapRawQuestionsToPreview } from "@/services/ai";
import { getQuestionGeneratorCatalog } from "@/services/aiGenerate";
import type { QuestionGeneratorCatalog } from "@/services/aiGenerate";
import { toast } from "@/lib/toast";
import type { AIQuestionPreview } from "@/services/ai";
import type { CreatorQuestion } from "../types";
import { mapToCreatorQuestions } from "@/utils/aiToCreatorQuestion";
import AIQuestionReviewOverlay from "@/components/quiz/creator/AIQuestionReviewOverlay";
import { AiStreamText } from "@/components/ui";
import { QsSelect } from "@/components/creator/problems/QsSelect";
import { AiGenerateButton } from "@/components/creator/common/AiGenerateButton";

const ACCEPT = [
  ".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".yml", ".yaml",
  ".sql", ".log", ".ini", ".toml",
  ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".c", ".cpp", ".cc", ".h", ".hpp",
  ".go", ".rs", ".rb", ".php", ".sh", ".bash",
  ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".xlsm", ".zip",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
].join(",");

const MAX_SIZE_MB = 20;
const MAX_BANK_QUESTIONS = 25;
const MAX_QUIZ_QUESTIONS = 25;
const FILE_GENERATION_COUNT = 20;

function getQuizLimitError(existingCount: number, requestedCount: number): string | null {
  const total = existingCount + requestedCount;
  if (total <= MAX_QUIZ_QUESTIONS) return null;
  if (existingCount >= MAX_QUIZ_QUESTIONS) {
    return `This quiz already has ${existingCount} questions — the ${MAX_QUIZ_QUESTIONS}-question limit. Remove questions before generating more.`;
  }
  const remaining = MAX_QUIZ_QUESTIONS - existingCount;
  return `This quiz already has ${existingCount} questions. Generating ${requestedCount} more would reach ${total}, over the ${MAX_QUIZ_QUESTIONS}-question limit. You can generate up to ${remaining} more.`;
}

const GENERATION_STEPS = [
  "Reading your subject scope and instructions…",
  "Mapping chapters, topics, and question style…",
  "Drafting clear, exam-ready question stems…",
  "Balancing difficulty and writing explanations…",
  "Checking answers and final quality…",
] as const;

const GENERATION_TIPS = [
  "AI is matching questions to your selected chapters and difficulty mix.",
  "Every question comes with an answer and explanation you can edit.",
  "You can regenerate the set if the difficulty doesn't feel right.",
  "Nothing is added to the quiz until you review and accept the set.",
] as const;

const FILE_EXTENSIONS: Record<string, string[]> = {
  pdf: ["pdf"],
  ppt: ["ppt", "pptx"],
  doc: ["doc", "docx"],
  xls: ["xls", "xlsx", "xlsm", "csv", "tsv"],
  img: ["png", "jpg", "jpeg", "gif", "webp"],
  code: ["ts", "tsx", "js", "jsx", "py", "java", "c", "cpp", "cc", "h", "hpp", "go", "rs", "rb", "php", "sh", "bash"],
  text: ["txt", "md", "json", "xml", "html", "yml", "yaml", "sql", "log", "ini", "toml"],
  zip: ["zip"],
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (FILE_EXTENSIONS.pdf.includes(ext)) return FileText;
  if (FILE_EXTENSIONS.ppt.includes(ext)) return FileText;
  if (FILE_EXTENSIONS.doc.includes(ext)) return FileText;
  if (FILE_EXTENSIONS.xls.includes(ext)) return FileSpreadsheet;
  if (FILE_EXTENSIONS.img.includes(ext)) return FileImage;
  if (FILE_EXTENSIONS.zip.includes(ext)) return FileCode2;
  return FileCode2;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AiGenerateModal({
  open,
  onClose,
  onQuestionsAdded,
  defaultSubjectId = null,
  defaultSubjectName,
  quizId = null,
  currentQuestionCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  onQuestionsAdded: (questions: CreatorQuestion[]) => Promise<void>;
  defaultSubjectId?: number | null;
  defaultSubjectName?: string;
  quizId?: string | null;
  currentQuestionCount?: number;
}) {
  const [mode, setMode] = useState<"own" | "bank">("own");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [lastAction, setLastAction] = useState<"own" | "bank">("own");
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  // Review-before-add: generated questions wait in the overlay until accepted.
  // Nothing is saved to the server before the creator accepts.
  const [reviewQuestions, setReviewQuestions] = useState<AIQuestionPreview[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Topic controls — balanced 10-question default 4/3/3
  const [bankNumber, setBankNumber] = useState(10);
  const [bankEasy, setBankEasy] = useState(4);
  const [bankMedium, setBankMedium] = useState(3);
  const [bankHard, setBankHard] = useState(3);
  const [bankSyllabus, setBankSyllabus] = useState("");
  // `undefined` means "not chosen yet" — the quiz's own subject is shown by
  // default without needing an effect to sync it on every open.
  const [bankSubjectChoice, setBankSubjectChoice] = useState<number | null | undefined>(undefined);
  // A quiz is always bound to one subject: once the quiz has a subject, the
  // generator must not drift to another subject. Other entry points without a
  // quiz subject can still pick one.
  const subjectLocked = defaultSubjectId != null;
  const bankSubjectId = subjectLocked
    ? defaultSubjectId
    : bankSubjectChoice === undefined
      ? null
      : bankSubjectChoice;
  const [bankChapterIds, setBankChapterIds] = useState<number[]>([]);
  const [bankTopicIds, setBankTopicIds] = useState<number[]>([]);
  const [bankKind, setBankKind] = useState<"any" | "theory" | "numerical">("any");
  const [catalog, setCatalog] = useState<QuestionGeneratorCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    getQuestionGeneratorCatalog(controller.signal)
      .then((data) => {
        if (active) {
          setCatalog(data);
          setCatalogError("");
        }
      })
      .catch((err) => {
        if (active && err?.name !== "AbortError") {
          setCatalogError(err?.message || "Could not load subjects.");
        }
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!generating) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedSeconds(Math.floor(elapsed / 1000));
      setProgress((current) => Math.min(90, Math.max(current, Math.floor((elapsed / 32_000) * 88))));
      setGenerationStep((current) => {
        const next = Math.min(GENERATION_STEPS.length - 1, Math.floor(elapsed / 5_500));
        return Math.max(current, next);
      });
      setTipIndex(Math.floor(elapsed / 6_500) % GENERATION_TIPS.length);
    }, 500);
    return () => window.clearInterval(timer);
  }, [generating]);

  const subjectOptions = useMemo(() => {
    const base = catalog?.subjects ?? [];
    if (defaultSubjectId != null && !base.some((subject) => subject.id === defaultSubjectId)) {
      return defaultSubjectName
        ? [...base, { id: defaultSubjectId, name: defaultSubjectName }]
        : base;
    }
    return base;
  }, [catalog, defaultSubjectId, defaultSubjectName]);

  const chapterOptions = useMemo(
    () => catalog?.chapters.filter((chapter) => chapter.subjectId === bankSubjectId) ?? [],
    [catalog, bankSubjectId]
  );
  const topicOptions = useMemo(() => {
    const topics = catalog?.topics ?? [];
    const chapterIds = new Set(chapterOptions.map((chapter) => chapter.id));
    return topics.filter((topic) =>
      bankChapterIds.length === 0
        ? chapterIds.has(topic.chapterId)
        : bankChapterIds.includes(topic.chapterId)
    );
  }, [catalog, bankChapterIds, chapterOptions]);

  const lockedSubjectName =
    defaultSubjectName ||
    subjectOptions.find((subject) => subject.id === defaultSubjectId)?.name ||
    "Quiz subject";

  const notifySubjectLocked = () => {
    toast.info({
      title: "Subject is locked to this quiz",
      description: "To generate for another subject, change the quiz subject in the quiz details first.",
    });
  };

  const handleBankChaptersChange = (next: number[]) => {
    setBankChapterIds(next);
    // Empty chapters means "all chapters"; keep the topic selection so the
    // creator can still narrow the scope without re-picking chapters.
    if (next.length === 0) return;
    setBankTopicIds((prev) =>
      prev.filter((topicId) =>
        catalog?.topics.some((topic) => topic.id === topicId && next.includes(topic.chapterId))
      )
    );
  };

  const syncBankDistribution = (total: number) => {
    let e = Math.round(total * 0.4);
    let m = Math.round(total * 0.3);
    let h = total - e - m;
    if (total === 10) { e = 4; m = 3; h = 3; }
    if (h < 0) h = 0;
    setBankEasy(e); setBankMedium(m); setBankHard(h);
  };

  const reset = () => {
    setFiles([]);
    setError("");
    setGenerating(false);
    setGenerationStep(0);
    setGenerationFailed(false);
    setProgress(0);
    setElapsedSeconds(0);
    setTipIndex(0);
    setDone(false);
    setAddedCount(0);
    setBankSyllabus("");
    setBankSubjectChoice(undefined);
    setBankChapterIds([]);
    setBankTopicIds([]);
    setReviewQuestions([]);
    setReviewOpen(false);
    setAccepting(false);
    setAcceptCount(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateFile = useCallback((raw: File): string | null => {
    if (raw.size > MAX_SIZE_MB * 1024 * 1024) {
      return `${raw.name} exceeds the ${MAX_SIZE_MB} MB limit.`;
    }
    return null;
  }, []);

  const addFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      setError("");
      const incoming = Array.from(rawFiles);
      for (const f of incoming) {
        const err = validateFile(f);
        if (err) {
          setError(err);
          return;
        }
      }
      setFiles((prev) => [...prev, ...incoming]);
    },
    [validateFile]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const requestedQuestionCount = mode === "bank" ? bankNumber : FILE_GENERATION_COUNT;
  const remainingQuestionSlots = Math.max(0, MAX_QUIZ_QUESTIONS - currentQuestionCount);
  const quizLimitError = getQuizLimitError(currentQuestionCount, requestedQuestionCount);

  const handleGenerate = async () => {
    if (files.length === 0) return;
    const limitError = getQuizLimitError(currentQuestionCount, FILE_GENERATION_COUNT);
    if (limitError) {
      setLastAction("own");
      setError(limitError);
      return;
    }
    setLastAction("own");
    setGenerating(true);
    setGenerationFailed(false);
    setGenerationStep(0);
    setProgress(6);
    setElapsedSeconds(0);
    setTipIndex(0);
    setError("");

    try {
      const rawQuestions = await generateQuestionsFromFiles(files, {
        numberOfQuestions: FILE_GENERATION_COUNT,
        questionTypes: ["mcq"],
        difficulty: ["easy", "medium", "hard"],
        bloomsLevel: "understand",
        includeExplanations: true,
        includeHints: true,
        includeReferenceNotes: false,
        includeTags: true,
        subjectId: defaultSubjectId,
        quizId,
      });

      const previews = mapRawQuestionsToPreview(rawQuestions);
      if (previews.length === 0) {
        setError("The AI returned no questions. Try a smaller file or add more detail.");
        setGenerationFailed(true);
        setGenerating(false);
        return;
      }
      setProgress(100);
      setReviewQuestions(previews);
      setGenerating(false);
      setReviewOpen(true);
      toast.success(`Generated ${previews.length} questions — review before adding`);
    } catch (err) {
      setError((err as Error).message || "AI generation failed. Please try again.");
      setGenerationFailed(true);
      setGenerating(false);
    }
  };

  const handleGenerateFromBank = async () => {
    if (bankNumber > MAX_BANK_QUESTIONS) {
      setError(`You can generate at most ${MAX_BANK_QUESTIONS} questions at a time.`);
      return;
    }
    const limitError = getQuizLimitError(currentQuestionCount, bankNumber);
    if (limitError) {
      setLastAction("bank");
      setError(limitError);
      return;
    }
    const sum = bankEasy + bankMedium + bankHard;
    if (sum !== bankNumber) {
      setError(`Distribution must sum to ${bankNumber}: Easy ${bankEasy} + Medium ${bankMedium} + Hard ${bankHard} = ${sum}`);
      return;
    }
    if (!bankSubjectId) {
      setError("Please select a subject.");
      return;
    }
    setLastAction("bank");
    setGenerating(true);
    setGenerationFailed(false);
    setGenerationStep(0);
    setProgress(6);
    setElapsedSeconds(0);
    setTipIndex(0);
    setError("");
    const scopedChapterIds = bankChapterIds.length > 0
      ? bankChapterIds
      : [
          ...new Set(
            bankTopicIds
              .map((topicId) => catalog?.topics.find((topic) => topic.id === topicId)?.chapterId)
              .filter((chapterId): chapterId is number => typeof chapterId === "number")
          ),
        ];
    try {
      const rawQuestions = await generateFromQuestionBank({
        numberOfQuestions: bankNumber,
        easyCount: bankEasy,
        mediumCount: bankMedium,
        hardCount: bankHard,
        syllabus: bankSyllabus.trim() || undefined,
        subjectId: bankSubjectId,
        chapterIds: scopedChapterIds,
        topicIds: bankTopicIds,
        kind: bankKind,
        quizId,
      });
      const previews = mapRawQuestionsToPreview(rawQuestions);
      if (previews.length === 0) {
        setError("The AI returned no questions. Try again or widen the chapter/topic scope.");
        setGenerationFailed(true);
        setGenerating(false);
        return;
      }
      setProgress(100);
      setReviewQuestions(previews);
      setGenerating(false);
      setReviewOpen(true);
      toast.success(`Generated ${previews.length} questions (E${bankEasy}·M${bankMedium}·H${bankHard}) — review before adding`);
    } catch (err) {
      setError((err as Error).message || "Question generation failed. Please try again.");
      setGenerationFailed(true);
      setGenerating(false);
    }
  };

  const retryGeneration = () => {
    if (lastAction === "bank") {
      void handleGenerateFromBank();
    } else {
      void handleGenerate();
    }
  };

  // ---- Review overlay actions (mirror AIStudio / AI assistant panel) ----
  // `accepting` drives the loading screen while accepted questions save.
  const [accepting, setAccepting] = useState(false);
  const [acceptCount, setAcceptCount] = useState(0);
  const closeReview = () => {
    if (!accepting) setReviewOpen(false);
  };

  const handleRejectAll = () => {
    setReviewQuestions([]);
    setReviewOpen(false);
    toast.info("AI-generated questions discarded");
  };

  const handleAcceptAll = async () => {
    if (reviewQuestions.length === 0) {
      setReviewOpen(false);
      return;
    }
    if (accepting) return;
    const limitError = getQuizLimitError(currentQuestionCount, reviewQuestions.length);
    if (limitError) {
      toast.error({ title: "Question limit reached", description: limitError });
      return;
    }
    const questions = mapToCreatorQuestions(reviewQuestions);
    setAcceptCount(questions.length);
    setAccepting(true);
    try {
      await onQuestionsAdded(questions);
      setAddedCount(questions.length);
      setReviewQuestions([]);
      setReviewOpen(false);
      setDone(true);
      toast.success(`Added ${questions.length} questions from AI`);
    } catch (err) {
      toast.error("Could not add questions", { description: (err as Error).message || "Please try again." });
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptOne = async (question: AIQuestionPreview) => {
    const limitError = getQuizLimitError(currentQuestionCount, 1);
    if (limitError) {
      toast.error({ title: "Question limit reached", description: limitError });
      return;
    }
    try {
      const questions = mapToCreatorQuestions([question]);
      await onQuestionsAdded(questions);
      setReviewQuestions((prev) => prev.filter((q) => q.id !== question.id));
      toast.success("Question added to the quiz");
    } catch (err) {
      toast.error("Could not add question", { description: (err as Error).message || "Please try again." });
    }
  };

  const handleEditOne = (question: AIQuestionPreview) => {
    setReviewQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, ...question } : q)));
  };

  const canGenerateFromBank = bankEasy + bankMedium + bankHard === bankNumber && !!bankSubjectId;
  const canGenerateFromFiles = files.length > 0 && !error;
  const primaryDisabled = (mode === "bank" ? !canGenerateFromBank : !canGenerateFromFiles) || !!quizLimitError;

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="qs-ui fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4"
          style={{ background: "rgba(26, 18, 64, 0.6)" }}
          onClick={handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-generate-title"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[8px_8px_0_var(--qs-sun)] sm:max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b-2 border-[var(--qs-line)] px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                    AI Question Studio
                  </p>
                  <h3 id="ai-generate-title" className="mt-0.5 text-lg font-extrabold text-[var(--qs-ink)]">
                    <AiStreamText text="Generate with AI" />
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">
                    Currently generates <span className="font-extrabold text-[var(--qs-ink)]">single-correct MCQs only</span> — review everything before adding.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close AI generator"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border-2 border-[var(--qs-line)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode selector */}
            {!done && !generating && (
              <div className="grid shrink-0 grid-cols-2 gap-2 px-4 pt-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => { setMode("own"); setError(""); setGenerationFailed(false); }}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-[14px] border-2 p-2.5 text-left transition-colors",
                    mode === "own"
                      ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                  )}
                >
                  <span className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-2",
                    mode === "own"
                      ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                  )}>
                    <Upload className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-extrabold text-[var(--qs-ink)]">From your material</span>
                    <span className="block truncate text-[10px] font-medium text-[var(--qs-muted)]">PDF, notes, slides</span>
                  </span>
                  {mode === "own" && <Check className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("bank"); setError(""); setGenerationFailed(false); }}
                  className={cn(
                    "flex min-w-0 items-center gap-2.5 rounded-[14px] border-2 p-2.5 text-left transition-colors",
                    mode === "bank"
                      ? "border-[var(--qs-ink)] bg-[var(--qs-poly-1)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                  )}
                >
                  <span className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border-2",
                    mode === "bank"
                      ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]"
                      : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]"
                  )}>
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-extrabold text-[var(--qs-ink)]">Generate by topic</span>
                    <span className="block truncate text-[10px] font-medium text-[var(--qs-muted)]">AI writes fresh MCQs</span>
                  </span>
                  {mode === "bank" && <Check className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />}
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              {done ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-extrabold text-[var(--qs-ink)]">
                    {addedCount} questions added
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
                    Review and edit them anytime in the question editor.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
                  >
                    Done
                  </button>
                </div>
              ) : generating ? (
                <div className="space-y-3 py-2">
                  <div className="relative overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] shadow-[4px_4px_0_var(--qs-poly-3)]">
                    <span className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[var(--qs-brand)]/15 blur-2xl" />
                    <span className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-[var(--qs-sun)]/30 blur-2xl" />
                    <div className="relative p-4 sm:p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="relative shrink-0">
                          <span className="absolute inset-0 rounded-[16px] bg-[var(--qs-brand)]/25 motion-safe:animate-ping motion-reduce:hidden" />
                          <span className="relative grid h-12 w-12 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-sun)] shadow-[3px_3px_0_var(--qs-sun)]">
                            <Sparkles className="h-5 w-5 motion-safe:animate-pulse motion-reduce:animate-none" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-extrabold text-[var(--qs-ink)]">Creating your questions</p>
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--qs-muted)]">
                              <Clock className="h-3 w-3" />
                              {elapsedSeconds}s
                            </span>
                          </div>
                          <p aria-live="polite" className="mt-1 text-[11px] font-medium leading-5 text-[var(--qs-muted)]">
                            {GENERATION_STEPS[generationStep]}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={progress}
                          aria-label="Question generation progress"
                          className="h-2.5 overflow-hidden rounded-full border border-[var(--qs-line)] bg-[var(--qs-surface)]"
                        >
                          <motion.div
                            className="relative h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.4 }}
                          >
                            <span className="absolute inset-y-0 right-0 w-8 bg-white/25 blur-sm" />
                          </motion.div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] font-semibold text-[var(--qs-muted)]">
                          <span>Usually takes about 30 seconds</span>
                          <span className="tabular-nums">{progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1.15fr_0.85fr]">
                    <ul className="space-y-1 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2">
                      {GENERATION_STEPS.map((step, index) => {
                        const isDone = index < generationStep;
                        const isCurrent = index === generationStep;
                        return (
                          <li
                            key={step}
                            className={cn(
                              "flex items-center gap-2.5 rounded-[11px] px-2 py-1.5 text-[11px] font-semibold transition-colors",
                              isCurrent
                                ? "bg-[var(--qs-poly-1)] text-[var(--qs-ink)]"
                                : isDone
                                  ? "text-[var(--qs-muted)]"
                                  : "text-[var(--qs-muted)]/55"
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[9px] font-extrabold",
                                isDone
                                  ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                                  : isCurrent
                                    ? "border-[var(--qs-brand)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                                    : "border-[var(--qs-line)] text-[var(--qs-muted)]"
                              )}
                            >
                              {isDone ? (
                                <Check className="h-3 w-3" />
                              ) : isCurrent ? (
                                <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" />
                              ) : (
                                index + 1
                              )}
                            </span>
                            <span className="flex-1 leading-4">{step}</span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="flex flex-col justify-between gap-2 rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)]/20 p-3.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-[var(--qs-warn)]" />
                          <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-warn)]">
                            While you wait
                          </p>
                        </div>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.p
                            key={tipIndex}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            className="mt-1.5 text-[11px] font-semibold leading-5 text-[var(--qs-ink)]"
                          >
                            {GENERATION_TIPS[tipIndex]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                      <p className="text-[10px] font-medium leading-4 text-[var(--qs-muted)]">
                        Review opens automatically — nothing is added until you accept.
                      </p>
                    </div>
                  </div>
                </div>
              ) : generationFailed ? (
                <div className="py-3" role="alert">
                  <div className="rounded-[18px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] p-5 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-bad)] bg-[var(--qs-surface)] text-[var(--qs-bad)]">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-base font-extrabold text-[var(--qs-ink)]">
                      We couldn&apos;t generate questions
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-5 text-[var(--qs-bad)]">
                      {error || "The AI request failed. Please try again."}
                    </p>
                    <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
                      <AiGenerateButton
                        size="md"
                        label="Try again"
                        onClick={retryGeneration}
                        className="w-full sm:w-auto"
                      />
                      <button
                        type="button"
                        onClick={() => { setGenerationFailed(false); setError(""); }}
                        className="h-10 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] sm:w-auto"
                      >
                        Back to settings
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[10px] font-medium text-[var(--qs-muted)]">
                    Tip: try fewer questions, a narrower topic, or a smaller file.
                  </p>
                </div>
              ) : mode === "bank" ? (
                <div className="space-y-3">
                  {/* Scope */}
                  <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                    <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                      <Target className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Quiz scope
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <div className="min-w-0">
                        <div className="flex h-4 items-center gap-1.5 overflow-hidden">
                          <label
                            htmlFor="ai-bank-subject"
                            className="truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]"
                          >
                            Subject
                          </label>
                          {subjectLocked ? (
                            <span className="shrink-0 rounded-full bg-[var(--qs-poly-2)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
                              from this quiz
                            </span>
                          ) : null}
                        </div>
                        {subjectLocked ? (
                          <>
                            <button
                              id="ai-bank-subject"
                              type="button"
                              onClick={notifySubjectLocked}
                              aria-describedby="ai-bank-subject-locked-hint"
                              title="Subject is locked to this quiz"
                              className="mt-1.5 flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3 text-left transition-colors hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] focus-visible:outline-none"
                            >
                              <span className="truncate text-[12px] font-bold text-[var(--qs-ink)]">
                                {lockedSubjectName}
                              </span>
                              <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" aria-hidden="true" />
                            </button>
                            <p id="ai-bank-subject-locked-hint" className="sr-only">
                              The subject is locked to this quiz. Change the quiz subject to use a different one.
                            </p>
                          </>
                        ) : (
                          <QsSelect
                            id="ai-bank-subject"
                            value={bankSubjectId}
                            onChange={(next) => {
                              setBankSubjectChoice(next);
                              setBankChapterIds([]);
                              setBankTopicIds([]);
                            }}
                            options={subjectOptions.map((subject) => ({ value: subject.id, label: subject.name }))}
                            placeholder={catalogLoading ? "Loading…" : "Select subject"}
                            disabled={catalogLoading}
                            ariaLabel="Subject"
                            searchable
                            triggerClassName="mt-1.5 h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3 text-[12px] font-bold text-[var(--qs-ink)] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex h-4 items-center gap-1.5 overflow-hidden">
                          <label
                            htmlFor="ai-bank-chapter"
                            className="truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]"
                          >
                            Chapter
                          </label>
                          <span className="shrink-0 rounded-full bg-[var(--qs-poly-2)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
                            optional
                          </span>
                        </div>
                        <QsSelect
                          id="ai-bank-chapter"
                          multiple
                          values={bankChapterIds}
                          onValuesChange={handleBankChaptersChange}
                          options={chapterOptions.map((chapter) => ({
                            value: chapter.id,
                            label: chapter.name,
                          }))}
                          placeholder="All chapters"
                          disabled={!bankSubjectId}
                          ariaLabel="Chapters"
                          searchable
                          triggerClassName="mt-1.5 h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3 text-[12px] font-bold text-[var(--qs-ink)] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex h-4 items-center gap-1.5 overflow-hidden">
                          <label
                            htmlFor="ai-bank-topic"
                            className="truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]"
                          >
                            Topic
                          </label>
                          <span className="shrink-0 rounded-full bg-[var(--qs-poly-2)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
                            optional
                          </span>
                        </div>
                        <QsSelect
                          id="ai-bank-topic"
                          multiple
                          values={bankTopicIds}
                          onValuesChange={setBankTopicIds}
                          options={topicOptions.map((topic) => ({
                            value: topic.id,
                            label: topic.name,
                          }))}
                          placeholder="All topics"
                          disabled={!bankSubjectId}
                          ariaLabel="Topics"
                          searchable
                          triggerClassName="mt-1.5 h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3 text-[12px] font-bold text-[var(--qs-ink)] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
                        />
                      </div>
                    </div>
                    {catalogError ? (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--qs-bad)]">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {catalogError}
                      </p>
                    ) : null}
                    <div className="mt-2.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        Question style
                      </p>
                      <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1">
                        {([
                          { value: "any", label: "Mixed" },
                          { value: "theory", label: "Theory" },
                          { value: "numerical", label: "Numerical" },
                        ] as const).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setBankKind(option.value)}
                            className={cn(
                              "h-8 rounded-[9px] text-[11px] font-bold transition-colors",
                              bankKind === option.value
                                ? "bg-[var(--qs-poly-2)] text-[var(--qs-ink)]"
                                : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Syllabus */}
                  <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <label htmlFor="ai-bank-syllabus" className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        <BookOpen className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Syllabus / topics
                      </label>
                      <span className="rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.06em] text-[#1a1240]">
                        Recommended
                      </span>
                    </div>
                    <textarea
                      id="ai-bank-syllabus"
                      value={bankSyllabus}
                      onChange={(event) => setBankSyllabus(event.target.value)}
                      maxLength={4000}
                      rows={4}
                      placeholder={"Paste the topics to cover, one per line:\nProcesses and threads\nCPU scheduling\nExclude virtual memory"}
                      className="mt-2 w-full resize-y rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3 py-2 text-xs font-medium leading-5 text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                    />
                    <div className="mt-2 flex items-start justify-between gap-3 text-[10px] font-medium text-[var(--qs-muted)]">
                      <span className={bankSyllabus.trim() ? "text-[var(--qs-ok)]" : "text-[var(--qs-warn)]"}>
                        <AiStreamText text={bankSyllabus.trim()
                          ? "AI will generate questions only from these topics."
                          : "Add topics for precise questions; otherwise the full subject scope is used."} />
                      </span>
                      <span className="shrink-0 tabular-nums">{bankSyllabus.length}/4000</span>
                    </div>
                  </div>

                  {/* Size + difficulty */}
                  <div className="rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        <Target className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Assessment size
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Fewer questions"
                          onClick={() => { const v = Math.max(5, bankNumber - 1); setBankNumber(v); syncBankDistribution(v); }}
                          className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-extrabold tabular-nums text-[var(--qs-ink)]">
                          {bankNumber}
                        </span>
                        <button
                          type="button"
                          aria-label="More questions"
                          onClick={() => { const v = Math.min(MAX_BANK_QUESTIONS, bankNumber + 1); setBankNumber(v); syncBankDistribution(v); }}
                          className="grid h-8 w-8 place-items-center rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={MAX_BANK_QUESTIONS}
                      value={bankNumber}
                      onChange={(e) => { const v = parseInt(e.target.value); setBankNumber(v); syncBankDistribution(v); }}
                      className="mt-2 w-full accent-[var(--qs-brand)]"
                      aria-label="Number of questions"
                    />

                    <div className="mt-3 border-t-2 border-[var(--qs-line)] pt-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Difficulty split
                      </p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {([
                          { key: "easy", label: "Easy", value: bankEasy, setter: setBankEasy, color: "text-[var(--qs-ok)]" },
                          { key: "medium", label: "Medium", value: bankMedium, setter: setBankMedium, color: "text-[var(--qs-warn)]" },
                          { key: "hard", label: "Hard", value: bankHard, setter: setBankHard, color: "text-[var(--qs-bad)]" },
                        ] as const).map((item) => (
                          <div key={item.key} className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2 text-center">
                            <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.06em]", item.color)}>{item.label}</p>
                            <div className="mt-1 flex items-center justify-center gap-1">
                              <button
                                type="button"
                                aria-label={`Decrease ${item.label}`}
                                onClick={() => item.setter((value) => Math.max(0, value - 1))}
                                className="grid h-6 w-6 place-items-center rounded-[7px] border-2 border-[var(--qs-line)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-sm font-extrabold tabular-nums text-[var(--qs-ink)]">{item.value}</span>
                              <button
                                type="button"
                                aria-label={`Increase ${item.label}`}
                                onClick={() => item.setter((value) => Math.min(bankNumber, value + 1))}
                                className="grid h-6 w-6 place-items-center rounded-[7px] border-2 border-[var(--qs-line)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        className={cn(
                          "mt-2 rounded-[10px] border-2 px-2 py-1 text-center text-[10px] font-extrabold tabular-nums",
                          bankEasy + bankMedium + bankHard === bankNumber
                            ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                            : "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
                        )}
                      >
                        {bankEasy} + {bankMedium} + {bankHard} = {bankEasy + bankMedium + bankHard}{" "}
                        {bankEasy + bankMedium + bankHard === bankNumber ? "· Balanced" : `≠ ${bankNumber} — adjust`}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2.5">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-bad)]" />
                      <p className="text-xs font-semibold text-[var(--qs-bad)]">{error}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                      "cursor-pointer rounded-[18px] border-2 border-dashed p-5 text-center transition-colors",
                      files.length > 0
                        ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-bg)] hover:border-[var(--qs-brand)]"
                    )}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept={ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    {files.length > 0 ? (
                      <div className="space-y-2">
                        {files.map((f, i) => {
                          const Icon = getFileIcon(f.name);
                          return (
                            <div key={`${f.name}-${i}`} className="flex items-center gap-3 text-left">
                              <Icon className="h-6 w-6 shrink-0 text-[var(--qs-ok)]" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-[var(--qs-ink)]">{f.name}</p>
                                <p className="text-[11px] font-medium text-[var(--qs-muted)]">{formatSize(f.size)}</p>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${f.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(i);
                                }}
                                className="grid h-7 w-7 place-items-center rounded-[8px] border-2 border-transparent text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-bad)] hover:text-[var(--qs-bad)]"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            inputRef.current?.click();
                          }}
                          className="mt-1 text-[11px] font-extrabold text-[var(--qs-brand)] hover:underline"
                        >
                          + Add more files
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="mx-auto grid h-11 w-11 place-items-center rounded-[13px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]">
                          <Upload className="h-5 w-5" />
                        </span>
                        <p className="mt-2.5 text-sm font-extrabold text-[var(--qs-ink)]">Drop files here</p>
                        <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">
                          PDF, DOCX, PPTX, Excel, images, code files, and more
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-[var(--qs-muted)]">
                          Max {MAX_SIZE_MB} MB per file
                        </p>
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="mt-3 flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2.5">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-bad)]" />
                      <p className="text-[11px] font-semibold text-[var(--qs-bad)]">{error}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer CTA */}
            {!done && !generating && !generationFailed && (
              <div className="shrink-0 border-t-2 border-[var(--qs-line)] px-4 py-3 sm:px-5">
                {quizLimitError ? (
                  <div className="mb-2 flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-warn)] bg-[var(--qs-bg)] px-3 py-2">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-warn)]" />
                    <p className="text-[11px] font-semibold leading-relaxed text-[var(--qs-ink)]">{quizLimitError}</p>
                  </div>
                ) : currentQuestionCount > 0 ? (
                  <p className="mb-2 text-center text-[10px] font-semibold text-[var(--qs-muted)]">
                    This quiz has {currentQuestionCount} of {MAX_QUIZ_QUESTIONS} questions · {remainingQuestionSlots} slot{remainingQuestionSlots === 1 ? "" : "s"} left
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="h-11 rounded-[12px] border-2 border-[var(--qs-line)] px-4 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                  >
                    Cancel
                  </button>
                  <AiGenerateButton
                    size="md"
                    label={mode === "bank" ? `Generate ${bankNumber} questions` : "Generate questions"}
                    onClick={() => (mode === "bank" ? void handleGenerateFromBank() : void handleGenerate())}
                    disabled={primaryDisabled}
                    className="h-11 flex-1 px-4 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="shrink-0 border-t-2 border-[var(--qs-line)] px-4 py-2 sm:px-5">
              <p className="flex items-start gap-1.5 text-[9px] font-medium leading-4 text-[var(--qs-muted)]">
                <AlertCircle className="mt-px h-2.5 w-2.5 shrink-0" /> AI can make mistakes. Review every question before adding it to your quiz.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    {/* Review overlay — renders after the modal so it paints above it */}
    <AIQuestionReviewOverlay
      open={reviewOpen}
      questions={reviewQuestions}
      onClose={closeReview}
      onAccept={handleAcceptAll}
      onReject={handleRejectAll}
      onAcceptOne={handleAcceptOne}
      onEditOne={handleEditOne}
    />
    {/* Loading screen while accepted questions are being added */}
    <AnimatePresence>
      {accepting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="qs-ui fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: "rgba(26, 18, 64, 0.6)" }}
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-sm rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-7 text-center shadow-[8px_8px_0_var(--qs-sun)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)]">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--qs-line)] border-t-[var(--qs-brand)]" />
            </div>
            <h2 className="mt-4 text-base font-extrabold text-[var(--qs-ink)]">
              Adding {acceptCount} question{acceptCount === 1 ? "" : "s"}…
            </h2>
            <p className="mt-1.5 text-sm font-medium leading-6 text-[var(--qs-muted)]">
              Saving to your quiz. Please keep this window open.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
