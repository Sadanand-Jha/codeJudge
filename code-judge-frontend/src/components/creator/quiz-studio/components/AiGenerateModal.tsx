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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  generateQuestionsFromFiles,
  generateFromQuestionBank,
  generateFromQuestionBankStream,
  mapRawQuestionsToPreview,
} from "@/services/ai";
import { getQuestionGeneratorCatalog } from "@/services/aiGenerate";
import type { QuestionGeneratorCatalog } from "@/services/aiGenerate";
import { toast } from "@/lib/toast";
import type { AIQuestionPreview, LiveUsage, RawAIGeneratedQuestion } from "@/services/ai";
import type { CreatorQuestion } from "../types";
import { mapToCreatorQuestions } from "@/utils/aiToCreatorQuestion";
import AIQuestionReviewOverlay, { type PreviewQuestion } from "@/components/quiz/creator/AIQuestionReviewOverlay";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";
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

/** Turn the model's raw JSON stream into readable text while it is writing. */
function readableStreamText(raw: string): string {
  return raw
    .replace(/```(?:json)?/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/[{}\[\]]/g, "\n")
    .replace(/"[a-zA-Z]+"\s*:/g, "")
    .replace(/"/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(-4000);
}

function getDifficultySplit(total: number, difficulty?: string) {
  const key = (difficulty ?? "").toLocaleLowerCase();
  const ratios = key.includes("easy")
    ? [0.5, 0.3, 0.2]
    : key.includes("hard") || key.includes("expert")
      ? [0.2, 0.3, 0.5]
      : [0.4, 0.3, 0.3];
  let easy = Math.round(total * ratios[0]);
  let medium = Math.round(total * ratios[1]);
  let hard = total - easy - medium;
  if (hard < 0) {
    medium = Math.max(0, medium + hard);
    hard = 0;
  }
  if (total >= 3 && hard === 0) {
    hard = 1;
    if (easy > 1) easy -= 1;
    else medium = Math.max(0, medium - 1);
  }
  return { easy, medium, hard };
}

function getCategorySplit(total: number, theory: number, numerical: number) {
  const selected = theory + numerical;
  const ratio = selected > 0 ? theory / selected : 0.6;
  const nextTheory = Math.max(0, Math.min(total, Math.round(total * ratio)));
  return { theory: nextTheory, numerical: total - nextTheory };
}

function getQuizLimitError(existingCount: number, requestedCount: number): string | null {
  const total = existingCount + requestedCount;
  if (total <= MAX_QUIZ_QUESTIONS) return null;
  if (existingCount >= MAX_QUIZ_QUESTIONS) {
    return `This quiz already has ${existingCount} questions — the ${MAX_QUIZ_QUESTIONS}-question limit. Remove questions before generating more.`;
  }
  const remaining = MAX_QUIZ_QUESTIONS - existingCount;
  return `This quiz already has ${existingCount} questions. Generating ${requestedCount} more would reach ${total}, over the ${MAX_QUIZ_QUESTIONS}-question limit. You can generate up to ${remaining} more.`;
}

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
  defaultDifficulty,
  quizId = null,
  currentQuestionCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  onQuestionsAdded: (questions: CreatorQuestion[]) => Promise<void>;
  defaultSubjectId?: number | null;
  defaultSubjectName?: string;
  defaultDifficulty?: string;
  quizId?: string | null;
  currentQuestionCount?: number;
}) {
  const [mode, setMode] = useState<"own" | "bank">("own");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [lastAction, setLastAction] = useState<"own" | "bank">("own");
  const [progress, setProgress] = useState(0);
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
  const [bankTheory, setBankTheory] = useState(6);
  const [bankNumerical, setBankNumerical] = useState(4);
  const [bankSyllabus, setBankSyllabus] = useState("");
  // AI generation always uses the quiz's own subject. We only load the
  // chapters and topics that belong to that subject.
  const bankSubjectId = defaultSubjectId;
  const [bankChapterIds, setBankChapterIds] = useState<number[]>([]);
  const [bankTopicIds, setBankTopicIds] = useState<number[]>([]);
  const bankKind: "any" | "theory" | "numerical" =
    bankTheory >= bankNumber ? "theory" : bankNumerical >= bankNumber ? "numerical" : "any";
  const [catalogState, setCatalogState] = useState<{
    subjectId: number;
    data: QuestionGeneratorCatalog;
  } | null>(null);
  const [catalogErrorState, setCatalogErrorState] = useState<{
    subjectId: number;
    message: string;
  } | null>(null);
  const catalog = catalogState?.subjectId === defaultSubjectId ? catalogState.data : null;
  const catalogError =
    catalogErrorState?.subjectId === defaultSubjectId ? catalogErrorState.message : "";
  const catalogLoading =
    defaultSubjectId != null &&
    catalogState?.subjectId !== defaultSubjectId &&
    catalogErrorState?.subjectId !== defaultSubjectId;
  const [tokenRate, setTokenRate] = useState<number | null>(null);
  const [thinking, setThinking] = useState("");
  const [streamContent, setStreamContent] = useState("");
  const [liveUsage, setLiveUsage] = useState<LiveUsage | undefined>(undefined);
  const generationStartedAtRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const streamScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = streamScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [thinking, streamContent, open]);

  useEffect(() => {
    if (!open || defaultSubjectId == null) return;
    let active = true;
    const controller = new AbortController();
    getQuestionGeneratorCatalog(controller.signal, defaultSubjectId)
      .then((data) => {
        if (!active) return;
        setCatalogState({ subjectId: defaultSubjectId, data });
        setCatalogErrorState(null);
      })
      .catch((err) => {
        if (!active || err?.name === "AbortError") return;
        setCatalogErrorState({
          subjectId: defaultSubjectId,
          message: err?.message || "Could not load this subject's chapters.",
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, defaultSubjectId]);

  useEffect(() => {
    if (!generating) return;
    const startedAt = Date.now();
    const estimatedTotalTokens = (mode === "bank" ? bankNumber : FILE_GENERATION_COUNT) * 220;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(90, Math.max(1, Math.floor((elapsed / 32_000) * 88)));
      setProgress((current) => Math.min(90, Math.max(current, nextProgress)));
      setTokenRate(
        Math.max(1, Math.round((estimatedTotalTokens * (nextProgress / 100)) / Math.max(0.3, elapsed / 1000)))
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [generating, mode, bankNumber]);

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

  const selectedScopeTree = useMemo(() => {
    if (!catalog) return [];
    const selectedTopicIds = new Set(bankTopicIds);
    const chapterIds = new Set(bankChapterIds);
    for (const topicId of bankTopicIds) {
      const topic = catalog.topics.find((item) => item.id === topicId);
      if (topic) chapterIds.add(topic.chapterId);
    }
    return catalog.chapters
      .filter((chapter) => chapterIds.has(chapter.id))
      .map((chapter) => ({
        id: chapter.id,
        name: chapter.name,
        topics: catalog.topics
          .filter((topic) => topic.chapterId === chapter.id && selectedTopicIds.has(topic.id))
          .map((topic) => topic.name),
      }));
  }, [catalog, bankChapterIds, bankTopicIds]);

  const lockedSubjectName =
    defaultSubjectName ||
    catalog?.subjects.find((subject) => subject.id === defaultSubjectId)?.name ||
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
    const split = getDifficultySplit(total, defaultDifficulty);
    setBankEasy(split.easy);
    setBankMedium(split.medium);
    setBankHard(split.hard);
  };

  const syncBankMix = (total: number) => {
    const split = getCategorySplit(total, bankTheory, bankNumerical);
    setBankTheory(split.theory);
    setBankNumerical(split.numerical);
  };

  const syncBankSize = (total: number) => {
    syncBankDistribution(total);
    syncBankMix(total);
  };

  const setCategoryCount = (kind: "theory" | "numerical", next: number) => {
    const clamped = Math.max(0, Math.min(bankNumber, next));
    if (kind === "theory") {
      setBankTheory(clamped);
      setBankNumerical(bankNumber - clamped);
    } else {
      setBankNumerical(clamped);
      setBankTheory(bankNumber - clamped);
    }
  };

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const split = getDifficultySplit(bankNumber, defaultDifficulty);
      setBankEasy(split.easy);
      setBankMedium(split.medium);
      setBankHard(split.hard);
      const mix = getCategorySplit(bankNumber, bankTheory, bankNumerical);
      setBankTheory(mix.theory);
      setBankNumerical(mix.numerical);
    }
    wasOpenRef.current = open;
  }, [open, defaultDifficulty, bankNumber, bankTheory, bankNumerical]);

  const reset = () => {
    setFiles([]);
    setError("");
    setGenerating(false);
    setGenerationFailed(false);
    setProgress(0);
    setDone(false);
    setAddedCount(0);
    setTokenRate(null);
    setThinking("");
    setStreamContent("");
    setLiveUsage(undefined);
    setBankSyllabus("");
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
    setProgress(6);
    setTokenRate(null);
    setThinking("");
    setStreamContent("");
    setLiveUsage(undefined);
    generationStartedAtRef.current = Date.now();
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
        setTokenRate(null);
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
      setTokenRate(null);
    }
  };

  const getScopedChapterIds = () =>
    bankChapterIds.length > 0
      ? bankChapterIds
      : [
          ...new Set(
            bankTopicIds
              .map((topicId) => catalog?.topics.find((topic) => topic.id === topicId)?.chapterId)
              .filter((chapterId): chapterId is number => typeof chapterId === "number")
          ),
        ];

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
    if (bankTheory + bankNumerical !== bankNumber) {
      setError(`Category split must sum to ${bankNumber}: Theory ${bankTheory} + Numerical ${bankNumerical} = ${bankTheory + bankNumerical}`);
      return;
    }
    if (!bankSubjectId) {
      setError("Choose a subject in Details before generating questions.");
      return;
    }
    setLastAction("bank");
    setGenerating(true);
    setGenerationFailed(false);
    setProgress(6);
    setTokenRate(null);
    generationStartedAtRef.current = Date.now();
    setError("");
    setThinking("");
    setStreamContent("");
    setLiveUsage(undefined);
    const scopedChapterIds = getScopedChapterIds();
    let streamedQuestions: RawAIGeneratedQuestion[] = [];
    try {
      await generateFromQuestionBankStream(
        {
          numberOfQuestions: bankNumber,
          easyCount: bankEasy,
          mediumCount: bankMedium,
          hardCount: bankHard,
          theoryCount: bankTheory,
          numericalCount: bankNumerical,
          syllabus: bankSyllabus.trim() || undefined,
          subjectId: bankSubjectId,
          chapterIds: scopedChapterIds,
          topicIds: bankTopicIds,
          kind: bankKind,
          quizId,
        },
        {
          onReasoning: (chunk) => setThinking((prev) => prev + chunk),
          onContent: (chunk) => setStreamContent((prev) => prev + chunk),
          onQuestions: (questions) => {
            streamedQuestions = questions;
          },
          onUsage: ({ usage }) => {
            if (!usage) return;
            setLiveUsage(usage);
            const tokens = usage.outputTokens ?? usage.totalTokens;
            if (!tokens) return;
            const seconds = Math.max(0.3, (Date.now() - generationStartedAtRef.current) / 1000);
            setTokenRate(Math.round(tokens / seconds));
          },
          onError: (message) => setError(message),
        }
      );
      const previews = mapRawQuestionsToPreview(streamedQuestions);
      if (previews.length === 0) {
        setError("The AI returned no questions. Try again or widen the chapter/topic scope.");
        setGenerationFailed(true);
        setGenerating(false);
        setTokenRate(null);
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
      setTokenRate(null);
    }
  };

  const handleRegenerateQuestion = async (question: PreviewQuestion) => {
    try {
      let rawQuestions: RawAIGeneratedQuestion[];
      if (mode === "bank") {
        if (!bankSubjectId) throw new Error("Choose a subject in Details before regenerating.");
        const difficulty = question.difficulty === "expert" ? "hard" : question.difficulty;
        rawQuestions = await generateFromQuestionBank({
          numberOfQuestions: 1,
          easyCount: difficulty === "easy" ? 1 : 0,
          mediumCount: difficulty === "medium" ? 1 : 0,
          hardCount: difficulty === "hard" ? 1 : 0,
          theoryCount: bankKind === "theory" ? 1 : bankKind === "numerical" ? 0 : undefined,
          numericalCount: bankKind === "numerical" ? 1 : bankKind === "theory" ? 0 : undefined,
          syllabus: bankSyllabus.trim() || undefined,
          subjectId: bankSubjectId,
          chapterIds: getScopedChapterIds(),
          topicIds: bankTopicIds,
          kind: bankKind,
          quizId,
        });
      } else {
        if (files.length === 0) throw new Error("Uploaded files are no longer available.");
        rawQuestions = await generateQuestionsFromFiles(files, {
          numberOfQuestions: 1,
          questionTypes: ["mcq"],
          difficulty: [question.difficulty],
          bloomsLevel: "understand",
          includeExplanations: true,
          includeHints: true,
          includeReferenceNotes: false,
          includeTags: true,
          subjectId: defaultSubjectId,
          quizId,
        });
      }
      const preview = mapRawQuestionsToPreview(rawQuestions)[0];
      if (!preview) throw new Error("The AI returned no question. Please try again.");
      setReviewQuestions((previous) =>
        previous.map((item) => (item.id === question.id ? preview : item))
      );
      toast.success(`Question regenerated (${question.difficulty})`);
    } catch (err) {
      toast.error({
        title: "Could not regenerate question",
        description: (err as Error).message || "Please try again.",
      });
      throw err;
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
    setProgress(0);
    setTokenRate(null);
    setThinking("");
    setStreamContent("");
    setLiveUsage(undefined);
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

  const canGenerateFromBank =
    bankEasy + bankMedium + bankHard === bankNumber &&
    bankTheory + bankNumerical === bankNumber &&
    !!bankSubjectId;
  const canGenerateFromFiles = files.length > 0 && !error;
  const primaryDisabled = (mode === "bank" ? !canGenerateFromBank : !canGenerateFromFiles) || !!quizLimitError;

  const liveTotal = mode === "bank" ? bankNumber : FILE_GENERATION_COUNT;
  const liveDraftCount = generating
    ? Math.min(liveTotal, Math.max(1, Math.ceil((progress / 100) * liveTotal)))
    : 0;
  const liveCards = Array.from(
    { length: Math.min(liveDraftCount, 8) },
    (_, offset) => {
      const index = Math.max(0, liveDraftCount - Math.min(liveDraftCount, 8) + offset);
      const difficulty =
        mode === "bank"
          ? index < bankEasy
            ? "Easy"
            : index < bankEasy + bankMedium
              ? "Medium"
              : "Hard"
          : (["Easy", "Medium", "Hard"] as const)[index % 3];
      const kind =
        mode === "bank"
          ? index < bankTheory
            ? "Theory"
            : "Numerical"
          : "MCQ";
      return { index, difficulty, kind };
    }
  );
  const reviewReady = !generating && reviewQuestions.length > 0;
  const liveCount = done
    ? addedCount || liveTotal
    : reviewReady
      ? reviewQuestions.length
      : generating
        ? liveDraftCount
        : 0;
  const liveTitle = generationFailed
    ? "Generation failed"
    : done
      ? "✓ Ready — review and add"
      : reviewReady
        ? "✓ Ready — review and add"
        : generating
          ? "AI is writing…"
          : "Live preview · ready";

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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-generate-title"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)] sm:max-h-[90dvh] lg:h-[660px] lg:max-h-[calc(100dvh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--qs-line)] px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]">
                  <Sparkles className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <h3 id="ai-generate-title" className="text-[17px] font-extrabold leading-5 text-[var(--qs-ink)]">
                    <AiStreamText text="Generate with AI" />
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium leading-4 text-[var(--qs-muted)]">
                    Only single-correct MCQs — review every question before adding.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close AI generator"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:bg-[var(--qs-bg)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode selector */}
            <div className="grid shrink-0 grid-cols-2 gap-2 px-4 pt-3 sm:px-5">
              <button
                type="button"
                disabled={generating}
                onClick={() => { setMode("own"); setError(""); setGenerationFailed(false); }}
                className={cn(
                  "min-w-0 rounded-[11px] border-2 px-2.5 py-2 text-left transition-colors disabled:opacity-60",
                  mode === "own"
                    ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                    : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                )}
              >
                <span className="flex items-center justify-between gap-2 text-[11.5px] font-extrabold text-[var(--qs-ink)]">
                  <span className="truncate">From your material</span>
                  {mode === "own" && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-[var(--qs-muted)]">PDF, notes, slides</span>
              </button>
              <button
                type="button"
                disabled={generating}
                onClick={() => { setMode("bank"); setError(""); setGenerationFailed(false); }}
                className={cn(
                  "min-w-0 rounded-[11px] border-2 px-2.5 py-2 text-left transition-colors disabled:opacity-60",
                  mode === "bank"
                    ? "border-[var(--qs-brand)] bg-[var(--qs-poly-1)]"
                    : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-brand)]"
                )}
              >
                <span className="flex items-center justify-between gap-2 text-[11.5px] font-extrabold text-[var(--qs-ink)]">
                  <span className="truncate">Generate by topic</span>
                  {mode === "bank" && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-[var(--qs-muted)]">AI writes fresh MCQs</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 lg:overflow-hidden lg:py-3">
              <div className="grid min-h-0 gap-3 lg:h-full lg:grid-cols-[1fr_1fr_1.05fr]">
                {mode === "bank" ? (
                  <>
                    {/* Column 1 — scope, theory/numerical, size */}
                    <div className="flex min-h-0 flex-col gap-2.5 lg:overflow-y-auto lg:pr-1">
                      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                          <Target className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Quiz scope
                        </p>
                        <div className="space-y-2">
                          <div className="min-w-0">
                            <div className="flex h-4 items-center gap-1.5 overflow-hidden">
                              <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                                Subject
                              </span>
                            </div>
                            <button
                              id="ai-bank-subject"
                              type="button"
                              onClick={bankSubjectId != null ? notifySubjectLocked : undefined}
                              disabled={bankSubjectId == null}
                              aria-describedby={bankSubjectId == null ? "ai-bank-subject-locked-hint" : undefined}
                              title={bankSubjectId != null ? "Subject is locked to this quiz" : "Choose a subject in Details first"}
                              className="mt-1.5 flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3 text-left transition-colors hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span className="truncate text-[12px] font-bold text-[var(--qs-ink)]">
                                {bankSubjectId != null ? lockedSubjectName : "No subject selected"}
                              </span>
                              <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" aria-hidden="true" />
                            </button>
                            {bankSubjectId == null ? (
                              <p
                                id="ai-bank-subject-locked-hint"
                                className="mt-1.5 text-[9.5px] font-medium leading-4 text-[var(--qs-warn)]"
                              >
                                Choose a subject in Details before generating questions.
                              </p>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="min-w-0">
                              <div className="flex h-4 items-center gap-1.5 overflow-hidden">
                                <label
                                  htmlFor="ai-bank-chapter"
                                  className="truncate text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]"
                                >
                                  Chapter
                                </label>
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
                                placeholder={catalogLoading ? "Loading…" : "All chapters"}
                                disabled={!bankSubjectId || catalogLoading}
                                ariaLabel="Chapters"
                                searchable
                                wrapLabels
                                boundaryRef={dialogRef}
                                menuWidthScale={1.5}
                                triggerClassName="mt-1.5 min-h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-2.5 py-2 text-[11px] font-bold leading-4 text-[var(--qs-ink)] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
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
                                placeholder={catalogLoading ? "Loading…" : "All topics"}
                                disabled={!bankSubjectId || catalogLoading}
                                ariaLabel="Topics"
                                searchable
                                wrapLabels
                                boundaryRef={dialogRef}
                                menuWidthScale={1.5}
                                triggerClassName="mt-1.5 min-h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-2.5 py-2 text-[11px] font-bold leading-4 text-[var(--qs-ink)] hover:border-[var(--qs-brand)] focus-visible:border-[var(--qs-brand)] disabled:opacity-50"
                              />
                            </div>
                          </div>
                        </div>
                        {catalogError ? (
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--qs-bad)]">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {catalogError}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                            Theory vs numerical
                          </p>
                          <span className="rounded-full bg-[var(--qs-poly-2)] px-2 py-0.5 text-[9px] font-extrabold tabular-nums text-[var(--qs-brand)]">
                            {bankTheory}T · {bankNumerical}N
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-2">
                          {([
                            { key: "theory", label: "Theory", value: bankTheory },
                            { key: "numerical", label: "Numerical / practical", value: bankNumerical },
                          ] as const).map((item) => (
                            <div
                              key={item.key}
                              className="rounded-[11px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1.5 text-center"
                            >
                              <p className="truncate text-[9px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-ink)]">
                                {item.label}
                              </p>
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  aria-label={`Decrease ${item.label}`}
                                  onClick={() => setCategoryCount(item.key, item.value - 1)}
                                  className="grid h-6 w-6 place-items-center rounded-[7px] border-2 border-[var(--qs-line)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-sm font-extrabold tabular-nums text-[var(--qs-ink)]">
                                  {item.value}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Increase ${item.label}`}
                                  onClick={() => setCategoryCount(item.key, item.value + 1)}
                                  className="grid h-6 w-6 place-items-center rounded-[7px] border-2 border-[var(--qs-line)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[9.5px] font-medium leading-4 text-[var(--qs-muted)]">
                          Numerical = calculation / practical. Total stays at {bankNumber}.
                        </p>
                      </div>

                      <div className="shrink-0 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 lg:sticky lg:bottom-0 lg:z-10 lg:shadow-[0_-6px_14px_rgba(26,18,64,0.06)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                            <Target className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Assessment size
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label="Fewer questions"
                              onClick={() => { const v = Math.max(5, bankNumber - 1); setBankNumber(v); syncBankSize(v); }}
                              className="grid h-7 w-7 place-items-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-7 text-center text-sm font-extrabold tabular-nums text-[var(--qs-ink)]">
                              {bankNumber}
                            </span>
                            <button
                              type="button"
                              aria-label="More questions"
                              onClick={() => { const v = Math.min(MAX_BANK_QUESTIONS, bankNumber + 1); setBankNumber(v); syncBankSize(v); }}
                              className="grid h-7 w-7 place-items-center rounded-[8px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
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
                          onChange={(e) => { const v = parseInt(e.target.value); setBankNumber(v); syncBankSize(v); }}
                          className="mt-2 h-1.5 w-full accent-[var(--qs-brand)]"
                          aria-label="Number of questions"
                        />
                      </div>
                    </div>

                    {/* Column 2 — syllabus, difficulty, selected scope */}
                    <div className="flex min-h-0 flex-col gap-2.5 lg:overflow-y-auto lg:pr-1">
                      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
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
                          className="mt-2 min-h-[92px] w-full resize-none rounded-[11px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3 py-2 text-[11px] font-medium leading-5 text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                        />
                        <div className="mt-2 flex items-start justify-between gap-3 text-[9.5px] font-medium text-[var(--qs-muted)]">
                          <span className={bankSyllabus.trim() ? "text-[var(--qs-ok)]" : "text-[var(--qs-warn)]"}>
                            <AiStreamText text={bankSyllabus.trim()
                              ? "AI will generate questions only from these topics."
                              : "Add topics for precise questions; otherwise the full subject scope is used."} />
                          </span>
                          <span className="shrink-0 tabular-nums">{bankSyllabus.length}/4000</span>
                        </div>
                      </div>

                      <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Difficulty split
                          </p>
                          <span className="rounded-full bg-[var(--qs-poly-2)] px-2 py-0.5 text-[9px] font-extrabold tabular-nums text-[var(--qs-brand)]">
                            {bankEasy + bankMedium + bankHard}/{bankNumber}
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                          {([
                            { key: "easy", label: "Easy", value: bankEasy, setter: setBankEasy, color: "text-[var(--qs-ok)]" },
                            { key: "medium", label: "Medium", value: bankMedium, setter: setBankMedium, color: "text-[var(--qs-warn)]" },
                            { key: "hard", label: "Hard", value: bankHard, setter: setBankHard, color: "text-[var(--qs-bad)]" },
                          ] as const).map((item) => (
                            <div key={item.key} className="rounded-[11px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1.5 text-center">
                              <p className={cn("text-[9px] font-extrabold uppercase tracking-[0.05em]", item.color)}>{item.label}</p>
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
                            "mt-2 rounded-[9px] border-2 px-2 py-1 text-center text-[9.5px] font-extrabold tabular-nums",
                            bankEasy + bankMedium + bankHard === bankNumber
                              ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]"
                              : "border-[var(--qs-bad)] bg-[var(--qs-badbg)] text-[var(--qs-bad)]"
                          )}
                        >
                          {bankEasy} + {bankMedium} + {bankHard} = {bankEasy + bankMedium + bankHard}{" "}
                          {bankEasy + bankMedium + bankHard === bankNumber ? "· Balanced" : `≠ ${bankNumber} — adjust`}
                        </div>
                      </div>

                      {selectedScopeTree.length > 0 ? (
                        <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                              <Target className="h-3.5 w-3.5 text-[var(--qs-brand)]" /> Selected scope
                            </p>
                            <span className="rounded-full bg-[var(--qs-poly-2)] px-2 py-0.5 text-[8px] font-extrabold tabular-nums uppercase tracking-[0.04em] text-[var(--qs-brand)]">
                              {selectedScopeTree.length} ch · {bankTopicIds.length} topic{bankTopicIds.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="mt-1.5 space-y-1.5">
                            {selectedScopeTree.map((chapter) => (
                              <div key={chapter.id} className="rounded-[9px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 truncate text-[10.5px] font-bold text-[var(--qs-ink)]">{chapter.name}</span>
                                  <span className="shrink-0 rounded-full bg-[var(--qs-poly-2)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-brand)]">
                                    {chapter.topics.length > 0
                                      ? `${chapter.topics.length} topic${chapter.topics.length === 1 ? "" : "s"}`
                                      : "All topics"}
                                  </span>
                                </div>
                                {chapter.topics.length > 0 ? (
                                  <p className="mt-0.5 line-clamp-2 text-[9.5px] font-medium leading-4 text-[var(--qs-muted)]">
                                    {chapter.topics.join(" · ")}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-0 flex-col gap-2.5 lg:col-span-2">
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      onClick={() => inputRef.current?.click()}
                      className={cn(
                        "flex min-h-[190px] flex-1 cursor-pointer flex-col justify-center rounded-[16px] border-2 border-dashed p-5 text-center transition-colors",
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
                        <div className="space-y-2 text-left">
                          {files.map((f, i) => {
                            const Icon = getFileIcon(f.name);
                            return (
                              <div key={`${f.name}-${i}`} className="flex items-center gap-3">
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
                      <div className="flex items-start gap-2 rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-bad)]" />
                        <p className="text-[11px] font-semibold text-[var(--qs-bad)]">{error}</p>
                      </div>
                    )}
                    <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                        What AI will create
                      </p>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px] font-semibold text-[var(--qs-muted)] sm:grid-cols-4">
                        <span className="rounded-[8px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1">{FILE_GENERATION_COUNT} MCQs</span>
                        <span className="rounded-[8px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1">Answers + explanations</span>
                        <span className="rounded-[8px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1">Mixed difficulty</span>
                        <span className="rounded-[8px] border border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-1">Review before adding</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Column 3 — live preview (desktop/tablet only; hidden on mobile) */}
                <div className="hidden min-h-0 min-w-0 flex-col lg:flex">
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]">
                    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--qs-line)] px-3 py-2">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          generating ? "animate-pulse bg-[var(--qs-bad)]" : done || reviewReady ? "bg-[var(--qs-ok)]" : "bg-[var(--qs-muted)]/40"
                        )}
                      />
                      <span aria-live="polite" className="min-w-0 truncate text-[11px] font-bold">
                        {liveTitle}
                      </span>
                      <span className="ml-auto shrink-0 rounded-[6px] bg-[var(--qs-sun)]/30 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-[var(--qs-ink)]">
                        ⚡ {tokenRate ?? 0} tok/s{done && tokenRate != null ? " avg" : ""}
                      </span>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--qs-muted)]">
                        {liveCount}/{liveTotal}
                      </span>
                    </div>
                    <div className="h-[3px] shrink-0 bg-[var(--qs-line)]">
                      <div
                        className="h-full bg-[var(--qs-brand)] transition-[width] duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,#000_35%)]">
                      {thinking || streamContent ? (
                        <div className="absolute inset-0 flex flex-col">
                          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2">
                            <Sparkles className={cn("h-3.5 w-3.5 text-[var(--qs-brand)]", generating && "animate-pulse")} />
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-ink)]">
                              {thinking
                                ? generating
                                  ? "Thinking…"
                                  : "Thinking · completed"
                                : generating
                                  ? "Writing questions…"
                                  : "AI stream · completed"}
                            </span>
                            <span className="ml-auto text-[9px] font-semibold tabular-nums text-[var(--qs-muted)]">
                              {liveUsage?.reasoningTokens != null
                                ? `${liveUsage.reasoningTokens} thinking tokens`
                                : `${Math.round((thinking || streamContent).length / 4)} tokens`}
                            </span>
                          </div>
                          <div ref={streamScrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                            {thinking ? (
                              <div className="[&_.markdown-body]:text-[7px] [&_.markdown-body]:leading-[1.4]">
                                <MarkdownRenderer content={thinking} />
                              </div>
                            ) : (
                              <pre className="whitespace-pre-wrap break-words font-sans text-[7px] leading-[1.4] text-[var(--qs-muted)]">
                                {readableStreamText(streamContent)}
                                {generating ? <span className="ml-0.5 inline-block h-2 w-1 animate-pulse bg-[var(--qs-brand)] align-text-bottom" /> : null}
                              </pre>
                            )}
                          </div>
                          {reviewReady && !done ? (
                            <div className="shrink-0 border-t border-[var(--qs-line)] p-2">
                              <button
                                type="button"
                                onClick={() => setReviewOpen(true)}
                                className="w-full rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2.5 py-1.5 text-[10px] font-extrabold text-[var(--qs-on-brand)]"
                              >
                                Review questions
                              </button>
                            </div>
                          ) : done ? (
                            <div className="shrink-0 border-t border-[var(--qs-line)] p-2 text-center text-[10px] font-semibold text-[var(--qs-ok)]">
                              ✓ Questions added to the quiz
                            </div>
                          ) : null}
                        </div>
                      ) : generationFailed ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                          <AlertCircle className="h-6 w-6 text-[var(--qs-bad)]" />
                          <p className="text-[11px] font-bold">Generation failed</p>
                          <p className="max-w-[220px] text-[10px] leading-4 text-[var(--qs-muted)]">
                            {error || "The AI request failed. Please try again."}
                          </p>
                          <button
                            type="button"
                            onClick={retryGeneration}
                            className="mt-1 rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--qs-on-brand)]"
                          >
                            Try again
                          </button>
                        </div>
                      ) : done ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                          <CheckCircle2 className="h-7 w-7 text-[var(--qs-ok)]" />
                          <p className="text-[12px] font-bold">✓ Ready — review and add</p>
                          <p className="text-[10px] text-[var(--qs-muted)]">
                            Questions added to the quiz.
                          </p>
                        </div>
                      ) : reviewReady ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                          <CheckCircle2 className="h-7 w-7 text-[var(--qs-ok)]" />
                          <p className="text-[12px] font-bold">✓ Ready — review and add</p>
                          <p className="text-[10px] text-[var(--qs-muted)]">
                            Questions are ready for review.
                          </p>
                          <button
                            type="button"
                            onClick={() => setReviewOpen(true)}
                            className="mt-1 rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--qs-on-brand)]"
                          >
                            Review questions
                          </button>
                        </div>
                      ) : generating ? (
                        <div className="absolute inset-x-0 bottom-0 flex max-h-full flex-col justify-end gap-1.5 overflow-hidden p-3">
                          {liveCards.map((card) => (
                            <div key={card.index} className="rounded-[9px] border border-[var(--qs-line)] bg-[var(--qs-bg)] p-2">
                              <div className="flex items-center gap-1 text-[8.5px] font-bold">
                                <span className="rounded-[5px] bg-[var(--qs-poly-1)] px-1.5 py-0.5 text-[var(--qs-muted)]">Q{card.index + 1}</span>
                                <span className="rounded-[5px] bg-[var(--qs-poly-1)] px-1.5 py-0.5 text-[var(--qs-muted)]">{card.difficulty}</span>
                                <span className="rounded-[5px] bg-[var(--qs-poly-1)] px-1.5 py-0.5 text-[var(--qs-muted)]">{card.kind}</span>
                              </div>
                              <div className="mt-1.5 space-y-1">
                                <span className="block h-1.5 w-[92%] animate-pulse rounded bg-[var(--qs-line)]" />
                                <span className="block h-1.5 w-[68%] animate-pulse rounded bg-[var(--qs-line)]" />
                              </div>
                              <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
                                {[0, 1, 2, 3].map((option) => (
                                  <span key={option} className="block h-1.5 rounded bg-[var(--qs-line)]" />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="absolute inset-0 grid place-items-center p-4 text-center">
                          <div>
                            <Sparkles className="mx-auto h-6 w-6 text-[var(--qs-brand)]" />
                            <p className="mt-1.5 text-[11px] font-semibold leading-5 text-[var(--qs-muted)]">
                              Hit <span className="font-extrabold text-[var(--qs-brand)]">Generate</span> and AI
                              <br /> questions will stream here live.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer CTA */}
            {!done ? (
              <div className="shrink-0 border-t-2 border-[var(--qs-line)] px-4 py-2.5 sm:px-5">
                {quizLimitError ? (
                  <div className="mb-2 flex items-start gap-2 rounded-[10px] border-2 border-[var(--qs-warn)] bg-[var(--qs-bg)] px-3 py-1.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-warn)]" />
                    <p className="text-[10.5px] font-semibold leading-relaxed text-[var(--qs-ink)]">{quizLimitError}</p>
                  </div>
                ) : currentQuestionCount > 0 ? (
                  <p className="mb-1.5 text-center text-[10px] font-semibold text-[var(--qs-muted)]">
                    This quiz has {currentQuestionCount} of {MAX_QUIZ_QUESTIONS} questions · {remainingQuestionSlots} slot{remainingQuestionSlots === 1 ? "" : "s"} left
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-auto hidden max-w-[430px] items-start gap-1.5 text-[9px] font-medium leading-4 text-[var(--qs-muted)] lg:flex">
                    <AlertCircle className="mt-px h-2.5 w-2.5 shrink-0" /> AI can make mistakes. Review every question before adding it to your quiz.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={generating || accepting}
                    className="h-10 rounded-[10px] border-2 border-[var(--qs-line)] px-4 text-sm font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <AiGenerateButton
                    size="md"
                    label={
                      generationFailed
                        ? "Try again"
                        : generating
                          ? "Generating…"
                          : mode === "bank"
                            ? `Generate ${bankNumber} questions`
                            : "Generate questions"
                    }
                    onClick={
                      generationFailed
                        ? retryGeneration
                        : mode === "bank"
                          ? () => void handleGenerateFromBank()
                          : () => void handleGenerate()
                    }
                    disabled={primaryDisabled || generating}
                    className="h-10 min-w-[190px] flex-1 px-4 text-sm disabled:opacity-60 sm:flex-none"
                  />
                </div>
                <p className="mt-1.5 flex items-start gap-1.5 text-[9px] font-medium leading-4 text-[var(--qs-muted)] lg:hidden">
                  <AlertCircle className="mt-px h-2.5 w-2.5 shrink-0" /> AI can make mistakes. Review every question before adding it to your quiz.
                </p>
              </div>
            ) : (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t-2 border-[var(--qs-line)] px-4 py-2.5 sm:px-5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-10 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
                >
                  Done
                </button>
              </div>
            )}
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
      onRegenerate={handleRegenerateQuestion}
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
