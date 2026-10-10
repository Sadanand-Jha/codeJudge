"use client";

import { useMemo } from "react";
import { ClipboardList, UserCheck, Activity } from "lucide-react";
import { timeAgo, IST_TIMEZONE } from "@/lib/formatters";
import type { CreatorProfileOverview } from "@/services/creatorProfile";

interface TimelineEvent {
  id: string;
  at: string | null;
  title: string;
  sub: string;
  kind: "quiz" | "attempt";
}

function exactDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    timeZone: IST_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityTimeline({ overview }: { overview: CreatorProfileOverview }) {
  const events = useMemo<TimelineEvent[]>(() => {
    const quizEvents: TimelineEvent[] = overview.recentQuizzes.map((q) => ({
      id: `quiz-${q.id}`,
      at: q.createdAt,
      title: `Created “${q.name}”`,
      sub: q.code ? `Code ${q.code}` : "Assessment",
      kind: "quiz",
    }));
    const attemptEvents: TimelineEvent[] = overview.recentAttempts.map((a) => ({
      id: `attempt-${a.id}`,
      at: a.attemptedAt,
      title: `${a.studentName} attempted ${a.quizName || "a quiz"}`,
      sub: a.status === "completed" ? "Attempt submitted" : "Attempt in progress",
      kind: "attempt",
    }));
    return [...quizEvents, ...attemptEvents]
      .sort((x, y) => {
        const tx = x.at ? new Date(x.at).getTime() : 0;
        const ty = y.at ? new Date(y.at).getTime() : 0;
        return ty - tx;
      })
      .slice(0, 8);
  }, [overview]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-profile-border bg-profile-surface p-5">
      <h2 className="text-[14px] font-semibold text-profile-text-primary">Recent activity</h2>
      {events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-profile-border px-4 py-8 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-profile-surface-elevated">
            <Activity className="h-4 w-4 text-profile-text-muted" />
          </span>
          <p className="text-[13px] font-semibold text-profile-text-primary">Nothing here yet</p>
          <p className="max-w-[240px] text-[11px] leading-relaxed text-profile-text-muted">
            New assessments and student attempts will show up in this timeline.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-profile-border">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-profile-surface-elevated">
                {e.kind === "quiz" ? (
                  <ClipboardList className="h-3.5 w-3.5 text-profile-accent" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5 text-profile-purple" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-profile-text-primary" title={e.title}>
                  {e.title}
                </p>
                <p className="mt-0.5 text-[11px] text-profile-text-muted">{e.sub}</p>
              </div>
              <span
                className="shrink-0 text-[11px] text-profile-text-muted"
                title={exactDate(e.at) || undefined}
              >
                {e.at ? timeAgo(e.at) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
