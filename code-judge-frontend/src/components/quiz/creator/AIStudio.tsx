"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Upload, FileText, Image, X, ChevronRight, ChevronDown,
  Settings, Play, Pause, RotateCcw, Check, Edit3, Trash2,
  Wand2, FileSpreadsheet, FileType, Archive, CheckCircle2,
  AlertCircle, Loader2, Plus, Minus, Sliders, BookOpen,
  BarChart3, Lightbulb, Tag, ImageIcon, HelpCircle,
  File, FileCode, FileImage, FileArchive, FileText as FileTxt,
  ChevronLeft, GripVertical, Eye, Download, RefreshCw,
  SlidersHorizontal, Target, Clock, Zap, Brain,
  Presentation, Table, FileType2, Code2
} from "lucide-react";
import { useAICreditConsumption } from "@/hooks/useAICreditConsumption";
import { toast } from "@/lib/toast";
import { generateQuestionsFromFiles, mapRawQuestionsToPreview } from "@/services/ai";
import type { RawAIGeneratedQuestion, AIQuestionPreview } from "@/services/ai";
import AIQuestionReviewOverlay, {
  type PreviewQuestion,
} from "@/components/quiz/creator/AIQuestionReviewOverlay";

/* ============================================
   Types
   ============================================ */
type QuestionType = "mcq" | "coding" | "true_false" | "fill" | "short" | "integer" | "long";
type Difficulty = "easy" | "medium" | "hard" | "expert";
type BloomsLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

interface GenerationOptions {
  questionTypes: QuestionType[];
  difficulty: Difficulty[];
  bloomsLevel: BloomsLevel[];
  numberOfQuestions: number;
  includeExplanations: boolean;
  includeHints: boolean;
  includeReferenceNotes: boolean;
  includeTags: boolean;
  includeImages: boolean;
}

interface GeneratedQuestion {
  id: string;
  type: QuestionType;
  title: string;
  content: string;
  options?: { id: string; content: string; isCorrect: boolean }[];
  correctAnswer?: string | number;
  explanation?: string;
  hint?: string;
  difficulty: Difficulty;
  tags: string[];
  credits: number;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
  file?: File;
}

const DEFAULT_OPTIONS: GenerationOptions = {
  questionTypes: ["mcq"],
  difficulty: ["medium"],
  bloomsLevel: ["understand"],
  numberOfQuestions: 5,
  includeExplanations: true,
  includeHints: true,
  includeReferenceNotes: false,
  includeTags: true,
  includeImages: false,
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "MCQ",
  coding: "Coding",
  true_false: "True/False",
  fill: "Fill",
  integer: "Integer",
  short: "Short Answer",
  long: "Long Answer",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert",
};

const BLOOMS_LABELS: Record<BloomsLevel, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};

const SUPPORTED_FILE_TYPES = [
  ".pdf", ".ppt", ".pptx", ".doc", ".docx",
  ".xls", ".xlsx", ".csv", ".md", ".txt", ".zip",
  ".png", ".jpg", ".jpeg", ".gif", ".webp"
];

const FILE_TYPE_SUGGESTIONS: Record<string, { questionTypes: QuestionType[]; label: string }> = {
  pdf: { questionTypes: ["mcq", "short", "fill"], label: "PDF Document" },
  ppt: { questionTypes: ["mcq", "true_false"], label: "PowerPoint" },
  pptx: { questionTypes: ["mcq", "true_false"], label: "PowerPoint" },
  doc: { questionTypes: ["mcq", "short", "long"], label: "Word Document" },
  docx: { questionTypes: ["mcq", "short", "long"], label: "Word Document" },
  xls: { questionTypes: ["integer", "mcq"], label: "Excel Spreadsheet" },
  xlsx: { questionTypes: ["integer", "mcq"], label: "Excel Spreadsheet" },
  csv: { questionTypes: ["integer", "mcq"], label: "CSV Data" },
  md: { questionTypes: ["mcq", "short", "fill"], label: "Markdown" },
  txt: { questionTypes: ["mcq", "short", "fill"], label: "Text File" },
  zip: { questionTypes: ["mcq", "coding", "short"], label: "ZIP Archive" },
  png: { questionTypes: ["mcq", "short", "fill"], label: "Image" },
  jpg: { questionTypes: ["mcq", "short", "fill"], label: "Image" },
  jpeg: { questionTypes: ["mcq", "short", "fill"], label: "Image" },
};

/* ============================================
   Helper Components
   ============================================ */

const FileIconComponent = ({ fileType, className }: { fileType: string; className?: string }) => {
  if (fileType.includes("pdf")) return <FileText className={className} />;
  if (fileType.includes("image")) return <FileImage className={className} />;
  if (fileType.includes("zip") || fileType.includes("archive")) return <FileArchive className={className} />;
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return <FileSpreadsheet className={className} />;
  if (fileType.includes("powerpoint") || fileType.includes("presentation")) return <Presentation className={className} />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileType2 className={className} />;
  if (fileType.includes("code") || fileType.includes("javascript") || fileType.includes("python")) return <Code2 className={className} />;
  return <File className={className} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* ============================================
   AI Studio Component
   ============================================ */
export default function AIStudio({
  onQuestionsGenerated,
  onClose,
}: {
  onQuestionsGenerated: (questions: GeneratedQuestion[]) => void;
  onClose?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"upload" | "generate" | "review">("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showReviewOverlay, setShowReviewOverlay] = useState(false);
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSmartSuggestions, setShowSmartSuggestions] = useState(true);

  const { consume, refund, completeRequest, balance, isLowCredit, recommendedPack } = useAICreditConsumption();

  // Calculate estimated credits
  useEffect(() => {
    const baseCost = 8;
    const perQuestion = 1.5;
    const estimated = Math.round(baseCost + (options.numberOfQuestions * perQuestion));
    setEstimatedCredits(estimated);
  }, [options.numberOfQuestions]);

  /* ============================================
     File Upload Handlers
      ============================================ */
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!SUPPORTED_FILE_TYPES.includes(ext)) {
        toast.error("Unsupported file type", { description: `${file.name} is not supported` });
        return;
      }

      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type || ext,
        status: "ready",
        progress: 100,
        file,
      };

      setUploadedFiles((prev) => [...prev, newFile]);
      toast.success(`Added ${file.name}`);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /* ============================================
     Generation Handlers
      ============================================ */
  const handleGenerate = async () => {
    const files = uploadedFiles.filter((f) => f.file).map((f) => f.file as File);
    if (files.length === 0) {
      toast.error("Please upload learning material first");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(5);

    try {
      let rawQuestions: RawAIGeneratedQuestion[] = [];
      try {
        rawQuestions = await generateQuestionsFromFiles(files, {
          ...options,
          bloomsLevel: options.bloomsLevel[0] || "understand",
        });
      } catch (error) {
        console.error("Backend generation failed:", error);
        toast.error("AI generation failed", {
          description: (error as Error).message || "Could not reach the generation service",
        });
        setIsGenerating(false);
        setGenerationProgress(0);
        return;
      }
      setGenerationProgress(70);

      const questions: GeneratedQuestion[] = mapRawQuestionsToPreview(rawQuestions).map(
        (q: AIQuestionPreview, i) => ({
          ...q,
          credits: Math.round(8 / Math.max(rawQuestions.length, 1)),
        })
      );

      setGenerationProgress(100);
      setGeneratedQuestions(questions);
      setIsGenerating(false);
      setActiveTab("review");
      setShowReviewOverlay(true);
      toast.success(`Generated ${questions.length} questions!`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Something went wrong while generating questions");
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleAcceptAll = () => {
    if (generatedQuestions.length === 0) return;
    onQuestionsGenerated?.(generatedQuestions);
    setShowReviewOverlay(false);
    setGeneratedQuestions([]);
    setActiveTab("upload");
    toast.success(`${generatedQuestions.length} questions added to quiz`);
  };

  const handleRejectAll = () => {
    setShowReviewOverlay(false);
    setGeneratedQuestions([]);
    setActiveTab("upload");
    toast.info("AI-generated questions discarded");
  };

  const handleAccept = (question: GeneratedQuestion) => {
    setShowReviewOverlay(false);
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== question.id));
    onQuestionsGenerated?.([question]);
    toast.success("Question added");
  };

  const handleAcceptOne = (question: PreviewQuestion) => {
    const q = question as GeneratedQuestion;
    setGeneratedQuestions((prev) => prev.filter((x) => x.id !== q.id));
    onQuestionsGenerated?.([q]);
    toast.success("Question added to the problem list");
  };

  const handleEditOne = (question: PreviewQuestion) => {
    setGeneratedQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, ...question } : q)));
  };

  const handleRegenerate = async (questionId: string) => {
    toast.info("Regenerating question...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Question regenerated");
  };

  const handleDelete = (questionId: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  /* ============================================
     Smart Suggestions
      ============================================ */
  const getSmartSuggestions = () => {
    if (uploadedFiles.length === 0) return null;

    const fileExt = uploadedFiles[0].name.split(".").pop()?.toLowerCase() || "";
    const suggestion = FILE_TYPE_SUGGESTIONS[fileExt];

    if (!suggestion) return null;

    return {
      ...suggestion,
      recommendedTypes: suggestion.questionTypes,
    };
  };

  const smartSuggestion = getSmartSuggestions();

  /* ============================================
     Render
      ============================================ */
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 top-1/2 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2 text-sm font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)]"
      >
        <Sparkles className="h-4 w-4" />
        AI Studio
      </button>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 480, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="fixed right-0 top-0 z-40 h-screen w-[480px] max-w-full border-l border-border bg-background shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#8B5CF6]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">AI Studio</h3>
            <p className="text-[10px] text-text-muted">Generate questions with AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-text-muted hover:bg-card-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: "upload", label: "Upload", icon: Upload },
          { id: "generate", label: "Generate", icon: Wand2 },
          { id: "review", label: "Review", icon: CheckCircle2, badge: generatedQuestions.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-colors ${
              activeTab === tab.id
                ? "text-accent"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="ai-studio-tab"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[#EC4899] to-[#8B5CF6]"
              />
            )}
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="h-[calc(100vh-120px)] overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragOver
                    ? "border-accent bg-accent/5 scale-[1.02]"
                    : "border-border hover:border-accent/50 bg-card-hover/50"
                }`}
              >
                <motion.div
                  animate={{ y: isDragOver ? -5 : 0, scale: isDragOver ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Upload className="mx-auto h-12 w-12 text-text-muted mb-3" />
                </motion.div>
                <p className="text-sm font-medium text-text-primary mb-1">
                  {isDragOver ? "Drop files here" : "Drag & Drop Learning Material"}
                </p>
                <p className="text-[11px] text-text-muted mb-4">
                  PDF, PPT, DOC, Excel, CSV, MD, TXT, ZIP, Images
                </p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_16px_rgba(236,72,153,0.4)] transition-shadow"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Browse Files
                </label>
              </div>

              {/* Smart Suggestions */}
              {smartSuggestion && showSmartSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-accent/20 bg-gradient-to-br from-[#8B5CF6]/5 to-[#EC4899]/5 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-accent" />
                      <span className="text-[11px] font-bold text-text-primary">
                        Smart Suggestion
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSmartSuggestions(false)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-text-secondary mb-2">
                    Based on {smartSuggestion.label}, we recommend:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {smartSuggestion.recommendedTypes.map((type) => (
                      <span
                        key={type}
                        className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-1 rounded-lg"
                      >
                        ✓ {QUESTION_TYPE_LABELS[type]}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                          <FileIconComponent fileType={file.type} className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-text-primary truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-text-muted mb-1">
                            {formatFileSize(file.size)}
                          </div>
                          {file.status === "uploading" && (
                            <div className="h-1 rounded-full bg-card-hover overflow-hidden">
                              <motion.div
                                animate={{ width: `${file.progress}%` }}
                                className="h-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6]"
                              />
                            </div>
                          )}
                          {file.status === "processing" && (
                            <div className="flex items-center gap-1 text-[10px] text-accent">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Processing...
                            </div>
                          )}
                          {file.status === "ready" && (
                            <div className="flex items-center gap-1 text-[10px] text-success">
                              <CheckCircle2 className="h-3 w-3" />
                              Ready
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {file.status === "ready" && (
                            <>
                              <button className="rounded p-1 text-text-muted hover:text-accent">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button className="rounded p-1 text-text-muted hover:text-accent">
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => removeFile(file.id)}
                            className="rounded p-1 text-text-muted hover:text-danger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Processing Timeline */}
              {uploadedFiles.some((f) => f.status === "processing" || f.status === "ready") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <span className="text-[11px] font-medium text-text-primary">Processing Pipeline</span>
                  {[
                    { label: "File Uploaded", done: true },
                    { label: "Content Extracted", done: uploadedFiles.some((f) => f.status === "ready") },
                    { label: "AI Understanding", done: false },
                    { label: "Question Planning", done: false },
                    { label: "Ready To Generate", done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {step.done ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-border" />
                      )}
                      <span className={`text-[10px] ${step.done ? "text-text-primary" : "text-text-muted"}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Next Button */}
              {uploadedFiles.some((f) => f.status === "ready") && (
                <button
                  onClick={() => setActiveTab("generate")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)]"
                >
                  Continue to Generation
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          )}

          {activeTab === "generate" && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Question Types */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-primary flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-accent" />
                  Question Types
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setOptions((prev) => ({
                          ...prev,
                          questionTypes: prev.questionTypes.includes(key)
                            ? prev.questionTypes.filter((t) => t !== key)
                            : [...prev.questionTypes, key],
                        }));
                      }}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium transition-all ${
                        options.questionTypes.includes(key)
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "bg-card-hover text-text-secondary border border-border hover:border-accent/20"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                        options.questionTypes.includes(key)
                          ? "border-accent bg-accent"
                          : "border-border"
                      }`}>
                        {options.questionTypes.includes(key) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-primary flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                  Difficulty
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setOptions((prev) => ({
                          ...prev,
                          difficulty: prev.difficulty.includes(key)
                            ? prev.difficulty.filter((d) => d !== key)
                            : [...prev.difficulty, key],
                        }));
                      }}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
                        options.difficulty.includes(key)
                          ? "bg-accent text-white shadow-md"
                          : "bg-card-hover text-text-secondary border border-border hover:border-accent/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count Slider */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-primary flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-accent" />
                  Number of Questions: <span className="text-accent">{options.numberOfQuestions}</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOptions((prev) => ({ ...prev, numberOfQuestions: Math.max(1, prev.numberOfQuestions - 1) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-hover border border-border hover:border-accent/30 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={options.numberOfQuestions}
                    onChange={(e) => setOptions((prev) => ({ ...prev, numberOfQuestions: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-card-hover rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <button
                    onClick={() => setOptions((prev) => ({ ...prev, numberOfQuestions: Math.min(50, prev.numberOfQuestions + 1) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-hover border border-border hover:border-accent/30 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Bloom's Taxonomy */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-primary flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-accent" />
                  Bloom's Taxonomy Level
                </label>
                <select
                  value={options.bloomsLevel[0] || "understand"}
                  onChange={(e) => setOptions((prev) => ({ ...prev, bloomsLevel: [e.target.value as BloomsLevel] }))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-text-primary focus:border-accent focus:outline-none"
                >
                  {Object.entries(BLOOMS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Additional Options */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-primary">
                  Additional Options
                </label>
                <div className="space-y-2">
                  {[
                    { key: "includeExplanations", label: "Include Explanations", icon: Lightbulb },
                    { key: "includeHints", label: "Include Hints", icon: HelpCircle },
                    { key: "includeReferenceNotes", label: "Include Reference Notes", icon: BookOpen },
                    { key: "includeTags", label: "Include Tags", icon: Tag },
                    { key: "includeImages", label: "Include Images", icon: ImageIcon },
                  ].map((option) => (
                    <div
                      key={option.key}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4 text-accent" />
                        <span className="text-[11px] font-medium text-text-primary">
                          {option.label}
                        </span>
                      </div>
                      <button
                        onClick={() => setOptions((prev) => ({
                          ...prev,
                          [option.key]: !prev[option.key as keyof GenerationOptions],
                        }))}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          options[option.key as keyof GenerationOptions]
                            ? "bg-accent"
                            : "bg-card-hover"
                        }`}
                      >
                        <motion.div
                          animate={{ x: options[option.key as keyof GenerationOptions] ? 16 : 2 }}
                          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimate Card */}
              <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-[#8B5CF6]/10 to-[#EC4899]/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-accent" />
                    Estimated Questions
                  </span>
                  <span className="text-sm font-bold text-accent">{options.numberOfQuestions}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Est. Time: ~{Math.round(options.numberOfQuestions * 1.5)}s
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Compute: Medium
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted pt-2 border-t border-accent/20">
                  <span>Available: {balance.totalRemaining} credits</span>
                  <span>Cost: ~{estimatedCredits} credits</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-3 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] transition-shadow"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating... {Math.round(generationProgress)}%
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Questions
                  </>
                )}
              </button>
            </motion.div>
          )}

          {activeTab === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {generatedQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto h-12 w-12 text-text-muted mb-3 opacity-50" />
                  <p className="text-[11px] text-text-muted">
                    No questions generated yet
                  </p>
                </div>
              ) : (
                <>
                  {generatedQuestions.map((q) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                              {QUESTION_TYPE_LABELS[q.type]}
                            </span>
                            <span className="text-[10px] font-medium text-text-muted">
                              {DIFFICULTY_LABELS[q.difficulty]}
                            </span>
                          </div>
                          <h4 className="text-[12px] font-semibold text-text-primary">
                            {q.title}
                          </h4>
                          <p className="text-[11px] text-text-secondary mt-1">
                            {q.content}
                          </p>
                        </div>
                      </div>

                      {/* Options preview for MCQ */}
                      {q.options && (
                        <div className="space-y-1.5 pl-3 border-l-2 border-accent/20">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`text-[11px] px-2 py-1 rounded ${
                                opt.isCorrect
                                  ? "bg-success/10 text-success"
                                  : "bg-card-hover text-text-secondary"
                              }`}
                            >
                              {opt.id}. {opt.content}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="rounded-lg bg-[#8B5CF6]/10 p-2">
                          <div className="flex items-start gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5 text-accent mt-0.5" />
                            <p className="text-[10px] text-text-secondary flex-1">
                              {q.explanation}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {q.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {q.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] font-medium text-text-muted bg-card-hover px-2 py-0.5 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                        <button
                          onClick={() => handleAccept(q)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-[10px] font-bold text-success hover:bg-success/20 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleRegenerate(q.id)}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent hover:bg-accent/20 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Regenerate
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] font-bold text-danger hover:bg-danger/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}

                  {/* Accept All Button */}
                  <button
                    onClick={() => setShowReviewOverlay(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)]"
                  >
                    <Check className="h-4 w-4" />
                    Review All Questions ({generatedQuestions.length})
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full-screen AI review overlay */}
      {showReviewOverlay && (
        <AIQuestionReviewOverlay
          open={showReviewOverlay}
          questions={generatedQuestions as PreviewQuestion[]}
          onClose={() => setShowReviewOverlay(false)}
          onAccept={handleAcceptAll}
          onReject={handleRejectAll}
          onAcceptOne={handleAcceptOne}
          onEditOne={handleEditOne}
        />
      )}
    </motion.div>
  );
}