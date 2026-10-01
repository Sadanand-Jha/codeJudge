"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Trash2,
  BrainCircuit,
  ScanLine,
  Layers3,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { AiStreamText } from "@/components/ui";
import { generateTestSectionsFromPDF } from "@/services/aiGenerate";
import { convertAIResponseToSections } from "./convertAIResponse";
import type {
  AIGenerateResponse,
  AIGenerateStatus,
  AIGenerateError,
} from "./aiTypes";
import type { Section } from "./types";

interface AIGenerateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (sections: Section[]) => void;
  existingSectionCount: number;
}

const PROGRESS_STEPS = [
  { key: "uploading", label: "File uploaded safely" },
  { key: "extracting", label: "Extracting document" },
  { key: "analyzing", label: "Identifying question-paper structure" },
  { key: "building", label: "Building sections" },
] as const;

const LIVE_ACTIVITY = [
  "Reading headings and question patterns",
  "Mapping groups, marks and attempt rules",
  "Checking the paper for repeated structures",
  "Organizing sections in a teacher-friendly order",
  "Validating totals before building your blueprint",
] as const;

const WAITING_TIPS = [
  "AI keeps your source structure intact wherever possible.",
  "Marks and attempt rules are validated before sections appear.",
  "You can edit every generated section before moving ahead.",
] as const;

const SUPPORTED_EXTENSIONS = new Set([
  "pdf", "docx", "pptx", "xlsx", "txt", "md", "csv", "tsv", "json",
  "png", "jpg", "jpeg", "webp",
]);
const SUPPORTED_ACCEPT = ".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.tsv,.json,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/markdown,text/csv,application/json,image/png,image/jpeg,image/webp";
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

export function AIGenerateModal({
  open,
  onClose,
  onGenerate,
  existingSectionCount,
}: AIGenerateModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<AIGenerateStatus>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<AIGenerateError | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const reset = useCallback(() => {
    setFiles([]);
    setStatus("idle");
    setCurrentStep(0);
    setError(null);
    setShowReplaceConfirm(false);
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (status === "uploading" || status === "extracting" || status === "analyzing" || status === "building") {
      abortRef.current?.abort();
    }
    reset();
    onClose();
  }, [status, reset, onClose]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const selected = Array.from(incoming);
    if (selected.length === 0) return;
    const invalid = selected.find((file) => !SUPPORTED_EXTENSIONS.has(file.name.split(".").pop()?.toLocaleLowerCase() ?? ""));
    if (invalid) {
      setError({ type: "upload", message: "Upload PDF, Word, PowerPoint, Excel, text, or PNG/JPEG/WebP images only." });
      return;
    }
    setFiles((current) => {
      const next = [...current, ...selected.filter((file) => !current.some((existing) => existing.name === file.name && existing.size === file.size))];
      if (next.length > MAX_FILES) {
        setError({ type: "upload", message: `Add up to ${MAX_FILES} files at a time.` });
        return current;
      }
      const total = next.reduce((sum, file) => sum + file.size, 0);
      if (total > MAX_TOTAL_BYTES) {
        setError({ type: "upload", message: "All selected files together must be 2MB or less." });
        return current;
      }
      setError(null);
      return next;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const simulateProgress = useCallback(async () => {
    setCurrentStep(0);
    setStatus("uploading");
    await new Promise((r) => setTimeout(r, 600));

    setCurrentStep(1);
    setStatus("extracting");
    await new Promise((r) => setTimeout(r, 1200));

    setCurrentStep(2);
    setStatus("analyzing");
    await new Promise((r) => setTimeout(r, 800));

    setCurrentStep(3);
    setStatus("building");
  }, []);

  const handleGenerate = useCallback(async () => {
    if (files.length === 0) return;

    if (existingSectionCount > 0) {
      setShowReplaceConfirm(true);
      return;
    }

    await startGeneration();
  }, [files, existingSectionCount]);

  const startGeneration = useCallback(async () => {
    if (files.length === 0) return;

    setShowReplaceConfirm(false);
    setError(null);
    abortRef.current = new AbortController();

    const progressPromise = simulateProgress();

    try {
      const response = await generateTestSectionsFromPDF(
        files,
        abortRef.current.signal
      );

      await progressPromise;

      if (
        !response.sections ||
        !Array.isArray(response.sections) ||
        response.sections.length === 0
      ) {
        setError({
          type: "empty",
          message: "No usable question-paper structure was found in this document.",
        });
        setStatus("error");
        return;
      }

      const sections = convertAIResponseToSections(response);
      setStatus("done");

      setTimeout(() => {
        onGenerate(sections);
        toast.success({
          title: "Test structure generated",
          description: "Review the generated sections before continuing.",
        });
        handleClose();
      }, 800);
    } catch (err: any) {
      await progressPromise;

      if (err?.name === "CanceledError" || err?.name === "AbortError") {
        reset();
        return;
      }

      let errorType: AIGenerateError["type"] = "network";
      let errorMessage = "Something went wrong. Please try again.";

      if (err?.response?.status === 400) {
        errorType = "upload";
        errorMessage = "Please upload a supported file that passes our safety checks.";
      } else if (err?.response?.status === 422) {
        errorType = "validation";
        errorMessage =
          "The generated structure couldn't be validated. Please try again.";
      } else if (err?.response?.status === 500) {
        errorType = "extraction";
        errorMessage =
          "We couldn't extract content from this file. Please try another supported document or image.";
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError({ type: errorType, message: errorMessage });
      setStatus("error");
    }
  }, [files, simulateProgress, onGenerate, toast, handleClose, reset]);

  const isProcessing =
    status === "uploading" ||
    status === "extracting" ||
    status === "analyzing" ||
    status === "building";

  useEffect(() => {
    if (!isProcessing) {
      setElapsedSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [isProcessing]);

  const processingStepIndex = Math.max(0, PROGRESS_STEPS.findIndex((step) => step.key === status));
  const activityIndex = Math.floor(elapsedSeconds / 3) % LIVE_ACTIVITY.length;
  const tipIndex = Math.floor(elapsedSeconds / 6) % WAITING_TIPS.length;
  const progressPercent = status === "uploading"
    ? 14
    : status === "extracting"
      ? 36
      : status === "analyzing"
        ? 62
        : Math.min(94, 74 + elapsedSeconds * 0.65);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="ai-color-card max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="ai-color-header flex items-center justify-between border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text-primary">
                      <AiStreamText text="Generate Test Structure with AI" />
                    </h2>
                    <p className="text-[11px] text-text-muted">
                      <AiStreamText text="Powered by AI" />
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {/* Description */}
                {status === "idle" && !showReplaceConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    <p className="ai-color-note min-h-10 rounded-xl px-3.5 py-3 text-[13px] leading-5 text-text-secondary">
                      <AiStreamText text="Upload a question paper, syllabus, textbook, or study material. AI will analyze the document and suggest a structured question-paper layout." />
                    </p>

                    {/* Upload Area */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-7 text-center transition-all cursor-pointer",
                        files.length > 0 && "ai-upload-zone",
                        dragOver
                          ? "border-pink-500 bg-pink-500/5"
                          : files.length > 0
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border bg-card-hover/20 hover:border-pink-500/30 hover:bg-pink-500/5"
                      )}
                    >
                      {files.length > 0 ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-lg shadow-violet-500/15">
                            <FileText className="h-6 w-6" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-text-primary">
                            {files.length} file{files.length === 1 ? "" : "s"} selected
                          </p>
                          <p className="mt-1 text-[11px] text-text-muted">
                            {(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB of 2 MB
                          </p>
                          <div className="mt-3 max-h-24 w-full space-y-1 overflow-y-auto text-left">
                            {files.map((file, index) => (
                              <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-violet-500/10 bg-white/75 px-2.5 py-1.5 text-[11px] shadow-sm dark:bg-white/[0.035]">
                                <span className="min-w-0 truncate text-text-secondary">{file.name}</span>
                                <button type="button" onClick={(event) => { event.stopPropagation(); removeFile(index); }} className="shrink-0 text-rose-500 hover:text-rose-600" aria-label={`Remove ${file.name}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {files.length < MAX_FILES && (
                            <button type="button" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-violet-500/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-500/[0.13] dark:text-violet-300">
                              <Upload className="h-3 w-3" /> Add more files
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card text-text-muted">
                            <Upload className="h-6 w-6" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-text-primary">
                            Drop a document or image here, or click to browse
                          </p>
                          <p className="mt-1 text-[11px] text-text-muted">
                            PDF, Word, PowerPoint, Excel, text, PNG/JPEG/WebP · up to 5 files, 2MB total
                          </p>
                        </>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={SUPPORTED_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                    />

                    {/* Error */}
                    {error && (
                      <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                        <div>
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            {error.message}
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setFiles([]);
                              }}
                              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600"
                            >
                              Try Again
                            </button>
                            <span className="text-text-muted">or</span>
                            <button
                              type="button"
                              onClick={handleClose}
                              className="text-[11px] font-semibold text-text-secondary hover:text-text-primary"
                            >
                              Create Sections Manually
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Replace Confirmation */}
                {showReplaceConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                      <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-bold text-text-primary">
                          Replace existing sections?
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          This will replace the current{" "}
                          {existingSectionCount} section
                          {existingSectionCount !== 1 ? "s" : ""} with the
                          AI-generated structure. Your existing sections will
                          not be deleted permanently until you save.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReplaceConfirm(false)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-semibold text-text-primary transition-all hover:border-border-hover"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={startGeneration}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)]"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate & Replace
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Processing Progress */}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-pink-500/[0.07] via-card to-violet-500/[0.09] px-4 pb-4 pt-5 text-center dark:border-violet-400/15">
                      <motion.div
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-12 -top-14 h-32 w-32 rounded-full bg-pink-400/15 blur-3xl"
                        animate={{ scale: [0.85, 1.15, 0.9], opacity: [0.35, 0.7, 0.4] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-16 -right-10 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl"
                        animate={{ scale: [1.1, 0.88, 1.12], opacity: [0.4, 0.7, 0.35] }}
                        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
                      />

                      <div className="relative mx-auto h-24 w-28">
                        <motion.div
                          aria-hidden="true"
                          className="absolute inset-1 rounded-full border border-dashed border-violet-400/35"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                          className="absolute left-1/2 top-1/2 flex h-16 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-xl border border-white/70 bg-white text-violet-600 shadow-[0_10px_30px_rgba(124,58,237,0.18)] dark:border-white/10 dark:bg-zinc-900 dark:text-violet-300"
                          animate={{ y: [-2, 2, -2], rotate: [-1, 1, -1] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <FileText className="h-7 w-7" />
                          <motion.span
                            aria-hidden="true"
                            className="absolute inset-x-1 h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_8px_rgba(236,72,153,0.8)]"
                            animate={{ top: [8, 54, 8] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </motion.div>
                        <motion.span className="absolute left-1 top-4 text-pink-500" animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3], rotate: [0, 18, 0] }} transition={{ duration: 2.1, repeat: Infinity }}><Sparkles className="h-3.5 w-3.5" /></motion.span>
                        <motion.span className="absolute bottom-3 right-0 text-violet-500" animate={{ y: [0, 5, 0], opacity: [0.35, 1, 0.35], rotate: [0, -18, 0] }} transition={{ duration: 2.6, repeat: Infinity }}><Sparkles className="h-3 w-3" /></motion.span>
                      </div>

                      <div className="relative -mt-1">
                        <div className="flex items-center justify-center gap-2 text-sm font-extrabold text-text-primary">
                          <BrainCircuit className="h-4 w-4 text-violet-500" />
                          AI is designing your sections
                        </div>
                        <div className="mt-1.5 min-h-5 overflow-hidden text-[11px] text-text-secondary">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={activityIndex}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.25 }}
                            >
                              {LIVE_ACTIVITY[activityIndex]}…
                            </motion.p>
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="relative mt-4">
                        <div className="h-2 overflow-hidden rounded-full bg-violet-950/[0.06] dark:bg-white/[0.07]">
                          <motion.div
                            className="relative h-full rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500"
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                          >
                            <motion.span
                              aria-hidden="true"
                              className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                              animate={{ x: ["-100%", "500%"] }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                            />
                          </motion.div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-text-muted">
                          <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> {elapsedSeconds}s elapsed</span>
                          <span>Usually 30–60 seconds</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {PROGRESS_STEPS.map((step, idx) => {
                        const isDone = idx < processingStepIndex;
                        const isCurrent = idx === processingStepIndex;
                        const StepIcon = idx === 0 ? ShieldCheck : idx === 1 ? ScanLine : idx === 2 ? BrainCircuit : Layers3;
                        return (
                          <div key={step.key} className={cn("rounded-xl border px-1.5 py-2 text-center transition-colors", isDone ? "border-emerald-500/20 bg-emerald-500/[0.06]" : isCurrent ? "border-violet-500/30 bg-violet-500/[0.08]" : "border-border bg-card-hover/20")}>
                            <div className={cn("mx-auto flex h-6 w-6 items-center justify-center rounded-lg", isDone ? "bg-emerald-500 text-white" : isCurrent ? "bg-gradient-to-br from-pink-500 to-violet-600 text-white" : "bg-card-hover text-text-muted")}>
                              {isDone ? <Check className="h-3 w-3" /> : isCurrent ? <StepIcon className="h-3 w-3 animate-pulse" /> : <StepIcon className="h-3 w-3" />}
                            </div>
                            <p className={cn("mt-1.5 truncate text-[8px] font-bold", isDone ? "text-emerald-600 dark:text-emerald-300" : isCurrent ? "text-violet-600 dark:text-violet-300" : "text-text-muted")}>{step.label.replace(" safely", "").replace(" question-paper", "")}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border border-border bg-card-hover/25 px-3 py-2.5">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-500" />
                      <div className="min-w-0 text-left">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-text-muted">While AI works</p>
                        <AnimatePresence mode="wait">
                          <motion.p key={tipIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-0.5 text-[10px] leading-4 text-text-secondary">{WAITING_TIPS[tipIndex]}</motion.p>
                        </AnimatePresence>
                      </div>
                    </div>

                    <p className="text-center text-[10px] font-semibold text-text-muted">Please keep this window open — your document is being processed securely.</p>
                  </motion.div>
                )}

                {/* Error state (after processing) */}
                {status === "error" && error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      <div>
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {error.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-semibold text-text-primary transition-all hover:border-border-hover"
                      >
                        Create Sections Manually
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setStatus("idle");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)]"
                      >
                        Try Again
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Done state */}
                {status === "done" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-6 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                      <Check className="h-7 w-7" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-text-primary">
                      Structure generated!
                    </p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      Populating sections...
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {status === "idle" && !showReplaceConfirm && (
                <div className="ai-color-header flex flex-col gap-2 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex max-w-[230px] items-start gap-1 text-[9px] leading-3.5 text-text-muted">
                    <AlertCircle className="mt-px h-2.5 w-2.5 shrink-0" /> AI can make mistakes. Review the generated structure before saving it.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-semibold text-text-primary transition-all hover:border-border-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={files.length === 0}
                      className="section-ai-cta inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Test Structure
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
