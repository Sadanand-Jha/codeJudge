"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Trophy, UserPlus, Code2, Loader2, CalendarDays, BellRing } from "lucide-react";
import { getMyContests } from "@/services/contests";
import { getIncomingCollaboratorRequests } from "@/services/quiz";
import { groupLabel, timeAgo, type ActivityEvent } from "@/services/profile";
import ProfileSectionHeader from "./ProfileSectionHeader";

const EVENT_TONE: Record<ActivityEvent["type"], { icon: React.ComponentType<{ className?: string }>; gradient: string }> = {
  contest: { icon: Trophy, gradient: "from-[#FBBF24] to-[#F59E0B]" },
  collaboration: { icon: UserPlus, gradient: "from-[#F59E0B] to-[#F97316]" },
  achievement: { icon: BellRing, gradient: "from-[#22C55E] to-[#10B981]" },
  profile: { icon: Code2, gradient: "from-[#3B82F6] to-[#06B6D4]" },
  quiz: { icon: CalendarDays, gradient: "from-[#8B5CF6] to-[#6366F1]" },
  problem: { icon: Code2, gradient: "from-[#06B6D4] to-[#3B82F6]" },
};

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [contests, requests] = await Promise.all([
        getMyContests().catch(() => [] as Awaited<ReturnType<typeof getMyContests>>),
        getIncomingCollaboratorRequests().catch(() => [] as Awaited<ReturnType<typeof getIncomingCollaboratorRequests>>),
      ]);

      const contestEvents: ActivityEvent[] = (contests ?? []).map((c) => ({
        id: `contest-${c.id}`,
        type: "contest",
        title: `Registered for "${c.name}"`,
        description: c.starttime
          ? `Contest ${new Date(c.starttime) <= new Date() ? "took place" : "is scheduled"} to begin on ${new Date(c.starttime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Contest registration",
        timestamp: c.starttime || c.created_at || new Date().toISOString(),
        href: `/contests`,
      }));

      const requestEvents: ActivityEvent[] = (requests ?? []).map((r) => ({
        id: `collab-${r.id}`,
        type: "collaboration",
        title: `Invited to collaborate on "${r.quiz_name}"`,
        description: r.inviter_username ? `Invited by @${r.inviter_username}` : "Collaboration request",
        timestamp: r.created_at || new Date().toISOString(),
        href: r.quiz_code ? `/quiz/${r.quiz_code}` : undefined,
      }));

      setEvents(
        [...contestEvents, ...requestEvents].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const e of events) {
      const key = groupLabel(e.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <ProfileSectionHeader
          title="Activity"
          description="A timeline of your recent journey — contests, collaborations and milestones."
          icon={Activity}
          iconTone="from-[#F59E0B] to-[#F97316]"
          badge={
            !loading && events.length > 0 ? (
              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
                {events.length} events
              </span>
            ) : undefined
          }
        />

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16 text-sm text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
          </div>
        ) : grouped.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316]/10 to-[#F59E0B]/10">
              <Activity className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <p className="mt-4 text-sm font-semibold text-text-primary">No activity yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-text-muted">
              When you solve problems, join quizzes or register for contests, your activity will appear here.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([label, items], gi) => (
              <motion.section
                key={label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: gi * 0.06 }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="rounded-lg bg-gradient-to-r from-[#F59E0B]/15 to-[#F97316]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
                    {label}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <div className="relative">
                  {/* Timeline rail */}
                  <span className="absolute bottom-3 left-[9px] top-3 w-px bg-border" />

                  <div className="space-y-3">
                    {items.map((event, i) => {
                      const meta = EVENT_TONE[event.type];
                      const Icon = meta.icon;
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.04 }}
                          className="relative flex items-start gap-3.5"
                        >
                          {/* Node on the rail */}
                          <span className="relative z-10 mt-5 flex h-3 w-3 shrink-0 items-center justify-center">
                            <span className="absolute inline-flex h-3 w-3 rounded-full bg-[#F59E0B]/30" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#F97316] shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                          </span>

                          <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-hover">
                            <div className="flex items-start gap-3.5">
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${meta.gradient}`}>
                                <Icon className="h-4 w-4 text-white" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-text-primary">{event.title}</p>
                                {event.description && (
                                  <p className="mt-0.5 text-xs text-text-secondary">{event.description}</p>
                                )}
                                <p className="mt-1 text-[10px] text-text-muted">{timeAgo(event.timestamp)}</p>
                              </div>
                              {event.href && (
                                <Link
                                  href={event.href}
                                  className="shrink-0 self-center rounded-lg border border-border px-3 py-1.5 text-[10px] font-semibold text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                                >
                                  Open
                                </Link>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
