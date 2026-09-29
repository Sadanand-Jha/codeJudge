"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
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
              className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-text-primary">
                      Generate Test Structure with AI
                    </h2>
                    <p className="text-[11px] text-text-muted">
                      Powered by AI
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
              <div className="px-6 py-5">
                {/* Description */}
                {status === "idle" && !showReplaceConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-5"
                  >
                    <p className="text-[13px] text-text-secondary">
                      Upload a question paper, syllabus, textbook, or study
                      material. AI will analyze the document and suggest a
                      structured question-paper layout.
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
                        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all cursor-pointer",
                        dragOver
                          ? "border-pink-500 bg-pink-500/5"
                          : files.length > 0
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border bg-card-hover/20 hover:border-pink-500/30 hover:bg-pink-500/5"
                      )}
                    >
                      {files.length > 0 ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
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
                              <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-card px-2 py-1.5 text-[11px]">
                                <span className="min-w-0 truncate text-text-secondary">{file.name}</span>
                                <button type="button" onClick={(event) => { event.stopPropagation(); removeFile(index); }} className="shrink-0 text-rose-500 hover:text-rose-600" aria-label={`Remove ${file.name}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {files.length < MAX_FILES && (
                            <button type="button" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }} className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-pink-500 hover:text-pink-600">
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
                    className="space-y-4"
                  >
                    <p className="text-[13px] font-semibold text-text-primary">
                      Analyzing your document...
                    </p>

                    <div className="space-y-2.5">
                      {PROGRESS_STEPS.map((step, idx) => {
                        const stepIdx = PROGRESS_STEPS.findIndex(
                          (s) => s.key === status
                        );
                        const isDone = idx < stepIdx;
                        const isCurrent = idx === stepIdx;

                        return (
                          <div
                            key={step.key}
                            className="flex items-center gap-3"
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                isDone &&
                                  "bg-emerald-500 text-white",
                                isCurrent &&
                                  "bg-pink-500 text-white",
                                !isDone &&
                                  !isCurrent &&
                                  "bg-card-hover text-text-muted"
                              )}
                            >
                              {isDone ? (
                                <Check className="h-3 w-3" />
                              ) : isCurrent ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-[13px]",
                                isDone &&
                                  "font-medium text-emerald-600 dark:text-emerald-400",
                                isCurrent &&
                                  "font-semibold text-text-primary",
                                !isDone &&
                                  !isCurrent &&
                                  "text-text-muted"
                              )}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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
                <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
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
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:shadow-[0_6px_20px_rgba(236,72,153,0.35)] disabled:opacity-50 disabled:shadow-none"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate Test Structure
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
