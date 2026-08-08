"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  UploadCloud,
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  FileType2,
  FileCode,
  File,
  Loader2,
  Send,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/helpers";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "ready" | "error";
}

const SUPPORTED_FILE_TYPES = [
  ".pdf", ".docx", ".doc", ".txt", ".md",
  ".png", ".jpg", ".jpeg", ".gif", ".webp",
];

const FileIcon = ({ fileType, className }: { fileType: string; className?: string }) => {
  if (fileType.includes("pdf")) return <FileText className={className} />;
  if (fileType.includes("image")) return <FileImage className={className} />;
  if (fileType.includes("zip") || fileType.includes("archive")) return <FileArchive className={className} />;
  if (fileType.includes("excel") || fileType.includes("spreadsheet") || fileType.includes("csv"))
    return <FileSpreadsheet className={className} />;
  if (fileType.includes("powerpoint") || fileType.includes("presentation"))
    return <Presentation className={className} />;
  if (fileType.includes("word") || fileType.includes("document")) return <FileType2 className={className} />;
  if (fileType.includes("code")) return <FileCode className={className} />;
  return <File className={className} />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeLabel = (file: UploadedFile): string => {
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "doc":
      return "DOC";
    case "txt":
      return "TXT";
    case "md":
      return "Markdown";
    case "png":
      return "PNG";
    case "jpg":
    case "jpeg":
      return "JPEG";
    case "gif":
      return "GIF";
    case "webp":
      return "WEBP";
    default:
      return ext?.toUpperCase() || "File";
  }
};

// Staged counter illustrating the productivity uplift (visual only).
const TIME_STAGES = ["30 min", "12 min", "4 min", "45 sec", "a few seconds"];

/**
 * Sliding AI workspace panel.
 *
 * UI layer only — uploads and "Ask AI" are simulated locally. Swap the
 * placeholder handlers with real AI / upload API calls when ready; the
 * surrounding UI is isolated from that integration.
 */
export default function AiAssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [timeStage, setTimeStage] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // "You just upgraded your workflow" onboarding: welcome banner + counter
  // cycle, first few seconds only (this component only mounts while `open`).
  useEffect(() => {
    const t1 = window.setTimeout(() => setTimeStage(1), 400);
    const t2 = window.setTimeout(() => setTimeStage(2), 850);
    const t3 = window.setTimeout(() => setTimeStage(3), 1350);
    const t4 = window.setTimeout(() => setTimeStage(4), 2600);
    const end = window.setTimeout(() => setShowWelcome(false), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(end);
    };
  }, []);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [prompt]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    Array.from(incoming).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!SUPPORTED_FILE_TYPES.includes(ext)) {
        toast.error("Unsupported file type", { description: `${file.name} is not supported.` });
        return;
      }
      const newFile: UploadedFile = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type || ext,
        status: "uploading",
      };
      setFiles((prev) => [...prev, newFile]);
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) => (f.id === newFile.id ? { ...f, status: "ready" } : f))
        );
      }, 900);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSend = () => {
    if (!prompt.trim() || files.length === 0 || sending) return;
    if (files.some((f) => f.status === "uploading")) {
      toast.error("Please wait for uploads to finish");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setPrompt("");
      setSending(false);
      toast.info("Ask AI is not yet connected.", {
        description: "Your documents and instructions will be sent to the AI backend here.",
      });
    }, 1200);
  };

  const TRADITIONAL = ["Write", "Format", "Add questions", "Configure", "Review"];
  const WITH_AI = ["Upload", "Generate", "Review"];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile backdrop — subtle, dismisses on tap */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[54] bg-black/30 lg:hidden"
          />

          <motion.aside
            data-ai-panel
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            className="fixed inset-y-0 right-0 z-[55] flex w-full flex-col border-l border-border bg-card text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.18)] lg:min-w-[340px] lg:w-[33vw] lg:max-w-[480px]"
          >
            {/* ===== Header (with "first few seconds" sparkles) ===== */}
            <div className="relative flex items-center justify-between border-b border-border bg-card-hover/40 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#EC4899] to-[#7C3AED] text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">✨ AI Assistant</h2>
                  <p className="text-[10px] text-text-secondary">Turn your material into a quiz.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-card-hover hover:text-text-primary"
                aria-label="Close AI Assistant"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Gentle sparkle accents — only while the welcome banner is live */}
              <AnimatePresence>
                {showWelcome && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4 }}
                      className="absolute -top-0.5 left-1/4 -translate-x-1/2"
                    >
                      <Sparkles className="h-3 w-3 text-white/55" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="absolute top-1/2 -translate-y-1/2 right-3"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-white/45" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                      className="absolute bottom-1 left-1/3 -translate-x-1/2"
                    >
                      <Sparkles className="h-3 w-3 text-white/50" />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* ===== Body ===== */}
            <div className="flex-1 overflow-y-auto">
              {/* "You just upgraded your workflow" banner */}
              <AnimatePresence>
                {showWelcome && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.4 }}
                    className="border-b border-border px-5 py-4"
                  >
                    <motion.p
                      className="text-xs font-medium text-text-primary"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                    >
                      ✨ Your quiz creation just got faster
                    </motion.p>
                    <motion.p
                      className="mt-1 text-[10px] leading-relaxed text-text-secondary"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.25 }}
                    >
                      Create quizzes from documents, notes, or your own ideas — in seconds.
                    </motion.p>

                    {/* Time-reduction comparison */}
                    <motion.div
                      className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2.5 text-[10px]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.45 }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-text-muted">Traditional creation</span>
                        <span className="mt-0.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-card-hover/40 px-2 py-1 text-text-secondary">
                          {TRADITIONAL.map((s, i) => (
                            <span key={i}>{s}</span>
                          ))}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <motion.span
                          className="rotate-[-90deg] text-xs font-bold text-accent"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.7 }}
                        >
                          ↓
                        </motion.span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#EC4899] to-[#7C3AED]">
                          With AI ⚡
                        </span>
                        <span className="mt-0.5 inline-flex flex-wrap items-center gap-1 rounded-md bg-gradient-to-r from-[#EC4899]/10 to-[#7C3AED]/10 px-2 py-1 text-accent">
                          {WITH_AI.map((s) => (
                            <span key={s}>{s}</span>
                          ))}
                        </span>
                      </div>
                    </motion.div>

                    {/* Animated counter */}
                    <motion.div
                      className="mt-3.5 flex items-center gap-1.5 text-[10px] text-text-secondary"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.9 }}
                    >
                      <span className="text-warning">⚡ Quiz creation time reduced</span>
                      <span className="font-bold text-text-primary">
                        {TIME_STAGES[timeStage]}
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload area */}
              <div className="px-5 py-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById("ai-file-input")?.click()}
                  className={cn(
                    "relative flex min-h-[96px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed text-center transition-all",
                    dragOver
                      ? "border-pink-500/40 bg-pink-500/[0.06]"
                      : "border-border bg-card-hover/40 hover:border-pink-500/35 hover:bg-pink-500/[0.04]"
                  )}
                >
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="h-5 w-5 text-text-muted" />
                    <p className="text-xs font-semibold text-text-primary">
                      Drop your PDF, notes, DOCX, or images
                    </p>
                    <p className="text-[10px] text-text-muted">
                      Or click to browse — multiple files supported
                    </p>
                  </div>
                  <input
                    id="ai-file-input"
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Uploaded files
                    </p>
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2.5 rounded-lg border border-border bg-card-hover/40 px-2.5 py-2"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                          <FileIcon fileType={file.type} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-text-primary">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {typeLabel(file)} · {formatFileSize(file.size)}
                          </p>
                        </div>
                        {file.status === "uploading" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                        ) : file.status === "error" ? (
                          <AlertCircle className="h-4 w-4 text-danger" />
                        ) : null}
                        <button
                          onClick={() => removeFile(file.id)}
                          disabled={file.status === "uploading"}
                          className="shrink-0 rounded p-1 text-text-muted hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Instructions editor */}
                <div className="mt-5">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Your instructions
                  </p>
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="✍️ Describe what you want to create — questions, summaries, explanations…"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="w-full resize-none rounded-xl border border-input-border bg-input-bg px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
                  />
                  <p className="mt-1 text-[10px] text-text-muted">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </div>
              </div>
            </div>

            {/* Footer / Ask AI */}
            <div className="border-t border-border p-4">
              <button
                onClick={handleSend}
                disabled={!prompt.trim() || files.length === 0 || sending || files.some((f) => f.status === "uploading")}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_2px_10px_rgba(236,72,153,0.25)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {sending ? "Asking…" : "Ask AI"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
