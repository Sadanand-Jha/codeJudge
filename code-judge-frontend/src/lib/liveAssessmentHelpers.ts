/**
 * Live Assessment Room — Helpers
 *
 * Small pure utilities for formatting and crowd layout.
 */

import type { LiveParticipant } from "@/types/liveAssessment";

/** Format seconds as mm:ss or h:mm:ss */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Relative time like "12s ago", "3m ago" */
export function formatRelative(secondsAgo: number): string {
  if (secondsAgo < 60) return `${Math.floor(secondsAgo)}s ago`;
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  return `${Math.floor(secondsAgo / 3600)}h ago`;
}

/**
 * Generate a random classroom position.
 * Uses a seeded hash for stable pseudo-random placement.
 * Allows 20-30% partial overlap between neighbours for a natural crowd feel.
 */
export function scatteredPosition(
  seed: number,
  index: number,
  count: number
): { left: number; top: number; rotate: number; scale: number; z: number } {
  // Deterministic pseudo-random from seed + index
  const hash1 = ((seed * 9301 + index * 49297) % 233280) / 233280;
  const hash2 = ((seed * 49297 + index * 233280) % 9301) / 9301;
  const hash3 = ((seed * 233280 + index * 9301) % 49297) / 49297;

  // Random position within classroom bounds (10% - 90%)
  // Clustered slightly toward center for a natural gathering feel
  const centerBias = 0.7;
  const left = 15 + hash1 * 70;
  const top = 12 + hash2 * 76;

  // Subtle rotation and scale variation
  const rotate = (hash3 - 0.5) * 6; // -3deg .. +3deg
  const scale = 0.95 + hash1 * 0.1; // 0.95 .. 1.05

  // Random z-index for natural depth layering
  const z = 10 + Math.floor(hash2 * 5);

  return { left, top, rotate, scale, z };
}

/** Compute live stats from a participant list */
export function computeStats(participants: LiveParticipant[]) {
  const total = participants.length;
  if (total === 0) {
    return {
      studentsJoined: 0,
      currentlyActive: 0,
      submitted: 0,
      averageProgress: 0,
      averageScore: 0,
      averageTime: 0,
    };
  }
  const submitted = participants.filter((p) => p.status === "submitted");
  const scored = participants.filter((p) => p.score !== undefined);
  return {
    studentsJoined: total,
    currentlyActive: participants.filter((p) => p.status === "attempting").length,
    submitted: submitted.length,
    averageProgress: Math.round(
      participants.reduce((s, p) => s + p.progress, 0) / total
    ),
    averageScore: scored.length
      ? Math.round(scored.reduce((s, p) => s + (p.score || 0), 0) / scored.length)
      : 0,
    averageTime: Math.round(
      participants.reduce((s, p) => s + p.timeSpent, 0) / total
    ),
  };
}