"use client";
import type { ComponentType, SVGProps } from "react";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, BarChart3, Users } from "lucide-react";
import type { LiveAssessmentRoomData, ActivityEvent } from "@/types/liveAssessment";
import { HeaderControls } from "./HeaderControls";
import { AnimatedCrowd } from "./AnimatedCrowd";
import { LiveStatsPanel } from "./LiveStatsPanel";
import { ActivityFeed } from "./ActivityFeed";
import { ParticipantsDrawer } from "./ParticipantsDrawer";
import { computeStats } from "@/lib/liveAssessmentHelpers";
import { STORAGE_KEYS } from "@/utils/storageKeys";

interface LiveAssessmentRoomProps {
  data: LiveAssessmentRoomData;
  onBack?: () => void;
}

/**
 * Live Assessment Room — the teacher monitoring experience.
 *
 * Composes the header (with Start / Pause / End controls), the large
 * animated crowd, the right sidebar (stats + activity feed) and the
 * participants drawer.
 */
export function LiveAssessmentRoom({ data, onBack }: LiveAssessmentRoomProps) {
  const [participants, setParticipants] = useState(data.participants);
  const [activity] = useState<ActivityEvent[]>(data.activity);
  const [status, setStatus] = useState(data.status);
  const [elapsed, setElapsed] = useState(data.elapsedSeconds);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rightTab, setRightTab] = useState<"stats" | "activity">("stats");

  // Live timer (only while actually live)
  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // Simulated live updates: nudge a random attempting student's progress
  useEffect(() => {
    if (status !== "live" || participants.length === 0) return;
    const interval = setInterval(() => {
      setParticipants((prev) => {
        const candidates = prev.filter((p) => p.status === "attempting");
        if (candidates.length === 0) return prev;
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        return prev.map((p) => {
          if (p.id !== target.id) return p;
          const answered = Math.min(p.totalQuestions, p.questionsAnswered + (Math.random() > 0.5 ? 1 : 0));
          const progress = Math.round((answered / p.totalQuestions) * 100);
          return { ...p, questionsAnswered: answered, progress, currentQuestion: Math.min(answered + 1, p.totalQuestions), timeSpent: p.timeSpent + 5 };
        });
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [status, participants.length]);

  const stats = useMemo(() => computeStats(participants), [participants]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handlePause = useCallback(() => setStatus("paused"), []);
  const handleResume = useCallback(() => setStatus("live"), []);
  const handleEnd = useCallback(() => setStatus("ended"), []);

  // Teacher clicks "Start Quiz" -> mark live + broadcast a start flag on
  // localStorage so any open waiting-room (student) tab redirects to /attempt.
  const handleStartQuiz = useCallback(() => {
    setStatus("live");
    try {
      window.localStorage.setItem(
        `${STORAGE_KEYS.LIVE_QUIZ_STARTED_PREFIX}${data.quizId}`,
        Date.now().toString()
      );
    } catch {}
  }, [data.quizId]);

  return (
    <div className="h-screen bg-[#09090B] flex flex-col overflow-hidden">
      <HeaderControls
        quizName={data.quizName}
        status={status}
        elapsedSeconds={elapsed}
        totalDuration={data.totalDuration}
        studentsJoined={stats.studentsJoined}
        studentsSubmitted={stats.submitted}
        onBack={onBack || (() => window.history.back())}
        onPause={handlePause}
        onResume={handleResume}
        onStartQuiz={handleStartQuiz}
        onEnd={handleEnd}
        onRefresh={handleRefresh}
        onOpenParticipants={() => setDrawerOpen(true)}
        refreshing={refreshing}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative overflow-hidden">
          <AnimatedCrowd participants={participants} />
        </div>

        <aside className="hidden lg:flex w-80 xl:w-96 border-l border-white/[0.06] bg-[#0B0D14] flex-col shrink-0">
          <div className="flex items-center gap-1 p-2 border-b border-white/[0.06]">
            <TabButton active={rightTab === "stats"} onClick={() => setRightTab("stats")} icon={BarChart3} label="Statistics" />
            <TabButton active={rightTab === "activity"} onClick={() => setRightTab("activity")} icon={Activity} label="Activity" badge={activity.length} />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {rightTab === "stats" ? (
              <>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-2">Live Statistics</h3>
                  <LiveStatsPanel stats={stats} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">Recent Activity</h3>
                    <button onClick={() => setRightTab("activity")} className="text-[10px] font-semibold text-[#EC4899] hover:text-[#DB2777]">View all</button>
                  </div>
                  <ActivityFeed events={activity} limit={4} />
                </div>
              </>
            ) : (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-2">Live Activity Feed</h3>
                <ActivityFeed events={activity} limit={20} />
              </div>
            )}
          </div>
        </aside>
      </div>

      <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setDrawerOpen(true)} className="lg:hidden fixed bottom-5 right-5 z-40 h-12 px-4 rounded-full bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-bold text-white shadow-2xl shadow-[#EC4899]/30 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Participants
        <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{stats.studentsJoined}</span>
      </motion.button>

      <ParticipantsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} participants={participants} />
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, badge }: { active: boolean; onClick: () => void; icon: ComponentType<SVGProps<SVGSVGElement>>; label: string; badge?: number }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${active ? "bg-[#EC4899]/15 text-white border border-[#EC4899]/25" : "text-[#9CA3Af] hover:text-white hover:bg-white/[0.04] border border-transparent"}`}>
      <Icon className={`w-3.5 h-3.5 ${active ? "text-[#EC4899]" : "text-[#71717A]"}`} />
      {label}
      {badge !== undefined && badge > 0 && <span className="px-1.5 py-0.5 rounded-full bg-[#EC4899]/15 text-[9px] font-bold text-[#EC4899]">{badge}</span>}
    </button>
  );
}

export default LiveAssessmentRoom;
