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
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/helpers";
import { streamChat } from "@/services/ai";
import type { ChatMessageInput, LiveUsage } from "@/services/ai";
import { useAIEditorStore } from "@/store/aiEditorStore";
import type { CodeContext } from "@/store/aiEditorStore";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";
import AIThinkingBlock from "@/components/ai/AIThinkingBlock";
import AIUsageMeta from "@/components/ai/AIUsageMeta";
import AILogo from "@/components/ai/AILogo";
import SuggestedChangesCard from "./SuggestedChangesCard";
import { extractRenderedText } from "@/utils/clipboard";
import {
  parseEditsFromResponse,
  validateEditsAgainstModel,
  applyEditsToEditor,
  clearEditDecorations,
  detachInlineSuggestion,
  attachInlineSuggestion,
  captureEditorSnapshot,
  isEditorUnchanged,
  type AIEdit,
  type EditorSnapshot,
  type SuggestedEdits,
} from "@/lib/codeEdits";

interface PanelMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningContent?: string;
  isReasoning?: boolean;
  isStreaming?: boolean;
  usage?: LiveUsage;
  timeMs?: number;
}

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
 * System instruction that teaches the model how to propose edits without
 * dumping the whole file. The AI presents changes as a standard **unified diff**
 * inside a fenced ```diff block, which the frontend parses into concrete
 * Monaco edits and offers for accept/reject.
 */
const EDIT_SYSTEM_GUIDE = `
You are embedded in a code editor. The user's current file is provided below as hidden context ("Current file"). You can propose changes to that file.

When you want to modify the code:
1. Write a SHORT human explanation (a sentence or two) as normal prose.
2. Then output ONLY the changed lines as a standard unified diff inside a fenced code block tagged \`\`\`diff.

Format rules (unified diff):
- Start with a hunk header: @@ -<startLine>,<count> +<startLine>,<count> @@  (1-based line numbers)
- Lines you are REMOVING are prefixed with "-".
- Lines you are ADDING are prefixed with "+".
- Keep ONE context line before/after each change so it is clear where it lands (context lines are prefixed with a space).
- NEVER include the entire file — only the lines that actually change.
- NEVER output the full "Before"/"After" code blocks.

Example: to change the line "cin >> n >> k;" to also guard against negatives, output:
\`\`\`diff
@@ -6,2 +6,3 @@
 int n, k;
-cin >> n >> k;
+cin >> n >> k;
+if (n < 0 || k < 0) return;
\`\`\`

- If you are only explaining (no change needed), respond with prose only and NO diff block.
- If you are asked to analyze/explain, just answer in prose without a diff block.
`.trim();

const buildSystemMessage = (context: CodeContext | null): string => {
  const base = `You are a coding assistant embedded in a competitive-programming code editor. You help the user understand, debug, refactor and improve their code. Be concise and direct. Use Markdown for readability and short code snippets where helpful.`;

  if (!context) return `${base}\n\n` + EDIT_SYSTEM_GUIDE;

  const parts = [base];

  parts.push(`\n--- Current file ---`);
  parts.push(`Filename: ${context.filename}`);
  parts.push(`Language: ${context.language}`);
  parts.push(``);
  parts.push("```" + context.language);
  parts.push(context.content);
  parts.push("```");

  if (context.selection && context.selectionRange) {
    const s = context.selectionRange;
    parts.push(
      `\nThe user has selected code from line ${s.startLine} col ${s.startColumn} to line ${s.endLine} col ${s.endColumn}. Prefer to modify this selected region when the request applies to it.`
    );
    parts.push("");
    parts.push("```" + context.language);
    parts.push(context.selection);
    parts.push("```");
  }

  return `${parts.join("\n")}\n\n` + EDIT_SYSTEM_GUIDE;
};

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
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [liveModelValue, setLiveModelValue] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const streamAbortRef = useRef<AbortController | null>(null);

  // When the panel opens and a request is pending, consume it and generate a
  // preliminary analysis of the current file.
  // Consume a pending "ask" request when the panel opens (external store sync).
  useEffect(() => {
    if (!open) return;
    const request = useAIEditorStore.getState().consumeRequest();
    if (request) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentContext(request.context);
      setMessages([]);
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

  // Keep Monaco in sync with the most recent pending (non-applied, non-rejected,
  // non-stale) suggestion: render an inline Copilot-style diff + Accept/Reject
  // widget on the changed lines.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !open) {
      detachInlineSuggestion(editor);
      return;
    }

    const active = [...suggestions]
      .reverse()
      .find((s) => !s.applied && !s.rejected && !s.stale);

    if (!active) {
      detachInlineSuggestion(editor);
      return;
    }

    const handle = attachInlineSuggestion(
      editor,
      monacoRef.current,
      active.edits,
      {
        label: active.explanation,
        onApply: () => applySuggestion(active.id),
        onReject: () => rejectSuggestion(active.id),
      }
    );
    return () => handle.detach();
  }, [suggestions, open, editorRef, monacoRef, applySuggestion, rejectSuggestion]);

  // Keep the live Monaco content for stale diff previews.
  useEffect(() => {
    const model = editorRef.current?.getModel?.();
    if (model?.getValue) {
      setLiveModelValue(model.getValue());
    }
  }, [suggestions, open, editorRef]);

  const close = () => useAIEditorStore.getState().setOpen(false);

  const copyMessage = (m: PanelMessage) => {
    const el = contentRefs.current[m.id];
    const rendered = el ? extractRenderedText(el) : "";
    navigator.clipboard.writeText(rendered || m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId((cur) => (cur === m.id ? null : cur)), 2000);
  };

  const stopGeneration = () => streamAbortRef.current?.abort();

  const updateMessage = (id: string, patch: Partial<PanelMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  };

  const handleSend = async (override?: string) => {
    const userPrompt = (override ?? prompt).trim();
    if (!userPrompt || sending) return;
    setPrompt("");
    setSending(true);
    setPreparing(true);

    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", content: userPrompt },
    ]);

    const aiId = makeId();
    const streamed = { content: "", reasoning: "" };
    setMessages((prev) => [
      ...prev,
      {
        id: aiId,
        role: "assistant",
        content: "",
        reasoningContent: "",
        isReasoning: true,
        isStreaming: true,
      },
    ]);

    const controller = new AbortController();
    streamAbortRef.current = controller;

    const system = buildSystemMessage(currentContext);
    const historyForModel: ChatMessageInput[] = [
      { role: "system", content: system },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userPrompt },
    ];

    const callbacks = {
      onReasoning: (chunk: string) => {
        streamed.reasoning += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, reasoningContent: streamed.reasoning }
              : m
          )
        );
      },
      onContent: (chunk: string) => {
        streamed.content += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: streamed.content } : m
          )
        );
      },
      onUsage: (meta: { usage?: LiveUsage; timeMs?: number }) => {
        updateMessage(aiId, { usage: meta.usage, timeMs: meta.timeMs });
      },
      onDone: () => {},
    };

    try {
      await streamChat(historyForModel, callbacks, controller.signal);

      // Finalize the message (clear streaming flags).
      updateMessage(aiId, { isReasoning: false, isStreaming: false });

      const { content: cleanContent, edits: editGroups } =
        parseEditsFromResponse(streamed.content);

      // Persist the cleaned content (without raw JSON block).
      const finalShown =
        cleanContent || streamed.content || "Here's what I found.";
      updateMessage(aiId, { content: finalShown });

      if (editGroups.length > 0) {
        const snapshot = captureEditorSnapshot(editorRef.current);
        // One independently-acceptable suggestion per edit group/hunk, so the
        // user can accept some hunks and reject others (Copilot-style).
        setSuggestions((prev) => [
          ...prev,
          ...editGroups.map((group) => ({
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
      updateMessage(aiId, { isReasoning: false, isStreaming: false });
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
      setPreparing(false);
    }
  };

  const applyAll = () => {
    const pending = suggestions.filter((s) => !s.applied && !s.rejected);
    pending.forEach((s) => applySuggestion(s.id));
  };

  const recalculateSuggestion = (suggestionId: string) => {
    const target = suggestions.find((s) => s.id === suggestionId);
    if (!target) return;
    // Mark the old one rejected, then re-run generation with the same ut.
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId ? { ...s, rejected: true } : s
      )
    );
    // Use the message's explanation as the prompt.
    handleSend(target.explanation || "Please fix or optimize the current file.");
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
                <button
                  onClick={applyAll}
                  className="flex items-center gap-1 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-2 py-1 text-[10px] font-bold text-[#A78BFA] transition-colors hover:bg-[#7C3AED]/20"
                  title="Apply all pending suggestions"
                >
                  <CheckCheck className="h-3 w-3" />
                  Apply all ({pendingCount})
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
            {messages.length === 0 ? (
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
              messages.map((m) => {
                const msgSuggestions = suggestions.filter(
                  (s) => s.messageId === m.id && !s.rejected
                );
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

                          {/* Suggested changes cards */}
                          {msgSuggestions.map((s) => {
                            const snapshot = s.snapshot;
                            const modelValue = snapshot?.content ?? "";
                            return (
                              <SuggestedChangesCard
                                key={s.id}
                                filename={currentContext?.filename ?? "code"}
                                explanation={s.explanation}
                                edits={s.edits}
                                modelValue={s.stale ? liveModelValue : modelValue}
                                stale={s.stale}
                                applying={s.applying}
                                onApply={() => applySuggestion(s.id)}
                                onReject={() => rejectSuggestion(s.id)}
                                onRefresh={() => recalculateSuggestion(s.id)}
                              />
                            );
                          })}
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
            )}
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
