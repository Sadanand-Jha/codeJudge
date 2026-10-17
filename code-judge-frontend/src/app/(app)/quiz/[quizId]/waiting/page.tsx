"use client";

import { notFound, useParams } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Clock,
  FileText,
  Award,
  ListChecks,
  Music,
  MessageSquare,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CountdownCard } from "@/components/quiz/live/CountdownCard";
import { AnimatedCrowd } from "@/components/quiz/live/AnimatedCrowd";
import { ParticipantsDrawer } from "@/components/quiz/live/ParticipantsDrawer";
import type { LiveParticipant } from "@/types/liveAssessment";
import { WaitingRoomToast } from "@/components/quiz/live/WaitingRoomToast";
import { AvatarHoverPreview } from "@/components/quiz/live/AvatarHoverPreview";
import { WaitingRoomThemeProvider, useWaitingRoomTheme } from "@/context/WaitingRoomThemeContext";
import { useTheme } from "@/context/ThemeContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import QuizPageReady from "@/components/quiz/live/QuizPageReady";
import { QuizLoader } from "@/components/quiz/live/StudentQuizShell";
import { SecureLogo } from "@/components/common/SecureLogo";
import { useToast } from "@/hooks/useToast";
import { useQuizSounds } from "@/hooks/useQuizSounds";
import { useAvatarHover } from "@/hooks/useAvatarHover";
import { getQuizByCode, getQuizCode, type Quiz } from "@/services/quiz";
import { isValidQuizCode } from "@/utils/quizCode";
import dynamic from "next/dynamic";
import { Sun, Moon, Globe } from "lucide-react";
const LiveCampus = dynamic(() => import("@/components/quiz/live/live-campus/LiveCampus"), { ssr: false });

export default function WaitingRoomPage() {
  const params = useParams<{ quizId?: string }>();
  const raw = params?.quizId || "";
  const quizCode = getQuizCode(raw);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuiz() {
      setLoading(true);
      if (!isValidQuizCode(quizCode)) {
        if (!cancelled) setQuiz(null);
        setLoading(false);
        return;
      }
      try {
        const data = await getQuizByCode(quizCode);
        if (!cancelled) setQuiz(data as unknown as Quiz);
      } catch {
        if (!cancelled) setQuiz(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchQuiz();
    return () => { cancelled = true; };
  }, [quizCode]);

  const [started, setStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const latestQuiz = await getQuizByCode(quizCode);
        if (cancelled) return;
        setQuiz(latestQuiz as unknown as Quiz);
        if (String(latestQuiz.status).toLowerCase() === "live") setStarted(true);
      } catch {
        // Keep the last verified state during transient network failures.
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 3000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [quizCode]);

  const [participants] = useState<LiveParticipant[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  const { hovered: hoveredParticipant, show: showHovered, armHide: armHideHover, cancelHide: cancelHideHover, hideNow: hideNowHover } = useAvatarHover();

  if (!quizCode) notFound();

  if (loading) {
    return (
      <div className="qs-ui min-h-screen flex items-center justify-center">
        <QuizLoader />
      </div>
    );
  }

  if (!quiz) {
    notFound();
  }

  return (
    <WaitingRoomThemeProvider>
      <WaitingRoomPageInner
        quizCode={quizCode}
        quiz={quiz}
        started={started}
        participants={participants}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        exitModalOpen={exitModalOpen}
        setExitModalOpen={setExitModalOpen}
        hoveredParticipant={hoveredParticipant}
        showHovered={showHovered}
        armHideHover={armHideHover}
        cancelHideHover={cancelHideHover}
        hideNowHover={hideNowHover}
        router={router}
        toast={toast}
        isDark={isDark}
      />
    </WaitingRoomThemeProvider>
  );
}

function WaitingRoomPageInner({
  quizCode,
  quiz,
  started,
  participants,
  drawerOpen,
  setDrawerOpen,
  exitModalOpen,
  setExitModalOpen,
  hoveredParticipant,
  showHovered,
  armHideHover,
  cancelHideHover,
  hideNowHover,
  router,
  toast,
  isDark,
}: {
  quizCode: string;
  quiz: Quiz;
  started: boolean;
  participants: LiveParticipant[];
  drawerOpen: boolean;
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  exitModalOpen: boolean;
  setExitModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hoveredParticipant: LiveParticipant | null;
  showHovered: (p: LiveParticipant) => void;
  armHideHover: () => void;
  cancelHideHover: () => void;
  hideNowHover: () => void;
  router: ReturnType<typeof useRouter>;
  toast: ReturnType<typeof useToast>;
  isDark: boolean;
}) {
  const { setTheme: setWaitingTheme, setStudentOverride } = useWaitingRoomTheme();
  const { playQuizSound } = useQuizSounds();
  const { setTheme } = useTheme();
  const [viewMode, setViewMode] = useState<"light"|"dark"|"real">(isDark ? "dark" : "light");
  const [clockMs, setClockMs] = useState<number | null>(null);
  // Mobile: static waiting room — no ThemeBackground loops, no party
  // confetti; AnimatedCrowd renders its own static fallback.
  const isMobile = useIsMobile();

  useEffect(() => {
    if (started) {
      playQuizSound("success");
      router.replace(`/quiz/${quizCode}/attempt`);
    }
  }, [quizCode, playQuizSound, router, started]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleViewMode = (m:"light"|"dark"|"real")=>{
    playQuizSound("select");
    setViewMode(m);
    try{ localStorage.setItem(`quizsupport_waiting_view_mode_${quizCode}`, m);}catch{}
    if(m==="light"){ setTheme("light"); setWaitingTheme("ai-cloud"); setStudentOverride(undefined); }
    if(m==="dark"){ setTheme("dark"); setWaitingTheme("deep-space"); setStudentOverride(undefined); }
    // real keeps current theme for LiveCampus isDark — ThemeBackground hidden in real mode
  };

  const remainingTime = useMemo(() => {
    if (!quiz.starttime) return "Soon";
    if (clockMs === null) return "Soon";
    const diff = new Date(quiz.starttime).getTime() - clockMs;
    if (diff <= 0) return "Starting soon";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }, [clockMs, quiz.starttime]);

  const handleStarted = () => {
    if (String(quiz.status).toLowerCase() === "live") {
      router.replace(`/quiz/${quizCode}/attempt`);
    }
  };

  const infoCards = [
    { icon: Users, label: "Students", value: String(participants.length) },
    { icon: Clock, label: "Starts In", value: remainingTime },
    { icon: ListChecks, label: "Questions", value: "—" },
    { icon: FileText, label: "Type", value: "MCQ" },
    { icon: Award, label: "Max Marks", value: quiz.total_marks || "—" },
  ];

  return (
    <div className="qs-ui h-dvh flex flex-col overflow-hidden relative bg-[var(--qs-bg)]">
      {/* Theme Background — hidden in Real World, visible in light/dark.
          Skipped on mobile: static page background instead of 60+ loops. */}
      {viewMode !== "real" && !isMobile && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className={`absolute inset-0 ${viewMode === "light" ? "bg-[linear-gradient(145deg,#fff9ef_0%,#fff3fb_33%,#eef9ff_67%,#f3fff8_100%)]" : "bg-[linear-gradient(145deg,#050510_0%,#111026_48%,#071424_100%)]"}`} />
          {/* DISCONNECTED: {viewMode === "light" && <QuizPartyAtmosphere />} (ice-cream floaters) */}
        </div>
      )}

      {/* Full-screen roaming avatars — always mounted so preload gate shows shimmer, then fade-in together */}
      <div className="fixed inset-0 z-[5] pointer-events-none">
        <AnimatedCrowd
          participants={participants}
          speedMultiplier={2}
          onShow={showHovered}
          onArmHide={armHideHover}
          onHideNow={hideNowHover}
        />
      </div>

      {/* Avatar hover preview */}
      <AvatarHoverPreview
        participant={hoveredParticipant}
        onEnter={cancelHideHover}
        onLeave={armHideHover}
      />

      {/* Custom Waiting Room Toast */}
      <WaitingRoomToast />

      {/* Top Bar */}
      <div className="relative z-[200] flex items-center justify-between gap-2 px-4 py-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-surface)]/80 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            onClick={() => setExitModalOpen(true)}
            className="qs-btn qs-btn-ghost gap-2 px-4 py-2 text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </motion.button>

          <div className="flex items-center gap-2">
            <SecureLogo size={32} variant="mark" rounded={false} />
            <span className="text-sm font-bold text-[var(--qs-ink)]">QuizSupport</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Light / Dark / Real World */}
          <div className="hidden sm:flex items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1">
            <button
              onClick={()=> handleViewMode("light")}
              title="Light mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode==="light" ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"}`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              onClick={()=> handleViewMode("dark")}
              title="Dark mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode==="dark" ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"}`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
            <button
              onClick={()=> handleViewMode("real")}
              title="Real World — Live Campus"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode==="real" ? "bg-[var(--qs-sun)] text-[var(--qs-ink)]" : "text-[var(--qs-muted)] hover:text-[var(--qs-ink)]"}`}
            >
              <Globe className="w-3.5 h-3.5" /> Real World
            </button>
          </div>
          {/* Mobile compact toggle */}
          <div className="flex sm:hidden items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-1">
            <button onClick={()=> handleViewMode("light")} className={`p-1.5 rounded-full ${viewMode==="light" ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "text-[var(--qs-muted)]"}`}><Sun className="w-3.5 h-3.5" /></button>
            <button onClick={()=> handleViewMode("dark")} className={`p-1.5 rounded-full ${viewMode==="dark" ? "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]" : "text-[var(--qs-muted)]"}`}><Moon className="w-3.5 h-3.5" /></button>
            <button onClick={()=> handleViewMode("real")} className={`p-1.5 rounded-full ${viewMode==="real" ? "bg-[var(--qs-sun)] text-[var(--qs-ink)]" : "text-[var(--qs-muted)]"}`}><Globe className="w-3.5 h-3.5" /></button>
          </div>
          {/* Participants Button */}
          <button
            onClick={() => { playQuizSound("navigate"); setDrawerOpen(true); }}
            className="qs-btn qs-btn-ghost gap-2 px-4 py-2 text-sm"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Participants</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--qs-sun)] text-[var(--qs-ink)]">
              {participants.length}
            </span>
          </button>
        </div>
      </div>

      {/* LiveCampus — only mounted in Real World mode, positioned absolutely to fill screen */}
      {viewMode === "real" && (
        <div className="absolute inset-0 z-10 pt-[60px]">
          <LiveCampus quizId={quizCode} quizName={quiz.name} startsIn={remainingTime} totalCapacity={40} />
        </div>
      )}

      {/* Waiting Room UI — hidden in Real World mode */}
      {viewMode !== "real" && (
        <QuizPageReady className="flex min-h-0 flex-1 flex-col" label="Loading waiting room">
      {/* Centered Header */}
      <div className="relative z-20 flex flex-col items-center text-center pt-6 pb-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] mb-3"
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-[var(--qs-brand)]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--qs-brand)]">
            Waiting Room
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="qs-display text-2xl sm:text-3xl font-extrabold mb-1 text-[var(--qs-ink)]"
        >
          {quiz.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-[var(--qs-muted)]"
        >
          Secure assessment • Code: {quiz.code}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-semibold mt-2 text-[var(--qs-brand)]"
        >
          {"Waiting for the teacher to start the quiz..."}
        </motion.p>
      </div>

      {/* Top Info Cards */}
      <div className="relative z-20 px-4 sm:px-6 mb-4">
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {infoCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              whileHover={{ y: -2 }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center border-2 border-[var(--qs-line)] bg-[var(--qs-bg)]"
              >
                <card.icon className="w-3.5 h-3.5 text-[var(--qs-brand)]" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[var(--qs-muted)]">{card.label}</p>
                <p className="text-xs font-bold text-[var(--qs-ink)]">{card.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Spacer for classroom area (avatars are now full-screen behind UI) */}
      <div className="relative z-10 flex-1">
        {participants.length === 0 && (
          <div className="w-full h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <Users className="w-10 h-10 mx-auto text-[var(--qs-muted)] mb-3" />
              <p className="text-sm text-[var(--qs-muted)]">Waiting for participants...</p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom Left Quick Actions */}
      <div className="absolute bottom-4 left-4 z-[200] flex items-center gap-2">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
          onClick={() =>
            toast.info({
              title: "Music coming soon",
              description: "Ambient classroom music will be available in a future update.",
            })
          }
          className="qs-btn qs-btn-ghost gap-2 px-4 py-2 text-xs"
        >
          <Music className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Music</span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
          onClick={() =>
            toast.info({
              title: "Chat coming soon",
              description: "In-room chat with classmates will be available in a future update.",
            })
          }
          className="qs-btn qs-btn-ghost gap-2 px-4 py-2 text-xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chat</span>
        </motion.button>
      </div>

      {/* Bottom Right Summary Card */}
      <div className="absolute bottom-4 right-4 z-[200] hidden sm:block">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-4 py-3 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-[0_6px_0_rgba(26,18,64,0.08)]"
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-extrabold text-[var(--qs-ink)]">{participants.length}</p>
              <p className="text-[9px] uppercase tracking-wider text-[var(--qs-muted)]">Joined</p>
            </div>
            <div className="w-px h-8 bg-[var(--qs-line)]" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-[var(--qs-brand)]">15-20</p>
              <p className="text-[9px] uppercase tracking-wider text-[var(--qs-muted)]">Visible</p>
            </div>
            <div className="w-px h-8 bg-[var(--qs-line)]" />
            <div className="text-center">
              <p className="text-lg font-extrabold text-amber-500">Soon</p>
              <p className="text-[9px] uppercase tracking-wider text-[var(--qs-muted)]">Starts</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Center: announcement and countdown */}
      <div className="relative z-[200] flex flex-col items-center gap-3 px-4 pb-4">
        {/* Announcement Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] shadow-[0_6px_0_rgba(26,18,64,0.08)]"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--qs-brand)] flex items-center justify-center text-sm">
            👩‍🏫
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-[var(--qs-ink)]">The teacher will start the quiz soon.</p>
            <p className="text-[10px] text-[var(--qs-muted)]">Get ready and stay here! 🚀</p>
          </div>
        </motion.div>

        {/* Countdown */}
        <CountdownCard targetAt={quiz.starttime ?? undefined} onStarted={handleStarted} />
      </div>
        </QuizPageReady>
      )}

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {exitModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setExitModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="qs-card w-full max-w-md p-6 shadow-[0_8px_0_rgba(26,18,64,0.15)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--qs-sun)]/30 border-2 border-[var(--qs-sun)] flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--qs-ink)]">Leave Waiting Room?</h3>
                  <p className="text-xs text-[var(--qs-muted)]">Leaving will not affect your quiz access</p>
                </div>
              </div>

              <div className="rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--qs-muted)]">Quiz starts in:</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-300">{remainingTime}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-[var(--qs-muted)]">Quiz access:</span>
                  <span className="text-sm font-bold text-[var(--qs-ok)]">Ready when it starts</span>
                </div>
              </div>

              <p className="text-sm text-[var(--qs-muted)] mb-4">
                You can come back anytime before the quiz starts. The teacher will start the quiz soon!
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExitModalOpen(false)}
                  className="qs-btn qs-btn-ghost flex-1 h-10 py-0 text-sm"
                >
                  Stay Here
                </button>
                <button
                  onClick={() => {
                    setExitModalOpen(false);
                    router.push(`/quiz`);
                  }}
                  className="qs-btn flex-1 h-10 py-0 text-sm"
                >
                  Leave Room
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participants Drawer */}
      <ParticipantsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        participants={participants}
      />
    </div>
  );
}
