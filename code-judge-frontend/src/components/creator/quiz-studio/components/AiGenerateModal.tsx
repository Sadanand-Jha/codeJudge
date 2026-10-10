"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode2,
  FileImage,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  SlidersHorizontal,
  Target,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { generateQuestionsFromFiles, generateFromQuestionBank, mapRawQuestionsToPreview } from "@/services/ai";
import { toast } from "@/lib/toast";
import type { AIQuestionPreview } from "@/services/ai";
import type { CreatorQuestion } from "../types";
import { mapToCreatorQuestions } from "@/utils/aiToCreatorQuestion";
import AIQuestionReviewOverlay from "@/components/quiz/creator/AIQuestionReviewOverlay";
import { QuestionBankFilters } from "@/components/creator/tests/sections/QuestionBankFilters";
import { AiStreamText } from "@/components/ui";

const ACCEPT = [
  ".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".yml", ".yaml",
  ".sql", ".log", ".ini", ".toml",
  ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".c", ".cpp", ".cc", ".h", ".hpp",
  ".go", ".rs", ".rb", ".php", ".sh", ".bash",
  ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".xlsm", ".zip",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
].join(",");

const MAX_SIZE_MB = 20;

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
}: {
  open: boolean;
  onClose: () => void;
  onQuestionsAdded: (questions: CreatorQuestion[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<"own" | "bank">("own");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  // Review-before-add: generated questions wait in the overlay until accepted.
  // Nothing is saved to the server before the creator accepts.
  const [reviewQuestions, setReviewQuestions] = useState<AIQuestionPreview[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  // Bank controls — balanced 10 paper default 4/3/3
  const [bankNumber, setBankNumber] = useState(10);
  const [bankEasy, setBankEasy] = useState(4);
  const [bankMedium, setBankMedium] = useState(3);
  const [bankHard, setBankHard] = useState(3);
  const [bankSyllabus, setBankSyllabus] = useState("");
  const [bankSubjectId, setBankSubjectId] = useState<number | null>(null);
  const [bankChapterId, setBankChapterId] = useState<number | null>(null);
  const [bankTopicId, setBankTopicId] = useState<number | null>(null);
  const [bankKind, setBankKind] = useState<"any" | "theory" | "numerical">("any");
  const inputRef = useRef<HTMLInputElement>(null);

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
    setProgress(0);
    setDone(false);
    setAddedCount(0);
    setBankSyllabus("");
    setReviewQuestions([]);
    setReviewOpen(false);
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

  const handleGenerate = async () => {
    if (files.length === 0) return;
    setGenerating(true);
    setProgress(10);
    setError("");

    try {
      setProgress(30);
      const rawQuestions = await generateQuestionsFromFiles(files, {
        numberOfQuestions: 20,
        questionTypes: ["mcq"],
        difficulty: ["easy", "medium", "hard"],
        bloomsLevel: "understand",
        includeExplanations: true,
        includeHints: true,
        includeReferenceNotes: false,
        includeTags: true,
      });

      setProgress(70);
      const previews = mapRawQuestionsToPreview(rawQuestions);
      if (previews.length === 0) {
        setError("AI returned no questions. Please try again.");
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
      setGenerating(false);
    }
  };

  const handleGenerateFromBank = async () => {
    const sum = bankEasy + bankMedium + bankHard;
    if (sum !== bankNumber) {
      setError(`Distribution must sum to ${bankNumber}: Easy ${bankEasy}+ Medium ${bankMedium}+ Hard ${bankHard}= ${sum}`);
      return;
    }
    if (!bankSubjectId) {
      setError("Please select a subject.");
      return;
    }
    setGenerating(true);
    setProgress(10);
    setError("");
    try {
      setProgress(20);
      const rawQuestions = await generateFromQuestionBank({
        numberOfQuestions: bankNumber,
        easyCount: bankEasy,
        mediumCount: bankMedium,
        hardCount: bankHard,
        syllabus: bankSyllabus.trim() || undefined,
        subjectId: bankSubjectId,
        chapterId: bankChapterId,
        topicId: bankTopicId,
        kind: bankKind,
      });
      setProgress(70);
      const previews = mapRawQuestionsToPreview(rawQuestions);
      if (previews.length === 0) {
        setError("AI returned no questions. Please try again.");
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
      setGenerating(false);
    }
  };

  // ---- Review overlay actions (mirror AIStudio / AI assistant panel) ----
  const closeReview = () => setReviewOpen(false);

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
    try {
      const questions = mapToCreatorQuestions(reviewQuestions);
      await onQuestionsAdded(questions);
      setAddedCount(questions.length);
      setReviewQuestions([]);
      setReviewOpen(false);
      setDone(true);
      toast.success(`Added ${questions.length} questions from AI`);
    } catch (err) {
      toast.error("Could not add questions", { description: (err as Error).message || "Please try again." });
    }
  };

  const handleAcceptOne = async (question: AIQuestionPreview) => {
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

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="ai-color-card flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-color-header flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h3 className="min-h-5 text-sm font-bold text-text-primary"><AiStreamText text="Generate with AI" /></h3>
                  <p className="min-h-4 text-[11px] text-text-secondary"><AiStreamText text="Choose a source" /></p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode selector */}
            <div className="grid shrink-0 grid-cols-2 gap-2 px-4 pt-3 sm:px-5 sm:pt-4">
              <button
                type="button"
                onClick={() => { setMode("own"); setError(""); }}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-all sm:p-3",
                  mode === "own" ? "border-pink-500 bg-pink-500/10 shadow-sm" : "border-border bg-card-hover hover:border-pink-500/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <Upload className={cn("h-4 w-4", mode === "own" ? "text-pink-500" : "text-text-muted")} />
                  <span className={cn("text-xs font-bold", mode === "own" ? "text-pink-600" : "text-text-primary")}>From Your Material</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setMode("bank"); setError(""); }}
                className={cn(
                  "rounded-xl border p-2.5 text-left transition-all sm:p-3",
                  mode === "bank" ? "border-pink-500 bg-pink-500/10 shadow-sm" : "border-border bg-card-hover hover:border-pink-500/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className={cn("h-4 w-4", mode === "bank" ? "text-pink-500" : "text-text-muted")} />
                  <span className={cn("text-xs font-bold", mode === "bank" ? "text-pink-600" : "text-text-primary")}>Generate by Topic</span>
                </div>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
              {done ? (
                <div className="py-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {addedCount} questions added
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    You can review and edit them in the question editor.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 rounded-lg bg-pink-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-pink-600"
                  >
                    Done
                  </button>
                </div>
              ) : generating ? (
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-500" />
                    <p className="mt-3 text-sm font-semibold text-text-primary">
                      Creating your questions…
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Building a balanced set from your preferences. Please keep this window open.
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <motion.div
                      className="h-full rounded-full bg-pink-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              ) : mode === "bank" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <QuestionBankFilters
                      subjectId={bankSubjectId}
                      chapterId={bankChapterId}
                      topicId={bankTopicId}
                      onSubjectChange={setBankSubjectId}
                      onChapterChange={setBankChapterId}
                      onTopicChange={setBankTopicId}
                      kind={bankKind}
                      onKindChange={setBankKind}
                      disabled={generating}
                      columns="grid-cols-1 sm:grid-cols-2 [&>*:last-child]:sm:col-span-2"
                    />
                  </div>
                  {/* Syllabus scope */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                    <label htmlFor="ai-bank-syllabus" className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-text-primary">
                      <BookOpen className="h-3.5 w-3.5 text-pink-500" /> Syllabus / topics
                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-violet-600 dark:text-violet-300">Recommended</span>
                    </label>
                    <textarea
                      id="ai-bank-syllabus"
                      value={bankSyllabus}
                      onChange={(event) => setBankSyllabus(event.target.value)}
                      maxLength={4000}
                      rows={4}
                      placeholder={"Paste your actual syllabus here:\nProcesses and threads\nCPU scheduling\nExclude virtual memory"}
                      className={cn(
                        "w-full resize-y rounded-lg border bg-card-hover px-3 py-2 text-xs leading-5 text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10",
                        bankSyllabus.trim() ? "border-emerald-500/30" : "border-amber-400/45"
                      )}
                    />
                    <div className="flex items-center justify-between gap-3 text-[10px] text-text-muted">
                      <span className={bankSyllabus.trim() ? "text-emerald-600 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
                        <AiStreamText text={bankSyllabus.trim()
                          ? "Great — AI will keep the quiz close to your taught material."
                          : "Add your syllabus for precise results; otherwise the quiz may cover a broader subject scope."} />
                      </span>
                      <span className="shrink-0 tabular-nums">{bankSyllabus.length}/4000</span>
                    </div>
                  </div>

                  {/* Assessment size */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                    <label className="text-xs font-bold text-text-primary flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-pink-500" /> Assessment size</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { const v = Math.max(1, bankNumber - 1); setBankNumber(v); syncBankDistribution(v); }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-hover border border-border"><Minus className="h-3.5 w-3.5" /></button>
                      <div className="flex-1 text-center">
                        <span className="text-lg font-bold text-pink-600">{bankNumber}</span>
                        <span className="text-xs text-text-muted ml-1">questions</span>
                      </div>
                      <button type="button" onClick={() => { const v = Math.min(50, bankNumber + 1); setBankNumber(v); syncBankDistribution(v); }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-hover border border-border"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <input type="range" min={5} max={20} value={bankNumber} onChange={(e) => { const v = parseInt(e.target.value); setBankNumber(v); syncBankDistribution(v); }} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-pink-500" />
                  </div>

                  {/* Difficulty distribution */}
                  <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                    <label className="text-xs font-bold text-text-primary flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5 text-pink-500" /> Difficulty distribution — must sum to {bankNumber}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "easy", label: "Easy", value: bankEasy, setter: setBankEasy, color: "text-emerald-600" },
                        { key: "medium", label: "Medium", value: bankMedium, setter: setBankMedium, color: "text-pink-600" },
                        { key: "hard", label: "Hard", value: bankHard, setter: setBankHard, color: "text-rose-600" },
                      ].map((d) => (
                        <div key={d.key} className="rounded-lg border border-border bg-card-hover p-2 text-center">
                          <p className={`text-xs font-bold ${d.color}`}>{d.label}</p>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <button type="button" onClick={() => (d.setter as any)((v: number) => Math.max(0, v - 1))} className="h-6 w-6 rounded border border-border flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                            <span className="w-6 text-sm font-bold text-text-primary">{d.value}</span>
                            <button type="button" onClick={() => (d.setter as any)((v: number) => Math.min(bankNumber, v + 1))} className="h-6 w-6 rounded border border-border flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={cn("rounded border px-2 py-1 text-center text-[11px] font-medium", bankEasy + bankMedium + bankHard === bankNumber ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20")}>
                      {bankEasy} + {bankMedium} + {bankHard} = {bankEasy + bankMedium + bankHard} {bankEasy + bankMedium + bankHard === bankNumber ? "✓ Balanced" : `≠ ${bankNumber} — adjust`}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2.5">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <p className="text-xs text-rose-500">{error}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerateFromBank}
                    disabled={bankEasy + bankMedium + bankHard !== bankNumber || !bankSubjectId}
                    className={cn(
                      "section-ai-cta sticky bottom-0 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
                      bankEasy + bankMedium + bankHard === bankNumber && bankSubjectId
                        ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/20 hover:brightness-110"
                        : "cursor-not-allowed bg-card-hover text-text-muted"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    <AiStreamText text={`Generate ${bankNumber} Questions`} />
                  </button>
                  <p className="flex items-start gap-1 text-[9px] leading-3.5 text-text-muted">
                    <AlertCircle className="mt-px h-2.5 w-2.5 shrink-0" /> AI can make mistakes. Review every question before adding it to your quiz.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                      "cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                      files.length > 0
                        ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                        : "border-border hover:border-pink-500/30 hover:bg-pink-500/[0.03]"
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
                              <Icon className="h-6 w-6 shrink-0 text-emerald-500" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-text-primary">{f.name}</p>
                                <p className="text-[11px] text-text-secondary">{formatSize(f.size)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(i);
                                }}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:text-rose-500"
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
                          className="mt-1 text-[11px] font-medium text-pink-500 hover:text-pink-600"
                        >
                          + Add more files
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto mb-2 h-6 w-6 text-text-muted" />
                        <p className="text-sm font-medium text-text-primary">
                          Drop files here
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          PDF, DOCX, PPTX, Excel, images, code files, and more
                        </p>
                        <p className="mt-0.5 text-[10px] text-text-muted">
                          Max {MAX_SIZE_MB} MB per file
                        </p>
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2.5">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <p className="text-[11px] text-rose-500">{error}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={files.length === 0 || !!error}
                    className={cn(
                      "mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
                      files.length > 0 && !error
                        ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/20 hover:brightness-110"
                        : "cursor-not-allowed bg-card-hover text-text-muted"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate Questions
                  </button>
                  <p className="mt-1.5 flex items-start gap-1 text-[9px] leading-3.5 text-text-muted">
                    <AlertCircle className="mt-px h-2.5 w-2.5 shrink-0" /> AI can make mistakes. Review every question before adding it to your quiz.
                  </p>
                </>
              )}
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
    </>
  );
}
