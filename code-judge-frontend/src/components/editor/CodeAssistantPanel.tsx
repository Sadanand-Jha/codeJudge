"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Square,
  Code2,
  FileCode2,
  CheckCheck,
  RotateCcw,
  ListTree,
  Wrench,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/helpers";
import { streamChat } from "@/services/ai";
import type { LiveUsage } from "@/services/ai";
import { useAIEditorStore } from "@/store/aiEditorStore";
import type { CodeContext } from "@/store/aiEditorStore";
import { useCodeAssistantStore } from "@/store/codeAssistantStore";
import type { CodeAssistantMessage } from "@/store/codeAssistantStore";
import AIMessageRow from "@/components/ai/AIMessageRow";
import AILogo from "@/components/ai/AILogo";
import SuggestionReviewOverlay from "./SuggestionReviewOverlay";
import {
  EDITS_OPEN,
  parseEditsFromResponse,
} from "@/lib/codeEdits";

/** A message rendered in the panel (the stored system message is filtered out). */
type PanelMessage = CodeAssistantMessage;

/** A concrete, reviewable build-mode suggestion attached to an assistant message. */
interface PendingSuggestion {
  id: string;
  messageId: string;
  explanation: string;
  /** The COMPLETE file with the proposed changes already applied. */
  proposedCode: string;
  /** The file the AI was asked to change — used to highlight the diff. */
  originalCode: string;
  /** Model version at generation time, so we can detect the file changed. */
  baseVersionId: number;
  applied: boolean;
  rejected: boolean;
  stale: boolean;
  applying: boolean;
}

const makeId = () =>
  `code-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Hide the raw build-mode payload (the complete-file code block) from the chat
 * bubble WHILE it is still streaming, so the whole file never renders inside a
 * normal chat message. The explanation precedes the block, so we cut everything
 * from the first fenced block onwards in build mode.
 */
function sanitizeStreamingContent(raw: string, buildMode = false): string {
  const fenceIdx = buildMode ? raw.search(/```/) : raw.search(/```\s*(?:diff|udiff|json)/i);
  const openIdx = raw.indexOf(EDITS_OPEN);
  const cut =
    fenceIdx !== -1 && (openIdx === -1 || fenceIdx < openIdx)
      ? fenceIdx
      : openIdx;
  return cut !== -1 ? raw.slice(0, cut).trim() : raw;
}

/**
 * Split a build-mode reply into (chat explanation, complete-file code).
 * The model is instructed to output the COMPLETE updated file as the LAST
 * fenced code block; everything before it is the explanation shown in chat.
 */
function splitCompleteFile(
  raw: string
): { content: string; proposedCode: string | null } {
  const fences = [
    ...raw.matchAll(/```[a-zA-Z0-9_+.#-]*\s*\n([\s\S]*?)\n?```/g),
  ];
  if (fences.length === 0) return { content: raw.trim(), proposedCode: null };
  const last = fences[fences.length - 1];
  const proposedCode = last[1].replace(/\n$/, "");
  const content = (
    raw.slice(0, last.index) + raw.slice(last.index + last[0].length)
  ).trim();
  return { content, proposedCode };
}

interface CodeAssistantPanelProps {
  editorRef: React.RefObject<any>;
  monacoRef: React.RefObject<any>;
}

export default function CodeAssistantPanel({
  editorRef,
}: CodeAssistantPanelProps) {
  const open = useAIEditorStore((s) => s.open);
  const setPreparing = useAIEditorStore((s) => s.setPreparing);

  const [currentContext, setCurrentContext] = useState<CodeContext | null>(null);
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  /** Plan = explains the approach, never edits. Build = proposes reviewable edits. */
  const [mode, setMode] = useState<"plan" | "build">("build");

  // Resizable panel width — drag the left-edge handle to change it. Uses the
  // same RAF + throttled-state pattern as the editor's workspace resizer so the
  // drag stays smooth even while the message thread (react-markdown) re-renders.
  const MIN_ASSISTANT_WIDTH = 320;
  const MAX_ASSISTANT_WIDTH = 760;
  const [panelWidth, setPanelWidth] = useState<number>(() =>
    typeof window !== "undefined"
      ? Math.round(
          Math.min(560, Math.max(MIN_ASSISTANT_WIDTH, window.innerWidth * 0.88))
        )
      : 560
  );
  const panelWidthRef = useRef(panelWidth);
  const assistantResizeRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  // Keep the ref in sync so a drag always starts from the rendered width.
  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);

  // Persistent conversation (module-scope store, like ChatContext for the quiz
  // assistant): survives closing/reopening the panel and page navigation so
  // follow-up questions retain full context.
  const messages = useCodeAssistantStore((s) => s.messages);
  const addConversationMessage = useCodeAssistantStore((s) => s.addMessage);
  const patchConversationMessage = useCodeAssistantStore((s) => s.patchMessage);
  const clearConversation = useCodeAssistantStore((s) => s.clearConversation);
  const conversationId = useCodeAssistantStore((s) => s.conversationId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Consume a pending "ask" request when the panel opens (external store sync).
  // The conversation is intentionally NOT cleared here so it persists across
  // panel sessions and keeps context for follow-up questions.
  useEffect(() => {
    if (!open) return;
    const request = useAIEditorStore.getState().consumeRequest();
    if (request) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentContext(request.context);
      setSuggestions([]);
      setPrompt(
        "Analyze this file and, if you find anything to improve or fix, propose the changes."
      );
    }
  }, [open]);

  // Abort any in-flight stream when the panel unmounts/fully closes.
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  // Auto-grow textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [prompt]);

  // Keep the latest reply in view.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, suggestions]);

  // Drag-to-resize the panel width. Global pointer listeners act only while a
  // drag is in progress; width updates are throttled to 60 FPS to avoid
  // re-rendering the whole message thread on every raw pointer event.
  useEffect(() => {
    let rafId: number | null = null;
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 1000 / 60;

    const handleMove = (event: PointerEvent) => {
      const drag = assistantResizeRef.current;
      if (!drag) return;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const current = assistantResizeRef.current;
        if (!current) return;
        const maxWidth = Math.min(
          Math.round(window.innerWidth * 0.92),
          MAX_ASSISTANT_WIDTH
        );
        // Right-anchored panel: dragging left grows it, dragging right shrinks.
        const next = current.startWidth - (event.clientX - current.startX);
        const clamped = Math.round(
          Math.max(MIN_ASSISTANT_WIDTH, Math.min(maxWidth, next))
        );
        panelWidthRef.current = clamped;
        const now = performance.now();
        if (now - lastUpdate >= UPDATE_INTERVAL) {
          lastUpdate = now;
          setPanelWidth(clamped);
        }
      });
    };

    const handleUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (assistantResizeRef.current) {
        setPanelWidth(panelWidthRef.current);
        assistantResizeRef.current = null;
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerup", handleUp);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const startAssistantResize = (event: React.PointerEvent) => {
    event.preventDefault();
    assistantResizeRef.current = {
      startX: event.clientX,
      startWidth: panelWidthRef.current,
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  // The complete file the AI proposed, shown in the review overlay.
  const proposedCode = useMemo(() => {
    const pending = suggestions.find(
      (s) => !s.applied && !s.rejected && !s.stale
    );
    return pending?.proposedCode ?? "";
  }, [suggestions]);

  const firstPending = useMemo(
    () => suggestions.find((s) => !s.applied && !s.rejected && !s.stale) ?? null,
    [suggestions]
  );

  // Reject a suggestion: leave Monaco untouched, just hide it.
  const rejectSuggestion = useCallback(
    (suggestionId: string) => {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, rejected: true } : s
        )
      );
    },
    []
  );

  // Accept from the overlay: replace the ENTIRE file with the proposed code
  // as a single undoable operation, then close. Build mode works on whole files
  // — the AI wrote the complete file, so there is nothing to merge hunk-by-hunk.
  const acceptAll = useCallback(() => {
    const pending = suggestions.filter(
      (s) => !s.applied && !s.rejected && !s.stale
    );
    if (pending.length === 0) {
      setReviewOpen(false);
      return;
    }

    const target = pending[0];
    const editor = editorRef.current;
    const model = editor?.getModel?.();

    if (!model || !target.proposedCode) {
      setReviewOpen(false);
      return;
    }

    // The file was edited while the AI was generating — refuse to clobber it.
    if (target.baseVersionId && model.getVersionId() !== target.baseVersionId) {
      setSuggestions((prev) =>
        prev.map((s) =>
          pending.some((p) => p.id === s.id) ? { ...s, stale: true } : s
        )
      );
      setReviewOpen(false);
      toast.info("The file changed while these changes were being generated.");
      return;
    }

    // Replace the full document (line 1 col 1 → just past the last line).
    const lineCount = model.getLineCount();
    const fullRange = { startLineNumber: 1, startColumn: 1, endLineNumber: lineCount + 1, endColumn: 1 };
    model.pushStackElement();
    const edits = [{ range: fullRange, text: target.proposedCode, forceMoveMarkers: true }];
    editor.executeEdits("byteclash-ai", edits);
    model.pushStackElement();

    setSuggestions((prev) =>
      prev.map((s) =>
        pending.some((p) => p.id === s.id)
          ? { ...s, applying: false, applied: true }
          : s
      )
    );
    setReviewOpen(false);
    toast.success("Changes applied to the editor");
  }, [suggestions, editorRef]);

  // Reject from the overlay: dismiss every pending suggestion, then close.
  const rejectAll = useCallback(() => {
    const pending = suggestions.filter(
      (s) => !s.applied && !s.rejected && !s.stale
    );
    pending.forEach((s) => rejectSuggestion(s.id));
    setReviewOpen(false);
  }, [suggestions, rejectSuggestion]);

  const pendingCount = useMemo(
    () => suggestions.filter((s) => !s.applied && !s.rejected).length,
    [suggestions]
  );

  const close = () => useAIEditorStore.getState().setOpen(false);

  const stopGeneration = () => streamAbortRef.current?.abort();

  /**
   * Re-read the editor's CURRENT content and selection at send time so the AI
   * always receives the latest version of the file, not the snapshot captured
   * when the panel was opened. Falls back to the panel context when the editor
   * isn't mounted yet.
   */
  const buildLiveContext = useCallback((): CodeContext | null => {
    const editor = editorRef.current;
    const model = editor?.getModel?.();
    const content = model?.getValue?.() ?? currentContext?.content ?? "";
    if (!content && !currentContext) return null;

    let selection: string | undefined;
    let selectionRange: CodeContext["selectionRange"];
    const sel = editor?.getSelection?.();
    if (model && sel && !sel.isEmpty()) {
      selection = model.getValueInRange(sel) || undefined;
      selectionRange = {
        startLine: sel.startLineNumber,
        startColumn: sel.startColumn,
        endLine: sel.endLineNumber,
        endColumn: sel.endColumn,
      };
    }

    return {
      type: "current_file",
      language: currentContext?.language ?? "",
      filename: currentContext?.filename ?? "",
      content,
      selection,
      selectionRange,
    };
  }, [editorRef, currentContext]);

  const updateMessage = (id: string, patch: Partial<PanelMessage>) => {
    patchConversationMessage(id, patch);
  };

  const handleSend = async (override?: string) => {
    const userPrompt = (override ?? prompt).trim();
    if (!userPrompt || sending) return;
    setPrompt("");
    setSending(true);
    setPreparing(true);

    addConversationMessage({ role: "user", content: userPrompt });

    const aiMsg = addConversationMessage({
      role: "assistant",
      content: "",
      reasoningContent: "",
      isReasoning: true,
      isStreaming: true,
    });
    const aiId = aiMsg.id;
    const streamed = { content: "", reasoning: "" };

    const controller = new AbortController();
    streamAbortRef.current = controller;

    // Always send the latest editor content (the context captured at open time
    // is stale once the user keeps typing in the editor). The backend rebuilds
    // the system prompt + problem context server-side, so only the live file
    // content and a few identifiers cross the wire. The conversation history
    // is persisted on the backend under `conversationId`.
    const liveContext = buildLiveContext();
    if (liveContext) setCurrentContext(liveContext);

    const requestInput = {
      message: userPrompt,
      mode: mode === "build" ? "coding_coach" : "plan",
      code: liveContext?.content || undefined,
      language: liveContext?.language || undefined,
      filename: liveContext?.filename || undefined,
      selection: liveContext?.selection,
      selectionRange: liveContext?.selectionRange,
      conversationId,
    };

    // Coalesce streaming UI updates: rebuilding the whole message list (and
    // re-highlighting the growing markdown/diff via react-markdown +
    // rehype-highlight) on every SSE chunk is a major cause of the 100% CPU /
    // freeze when the AI emits a large diff. We still accumulate the raw text
    // immediately, but only commit it to React at most ~15x/sec.
    let uiTimer: ReturnType<typeof setTimeout> | null = null;
    let uiDirty = false;
    const scheduleUiFlush = () => {
      uiDirty = true;
      if (uiTimer) return;
      uiTimer = setTimeout(() => {
        uiTimer = null;
        if (!uiDirty) return;
        uiDirty = false;
        patchConversationMessage(aiId, {
          content: sanitizeStreamingContent(streamed.content, mode === "build"),
          reasoningContent: streamed.reasoning,
        });
      }, 66);
    };
    const cancelUiFlush = () => {
      if (uiTimer) {
        clearTimeout(uiTimer);
        uiTimer = null;
      }
      uiDirty = false;
    };

    const callbacks = {
      onReasoning: (chunk: string) => {
        streamed.reasoning += chunk;
        scheduleUiFlush();
      },
      onContent: (chunk: string) => {
        streamed.content += chunk;
        scheduleUiFlush();
      },
      onUsage: (meta: { usage?: LiveUsage; timeMs?: number }) => {
        updateMessage(aiId, { usage: meta.usage, timeMs: meta.timeMs });
      },
      onDone: () => {},
    };

    try {
      await streamChat(requestInput, callbacks, controller.signal);

      // Stop the throttled UI flusher so a pending timer can't overwrite the
      // finalised (diff-block-stripped) content we write below.
      cancelUiFlush();

      // Finalize the message (clear streaming flags).
      updateMessage(aiId, { isReasoning: false, isStreaming: false });

      let finalShown: string;
      let proposedCode: string | null = null;

      if (mode === "build") {
        // Build mode: the AI wrote the COMPLETE updated file as the last
        // fenced block. Chat shows only the explanation; the full file goes to
        // the review overlay.
        const split = splitCompleteFile(streamed.content);
        proposedCode = split.proposedCode;
        finalShown =
          split.content ||
          sanitizeStreamingContent(streamed.content, true) ||
          "Here's what I found.";
      } else {
        // Plan mode: just prose. Strip any stray diff/json payload defensively.
        const { content: cleanContent } = parseEditsFromResponse(streamed.content);
        finalShown =
          cleanContent ||
          sanitizeStreamingContent(streamed.content, false) ||
          "Here's what I found.";
      }
      updateMessage(aiId, { content: finalShown });

      if (mode === "build" && proposedCode) {
        const baseVersionId =
          editorRef.current?.getModel?.()?.getVersionId?.() ?? 0;
        const suggestion: PendingSuggestion = {
          id: makeId(),
          messageId: aiId,
          explanation: finalShown || "I've prepared some changes.",
          proposedCode,
          originalCode: liveContext?.content ?? "",
          baseVersionId,
          applied: false,
          rejected: false,
          stale: false,
          applying: false,
        };
        setSuggestions([suggestion]);
        setReviewOpen(true);
      }
    } catch (error) {
      cancelUiFlush();
      updateMessage(aiId, { isReasoning: false, isStreaming: false });
      const err = error as Error;
      if (err.name !== "AbortError") {
        toast.error("Failed to get AI response", {
          description: err.message || "Please try again.",
        });
      }
    } finally {
      cancelUiFlush();
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
      setSending(false);
      setPreparing(false);
    }
  };

  const rejectAllFromHeader = () => {
    const pending = suggestions.filter((s) => !s.applied && !s.rejected);
    pending.forEach((s) => rejectSuggestion(s.id));
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            data-ai-ignore
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            style={{ width: panelWidth }}
            className="fixed inset-y-0 right-0 z-[56] flex flex-col border-l border-border bg-card text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
          >
            {/* Drag handle to resize the panel width */}
            <div
              onPointerDown={startAssistantResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
              title="Drag to resize"
              className="group absolute inset-y-0 -left-1 z-30 w-2 cursor-ew-resize touch-none"
            >
              <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-accent/50 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100" />
            </div>

            {/* ===== Header ===== */}
            <div className="relative flex items-center justify-between border-b border-border bg-card-hover/40 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6]">
                  <Code2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary">Code Assistant</h2>
                  <p className="text-[10px] text-text-secondary">
                    Ask, review and apply changes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {pendingCount > 0 && (
                  <>
                    <button
                      onClick={() => setReviewOpen(true)}
                      className="flex items-center gap-1 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-2 py-1 text-[10px] font-bold text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/20"
                      title="Review all pending suggestions"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Review ({pendingCount})
                    </button>
                    <button
                      onClick={rejectAllFromHeader}
                      className="flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 transition-colors hover:bg-red-500/20"
                      title="Reject all pending suggestions"
                    >
                      <X className="h-3 w-3" />
                      Reject all ({pendingCount})
                    </button>
                  </>
                )}
                {messages.filter((m) => m.role !== "system").length > 0 && (
                  <button
                    onClick={() => {
                      // Abort any in-flight stream so the LLM stops generating,
                      // then wipe the conversation and reset the composer.
                      streamAbortRef.current?.abort();
                      clearConversation();
                      setSuggestions([]);
                      setPrompt("");
                    }}
                    className="flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
                    title="Start a new conversation (context is cleared)"
                  >
                    <RotateCcw className="h-3 w-3" />
                    New chat
                  </button>
                )}
                <button
                  onClick={close}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-card-hover hover:text-text-primary"
                  aria-label="Close Code Assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ===== Current file chip ===== */}
            {currentContext && (
              <div className="flex items-center gap-1.5 border-b border-border bg-card px-5 py-2">
                <FileCode2 className="h-3 w-3 text-accent" />
                <span className="truncate font-mono text-[11px] text-text-secondary">
                  {currentContext.filename}
                </span>
                {currentContext.selection && (
                  <span className="ml-auto shrink-0 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                    selection
                  </span>
                )}
              </div>
            )}

            {/* ===== Body ===== */}
            <div className="flex-1 space-y-3 overflow-y-auto border-b border-border px-5 py-4">
              {(() => {
                const visibleMessages = messages.filter((m) => m.role !== "system");
                return visibleMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <AILogo variant="accent" size="lg" />
                  <p className="text-sm font-semibold text-text-primary">
                    Ask to improve your code
                  </p>
                  <p className="max-w-[260px] text-xs leading-relaxed text-text-secondary">
                    Try “Fix this code”, “Optimize this solution”, or “Convert
                    this to DP”. The AI proposes changes you can review and apply.
                  </p>
                </div>
              ) : (
                visibleMessages.map((m) => (
                  <AIMessageRow
                    key={m.id}
                    message={{
                      role: m.role === "user" ? "user" : "assistant",
                      content: m.content,
                      reasoningContent: m.reasoningContent,
                      isReasoning: m.isReasoning,
                      isStreaming: m.isStreaming,
                      usage: m.usage,
                      timeMs: m.timeMs,
                    }}
                  />
                ))
              );
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* ===== Composer ===== */}
            <div className="shrink-0 px-5 pb-2.5 pt-3">
              {/* ===== Mode toggle: Plan / Build ===== */}
              <div className="mb-2 flex items-center gap-1 rounded-xl border border-input-border bg-input-bg p-1">
                <button
                  onClick={() => setMode("plan")}
                  title="Plan — explain the approach without changing code"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                    mode === "plan"
                      ? "bg-orange-600/15 text-orange-700 shadow-sm dark:text-orange-500"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <ListTree className="h-3.5 w-3.5" />
                  Plan
                </button>
                <button
                  onClick={() => setMode("build")}
                  title="Build — propose editable changes you review and apply"
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                    mode === "build"
                      ? "bg-blue-600/15 text-blue-600 shadow-sm dark:text-blue-400"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Build
                </button>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border bg-input-bg px-2.5 py-2 text-xs text-text-primary",
                  "border-input-border focus-within:border-chat-rose/40 focus-within:ring-2 focus-within:ring-chat-rose/10"
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === "plan"
                      ? "Ask for a step-by-step plan…"
                      : "Ask to fix, optimize or refactor the code…"
                  }
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
              <p className="mt-1 truncate text-[10px] text-text-muted">
                {mode === "plan"
                  ? "Plan mode — explains the approach, never changes the code · Enter to send"
                  : "Build mode — proposes changes you review and apply · Enter to send"}
              </p>
            </div>

            {/* ===== Footer ===== */}
            <div className="border-t border-border px-4 py-3">
              {sending ? (
                <button
                  onClick={stopGeneration}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-xs font-bold text-danger transition-all hover:bg-danger/20 active:scale-[0.98]"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop generating
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!prompt.trim()}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_2px_10px_rgba(59,130,246,0.25)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                  Ask AI
                </button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ===== Whole-file review overlay ===== */}
      <SuggestionReviewOverlay
        open={reviewOpen && pendingCount > 0 && !!proposedCode}
        filename={currentContext?.filename ?? "code"}
        language={currentContext?.language ?? "cpp"}
        proposedCode={proposedCode}
        originalCode={firstPending?.originalCode}
        explanation={firstPending?.explanation}
        applying={suggestions.some((s) => s.applying)}
        onAccept={acceptAll}
        onReject={rejectAll}
        onClose={() => setReviewOpen(false)}
      />
    </>
  );
}
