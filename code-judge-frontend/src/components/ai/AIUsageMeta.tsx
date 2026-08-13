"use client";

import { cn } from "@/lib/helpers";
import { formatUsage } from "@/components/ai/tokenUsage";
import type { LiveUsage } from "@/services/ai";

/**
 * Subtle, fixed-shape metadata line shown below an AI message.
 *
 * - while streaming: reflects any real usage received so far, else a live
 *   `↓ N tokens` estimate (via `liveEstimate`) instead of a static "Generating…"
 * - when done: the final real usage + generation time + tokens/sec
 *
 * Real backend usage is always preferred; the estimate only fills the gap while
 * the answer is still streaming. The row is hidden when nothing is available.
 */
export default function AIUsageMeta({
  isStreaming,
  usage,
  timeMs,
  liveEstimate,
}: {
  isStreaming: boolean;
  usage?: LiveUsage;
  timeMs?: number;
  liveEstimate?: number;
}) {
  const text = formatUsage(usage, timeMs, isStreaming, liveEstimate);
  if (!text) return null;

  return (
    <p
      className={cn(
        "mt-1.5 overflow-visible whitespace-nowrap text-[10px] font-medium tracking-wide text-text-muted/80",
        isStreaming ? "opacity-100" : "opacity-90"
      )}
      aria-label="Usage information"
    >
      {text}
    </p>
  );
}
