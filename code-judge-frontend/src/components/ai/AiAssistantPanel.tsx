"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Plus,
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
import { streamChat, streamChatWithFiles } from "@/services/ai";
import { mapRawQuestionsToPreview } from "@/services/ai";
import type { LiveUsage, AIQuestionPreview, RawAIGeneratedQuestion } from "@/services/ai";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";
import AIThinkingBlock from "@/components/ai/AIThinkingBlock";
import AIUsageMeta from "@/components/ai/AIUsageMeta";
import AILogo from "@/components/ai/AILogo";
import AIQuestionReviewOverlay from "@/components/quiz/creator/AIQuestionReviewOverlay";
import { useQuizProblemsStore } from "@/store/quizProblemsStore";
import { mapToCreatorQuestions } from "@/utils/aiToCreatorQuestion";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "ready" | "error";
  file: File;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: string[];
  reasoningContent?: string;
  isReasoning?: boolean;
  isStreaming?: boolean;
  usage?: LiveUsage;
  timeMs?: number;
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
 * Uploads are simulated locally (status toggles to "ready" after a delay);
 * the "Ask AI" flow calls the real `/ai/chat` backend and shows the reply
 * inline in the panel.
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<AIQuestionPreview[]>([]);
  const [showReviewOverlay, setShowReviewOverlay] = useState(false);

  const closeReviewOverlay = () => setShowReviewOverlay(false);

  const handleAcceptAll = () => {
    if (reviewQuestions.length === 0) {
      setShowReviewOverlay(false);
      return;
    }
    const questions = mapToCreatorQuestions(reviewQuestions);
    useQuizProblemsStore.getState().addProblems(questions);
    setReviewQuestions([]);
    setShowReviewOverlay(false);
    toast.success(`${questions.length} questions added to the quiz`);
  };

  // Abort any in-flight AI stream when the panel unmounts so the SSE
  // connection does not keep streaming in the background.
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

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

  // Keep the latest AI reply in view
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        file: file
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

  const finalizeMessage = (id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isReasoning: false, isStreaming: false } : m
      )
    );
  };

  const handleSend = async () => {
    if (!prompt.trim() || sending) return;
    if (files.some((f) => f.status === "uploading")) {
      toast.error("Please wait for uploads to finish");
      return;
    }

    const formdata = new FormData();

    formdata.append("prompt", prompt.trim())

    files.forEach((file) => {
      if (file.status === "ready") {
        formdata.append("files", file.file, file.name);
      }
    });

    const readyFiles = files.filter((f) => f.status === "ready");
    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: "user",
      content: prompt.trim(),
      attachments: readyFiles.map((f) => f.name),
    };
    setMessages((prev) => [...prev, userMsg]);
    const userPrompt = prompt.trim();
    setPrompt("");
    setSending(true);

    const aiId = `m-${Date.now()}-ai`;
    const aiMsg: ChatMessage = {
      id: aiId,
      role: "assistant",
      content: "",
      reasoningContent: "",
      isReasoning: true,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiMsg]);

    const controller = new AbortController();
    streamAbortRef.current = controller;

    console.log("Streaming AI request:", userMsg);

    const callbacks = {
      onReasoning: (chunk: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, reasoningContent: (m.reasoningContent || "") + chunk }
              : m
          )
        );
      },
      onContent: (chunk: string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: m.content + chunk } : m
          )
        );
      },
      onUsage: (meta: { usage?: LiveUsage; timeMs?: number }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, usage: meta.usage, timeMs: meta.timeMs } : m
          )
        );
      },
      onQuestions: (rawQuestions: RawAIGeneratedQuestion[]) => {
        const preview = mapRawQuestionsToPreview(rawQuestions);
        if (preview.length === 0) return;
        setReviewQuestions(preview);
        setShowReviewOverlay(true);
      },
      onDone: () => finalizeMessage(aiId),
    };

    console.log(readyFiles.length > 0 ? "Streaming AI request with files" : "Streaming AI request without files");

    try {
      if (readyFiles.length > 0) {
        console.log(userPrompt, readyFiles.map((f) => f.file));
        await streamChatWithFiles(userPrompt, readyFiles.map((f) => f.file), callbacks, controller.signal);
      } else {
        await streamChat(userPrompt, callbacks, controller.signal);
      }
    } catch (error) {
      finalizeMessage(aiId);
      const err = error as Error;
      if (err.name !== "AbortError") {
        toast.error("Failed to get AI response", {
          description: err.message || "Please try again.",
        });
      }
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
      setSending(false);
    }
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
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#7C3AED]">
                <AILogo variant="mono" size="xs" className="text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">AI Assistant</h2>
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

            {/* ===== Body (scrollable conversation feed) ===== */}
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

              {/* Conversation thread */}
              {messages.length > 0 && (
                <div className="space-y-3 border-b border-border px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Conversation
                  </p>
                  {messages.map((m) => (
                    <div key={m.id} className={`flex w-full gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed text-text-primary",
                          m.role === "user"
                            ? "whitespace-pre-wrap rounded-tr-sm border border-pink-500/30 bg-pink-500/15"
                            : "rounded-tl-sm border border-border bg-card-hover/40"
                        )}
                      >
                        {m.role === "user" ? (
                          <div className="space-y-1.5">
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {m.attachments.map((name, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded-md border border-pink-500/30 bg-pink-500/10 px-1.5 py-0.5 text-[9px] font-medium text-pink-500"
                                  >
                                    <FileText className="h-2.5 w-2.5" />
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                            <span className="whitespace-pre-wrap text-xs leading-relaxed text-text-primary">
                              {m.content}
                            </span>
                          </div>
                        ) : (
                          <>
                            {/* Thinking phase: logo lives in the growable box header.
                                Hidden once answer content begins (the mark then
                                trails the live answer instead). */}
                            {!m.content && (m.reasoningContent || m.isReasoning) && (
                              <AIThinkingBlock
                                reasoning={m.reasoningContent || ""}
                                isReasoning={!!m.isReasoning}
                                usage={m.usage}
                              />
                            )}
                            {m.content && <MarkdownRenderer content={m.content} />}
                            {/* The AI mark trails the latest line of the answer while it
                                streams, then settles with the completed response. */}
                            {m.content && (
                              <AILogo
                                variant="accent"
                                size="sm"
                                animate={!!m.isStreaming}
                                className="mt-1"
                              />
                            )}
                            <AIUsageMeta
                              isStreaming={!!m.isStreaming}
                              usage={m.usage}
                              timeMs={m.timeMs}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* ===== Bottom bar: compact attachment, live token badge, composer, Ask AI ===== */}
            <div className="shrink-0 border-t border-border">
              {/* Attachment chips (compact, scrollable) */}
              <div className="px-5 pt-3">
                {files.length > 0 && (
                  <div className="mb-2 flex -space-x-1.5 overflow-x-auto py-0.5">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.75 text-[10px]",
                          file.status === "error" ? "border-danger/30" : "border-border"
                        )}
                        title={file.name}
                      >
                        <FileIcon fileType={file.type} className="h-3 w-3 text-text-muted" />
                        <span className="max-w-[130px] truncate text-text-secondary">{file.name}</span>
                        <span className="text-[9px] text-text-muted">
                          {typeLabel(file)} · {formatFileSize(file.size)}
                        </span>
                        {file.status === "uploading" && (
                          <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
                        )}
                        {file.status === "error" && <AlertCircle className="h-3 w-3 text-danger" />}
                        <button
                          onClick={() => removeFile(file.id)}
                          disabled={file.status === "uploading"}
                          className="shrink-0 rounded p-0.5 text-text-muted hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live token counter: rendered next to the active AI state while
                  generating. Starts at 0, then grows from the first usage chunk
                  the backend streams back. */}
              {sending && (
                <div className="flex items-center gap-1.5 px-5 pb-1 text-[11px] text-text-muted">
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-pink-400" />
                  <span>
                    {messages.some((m) => m.role === "assistant" && m.isReasoning)
                      ? "Thinking"
                      : "Generating"}
                  </span>
                  <span className="font-medium text-text-secondary">
                    ·{" "}
                    {(() => {
                      const live = messages.find(
                        (m) => m.role === "assistant" && m.isStreaming
                      )?.usage?.totalTokens;
                      const n = typeof live === "number" ? live : 0;
                      return `${n >= 1000 ? (n / 1000).toFixed(1) + "k" : n.toLocaleString()} tokens`;
                    })()}
                  </span>
                </div>
              )}

              {/* Composer: compact "+" attachment + textarea (drag highlight on frame) */}
              <div className="px-5 pb-2.5">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border bg-input-bg px-2.5 py-2 text-xs text-text-primary",
                    dragOver
                      ? "border-pink-500/50 ring-1 ring-pink-500/10"
                      : "border-input-border focus-within:border-pink-500/40 focus-within:ring-2 focus-within:ring-pink-500/10"
                  )}
                >
                  <label
                    htmlFor="ai-file-input"
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary",
                      files.some((f) => f.status === "uploading") && "cursor-not-allowed opacity-50"
                    )}
                    aria-label="Attach files"
                    title="Attach files (PDF, DOCX, TXT, MD, images, …)"
                  >
                    <Plus className="h-4 w-4" />
                    <input
                      id="ai-file-input"
                      type="file"
                      multiple
                      accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.gif,.webp"
                      className="hidden"
                      onChange={(e) => addFiles(e.target.files)}
                      disabled={files.some((f) => f.status === "uploading")}
                    />
                  </label>

                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create…"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="min-w-0 flex-1 resize-none border-0 bg-transparent text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-text-muted">
                  Enter to send · Shift + Enter for a new line
                </p>
              </div>

              {/* Footer / Ask AI */}
              <div className="border-t border-border px-4 py-3">
                <button
                  onClick={handleSend}
                  disabled={!prompt.trim() || sending || files.some((f) => f.status === "uploading")}
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
            </div>
          </motion.aside>

          {/* Full-screen AI review overlay for generated questions */}
          <AIQuestionReviewOverlay
            open={showReviewOverlay}
            questions={reviewQuestions}
            onClose={closeReviewOverlay}
            onAccept={handleAcceptAll}
            onReject={closeReviewOverlay}
          />
        </>
      )}
    </AnimatePresence>
  );
}
