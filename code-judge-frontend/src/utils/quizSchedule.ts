export type QuizScheduleState = "unscheduled" | "upcoming" | "live" | "ended";

export interface QuizScheduleWindow {
  state: QuizScheduleState;
  startMs: number | null;
  endMs: number | null;
  target: "start" | "end" | null;
  remainingMs: number | null;
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** Resolve a quiz's fixed start/end window against the current instant. */
export function getQuizScheduleWindow(
  quiz: { starttime?: string | null; endtime?: string | null },
  now = Date.now()
): QuizScheduleWindow {
  const startMs = parseTime(quiz.starttime);
  const endMs = parseTime(quiz.endtime);

  if (endMs !== null && now >= endMs) {
    return { state: "ended", startMs, endMs, target: null, remainingMs: 0 };
  }

  if (startMs !== null && now < startMs) {
    return { state: "upcoming", startMs, endMs, target: "start", remainingMs: startMs - now };
  }

  if (startMs === null && endMs === null) {
    return { state: "unscheduled", startMs, endMs, target: null, remainingMs: null };
  }

  return {
    state: "live",
    startMs,
    endMs,
    target: endMs !== null ? "end" : null,
    remainingMs: endMs !== null ? endMs - now : null,
  };
}

/** Compact countdown used by student-facing schedule clocks. */
export function formatScheduleCountdown(remainingMs: number | null | undefined): string {
  if (remainingMs === null || remainingMs === undefined) return "No end time";
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  if (totalSeconds <= 0) return "Ended";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
