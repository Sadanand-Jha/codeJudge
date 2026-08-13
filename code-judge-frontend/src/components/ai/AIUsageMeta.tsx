"use client";

import { cn } from "@/lib/helpers";
import { formatUsage } from "@/components/ai/tokenUsage";
import type { LiveUsage } from "@/services/ai";

/**
 * Subtle, fixed-shape metadata line shown below an AI message.
 *
 * - while streaming: reflects any real usage received so far (else "Generating…")
 * - when done: the final real usage + generation time + tokens/sec
 *
 * No tokens are ever invented; the row is hidden when nothing real is available
 * (e.g. a provider that never reports usage and no timing captured).
 */
export default function AIUsageMeta({
  isStreaming,
  usage,
  timeMs,
}: {
  isStreaming: boolean;
  usage?: LiveUsage;
  timeMs?: number;
}) {
  const text = formatUsage(usage, timeMs, isStreaming);
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
