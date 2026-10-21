export type EffectiveQuizStatus = "live" | "draft" | "scheduled" | "completed";

function parseQuizTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(trimmed);
  const base = trimmed.replace(" ", "T");
  const withTime = /T\d{2}:\d{2}/.test(base) ? base : `${base}T00:00`;
  const normalized = hasZone ? withTime : `${withTime}+05:30`;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Derive the status a quiz should show right now. The stored status is only a
 * fallback: a published quiz becomes scheduled before its start time and
 * completed once its end time passes, even if nobody updated the DB row.
 */
export function deriveQuizStatus(
  quiz: { status?: string | null; starttime?: string | null; endtime?: string | null },
  now: number = Date.now()
): EffectiveQuizStatus {
  const raw = quiz.status?.trim().toLowerCase() ?? "";
  if (raw === "draft") return "draft";
  if (raw === "completed" || raw === "ended") return "completed";

  const startAt = parseQuizTime(quiz.starttime);
  const endAt = parseQuizTime(quiz.endtime);

  if (endAt !== null && now >= endAt) return "completed";
  if (startAt !== null && now < startAt) return "scheduled";

  if (raw === "scheduled") {
    return startAt === null ? "scheduled" : "live";
  }
  if (raw === "live" || raw === "published" || raw === "active") return "live";

  return "draft";
}
