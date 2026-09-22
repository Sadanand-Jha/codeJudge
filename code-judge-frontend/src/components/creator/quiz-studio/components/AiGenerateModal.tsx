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
  Brain,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { generateQuestionsFromFiles, generateFromQuestionBank } from "@/services/ai";
import { toast } from "@/lib/toast";
import type { RawAIGeneratedQuestion } from "@/services/ai";
import type { CreatorQuestion } from "../types";

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

function mapToCreatorQuestion(
  raw: RawAIGeneratedQuestion,
  index: number
): CreatorQuestion {
  const id = `ai_${Date.now()}_${index}`;
  const isMcq =
    raw.options && raw.options.length > 0 && raw.type !== "true_false";
  const isTrueFalse = raw.type === "true_false";

  let options: CreatorQuestion["options"];
  let correctAnswer: number;

  if (isTrueFalse) {
    options = [
      { id: `${id}_a`, label: "A", content: "True", isCorrect: raw.answer?.toLowerCase() === "true" },
      { id: `${id}_b`, label: "B", content: "False", isCorrect: raw.answer?.toLowerCase() === "false" },
    ];
    correctAnswer = raw.answer?.toLowerCase() === "true" ? 0 : 1;
  } else if (isMcq) {
    options = raw.options!.map((content, oi) => {
      const label = String.fromCharCode(65 + oi);
      const isCorrect =
        content.trim().toLowerCase() === (raw.answer ?? "").trim().toLowerCase() ||
        label === (raw.answer ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
      return { id: `${id}_${label.toLowerCase()}`, label, content, isCorrect };
    });
    const correctIdx = options.findIndex((o) => o.isCorrect);
    correctAnswer = correctIdx >= 0 ? correctIdx : 0;
  } else {
    // Subjective / short — no choices; keep placeholder options hidden in editor
    options = [
      { id: `${id}_a`, label: "A", content: "", isCorrect: true },
      { id: `${id}_b`, label: "B", content: "", isCorrect: false },
      { id: `${id}_c`, label: "C", content: "", isCorrect: false },
      { id: `${id}_d`, label: "D", content: "", isCorrect: false },
    ];
    correctAnswer = 0;
  }

  const diff = (raw.difficulty ?? "medium").toLowerCase();
  const difficultyMap: Record<string, CreatorQuestion["difficulty"]> = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    expert: "Expert",
  };

  // Preserve full bank wording in title; also keep tags from bank
  return {
    id,
    type: isMcq || isTrueFalse ? "single_choice" : "text",
    title: raw.question || `AI Question ${index + 1}`,
    options,
    correctAnswer,
    explanation: raw.explanation ?? "",
    hint: raw.hint ?? "",
    marks: 10,
    negativeMarks: 0,
    difficulty: difficultyMap[diff] ?? "Medium",
    expectedTime: 2,
    topic: raw.tags?.[0] ?? "",
    bloomLevel: "Understand",
    tags: raw.tags ?? [],
    visibility: "visible",
    status: "draft",
    required: true,
    attachments: [],
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function AiGenerateModal({
  open,
  onClose,
  onQuestionsAdded,
}: {
  open: boolean;
  onClose: () => void;
  onQuestionsAdded: (questions: CreatorQuestion[]) => void;
}) {
  const [mode, setMode] = useState<"own" | "bank">("own");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  // Bank controls — balanced 10 paper default 4/3/3
  const [bankNumber, setBankNumber] = useState(10);
  const [bankEasy, setBankEasy] = useState(4);
  const [bankMedium, setBankMedium] = useState(3);
  const [bankHard, setBankHard] = useState(3);
  const [bankHint, setBankHint] = useState("");
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
      const questions = rawQuestions.map((q, i) => mapToCreatorQuestion(q, i));
      setProgress(100);
      setAddedCount(questions.length);
      setDone(true);
      onQuestionsAdded(questions);
      toast.success(`Added ${questions.length} questions from AI`);
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
        hardnessHint: bankHint || undefined,
      });
      setProgress(70);
      const questions = rawQuestions.map((q, i) => mapToCreatorQuestion(q, i));
      setProgress(100);
      setAddedCount(questions.length);
      setDone(true);
      onQuestionsAdded(questions);
      toast.success(`Selected ${questions.length} questions from bank (E${bankEasy}·M${bankMedium}·H${bankHard})`);
    } catch (err) {
      setError((err as Error).message || "Bank selection failed. Please try again.");
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Generate with AI</h3>
                  <p className="text-[11px] text-text-secondary">
                    {mode === "own" ? "Upload study materials to extract questions" : "AI-curated balanced selection"}
                  </p>
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
            <div className="grid grid-cols-2 gap-2 px-5 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => { setMode("own"); setError(""); }}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  mode === "own" ? "border-pink-500 bg-pink-500/10 shadow-sm" : "border-border bg-card-hover hover:border-pink-500/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <Upload className={cn("h-4 w-4", mode === "own" ? "text-pink-500" : "text-text-muted")} />
                  <span className={cn("text-xs font-bold", mode === "own" ? "text-pink-600" : "text-text-primary")}>From Your Material</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1">Upload PDF/DOC/PPT etc.</p>
              </button>
              <button
                type="button"
                onClick={() => { setMode("bank"); setError(""); }}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  mode === "bank" ? "border-pink-500 bg-pink-500/10 shadow-sm" : "border-border bg-card-hover hover:border-pink-500/20"
                )}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className={cn("h-4 w-4", mode === "bank" ? "text-pink-500" : "text-text-muted")} />
                  <span className={cn("text-xs font-bold", mode === "bank" ? "text-pink-600" : "text-text-primary")}>From Question Bank</span>
                </div>
                <p className="text-[10px] text-text-muted mt-1">Curated · balanced</p>
              </button>
            </div>

            {mode === "bank" && !done && !generating && (
              <div className="mx-5 mt-3 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-pink-500/5 p-3 flex items-start gap-2 shrink-0">
                <BookOpen className="h-4 w-4 text-violet-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-text-primary">Curated Operating Systems Bank</p>
                  <p className="text-[11px] text-text-secondary">200 single-correct MCQs · Balanced difficulty · Theory + Numerical</p>
                </div>
              </div>
            )}

            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
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
                      {mode === "bank" ? "Selecting balanced questions..." : "Analyzing your files..."}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {mode === "bank" ? `Picking ${bankNumber} (E${bankEasy}·M${bankMedium}·H${bankHard}) with chapter spread` : "Extracting text and generating questions"}
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
                <div className="space-y-4">
                  {/* Assessment size */}
                  <div className="rounded-xl border border-border bg-card p-3 space-y-3">
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
                    <p className="text-[10px] text-text-muted">Typical balanced OS paper is 10 questions (5–20 allowed).</p>
                  </div>

                  {/* Difficulty distribution */}
                  <div className="rounded-xl border border-border bg-card p-3 space-y-3">
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
                    <div className={cn("text-xs font-medium px-2 py-1.5 rounded text-center border", bankEasy + bankMedium + bankHard === bankNumber ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20")}>
                      {bankEasy} + {bankMedium} + {bankHard} = {bankEasy + bankMedium + bankHard} {bankEasy + bankMedium + bankHard === bankNumber ? "✓ Balanced" : `≠ ${bankNumber} — adjust`}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button type="button" onClick={() => syncBankDistribution(bankNumber)} className="text-xs font-medium px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-600 border border-pink-500/20">Auto 40/30/30</button>
                      <button type="button" onClick={() => { const e = Math.floor(bankNumber/3); setBankEasy(e); setBankMedium(e); setBankHard(bankNumber - 2*e); }} className="text-xs font-medium px-2.5 py-1 rounded-full bg-card-hover border border-border">Equal split</button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <label className="text-xs font-bold text-text-primary flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-pink-500" /> Hardness hint (optional)</label>
                    <input value={bankHint} onChange={(e) => setBankHint(e.target.value)} placeholder="e.g. Make it a hard paper, focus on numerical…" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-pink-500 outline-none" />
                    <p className="text-[11px] text-text-muted">Guides overall hardness beyond counts. Leave blank for default balanced paper.</p>
                  </div>

                  <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-pink-500/10 p-3">
                    <p className="text-xs font-bold text-text-primary mb-1">How it works</p>
                    <p className="text-xs text-text-secondary leading-relaxed">AI curates {bankNumber} questions for you — balanced across chapters, difficulty ({bankEasy}·{bankMedium}·{bankHard}) and theory / numerical mix for a fair assessment.</p>
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
                    disabled={bankEasy + bankMedium + bankHard !== bankNumber}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
                      bankEasy + bankMedium + bankHard === bankNumber
                        ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/20 hover:brightness-110"
                        : "cursor-not-allowed bg-card-hover text-text-muted"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate {bankNumber} from Bank
                  </button>
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
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
