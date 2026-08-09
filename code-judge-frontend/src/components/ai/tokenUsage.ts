import type { LiveUsage } from "@/services/ai";

export type { LiveUsage } from "@/services/ai";

export const fmt = (n: number) => Math.round(n).toLocaleString();

/**
 * Build the compact usage string for an AI message.
 *
 * Rules (honors "do not fabricate"):
 *  - reasoning tokens take priority when the provider exposes them
 *  - input/output breakdown when both are present (and no reasoning split)
 *  - total only otherwise
 *  - duration + tokens/sec only appended from real values; tok/s needs total + positive duration
 *  - returns "Generating…" while streaming and nothing real is known yet
 *  - returns null when there is nothing real to show (no usage & no time)
 */
export const formatUsage = (
  usage: LiveUsage | undefined,
  timeMs?: number,
  isStreaming?: boolean
): string | null => {
  const { inputTokens, outputTokens, reasoningTokens, totalTokens } = usage ?? {};
  const hasInput = inputTokens != null;
  const hasOutput = outputTokens != null;
  const hasReasoning = reasoningTokens != null;
  const hasTotal = totalTokens != null;

  const parts: string[] = [];

  if (hasReasoning && hasOutput && hasTotal) {
    const answer = Math.max(0, outputTokens! - reasoningTokens!);
    parts.push(`${fmt(totalTokens!)} tokens · ${fmt(reasoningTokens!)} thinking · ${fmt(answer)} answer`);
  } else if (hasInput && hasOutput) {
    parts.push(`↑ ${fmt(inputTokens!)} in · ↓ ${fmt(outputTokens!)} out`);
    if (hasTotal) parts.push(`${fmt(totalTokens!)} total`);
  } else if (hasTotal) {
    parts.push(`${fmt(totalTokens!)} tokens`);
  } else if (hasInput || hasOutput) {
    if (hasInput) parts.push(`↑ ${fmt(inputTokens!)} in`);
    if (hasOutput) parts.push(`↓ ${fmt(outputTokens!)} out`);
  }

  if (timeMs != null) {
    const secs = timeMs / 1000;
    parts.push(`${secs.toFixed(1)}s`);
    if (hasTotal && secs > 0) {
      parts.push(`${Math.round(totalTokens! / secs)} tok/s`);
    }
  }

  if (parts.length === 0) {
    return isStreaming ? "Generating…" : null;
  }
  return parts.join(" · ");
};

/** Scroll-position helpers shared with AIThinkingBlock */
export const isAtBottom = (
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  thresholdPx = 40
): boolean => scrollHeight - scrollTop - clientHeight <= thresholdPx;

export const shouldAutoFollow = (
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  isGenerating: boolean,
  thresholdPx = 40
): boolean => isGenerating && isAtBottom(scrollHeight, scrollTop, clientHeight, thresholdPx);
