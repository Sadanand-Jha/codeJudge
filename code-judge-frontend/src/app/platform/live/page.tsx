"use client";

import { useEffect, useState } from "react";
import { platformApi } from "@/services/platform";
import type { LiveData } from "@/services/platform";
import { SectionCard, FeedSkeleton, EmptyState, timeAgo } from "@/components/platform/ui";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/live — calls /live only (15s poll). */
export default function LivePage() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveError, setLiveError] = useState(false);
  const loadLive = () => {
    platformApi.live().then((d) => { setLive(d); setLiveError(false); }).catch(() => setLiveError(true));
  };
  useEffect(() => {
    const initial = setTimeout(loadLive, 0);
    const t = setInterval(loadLive, 15000);
    return () => { clearTimeout(initial); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Live now" detail="Realtime presence and event stream." />
      <SectionCard title="Live now" subtitle="realtime" right={<span className="pf-pulse inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />}>
        {!live && !liveError ? <FeedSkeleton rows={6} stats /> : liveError || !live ? <EmptyState message="Data unavailable" /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LiveStat value={live.online} label="users online" />
              <LiveStat value={live.takingQuizzes} label="taking quizzes" />
              <LiveStat value={live.activeQuizRooms} label="active rooms" />
              <LiveStat value={live.attemptsInProgress} label="attempts in progress" />
            </div>
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
              {live.events.length === 0 && <EmptyState message="Live activity will appear here" />}
              {live.events.slice(0, 20).map((e, i) => (
                <div key={`${e.kind}-${e.at}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <span className="min-w-0 truncate text-[var(--text-secondary)]">
                    <b className="font-medium text-[var(--text-primary)]">{e.actor ?? "—"}</b> {e.kind.replace(/_/g, " ")} {e.object ?? ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-[11px] text-[var(--text-muted)]">{timeAgo(e.at)}</span>
                </div>
              ))}
            </div>
            <button onClick={loadLive} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Refresh live</button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function LiveStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--border)] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[20px] font-semibold tabular-nums text-[var(--text-primary)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}
