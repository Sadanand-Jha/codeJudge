"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Copy,
  CheckCircle,
  Sparkles,
  RefreshCw,
  FileText,
} from "lucide-react";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";
import { estimateTokens, fmt, formatUsage } from "@/components/ai/tokenUsage";
import type { LiveUsage } from "@/services/ai";
import { extractRenderedText } from "@/utils/clipboard";

/** Claude-style asterisk mark used as the assistant avatar. */
export function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5v19M4.1 5.75l15.8 12.5M19.9 5.75L4.1 18.25"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Shared, minimal fields any AI conversation message exposes. */
export interface AIMessageData {
  role: "user" | "assistant";
  content: string;
  reasoningContent?: string;
  isReasoning?: boolean;
  isStreaming?: boolean;
  usage?: LiveUsage;
  timeMs?: number;
  attachments?: string[];
}

/** Inline, card-less reasoning panel (part of the assistant message, not a box). */
export function ThinkingPanel({
  reasoning,
  isThinking,
  usage,
}: {
  reasoning: string;
  isThinking: boolean;
  usage?: LiveUsage;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [followLatest, setFollowLatest] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Auto-expand while thinking; collapsed by default once reasoning completes.
  const open = manualOpen ?? isThinking;

  // Auto-follow the newest reasoning line so the panel always trails the latest
  // text while thinking. Pauses the moment the user scrolls up to read.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !open || !followLatest) return;
    el.scrollTop = el.scrollHeight;
  }, [reasoning, open, followLatest]);

  if (!reasoning && !isThinking) return null;

  // Live token estimate from real usage when reported, else char-based estimate.
  const tokens = usage?.totalTokens ?? Math.max(0, Math.round(reasoning.length / 4));

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom !== followLatest) setFollowLatest(atBottom);
  };

  const toggle = () => {
    setManualOpen(!open);
    if (!open) setFollowLatest(true);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setFollowLatest(true);
  };

  return (
    <div className="overflow-hidden rounded-md border border-ai-border/50">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="group flex w-full items-baseline gap-1.5 px-2 py-1.5 text-left"
      >
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-ai-text">
          <Sparkles className={`h-3 w-3 text-ai-accent ${isThinking ? "animate-pulse" : ""}`} />
          {isThinking ? "Thinking..." : "Thinking"}
        </span>
        <span className="text-[11px] text-ai-text-mut">
          · {fmt(tokens)} tokens
        </span>
        <span className="ml-auto">
          <ChevronDown
            className={`h-3 w-3 text-ai-text-mut transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-ai-border/40 px-2 pb-2">
          {reasoning ? (
            <div className="relative">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-40 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-ai-text-sec pt-1.5"
              >
                {reasoning}
              </div>
              {isThinking && !followLatest && (
                <button
                  onClick={jumpToLatest}
                  className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-ai-border bg-ai-surface px-2 py-0.5 text-[10px] font-medium text-ai-text-sec shadow-sm transition-colors hover:text-ai-text"
                >
                  ↓ New reasoning
                </button>
              )}
            </div>
          ) : (
            <div className="pt-1.5 text-[12px] text-ai-text-mut">Analyzing your request...</div>
          )}
        </div>
      )}
    </div>
  );
}

interface AIMessageRowProps {
  message: AIMessageData;
  /** Optional ref callback capturing the rendered assistant content node (for external copy). */
  contentRef?: (el: HTMLDivElement | null) => void;
  onRegenerate?: () => void;
  /** Extra content rendered below the assistant response (code blocks, execution, suggestions). */
  children?: ReactNode;
  /** Extra hover actions for completed assistant messages (bookmark/save/notes…). */
  extraActions?: ReactNode;
}

/**
 * The /ai/chat-style conversation row, shared by every AI assistant:
 * - user: compact right-aligned pale-purple bubble + tiny "U" avatar
 * - assistant: card-less row with a Claude-style mark, inline ThinkingPanel,
 *   markdown response directly on the background, live token meta and a
 *   hover-only action row (hidden while generating).
 */
export default function AIMessageRow({
  message,
  contentRef,
  onRegenerate,
  children,
  extraActions,
}: AIMessageRowProps) {
  const [copied, setCopied] = useState(false);
  const localRef = useRef<HTMLDivElement | null>(null);

  const handleRef = (node: HTMLDivElement | null) => {
    if (node) localRef.current = node;
    contentRef?.(node);
  };

  const copyMessage = () => {
    const rendered = extractRenderedText(localRef.current);
    navigator.clipboard.writeText(rendered || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === "user";
  const meta = formatUsage(message.usage, message.timeMs, message.isStreaming, estimateTokens(message.content));
  const hasThinking = !!(message.reasoningContent || message.isReasoning);
  const done = !message.isStreaming && !message.isReasoning;
  const hasResponse = !!message.content || !!children;

  const actionBtn =
    "rounded-md px-1.5 py-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text";

  if (isUser) {
    return (
      <div className="group flex justify-end gap-2">
        <div className="max-w-[85%]">
          <div className="rounded-lg rounded-br-md border border-ai-accent/15 bg-ai-user-bubble px-3.5 py-2 text-[13px] text-ai-text">
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1">
                {message.attachments.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md border border-ai-border/70 bg-ai-surface px-1.5 py-0.5 text-[10px] text-ai-text-sec"
                  >
                    <FileText className="h-2.5 w-2.5 text-ai-accent" />
                    {name}
                  </span>
                ))}
              </div>
            )}
            <p className="leading-relaxed">{message.content}</p>
          </div>
          <div className="mt-0.5 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={copyMessage}
              title={copied ? "Copied" : "Copy"}
              className="rounded-md p-1 text-ai-text-mut transition-colors hover:bg-ai-hover hover:text-ai-text"
            >
              {copied ? <CheckCircle className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ai-accent-soft text-[9px] font-bold text-ai-accent">
          U
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-2.5">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ai-accent-soft text-ai-accent">
        <ClaudeMark className="h-3 w-3" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="space-y-1">
          {hasThinking && (
            <ThinkingPanel
              reasoning={message.reasoningContent || ""}
              isThinking={!!message.isReasoning}
              usage={message.usage}
            />
          )}

          {message.isStreaming && !message.content && (
            <div className="text-[12px] text-ai-text-mut">
              {hasThinking ? "Generating response..." : "Generating..."}
            </div>
          )}

          {hasResponse && (
            <div className={hasThinking ? "mt-2" : ""}>
              {message.content && <MarkdownRenderer ref={handleRef} content={message.content} />}
              {children}
            </div>
          )}

          {meta && !(message.isStreaming && !message.content) && (
            <p className="flex items-center gap-1.5 text-[10px] text-ai-text-mut">
              {message.isStreaming && <span className="h-1 w-1 animate-pulse rounded-full bg-ai-accent" />}
              {meta}
            </p>
          )}

          {done && (
            <div className="flex items-center gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={copyMessage}
                title={copied ? "Copied" : "Copy"}
                className={actionBtn}
              >
                {copied ? <CheckCircle className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </button>
              {onRegenerate && (
                <button onClick={onRegenerate} title="Regenerate" className={actionBtn}>
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
              {extraActions && (
                <>
                  <span className="mx-1 h-3 w-px bg-ai-border" />
                  {extraActions}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
