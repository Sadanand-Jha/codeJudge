"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Square,
  Copy,
  Check,
  Code2,
  FileCode2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/helpers";
import { streamChat } from "@/services/ai";
import type { LiveUsage } from "@/services/ai";
import { useAIEditorStore } from "@/store/aiEditorStore";
import type { CodeContext } from "@/store/aiEditorStore";
import { useCodeAssistantStore } from "@/store/codeAssistantStore";
import type { CodeAssistantMessage } from "@/store/codeAssistantStore";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";
import AIThinkingBlock from "@/components/ai/AIThinkingBlock";
import AIUsageMeta from "@/components/ai/AIUsageMeta";
import AILogo from "@/components/ai/AILogo";
import { extractRenderedText } from "@/utils/clipboard";
import {
  EDITS_OPEN,
  parseEditsFromResponse,
  validateEditsAgainstModel,
  applyEditsToEditor,
  clearEditDecorations,
  detachInlineSuggestion,
  attachInlineSuggestion,
  captureEditorSnapshot,
  isEditorUnchanged,
  normalizeEditIndentation,
  sanitizeStructuralEdits,
  validateStructuralBalance,
  type AIEdit,
  type EditorSnapshot,
  type SuggestedEdits,
} from "@/lib/codeEdits";

/** A message rendered in the panel (the stored system message is filtered out). */
type PanelMessage = CodeAssistantMessage;

/** A concrete, reviewable suggestion attached to an assistant message. */
interface PendingSuggestion {
  id: string;
  messageId: string;
  explanation: string;
  edits: AIEdit[];
  editsGroup: SuggestedEdits[];
  snapshot: EditorSnapshot | null;
  applied: boolean;
  rejected: boolean;
  stale: boolean;
  applying: boolean;
}

const makeId = () =>
  `code-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Hide any raw edit payload (```diff / JSON fences or the delimiter block)
 * from the chat bubble WHILE it is still streaming, so the actual code change
 * never appears as a normal chat message. The explanation precedes the diff, so
 * we cut everything from the first edit fence onwards.
 */
function sanitizeStreamingContent(raw: string): string {
  const diffIdx = raw.search(/```\s*(?:diff|udiff|json)/i);
  const openIdx = raw.indexOf(EDITS_OPEN);
  const cut =
    diffIdx !== -1 && (openIdx === -1 || diffIdx < openIdx)
      ? diffIdx
      : openIdx;
  return cut !== -1 ? raw.slice(0, cut).trim() : raw;
}

interface CodeAssistantPanelProps {
  editorRef: React.RefObject<any>;
  monacoRef: React.RefObject<any>;
}

export default function CodeAssistantPanel({
  editorRef,
  monacoRef,
}: CodeAssistantPanelProps) {
  const open = useAIEditorStore((s) => s.open);
  const setPreparing = useAIEditorStore((s) => s.setPreparing);

  const [currentContext, setCurrentContext] = useState<CodeContext | null>(null);
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inlineActiveId, setInlineActiveId] = useState<string | null>(null);

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
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
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

  // Clear decorations whenever the panel closes / unmounts or a request resets.
  useEffect(() => {
    if (!open) {
      clearEditDecorations(editorRef.current);
      detachInlineSuggestion(editorRef.current);
    }
  }, [open, editorRef]);

  // Abort any in-flight stream when the panel unmounts/fully closes.
  useEffect(() => {
    const editor = editorRef.current;
    return () => {
      streamAbortRef.current?.abort();
      clearEditDecorations(editor);
      detachInlineSuggestion(editor);
    };
  }, [editorRef]);

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

  // Apply a pending suggestion's edits into Monaco as a single undoable op.
  const applySuggestion = useCallback(
    (suggestionId: string) => {
      const target = suggestions.find((s) => s.id === suggestionId);
      if (!target) return;

      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, applying: true } : s
        )
      );

      const editor = editorRef.current;
      const monaco = monacoRef.current;

      if (!isEditorUnchanged(editor, target.snapshot)) {
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId
              ? { ...s, applying: false, stale: true }
              : s
          )
        );
        toast.info("The file changed while this suggestion was being generated.");
        return;
      }

      const validation = validateEditsAgainstModel(editor, target.edits);
      if (!validation.valid) {
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId
              ? { ...s, applying: false, stale: true }
              : s
          )
        );
        toast.error("Could not apply changes", {
          description: validation.reason,
        });
        return;
      }

      // Structural safety net: applying must never unbalance the document's
      // `{}`, `()`, `[]` — i.e. never delete a closing delimiter.
      const balance = validateStructuralBalance(
        editor?.getModel?.()?.getValue?.() ?? "",
        target.edits
      );
      if (!balance.valid) {
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId
              ? { ...s, applying: false, stale: true }
              : s
          )
        );
        toast.error("Could not apply changes", {
          description: "The change would break the document's braces or brackets.",
        });
        return;
      }

      const ok = applyEditsToEditor(editor, monaco, target.edits);
      if (ok) {
        clearEditDecorations(editor);
        detachInlineSuggestion(editor);
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId
              ? { ...s, applying: false, applied: true }
              : s
          )
        );
        toast.success("Changes applied to the editor");
      } else {
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId ? { ...s, applying: false } : s
          )
        );
        toast.error("Could not apply changes");
      }
    },
    [suggestions, editorRef, monacoRef]
  );

  // Reject a suggestion: leave Monaco untouched, just hide it.
  const rejectSuggestion = useCallback(
    (suggestionId: string) => {
      detachInlineSuggestion(editorRef.current);
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, rejected: true } : s
        )
      );
    },
    [editorRef]
  );

  // Active (reviewable) suggestions ordered by where they land in the file, so
  // inline navigation walks top → bottom like a review.
  const pendingSuggestions = useMemo(
    () =>
      [...suggestions]
        .filter((s) => !s.applied && !s.rejected && !s.stale)
        .sort(
          (a, b) =>
            (a.edits[0]?.startLine ?? Number.MAX_SAFE_INTEGER) -
            (b.edits[0]?.startLine ?? Number.MAX_SAFE_INTEGER)
        ),
    [suggestions]
  );

  // Keep the active inline suggestion valid as the pending set changes.
  useEffect(() => {
    // Reset to the first pending suggestion whenever the pending set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInlineActiveId((cur) =>
      pendingSuggestions.some((s) => s.id === cur)
        ? cur
        : (pendingSuggestions[0]?.id ?? null)
    );
  }, [pendingSuggestions]);

  const activeIndex = pendingSuggestions.findIndex((s) => s.id === inlineActiveId);
  const activeSuggestion = activeIndex >= 0 ? pendingSuggestions[activeIndex] : null;

  const goPrev = useCallback(() => {
    if (pendingSuggestions.length === 0) return;
    const next =
      (activeIndex - 1 + pendingSuggestions.length) % pendingSuggestions.length;
    setInlineActiveId(pendingSuggestions[next].id);
  }, [pendingSuggestions, activeIndex]);

  const goNext = useCallback(() => {
    if (pendingSuggestions.length === 0) return;
    const next = (activeIndex + 1) % pendingSuggestions.length;
    setInlineActiveId(pendingSuggestions[next].id);
  }, [pendingSuggestions, activeIndex]);

  // Keep Monaco in sync with the active pending suggestion: render an inline
  // Copilot-style diff + Accept/Reject widget on the changed lines. Multiple
  // suggestions are navigable via the widget, the panel strip, or Alt+[ / Alt+].
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !open || !activeSuggestion) {
      detachInlineSuggestion(editor);
      return;
    }

    const handle = attachInlineSuggestion(
      editor,
      monacoRef.current,
      activeSuggestion.edits,
      {
        label: activeSuggestion.explanation,
        onApply: () => applySuggestion(activeSuggestion.id),
        onReject: () => rejectSuggestion(activeSuggestion.id),
        onPrev: pendingSuggestions.length > 1 ? goPrev : undefined,
        onNext: pendingSuggestions.length > 1 ? goNext : undefined,
        positionLabel:
          pendingSuggestions.length > 1
            ? `${activeIndex + 1} / ${pendingSuggestions.length}`
            : undefined,
      }
    );
    return () => handle.detach();
  }, [
    suggestions,
    open,
    editorRef,
    monacoRef,
    applySuggestion,
    rejectSuggestion,
    activeSuggestion,
    pendingSuggestions,
    activeIndex,
    goPrev,
    goNext,
  ]);

  // Keyboard navigation between inline suggestions (Alt+[ / Alt+]).
  useEffect(() => {
    if (!open) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor?.addCommand || !monaco?.KeyMod || !monaco?.KeyCode) return;
    const prevId = editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyCode.BracketLeft,
      () => goPrev()
    );
    const nextId = editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyCode.BracketRight,
      () => goNext()
    );
    return () => {
      if (typeof prevId === "number" || typeof prevId === "string") {
        editor.removeCommand?.(prevId);
      }
      if (typeof nextId === "number" || typeof nextId === "string") {
        editor.removeCommand?.(nextId);
      }
    };
  }, [open, editorRef, monacoRef, goPrev, goNext]);

  const close = () => useAIEditorStore.getState().setOpen(false);

  const copyMessage = (m: PanelMessage) => {
    const el = contentRefs.current[m.id];
    const rendered = el ? extractRenderedText(el) : "";
    navigator.clipboard.writeText(rendered || m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId((cur) => (cur === m.id ? null : cur)), 2000);
  };

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
      mode: "coding_coach",
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
          content: sanitizeStreamingContent(streamed.content),
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

      const { content: cleanContent, edits: editGroups } =
        parseEditsFromResponse(streamed.content);

      // Persist the cleaned content (without raw JSON block). Never fall back
      // to the raw stream text, which may still contain the edit payload.
      const finalShown =
        cleanContent ||
        sanitizeStreamingContent(streamed.content) ||
        "Here's what I found.";
      updateMessage(aiId, { content: finalShown });

      if (editGroups.length > 0) {
        const snapshot = captureEditorSnapshot(editorRef.current);
        // 1) Make ranges structurally safe: never delete a closing delimiter,
        //    snap "end of block" insertions to land before the closing brace.
        // 2) Normalize indentation against the CURRENT file so inserted lines
        //    match the surrounding code's tabs/spaces and nesting depth.
        const normalizedGroups = editGroups.map((group) => ({
          ...group,
          edits: snapshot
            ? normalizeEditIndentation(
                snapshot.content,
                sanitizeStructuralEdits(snapshot.content, group.edits)
              )
            : group.edits,
        }));
        // One independently-acceptable suggestion per edit group/hunk, so the
        // user can accept some hunks and reject others (Copilot-style).
        setSuggestions((prev) => [
          ...prev,
          ...normalizedGroups.map((group) => ({
            id: makeId(),
            messageId: aiId,
            explanation: group.explanation || "I've prepared some changes.",
            edits: group.edits,
            editsGroup: [group],
            snapshot,
            applied: false,
            rejected: false,
            stale: false,
            applying: false,
          })),
        ]);
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

  const applyAll = () => {
    const pending = suggestions.filter((s) => !s.applied && !s.rejected);
    pending.forEach((s) => applySuggestion(s.id));
  };

  const rejectAll = () => {
    const pending = suggestions.filter((s) => !s.applied && !s.rejected);
    pending.forEach((s) => rejectSuggestion(s.id));
  };

  const pendingCount = useMemo(
    () => suggestions.filter((s) => !s.applied && !s.rejected).length,
    [suggestions]
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          data-ai-ignore
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 36 }}
          className="fixed inset-y-0 right-0 z-[56] flex w-[88vw] max-w-[420px] flex-col border-l border-border bg-card text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
        >
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
                    onClick={applyAll}
                    className="flex items-center gap-1 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-2 py-1 text-[10px] font-bold text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/20"
                    title="Apply all pending suggestions"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Apply all ({pendingCount})
                  </button>
                  <button
                    onClick={rejectAll}
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
                    clearConversation();
                    detachInlineSuggestion(editorRef.current);
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

          {/* ===== Inline suggestion navigation ===== */}
          {pendingSuggestions.length > 1 && activeSuggestion && (
            <div className="flex items-center justify-between border-b border-border bg-card px-5 py-1.5">
              <span className="text-[10px] text-text-muted">
                Inline suggestion{" "}
                <span className="font-semibold tabular-nums text-text-primary">
                  {activeIndex + 1} / {pendingSuggestions.length}
                </span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                  title="Previous suggestion (Alt+[)"
                  aria-label="Previous suggestion"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={goNext}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                  title="Next suggestion (Alt+])"
                  aria-label="Next suggestion"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
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
              visibleMessages.map((m) => {
                return (
                  <div
                    key={m.id}
                    className={`group flex w-full flex-col gap-1 ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed text-text-primary",
                        m.role === "user"
                          ? "whitespace-pre-wrap rounded-tr-sm border border-chat-user-border bg-chat-user-bg"
                          : "rounded-tl-sm border border-border bg-card-hover/40"
                      )}
                    >
                      {m.role === "assistant" ? (
                        <>
                          {!m.content && (m.reasoningContent || m.isReasoning) && (
                            <AIThinkingBlock
                              reasoning={m.reasoningContent || ""}
                              isReasoning={!!m.isReasoning}
                              usage={m.usage}
                            />
                          )}
                          {m.content && (
                            <MarkdownRenderer
                              ref={(node) => {
                                if (node) contentRefs.current[m.id] = node;
                              }}
                              content={m.content}
                            />
                          )}
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
                      ) : (
                        <span className="whitespace-pre-wrap text-xs leading-relaxed text-text-primary">
                          {m.content}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => copyMessage(m)}
                      disabled={!m.content}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-text-muted opacity-0 transition-opacity hover:bg-card-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-0 group-hover:opacity-100"
                      title="Copy message"
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3 w-3 text-success" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedId === m.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                );
              })
            );
            })()}
            <div ref={messagesEndRef} />
          </div>

          {/* ===== Composer ===== */}
          <div className="shrink-0 px-5 pb-2.5 pt-3">
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
                placeholder="Ask to fix, optimize or refactor the code…"
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
  );
}
