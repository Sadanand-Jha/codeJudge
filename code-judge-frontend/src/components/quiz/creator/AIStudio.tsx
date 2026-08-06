"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Upload, FileText, Image, X, ChevronRight, ChevronDown,
  Settings, Play, Pause, RotateCcw, Check, Edit3, Trash2,
  Wand2, FileSpreadsheet, FileType, Archive, CheckCircle2,
  AlertCircle, Loader2, Plus, Minus, Sliders, BookOpen,
  BarChart3, Lightbulb, Tag, ImageIcon, HelpCircle
} from "lucide-react";
import { useAICreditConsumption } from "@/hooks/useAICreditConsumption";
import { toast } from "@/lib/toast";

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
  mcq: "Multiple Choice",
  coding: "Coding",
  true_false: "True/False",
  fill: "Fill in the Blank",
  short: "Short Answer",
  integer: "Integer",
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
  ".png", ".jpg", ".jpeg"
];

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
  const [extractedText, setExtractedText] = useState<string>("");
  const [options, setOptions] = useState<GenerationOptions>(DEFAULT_OPTIONS);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [estimatedCredits, setEstimatedCredits] = useState(0);

  const { consume, refund, completeRequest, balance, isLowCredit, recommendedPack } = useAICreditConsumption();

  // Calculate estimated credits
  useEffect(() => {
    const baseCost = 8; // AI quiz generation base cost
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
        type: file.type,
        status: "uploading",
        progress: 0,
      };

      setUploadedFiles((prev) => [...prev, newFile]);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === newFile.id ? { ...f, progress } : f))
        );

        if (progress >= 100) {
          clearInterval(interval);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === newFile.id ? { ...f, status: "processing", progress: 100 } : f
            )
          );

          // Simulate processing
          setTimeout(() => {
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === newFile.id ? { ...f, status: "ready" } : f
              )
            );
            setExtractedText((prev) => prev + "\n\n" + `[Content extracted from ${file.name}]\nSample text content...`);
          }, 2000);
        }
      }, 200);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /* ============================================
     Generation Handlers
     ============================================ */
  const handleGenerate = async () => {
    if (uploadedFiles.length === 0 && !extractedText.trim()) {
      toast.error("Please upload learning material first");
      return;
    }

    // Consume credits
    const result = await consume("ai-quiz-generation", {
      promptHash: extractedText.slice(0, 100),
      onInsufficientCredits: () => {
        toast.error("Not enough credits", {
          description: recommendedPack
            ? `Consider the ${recommendedPack.name} pack`
            : "Purchase credits to continue",
        });
      },
      onError: (reason) => {
        if (reason !== "insufficient_credits") {
          toast.error("Generation failed", { description: reason });
        }
      },
    });

    if (!result.allowed) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate progressive generation
    const totalSteps = options.numberOfQuestions;
    for (let i = 0; i < totalSteps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setGenerationProgress(((i + 1) / totalSteps) * 100);
    }

    // Generate mock questions
    const questions: GeneratedQuestion[] = Array.from({ length: options.numberOfQuestions }, (_, i) => ({
      id: `gen-${Date.now()}-${i}`,
      type: options.questionTypes[0],
      title: `Generated Question ${i + 1}`,
      content: `This is a generated question based on the uploaded material.`,
      options: options.questionTypes.includes("mcq")
        ? [
            { id: "a", content: "Option A", isCorrect: true },
            { id: "b", content: "Option B", isCorrect: false },
            { id: "c", content: "Option C", isCorrect: false },
            { id: "d", content: "Option D", isCorrect: false },
          ]
        : undefined,
      correctAnswer: options.questionTypes.includes("mcq") ? "a" : "Sample answer",
      explanation: options.includeExplanations ? "This is the explanation for the question." : undefined,
      hint: options.includeHints ? "Think about the key concepts." : undefined,
      difficulty: options.difficulty[0],
      tags: options.includeTags ? ["generated", "ai"] : [],
      credits: Math.round(8 / options.numberOfQuestions),
    }));

    setGeneratedQuestions(questions);
    setIsGenerating(false);
    setActiveTab("review");
    toast.success(`Generated ${questions.length} questions!`);
  };

  const handleAcceptAll = () => {
    onQuestionsGenerated?.(generatedQuestions);
    toast.success("All questions added to quiz");
  };

  const handleAccept = (question: GeneratedQuestion) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== question.id));
    onQuestionsGenerated?.([question]);
    toast.success("Question added");
  };

  const handleRegenerate = async (questionId: string) => {
    // Simulate regeneration with additional credits
    const result = await consume("ai-quiz-generation", {
      promptHash: `regen-${questionId}`,
    });

    if (!result.allowed) return;

    toast.info("Regenerating question...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Question regenerated");
  };

  const handleDelete = (questionId: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

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
                onDragOver={(e) => e.preventDefault()}
                className="rounded-2xl border-2 border-dashed border-border hover:border-accent/50 bg-card-hover/50 p-8 text-center transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-text-muted mb-3" />
                <p className="text-sm font-medium text-text-primary mb-1">
                  Drop learning material here
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
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.3)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Browse Files
                </label>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                        {file.type.includes("pdf") ? <FileText className="h-5 w-5 text-accent" /> :
                         file.type.includes("image") ? <Image className="h-5 w-5 text-accent" /> :
                         file.type.includes("zip") ? <Archive className="h-5 w-5 text-accent" /> :
                         <FileType className="h-5 w-5 text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium text-text-primary truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                        {file.status === "uploading" && (
                          <div className="mt-1 h-1 rounded-full bg-card-hover overflow-hidden">
                            <motion.div
                              animate={{ width: `${file.progress}%` }}
                              className="h-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6]"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {file.status === "ready" && (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        )}
                        {file.status === "processing" && (
                          <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        )}
                        <button
                          onClick={() => removeFile(file.id)}
                          className="rounded p-1 text-text-muted hover:text-danger"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted Text Preview */}
              {extractedText && (
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-text-primary">
                      Extracted Content
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {extractedText.split(/\s+/).length} words
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-lg bg-card-hover p-2 text-[10px] text-text-secondary">
                    {extractedText}
                  </div>
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
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setOptions((prev) => ({
                          ...prev,
                          questionTypes: prev.questionTypes.includes(key as QuestionType)
                            ? prev.questionTypes.filter((t) => t !== key)
                            : [...prev.questionTypes, key as QuestionType],
                        }));
                      }}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                        options.questionTypes.includes(key as QuestionType)
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "bg-card-hover text-text-secondary border border-border hover:border-accent/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-primary flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-accent" />
                  Difficulty
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setOptions((prev) => ({
                          ...prev,
                          difficulty: prev.difficulty.includes(key as Difficulty)
                            ? prev.difficulty.filter((d) => d !== key)
                            : [...prev.difficulty, key as Difficulty],
                        }));
                      }}
                      className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
                        options.difficulty.includes(key as Difficulty)
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "bg-card-hover text-text-secondary border border-border hover:border-accent/20"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-text-primary">
                  Number of Questions: {options.numberOfQuestions}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setOptions((prev) => ({ ...prev, numberOfQuestions: Math.max(1, prev.numberOfQuestions - 1) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-hover border border-border hover:border-accent/30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 text-center text-sm font-bold text-text-primary">
                    {options.numberOfQuestions}
                  </span>
                  <button
                    onClick={() => setOptions((prev) => ({ ...prev, numberOfQuestions: Math.min(20, prev.numberOfQuestions + 1) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-hover border border-border hover:border-accent/30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-2">
                {[
                  { key: "includeExplanations", label: "Include Explanations" },
                  { key: "includeHints", label: "Include Hints" },
                  { key: "includeReferenceNotes", label: "Include Reference Notes" },
                  { key: "includeTags", label: "Include Tags" },
                  { key: "includeImages", label: "Include Images (OCR)" },
                ].map((option) => (
                  <div
                    key={option.key}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-3"
                  >
                    <span className="text-[11px] font-medium text-text-primary">
                      {option.label}
                    </span>
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

              {/* Credit Estimate */}
              <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-[#8B5CF6]/10 to-[#EC4899]/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text-secondary">
                    Estimated Cost
                  </span>
                  <span className="text-sm font-bold text-accent">
                    ~{estimatedCredits} credits
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted">
                  <span>Available: {balance.totalRemaining}</span>
                  <span>Monthly: {balance.monthlyCredits - balance.monthlyCreditsConsumed}</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-3 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div
                      key={q.id}
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
                    </div>
                  ))}

                  {/* Accept All Button */}
                  <button
                    onClick={handleAcceptAll}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2.5 text-[12px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)]"
                  >
                    <Check className="h-4 w-4" />
                    Accept All Questions ({generatedQuestions.length})
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}