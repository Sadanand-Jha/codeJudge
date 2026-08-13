"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";
import AILogo from "@/components/ai/AILogo";
import { isAtBottom as userIsAtBottom } from "@/components/ai/tokenUsage";
import type { LiveUsage } from "@/services/ai";
import { estimateTokens, fmt } from "@/components/ai/tokenUsage";

// When the user's viewport is more than this many px below the newest reasoning,
// they are "paused" (reading older content) and auto-follow pauses.
const FOLLOW_THRESHOLD_PX = 40;
// Box grows from a header-only height up to this, then scrolls internally.
const MAX_BOX_HEIGHT = 150;
const HEADER_HEIGHT = 40;
const CONTENT_MAX = MAX_BOX_HEIGHT - HEADER_HEIGHT;

/**
 * Compact, growable "Thinking" panel for AI reasoning_content.
 *
 * Layout:
 *   ┌──────────────────────────┐
 *   │ ◊ Thinking · N tokens  ˅ │   <- header (always visible; holds the AI mark)
 *   ├──────────────────────────┤
 *   │ reasoning...             │   <- grows then scrolls internally (no visible scrollbar)
 *   └──────────────────────────┘
 *
 * The header always carries the assistant's AI mark while reasoning streams, so
 * the logo "stays with Thinking." Once reasoning is done the panel auto-collapses
 * (its caller unmounts it / shows the completed label), and the mark is instead
 * rendered trailing the live answer content.
 *
 * Token numbers shown here are the real values the backend has reported so
 * far, falling back to a live character-based estimate while reasoning streams
 * so the count is always moving; the real usage replaces it when it arrives.
 */
export default function AIThinkingBlock({
  reasoning,
  isReasoning,
  usage,
}: {
  reasoning: string;
  isReasoning: boolean;
  usage?: LiveUsage;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [followLatest, setFollowLatest] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The active "latest entry" — the trailing Thinking… indicator that gets
  // pinned to the newest thinking line while reasoning streams.
  const latestLineRef = useRef<HTMLDivElement>(null);

  const open = manualOpen ?? isReasoning;
  // Real-so-far token total when the backend reports it, otherwise a live
  // estimate from the reasoning text so the count is never stuck at 0 while
  // the model is still thinking.
  const headerTokenTotal = usage?.totalTokens ?? estimateTokens(reasoning);

  // Follow the newest reasoning line. Instead of guessing with a raw
  // `scrollHeight` assignment (which can leave the active line off-screen or
  // at an older position), pin the trailing indicator to the visible bottom.
  // Runs layout-synchronously so the follow happens in the same frame as the
  // content update — the latest line never sits at a stale position.
  useLayoutEffect(() => {
    if (!isReasoning || !followLatest) return;
    const el = scrollRef.current;
    const latest = latestLineRef.current;
    if (!el || !latest) return;
    const delta = latest.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom;
    if (delta > 0) el.scrollTop += delta;
  }, [reasoning, followLatest, open, isReasoning]);

  const handleScroll = () => {
    if (!isReasoning) return;
    const el = scrollRef.current;
    if (!el) return;
    if (userIsAtBottom(el.scrollHeight, el.scrollTop, el.clientHeight, FOLLOW_THRESHOLD_PX)) {
      if (!followLatest) setFollowLatest(true);
    } else if (followLatest) {
      setFollowLatest(false);
    }
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setFollowLatest(true);
  };

  if (!reasoning && !isReasoning) return null;

  const toggle = () => setManualOpen(!open);

  return (
    <div
      className="ai-thinking-scroll overflow-hidden rounded-lg border border-border/70 bg-card-hover/30"
      style={{ minHeight: HEADER_HEIGHT, maxHeight: MAX_BOX_HEIGHT }}
    >
      <button
        onClick={toggle}
        className="flex h-10 w-full items-center justify-between gap-2 px-3 text-left"
        aria-expanded={open}
      >
          <span className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
            {/* While reasoning streams, NO logo is anchored to the header — the
                active "Thinking…" mark trails the latest reasoning line in the
                body below. A spacer reserves the logo slot so the header doesn't
                jump when reasoning completes (completed header keeps its logo). */}
            {isReasoning ? (
              <span className="h-7 w-7 shrink-0" aria-hidden="true" />
            ) : (
              <AILogo variant="accent" size="lg" animate={false} />
            )}
            <span>{isReasoning ? "Thinking" : "Thinking · completed"}</span>
          </span>

          <span className="text-[11px] font-medium text-text-muted">
            · {fmt(headerTokenTotal)} tokens
          </span>

        <ChevronDown
          className={`h-3 w-3 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="ai-thinking-body ai-thinking-scroll relative border-t border-border/60 px-3 py-2"
          style={{ maxHeight: CONTENT_MAX }}
        >
          <MarkdownRenderer content={reasoning} />

          {/* Active "Thinking…" indicator is appended *after* the latest reasoning
              line so it always trails the bottom-most content while streaming.
              `latestLineRef` keeps it pinned to the visible bottom. */}
          {isReasoning && (
            <div ref={latestLineRef} className="mt-1.5 flex items-center gap-2 text-[13px] font-medium text-text-primary">
              <AILogo variant="accent" size="lg" animate={true} />
              <span>Thinking…</span>
            </div>
          )}

          {isReasoning && !followLatest && reasoning && (
            <button
              onClick={jumpToLatest}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-border/70 bg-card/90 px-2 py-1 text-[10px] font-medium text-text-secondary shadow-sm backdrop-blur"
            >
              ↓ New reasoning
            </button>
          )}
        </div>
      )}
    </div>
  );
}
