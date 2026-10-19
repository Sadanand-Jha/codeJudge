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
    <div className="space-y-5">
      <PageHeader
        eyebrow="Realtime"
        title="Live now"
        detail="Who is online and what is happening on the platform right now. Refreshes every 15 seconds."
      />
      <div className="qs-offset">
      <SectionCard title="Live now" subtitle="Real presence from the last 15 minutes — original data, never estimated" right={<span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]" aria-label="Live" />}>
        {!live && !liveError ? <FeedSkeleton rows={6} stats /> : liveError || !live ? <EmptyState message="Live data unavailable" detail="The live endpoint did not respond. Retry in a few seconds." /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <LiveStat value={live.online} label="users online" hint="logged in last 15 min" highlight />
              <LiveStat value={live.takingQuizzes} label="taking quizzes" hint="attempts in progress" />
              <LiveStat value={live.activeQuizRooms} label="active rooms" hint="distinct live quizzes" />
              <LiveStat value={live.attemptsInProgress} label="attempts in progress" hint="unfinished attempts" />
            </div>
            {(live.online === 0 && live.takingQuizzes === 0) && (
              <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] px-4 py-3 text-center text-[13px] text-[var(--qs-muted)]">
                Quiet right now — no one has logged in or started an attempt in the last few minutes. The event stream below still shows the latest real activity.
              </div>
            )}
            <div className="divide-y divide-[var(--qs-line)] border-t-2 border-[var(--qs-line)]">
              {live.events.length === 0 && <EmptyState message="No live events yet" detail="Registrations, quiz creations and attempts will stream here." />}
              {live.events.slice(0, 20).map((e, i) => (
                <div key={`${e.kind}-${e.at}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-[13px] hover:bg-[var(--qs-bg)]">
                  <span className="min-w-0 truncate text-[var(--qs-muted)]">
                    <b className="font-bold text-[var(--qs-ink)]">{e.actor ?? "—"}</b> {e.kind.replace(/_/g, " ")} {e.object ?? ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-[11px] text-[var(--qs-muted)]">{timeAgo(e.at)}</span>
                </div>
              ))}
            </div>
            <button onClick={loadLive} className="b sm">Refresh live</button>
          </div>
        )}
      </SectionCard>
      </div>
    </div>
  );
}

function LiveStat({ value, label, hint, highlight }: { value: number; label: string; hint: string; highlight?: boolean }) {
  return (
    <div className={highlight
      ? "rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-3"
      : "rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-3"}>
      <div className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[32px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
        <span className="inline-block h-2 w-2 rounded-full border border-[var(--qs-ink)] bg-[var(--qs-ok)]" aria-hidden="true" />
        {value}
      </div>
      <div className="mt-1 text-[11px] text-[var(--qs-muted)]">{hint}</div>
    </div>
  );
}
