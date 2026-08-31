"use client";

import { notFound, useParams } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Clock,
  FileText,
  Award,
  ListChecks,
  Music,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CountdownCard } from "@/components/quiz/live/CountdownCard";
import { AnimatedCrowd } from "@/components/quiz/live/AnimatedCrowd";
import { ParticipantsDrawer } from "@/components/quiz/live/ParticipantsDrawer";
import type { LiveParticipant } from "@/types/liveAssessment";
import { ThemeBackground } from "@/components/quiz/live/ThemeBackground";
import { WaitingRoomToast } from "@/components/quiz/live/WaitingRoomToast";
import { AvatarHoverPreview } from "@/components/quiz/live/AvatarHoverPreview";
import { WaitingRoomThemeProvider, useWaitingRoomTheme } from "@/context/WaitingRoomThemeContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/hooks/useToast";
import { useAvatarHover } from "@/hooks/useAvatarHover";
import { getQuizCode, quizCodePath, type Quiz } from "@/services/quiz";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { useQuizRegistrationStore } from "@/store/quizRegistrationStore";
import dynamic from "next/dynamic";
import { Sun, Moon, Globe } from "lucide-react";
const LiveCampus = dynamic(() => import("@/components/quiz/live/live-campus/LiveCampus"), { ssr: false });

function useRealtimeStartFlag(code: string, startedRef: { current: boolean }) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    const key = `${STORAGE_KEYS.LIVE_QUIZ_STARTED_PREFIX}${code}`;
    const t = setInterval(() => {
      try {
        const v = window.localStorage.getItem(key);
        if (v && !startedRef.current) {
          startedRef.current = true;
          setStarted(true);
        }
      } catch {}
    }, 700);
    return () => clearInterval(t);
  }, [code, startedRef]);

  return started;
}

export default function WaitingRoomPage() {
  const params = useParams<{ quizId?: string }>();
  const raw = params?.quizId || "";
  const quizCode = getQuizCode(raw);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isRegistered, getRegistration } = useQuizRegistrationStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchQuiz() {
      setLoading(true);
      // Skip backend — use mock data directly
      if (!cancelled) {
        setQuiz({
          id: 0,
          code: quizCode,
          name: `Quiz ${quizCode}`,
          description: "Waiting for quiz to start.",
          subject: "General",
          difficulty: "Medium",
          duration: 30,
          total_marks: 100,
          total_questions: 10,
          status: "live",
          starttime: null,
          endtime: null,
          negative_marking: false,
          shuffle_questions: false,
          shuffle_options: false,
          show_results_immediately: false,
          leaderboard: true,
          visibility: "private",
          creator_name: "Quiz Creator",
          created_at: new Date().toISOString(),
          registration_required: false,
        } as unknown as Quiz);
      }
      setLoading(false);
    }
    fetchQuiz();
    return () => { cancelled = true; };
  }, [quizCode]);

  const registration = getRegistration(quizCode);
  const registered = isRegistered(quizCode);

  const startedRef = useMemo(() => ({ current: false as boolean }), []);
  const started = useRealtimeStartFlag(quizCode, startedRef);

  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  const { hovered: hoveredParticipant, show: showHovered, armHide: armHideHover, cancelHide: cancelHideHover, hideNow: hideNowHover } = useAvatarHover();

  if (!quizCode) notFound();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-ai-accent border-t-transparent" />
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
        setParticipants={setParticipants}
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
        registered={registered}
        registration={registration}
      />
    </WaitingRoomThemeProvider>
  );
}

function WaitingRoomPageInner({
  quizCode,
  quiz,
  started,
  participants,
  setParticipants,
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
  registered,
  registration,
}: {
  quizCode: string;
  quiz: Quiz;
  started: boolean;
  participants: LiveParticipant[];
  setParticipants: React.Dispatch<React.SetStateAction<LiveParticipant[]>>;
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
  registered: boolean;
  registration: { studentName?: string; rollNumber?: string } | null;
}) {
  const { activeConfig, setTheme: setWaitingTheme, setStudentOverride } = useWaitingRoomTheme();
  const textPrimary = activeConfig.textPrimary;
  const textSecondary = activeConfig.textSecondary;
  const { setTheme } = useTheme();
  const [viewMode, setViewMode] = useState<"light"|"dark"|"real">("light");

  useEffect(()=>{
    try{
      const key = `byteclash_waiting_view_mode_${quizCode}`;
      const saved = localStorage.getItem(key) as "light"|"dark"|"real"|null;
      if(saved==="light"|| saved==="dark"|| saved==="real"){
        setViewMode(saved);
        if(saved==="light"){ setTheme("light"); setWaitingTheme("ai-cloud"); setStudentOverride(undefined); }
        if(saved==="dark"){ setTheme("dark"); setWaitingTheme("deep-space"); setStudentOverride(undefined); }
        return;
      }
      setViewMode(isDark ? "dark" : "light");
    }catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[quizCode]);

  const handleViewMode = (m:"light"|"dark"|"real")=>{
    setViewMode(m);
    try{ localStorage.setItem(`byteclash_waiting_view_mode_${quizCode}`, m);}catch{}
    if(m==="light"){ setTheme("light"); setWaitingTheme("ai-cloud"); setStudentOverride(undefined); }
    if(m==="dark"){ setTheme("dark"); setWaitingTheme("deep-space"); setStudentOverride(undefined); }
    // real keeps current theme for LiveCampus isDark — ThemeBackground hidden in real mode
  };

  const remainingTime = useMemo(() => {
    if (!quiz.starttime) return "Soon";
    const diff = new Date(quiz.starttime).getTime() - Date.now();
    if (diff <= 0) return "Starting soon";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }, [quiz.starttime]);

  useEffect(() => {
    if (started) return;
    // Simulate participants joining (in production, this would come from real-time updates)
    const interval = setInterval(() => {
      setParticipants((prev) => {
        const next = [...prev, { 
          id: Date.now().toString(), 
          username: `Student ${Math.floor(Math.random() * 1000)}`,
          avatar: "👤",
          status: "idle" as const,
          progress: 0,
          questionsAnswered: 0,
          totalQuestions: 0,
          currentQuestion: 0,
          timeSpent: 0,
          connection: "excellent" as const,
          joinedAt: new Date().toISOString(),
          positionSeed: Math.random(),
        }];
        return next.slice(-40);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [started]);

  const handleStarted = () => {
    try {
      window.location.href = `/quiz/${quizCode}/attempt`;
    } catch {}
  };

  const infoCards = [
    { icon: Users, label: "Students", value: participants.length, color: "#EC4899" },
    { icon: Clock, label: "Starts In", value: remainingTime, color: "#F59E0B" },
    { icon: ListChecks, label: "Questions", value: "—", color: "#3B82F6" },
    { icon: FileText, label: "Type", value: "MCQ", color: "#22C55E" },
    { icon: Award, label: "Max Marks", value: quiz.total_marks || "—", color: "#A855F7" },
  ];

  return (
    <div className={`waiting-page h-screen flex flex-col overflow-hidden relative transition-all duration-350 ${
      isDark ? 'bg-[#050510]' : 'bg-[#FAFBFF]'
    }`}>
      {/* Theme Background — hidden in Real World, visible in light/dark */}
      {viewMode !== "real" && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <ThemeBackground />
        </div>
      )}

      {/* Full-screen roaming avatars - behind all UI */}
      <div className="fixed inset-0 z-[5] pointer-events-none">
        {participants.length > 0 && (
          <AnimatedCrowd
            participants={participants}
            onShow={showHovered}
            onArmHide={armHideHover}
            onHideNow={hideNowHover}
          />
        )}
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
      <div className={`relative z-[200] flex items-center justify-between px-4 sm:px-6 py-3 transition-all duration-350 ${
        isDark ? 'border-b border-border' : 'border-b border-black/[0.06]'
      }`}>
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            onClick={() => setExitModalOpen(true)}
            className={`nav-btn flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border transition-all duration-250 ${
              isDark
                ? 'bg-white/[0.05] border-border-hover text-muted-foreground hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'bg-black/[0.03] border-black/[0.12] text-[#5a5a7a] hover:text-[#1a1a2e] hover:border-[#8B5CF6]/40 hover:bg-black/[0.06] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </motion.button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className={`text-sm font-bold transition-colors duration-350 ${isDark ? 'text-white' : 'text-[#1a1a2e]'}`}>ByteClash</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle: Light / Dark / Real World */}
          <div className={`hidden sm:flex items-center rounded-full border p-1 backdrop-blur-xl ${isDark ? "bg-white/[0.05] border-white/10" : "bg-black/[0.04] border-black/10"}`}>
            <button
              onClick={()=> handleViewMode("light")}
              title="Light mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode==="light" ? "bg-white text-[#1a1a2e] shadow-sm border border-black/10" : isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"}`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              onClick={()=> handleViewMode("dark")}
              title="Dark mode"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode==="dark" ? "bg-[#111217] text-white shadow border border-white/10" : isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"}`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
            <button
              onClick={()=> handleViewMode("real")}
              title="Real World — Live Campus"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode==="real" ? "bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white shadow" : isDark ? "text-white/60 hover:text-white" : "text-black/60 hover:text-black"}`}
            >
              <Globe className="w-3.5 h-3.5" /> Real World
            </button>
          </div>
          {/* Mobile compact toggle */}
          <div className={`flex sm:hidden items-center rounded-full border p-1 backdrop-blur-xl ${isDark ? "bg-white/[0.05] border-white/10" : "bg-black/[0.04] border-black/10"}`}>
            <button onClick={()=> handleViewMode("light")} className={`p-1.5 rounded-full ${viewMode==="light" ? "bg-white text-[#1a1a2e] shadow" : isDark ? "text-white/60" : "text-black/60"}`}><Sun className="w-3.5 h-3.5" /></button>
            <button onClick={()=> handleViewMode("dark")} className={`p-1.5 rounded-full ${viewMode==="dark" ? "bg-[#111217] text-white shadow" : isDark ? "text-white/60" : "text-black/60"}`}><Moon className="w-3.5 h-3.5" /></button>
            <button onClick={()=> handleViewMode("real")} className={`p-1.5 rounded-full ${viewMode==="real" ? "bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white shadow" : isDark ? "text-white/60" : "text-black/60"}`}><Globe className="w-3.5 h-3.5" /></button>
          </div>
          {/* Participants Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`nav-btn flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border transition-all duration-250 ${
              isDark
                ? 'bg-white/[0.05] border-border-hover text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                : 'bg-black/[0.03] border-black/[0.12] text-[#1a1a2e] hover:border-[#8B5CF6]/40 hover:bg-black/[0.06] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Participants</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-[0_0_12px_rgba(236,72,153,0.3)] ${
              isDark ? 'bg-gradient-to-r from-[#A855F7] to-[#EC4899]' : 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]'
            }`}>
              {participants.length}
            </span>
          </button>
        </div>
      </div>

      {/* Top-down is present everywhere: LiveCampus is always mounted behind, mechanics 0 when disabled still shows world */}
      <div className="relative z-20 flex-1 min-h-0">
        <LiveCampus quizId={quizCode} quizName={quiz.name} startsIn={remainingTime} totalCapacity={40} />
      </div>
      {viewMode!=="real" && (
        <>
      {/* Centered Header (overlay on top of LiveCampus when not in real mode) */}
      <div className="relative z-20 flex flex-col items-center text-center pt-6 pb-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-3 transition-all duration-350 ${
            isDark
              ? 'bg-[#EC4899]/10 border-[#EC4899]/20'
              : 'bg-[#EC4899]/10 border-[#EC4899]/25'
          }`}
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-[#EC4899]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-350 ${
            isDark ? 'text-[#EC4899]' : 'text-[#EC4899]'
          }`}>
            Waiting Room
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="waiting-header-title text-2xl sm:text-3xl font-bold mb-1 transition-all duration-350"
          style={{ color: textPrimary }}
        >
          {quiz.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="waiting-header-sub text-sm transition-all duration-350"
          style={{ color: textSecondary }}
        >
          by {quiz.creator_name || "Unknown"} • Quiz Code: {quiz.code}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`waiting-header-hint text-xs mt-2 transition-all duration-350 ${
            isDark ? 'text-[#FBBF24]' : 'text-[#F59E0B]'
          }`}
        >
          {registered ? `Registered as ${registration?.studentName} (${registration?.rollNumber})` : "Waiting for the teacher to start the quiz..."}
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
              className={`waiting-stat-card flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border transition-all duration-350 ${
                isDark
                  ? 'bg-gray-900/70 border-purple-500/30 hover:border-purple-400/50 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                  : 'bg-white/70 border-gray-200/50 hover:border-gray-300/80 shadow-md'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: isDark ? `${card.color}25` : `${card.color}15`,
                  border: `1px solid ${card.color}40`,
                  boxShadow: isDark ? `0 0 10px ${card.color}30` : 'none'
                }}
              >
                <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="waiting-stat-label text-[9px] uppercase tracking-wider transition-colors duration-350"
                  style={{ color: textSecondary }}>{card.label}</p>
                <p className="waiting-stat-value text-xs font-bold transition-colors duration-350"
                  style={{ color: textPrimary }}>{card.value}</p>
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
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Waiting for participants...</p>
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
          className={`nav-btn flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border transition-all duration-250 ${
            isDark
              ? 'bg-white/[0.05] border-border-hover text-muted-foreground hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
              : 'bg-black/[0.03] border-black/[0.12] text-[#5a5a7a] hover:text-[#1a1a2e] hover:border-[#8B5CF6]/40 hover:bg-black/[0.06] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Music</span>
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
          className={`nav-btn flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border transition-all duration-250 ${
            isDark
              ? 'bg-white/[0.05] border-border-hover text-muted-foreground hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
              : 'bg-black/[0.03] border-black/[0.12] text-[#5a5a7a] hover:text-[#1a1a2e] hover:border-[#8B5CF6]/40 hover:bg-black/[0.06] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </motion.button>
      </div>

      {/* Bottom Right Summary Card */}
      <div className="absolute bottom-4 right-4 z-[200]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`waiting-summary-card px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-xl transition-all duration-350 ${
            isDark
              ? 'bg-[#111217]/80 border-border-hover shadow-black/40'
              : 'bg-white/80 border-black/[0.08] shadow-black/10'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={`waiting-summary-value text-lg font-bold transition-colors duration-350 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>{participants.length}</p>
              <p className={`waiting-summary-muted text-[9px] uppercase tracking-wider transition-colors duration-350 ${
                isDark ? 'text-muted-foreground' : 'text-[#9ca3af]'
              }`}>Joined</p>
            </div>
            <div className={`waiting-summary-divider w-px h-8 transition-colors duration-350 ${
              isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'
            }`} />
            <div className="text-center">
              <p className="waiting-summary-accent text-lg font-bold text-[#EC4899]">15-20</p>
              <p className={`waiting-summary-muted text-[9px] uppercase tracking-wider transition-colors duration-350 ${
                isDark ? 'text-muted-foreground' : 'text-[#9ca3af]'
              }`}>Visible</p>
            </div>
            <div className={`waiting-summary-divider w-px h-8 transition-colors duration-350 ${
              isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'
            }`} />
            <div className="text-center">
              <p className="waiting-summary-warning text-lg font-bold text-[#F59E0B]">Soon</p>
              <p className={`waiting-summary-muted text-[9px] uppercase tracking-wider transition-colors duration-350 ${
                isDark ? 'text-muted-foreground' : 'text-[#9ca3af]'
              }`}>Starts</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Center: Announcement + Register/Registered + Countdown */}
      <div className="relative z-[200] flex flex-col items-center gap-3 px-4 pb-4">
        {/* Announcement Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="waiting-announcement flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#111217]/80 backdrop-blur-xl border border-[#EC4899]/20 shadow-xl"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center text-sm">
            👩‍🏫
          </div>
          <div>
            <p className="waiting-announcement-text text-xs font-medium text-white">The teacher will start the quiz soon.</p>
            <p className="waiting-announcement-sub text-[10px] text-muted-foreground">Get ready and stay here! 🚀</p>
          </div>
        </motion.div>

        {registered ? (
          <button
            className="inline-flex items-center gap-2 px-6 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-sm font-bold text-[#22C55E] hover:bg-[#22C55E]/20 transition-all"
            disabled
          >
            <Check className="w-4 h-4" />
            Registered
          </button>
        ) : (
          <Link
            href={quizCodePath(quizCode, "register")}
            className="inline-flex items-center gap-2 px-6 h-10 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-bold text-white hover:shadow-[0_0_24px_rgba(236,72,153,0.3)] transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Register for Quiz
          </Link>
        )}

        {/* Countdown */}
        <CountdownCard targetAt={quiz.starttime ?? undefined} onStarted={handleStarted} />
      </div>
        </>
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
              className="waiting-exit-modal w-full max-w-md rounded-2xl border border-[#EC4899]/20 bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="waiting-exit-modal-title text-lg font-semibold text-white">Leave Waiting Room?</h3>
                  <p className="waiting-exit-modal-sub text-xs text-muted-foreground">You won't be unregistered from the quiz</p>
                </div>
              </div>

              <div className="waiting-exit-modal-body rounded-xl border border-border bg-[#0B0D12] p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="waiting-exit-modal-label text-sm text-muted-foreground">Quiz starts in:</span>
                  <span className="waiting-exit-value text-sm font-bold text-[#F59E0B]">{remainingTime}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="waiting-exit-modal-label text-sm text-muted-foreground">Your registration:</span>
                  <span className="waiting-exit-value text-sm font-bold text-[#22C55E]">Will be saved</span>
                </div>
              </div>

              <p className="waiting-exit-modal-sub text-sm text-muted-foreground mb-4">
                You can come back anytime before the quiz starts. The teacher will start the quiz soon!
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExitModalOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-border-hover bg-white/[0.04] text-sm font-medium text-white hover:border-border-hover transition-colors"
                >
                  Stay Here
                </button>
                <button
                  onClick={() => {
                    setExitModalOpen(false);
                    router.push(`/quiz`);
                  }}
                  className="flex-1 h-10 rounded-xl bg-[#EC4899] text-sm font-bold text-white hover:shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
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