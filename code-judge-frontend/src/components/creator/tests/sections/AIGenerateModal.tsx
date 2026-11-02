"use client";

import { showUpgradeModal } from "@/lib/upgradePrompt";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { useFileUploadAccess } from "@/hooks/useFileUploadAccess";
import { AiStreamText } from "@/components/ui";
import { generateTestSectionsFromPDF } from "@/services/aiGenerate";
import { convertAIResponseToSections } from "./convertAIResponse";
import type {
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
  const {
    canUploadFiles,
    canUseAi,
    isLoading: subscriptionLoading,
    aiLoading,
    upgradeHref,
    upgradeMessage,
    aiUpgradeMessage,
  } = useFileUploadAccess();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<AIGenerateStatus>("idle");
  const [error, setError] = useState<AIGenerateError | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const reset = useCallback(() => {
    setFiles([]);
    setStatus("idle");
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
    if (!canUploadFiles) {
      setError({ type: "upload", message: upgradeMessage });
      if (!subscriptionLoading) {
        showUpgradeModal({ message: upgradeMessage });
      }
      return;
    }
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
  }, [canUploadFiles, subscriptionLoading, upgradeMessage]);

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
    setStatus("uploading");
    await new Promise((r) => setTimeout(r, 600));

    setStatus("extracting");
    await new Promise((r) => setTimeout(r, 1200));

    setStatus("analyzing");
    await new Promise((r) => setTimeout(r, 800));

    setStatus("building");
  }, []);

  const startGeneration = useCallback(async () => {
    if (!canUseAi) {
      setError({ type: "upload", message: aiUpgradeMessage });
      if (!aiLoading) {
        showUpgradeModal({ message: aiUpgradeMessage });
      }
      return;
    }
    if (!canUploadFiles) {
      setError({ type: "upload", message: upgradeMessage });
      return;
    }
    if (files.length === 0) return;

    setShowReplaceConfirm(false);
    setError(null);
    setElapsedSeconds(0);
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
    } catch (err) {
      await progressPromise;
      const apiError = err as {
        name?: string;
        response?: { status?: number; data?: { message?: string } };
      };

      if (apiError?.name === "CanceledError" || apiError?.name === "AbortError") {
        reset();
        return;
      }

      let errorType: AIGenerateError["type"] = "network";
      let errorMessage = "Something went wrong. Please try again.";

      if (apiError?.response?.status === 400) {
        errorType = "upload";
        errorMessage = "Please upload a supported file that passes our safety checks.";
      } else if (apiError?.response?.status === 422) {
        errorType = "validation";
        errorMessage =
          "The generated structure couldn't be validated. Please try again.";
      } else if (apiError?.response?.status === 500) {
        errorType = "extraction";
        errorMessage =
          "We couldn't extract content from this file. Please try another supported document or image.";
      } else if (apiError?.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      }

      setError({ type: errorType, message: errorMessage });
      setStatus("error");
    }
  }, [files, simulateProgress, onGenerate, toast, handleClose, reset, canUploadFiles, canUseAi, aiLoading, aiUpgradeMessage, upgradeMessage]);

  const handleGenerate = useCallback(async () => {
    if (!canUseAi) {
      setError({ type: "upload", message: aiUpgradeMessage });
      if (!aiLoading) {
        showUpgradeModal({ message: aiUpgradeMessage });
      }
      return;
    }
    if (!canUploadFiles) {
      setError({ type: "upload", message: upgradeMessage });
      if (!subscriptionLoading) {
        showUpgradeModal({ message: upgradeMessage });
      }
      return;
    }
    if (files.length === 0) return;

    if (existingSectionCount > 0) {
      setShowReplaceConfirm(true);
      return;
    }

    await startGeneration();
  }, [files, existingSectionCount, canUploadFiles, canUseAi, subscriptionLoading, aiLoading, upgradeMessage, aiUpgradeMessage, startGeneration]);

  const isProcessing =
    status === "uploading" ||
    status === "extracting" ||
    status === "analyzing" ||
    status === "building";

  useEffect(() => {
    if (!isProcessing) return;
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-[rgba(26,18,64,0.55)] p-3 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-generate-title"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="ai-generate-title" className="text-lg font-extrabold tracking-tight text-[var(--qs-ink)]">
                    <AiStreamText text="Generate Test Structure with AI" />
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
                    <AiStreamText text="Powered by AI" />
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="b b-icon sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* Description */}
              {status === "idle" && !showReplaceConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <p className="rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 text-[13px] font-medium leading-5 text-[var(--qs-muted)]">
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
                    onClick={() => {
                      if (!canUploadFiles) {
                        setError({ type: "upload", message: upgradeMessage });
                        if (!subscriptionLoading) {
                          showUpgradeModal({ message: upgradeMessage });
                        }
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-7 text-center transition-all",
                      canUploadFiles ? "cursor-pointer" : "cursor-not-allowed",
                      dragOver
                        ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/[0.04]"
                        : files.length > 0
                          ? "border-[var(--qs-ok)]/50 bg-[var(--qs-okbg)]/40"
                          : "border-[var(--qs-line)] bg-[var(--qs-bg)] hover:border-[var(--qs-brand)] hover:bg-[var(--qs-brand)]/[0.04]"
                    )}
                  >
                    {files.length > 0 ? (
                      <>
                        <div className="grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                          <FileText className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">
                          {files.length} file{files.length === 1 ? "" : "s"} selected
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-[var(--qs-muted)]">
                          {(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB of 2 MB
                        </p>
                        <div className="mt-3 max-h-24 w-full space-y-1 overflow-y-auto text-left">
                          {files.map((file, index) => (
                            <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1.5 text-[11px]">
                              <span className="min-w-0 truncate font-medium text-[var(--qs-ink)]">{file.name}</span>
                              <button type="button" onClick={(event) => { event.stopPropagation(); removeFile(index); }} className="shrink-0 text-[var(--qs-bad)] transition-opacity hover:opacity-70" aria-label={`Remove ${file.name}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {files.length < MAX_FILES && (
                          <button type="button" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }} className="mt-3 inline-flex items-center gap-1 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]">
                            <Upload className="h-3 w-3" /> Add more files
                          </button>
                        )}
                      </>
                    ) : !subscriptionLoading && !canUploadFiles ? (
                      <>
                        <div className="grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]">
                          <Lock className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">
                          File uploads are paid-only
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-[var(--qs-muted)]">
                          <Link
                            href={upgradeHref}
                            onClick={(event) => event.stopPropagation()}
                            className="font-bold text-[var(--qs-brand)] underline"
                          >
                            Upgrade your plan
                          </Link>{" "}
                          to generate test sections from your material.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="grid h-12 w-12 place-items-center rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]">
                          <Upload className="h-6 w-6" />
                        </div>
                        <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">
                          Drop a document or image here, or click to browse
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-[var(--qs-muted)]">
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
                    disabled={!canUploadFiles || subscriptionLoading}
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                  />

                  {/* Error */}
                  {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-4 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                      <div>
                        <p className="text-xs font-bold text-[var(--qs-bad)]">
                          {error.message}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setFiles([]);
                            }}
                            className="text-[11px] font-bold text-[var(--qs-bad)] hover:underline"
                          >
                            Retry
                          </button>
                          <span className="text-[var(--qs-muted)]">or</span>
                          <button
                            type="button"
                            onClick={handleClose}
                            className="text-[11px] font-bold text-[var(--qs-ink)] hover:underline"
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
                    <div className="flex items-start gap-3 rounded-xl border-2 border-[var(--qs-sun)] bg-[var(--qs-sun)]/15 px-4 py-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--qs-ink)]" />
                      <div>
                        <p className="text-sm font-bold text-[var(--qs-ink)]">
                          Replace existing sections?
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">
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
                        className="b sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={startGeneration}
                        className="b b-pri sm gap-1.5"
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
                    <div className="relative overflow-hidden rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 pb-4 pt-5 text-center">
                      <motion.div
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-12 -top-14 h-32 w-32 rounded-full bg-[var(--qs-sun)]/25 blur-3xl"
                        animate={{ scale: [0.85, 1.15, 0.9], opacity: [0.35, 0.7, 0.4] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-16 -right-10 h-36 w-36 rounded-full bg-[var(--qs-brand)]/10 blur-3xl"
                        animate={{ scale: [1.1, 0.88, 1.12], opacity: [0.4, 0.7, 0.35] }}
                        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
                      />

                      <div className="relative mx-auto h-24 w-28">
                        <motion.div
                          aria-hidden="true"
                          className="absolute inset-1 rounded-full border border-dashed border-[var(--qs-brand)]/30"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                          className="absolute left-1/2 top-1/2 flex h-16 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-brand)] shadow-[3px_3px_0_var(--qs-sun)]"
                          animate={{ y: [-2, 2, -2], rotate: [-1, 1, -1] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <FileText className="h-7 w-7" />
                          <motion.span
                            aria-hidden="true"
                            className="absolute inset-x-1 h-0.5 bg-gradient-to-r from-transparent via-[var(--qs-brand)] to-transparent shadow-[0_0_8px_var(--qs-brand)]"
                            animate={{ top: [8, 54, 8] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </motion.div>
                        <motion.span className="absolute left-1 top-4 text-[var(--qs-sun)]" animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3], rotate: [0, 18, 0] }} transition={{ duration: 2.1, repeat: Infinity }}><Sparkles className="h-3.5 w-3.5" /></motion.span>
                        <motion.span className="absolute bottom-3 right-0 text-[var(--qs-brand)]" animate={{ y: [0, 5, 0], opacity: [0.35, 1, 0.35], rotate: [0, -18, 0] }} transition={{ duration: 2.6, repeat: Infinity }}><Sparkles className="h-3 w-3" /></motion.span>
                      </div>

                      <div className="relative -mt-1">
                        <div className="flex items-center justify-center gap-2 text-sm font-extrabold text-[var(--qs-ink)]">
                          <BrainCircuit className="h-4 w-4 text-[var(--qs-brand)]" />
                          AI is designing your sections
                        </div>
                        <div className="mt-1.5 min-h-5 overflow-hidden text-[11px] font-medium text-[var(--qs-muted)]">
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
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--qs-line)]">
                          <motion.div
                            className="relative h-full rounded-full bg-[var(--qs-brand)]"
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
                        <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-[var(--qs-muted)]">
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
                          <div key={step.key} className={cn("rounded-[10px] border-2 px-1.5 py-2 text-center transition-colors", isDone ? "border-[var(--qs-ok)]/35 bg-[var(--qs-okbg)]" : isCurrent ? "border-[var(--qs-brand)]/40 bg-[var(--qs-brand)]/[0.07]" : "border-[var(--qs-line)] bg-[var(--qs-surface)]")}>
                            <div className={cn("mx-auto flex h-6 w-6 items-center justify-center rounded-lg", isDone ? "bg-[var(--qs-ok)] text-white" : isCurrent ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "bg-[var(--qs-bg)] text-[var(--qs-muted)]")}>
                              {isDone ? <Check className="h-3 w-3" /> : isCurrent ? <StepIcon className="h-3 w-3 animate-pulse" /> : <StepIcon className="h-3 w-3" />}
                            </div>
                            <p className={cn("mt-1.5 truncate text-[8px] font-bold", isDone ? "text-[var(--qs-ok)]" : isCurrent ? "text-[var(--qs-brand)]" : "text-[var(--qs-muted)]")}>{step.label.replace(" safely", "").replace(" question-paper", "")}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-start gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
                      <div className="min-w-0 text-left">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--qs-muted)]">While AI works</p>
                        <AnimatePresence mode="wait">
                          <motion.p key={tipIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-0.5 text-[10px] leading-4 text-[var(--qs-muted)]">{WAITING_TIPS[tipIndex]}</motion.p>
                        </AnimatePresence>
                      </div>
                    </div>

                    <p className="text-center text-[10px] font-semibold text-[var(--qs-muted)]">Please keep this window open — your document is being processed securely.</p>
                  </motion.div>
                )}

                {/* Error state (after processing) */}
                {status === "error" && error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-2.5 rounded-xl border-2 border-[var(--qs-bad)]/30 bg-[var(--qs-badbg)] px-4 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-bad)]" />
                      <div>
                        <p className="text-xs font-bold text-[var(--qs-bad)]">
                          {error.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="b sm"
                      >
                        Create Sections Manually
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setStatus("idle");
                        }}
                        className="b b-pri sm gap-1.5"
                      >
                        Retry
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
                    <div className="grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
                      <Check className="h-7 w-7" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-[var(--qs-ink)]">
                      Structure generated!
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-[var(--qs-muted)]">
                      Populating sections...
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {status === "idle" && !showReplaceConfirm && (
                <div className="border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex min-w-0 max-w-[290px] items-start gap-1.5 text-[10px] font-medium leading-4 text-[var(--qs-muted)]">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> AI can make mistakes. Review the generated structure before saving it.
                    </p>
                    <div className="flex shrink-0 items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="b sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={files.length === 0}
                        className="b b-pri sm gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Generate Test Structure
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
