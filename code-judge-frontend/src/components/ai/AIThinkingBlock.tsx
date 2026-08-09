"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import MarkdownRenderer from "@/components/ai/MarkdownRenderer";

// If the user's viewport is more than this many px below the newest reasoning,
// they are "paused" (reading older content) and auto-follow is disabled.
const FOLLOW_THRESHOLD_PX = 40;

/**
 * Compact, fixed-height "thinking" panel for AI reasoning_content.
 *
 * The box never grows, owns its own scrolling, and has no visible scrollbar.
 * While reasoning streams it auto-follows the newest text; if the user scrolls
 * up to read old reasoning, auto-follow pauses and a subtle "↓ New reasoning"
 * pill lets them jump back to the latest. Reasoning stays fully in message
 * state — only the visual box is height-constrained.
 */
export default function AIThinkingBlock({
  reasoning,
  isReasoning,
}: {
  reasoning: string;
  isReasoning: boolean;
}) {
  // `null` = auto mode: open while reasoning streams, collapse when done.
  // A manual toggle overrides the auto behavior.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [followLatest, setFollowLatest] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const open = manualOpen ?? isReasoning;

  // Follow newest reasoning as chunks arrive — but never fight the user's scroll.
  // Only active while a generation is running; closing/reopening a finished
  // box remounts it at the top so it can be read start-to-end.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && isReasoning && followLatest) el.scrollTop = el.scrollHeight;
  }, [reasoning, isReasoning, followLatest, open]);

  // Detect manual scroll: pausing follow once the user moves away from the
  // bottom, and (rightly) resuming when they come back near it.
  const handleScroll = () => {
    if (!isReasoning) return;
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > FOLLOW_THRESHOLD_PX) {
      if (followLatest) setFollowLatest(false);
    } else if (!followLatest) {
      setFollowLatest(true);
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
    <div className="mb-1.5 overflow-hidden rounded-lg border border-border/70 bg-card-hover/30">
      <button
        onClick={toggle}
        className="flex h-10 w-full items-center justify-between gap-2 px-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
          {isReasoning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 text-text-muted" />
          )}
          <span>{isReasoning ? "Thinking..." : "Thinking · completed"}</span>
        </span>
        <ChevronDown className={`h-3 w-3 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="ai-thinking-body ai-thinking-scroll h-[120px] max-h-[120px] min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain border-t border-border/60 px-3 py-2"
          >
            <MarkdownRenderer content={reasoning} />
          </div>

          {isReasoning && !followLatest && reasoning && (
            <button
              onClick={jumpToLatest}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-border/70 bg-card/90 px-2.5 py-1 text-[10px] font-medium text-text-secondary shadow-sm backdrop-blur"
            >
              ↓ New reasoning
            </button>
          )}
        </div>
      )}
    </div>
  );
}