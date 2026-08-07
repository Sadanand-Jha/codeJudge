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
import { mockLiveAssessmentRoom, mockEmptyLiveAssessmentRoom } from "@/mocks/liveAssessment";
import { useToast } from "@/hooks/useToast";
import { useAvatarHover } from "@/hooks/useAvatarHover";
import { getQuizCode } from "@/services/quiz";
import { STORAGE_KEYS } from "@/utils/storageKeys";

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

  if (!quizCode) notFound();

  const room = quizCode === getQuizCode(mockEmptyLiveAssessmentRoom.quizId)
    ? mockEmptyLiveAssessmentRoom
    : mockLiveAssessmentRoom;

  const startedRef = useMemo(() => ({ current: false as boolean }), []);
  const started = useRealtimeStartFlag(quizCode, startedRef);

  const [participants, setParticipants] = useState(room.participants);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  const { hovered: hoveredParticipant, show: showHovered, armHide: armHideHover, cancelHide: cancelHideHover, hideNow: hideNowHover } = useAvatarHover();

  return (
    <WaitingRoomThemeProvider>
      <WaitingRoomPageInner
        quizCode={quizCode}
        room={room}
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
      />
    </WaitingRoomThemeProvider>
  );
}

function WaitingRoomPageInner({
  quizCode,
  room,
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
}: {
  quizCode: string;
  room: typeof mockLiveAssessmentRoom;
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
}) {
  const { activeConfig } = useWaitingRoomTheme();
  const textPrimary = activeConfig.textPrimary;
  const textSecondary = activeConfig.textSecondary;

  const remainingTime = useMemo(() => {
    if (!room.scheduledStartAt) return "Soon";
    const diff = new Date(room.scheduledStartAt).getTime() - Date.now();
    if (diff <= 0) return "Starting soon";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }, [room.scheduledStartAt]);

  useEffect(() => {
    if (started) return;
    const pool = room.participants;
    if (pool.length === 0) return;
    const interval = setInterval(() => {
      setParticipants((prev) => {
        const next = [...prev, pool[Math.floor(Math.random() * pool.length)]];
        return next.slice(-40);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [started, room.participants]);

  const handleStarted = () => {
    try {
      window.location.href = `/quiz/${quizCode}/attempt`;
    } catch {}
  };

  const infoCards = [
    { icon: Users, label: "Students", value: room.stats.studentsJoined, color: "#EC4899" },
    { icon: Clock, label: "Starts In", value: "Soon", color: "#F59E0B" },
    { icon: ListChecks, label: "Questions", value: 20, color: "#3B82F6" },
    { icon: FileText, label: "Type", value: "MCQ", color: "#22C55E" },
    { icon: Award, label: "Max Marks", value: 100, color: "#A855F7" },
  ];

  return (
    <WaitingRoomThemeProvider>
    <div className={`waiting-page h-screen flex flex-col overflow-hidden relative transition-all duration-350 ${
      isDark ? 'bg-[#050510]' : 'bg-[#FAFBFF]'
    }`}>
      {/* Theme Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ThemeBackground />
      </div>

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
        isDark ? 'border-b border-white/[0.06]' : 'border-b border-black/[0.06]'
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
                ? 'bg-white/[0.05] border-white/[0.12] text-[#9CA3AF] hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
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
          {/* Participants Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`nav-btn flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border transition-all duration-250 ${
              isDark
                ? 'bg-white/[0.05] border-white/[0.12] text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
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

      {/* Centered Header */}
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
          {room.quizName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="waiting-header-sub text-sm transition-all duration-350"
          style={{ color: textSecondary }}
        >
          by {room.teacherName} • {room.subject}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`waiting-header-hint text-xs mt-2 transition-all duration-350 ${
            isDark ? 'text-[#FBBF24]' : 'text-[#F59E0B]'
          }`}
        >
          Waiting for the teacher to start the quiz...
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
              <Users className="w-10 h-10 mx-auto text-[#71717A] mb-3" />
              <p className="text-sm text-[#A1A1AA]">Waiting for participants...</p>
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
              ? 'bg-white/[0.05] border-white/[0.12] text-[#9CA3AF] hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
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
              ? 'bg-white/[0.05] border-white/[0.12] text-[#9CA3AF] hover:text-white hover:border-[#A855F7]/40 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]'
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
              ? 'bg-[#111217]/80 border-white/[0.08] shadow-black/40'
              : 'bg-white/80 border-black/[0.08] shadow-black/10'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={`waiting-summary-value text-lg font-bold transition-colors duration-350 ${
                isDark ? 'text-white' : 'text-[#1a1a2e]'
              }`}>{room.stats.studentsJoined}</p>
              <p className={`waiting-summary-muted text-[9px] uppercase tracking-wider transition-colors duration-350 ${
                isDark ? 'text-[#71717A]' : 'text-[#9ca3af]'
              }`}>Joined</p>
            </div>
            <div className={`waiting-summary-divider w-px h-8 transition-colors duration-350 ${
              isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'
            }`} />
            <div className="text-center">
              <p className="waiting-summary-accent text-lg font-bold text-[#EC4899]">15-20</p>
              <p className={`waiting-summary-muted text-[9px] uppercase tracking-wider transition-colors duration-350 ${
                isDark ? 'text-[#71717A]' : 'text-[#9ca3af]'
              }`}>Visible</p>
            </div>
            <div className={`waiting-summary-divider w-px h-8 transition-colors duration-350 ${
              isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'
            }`} />
            <div className="text-center">
              <p className="waiting-summary-warning text-lg font-bold text-[#F59E0B]">Soon</p>
              <p className={`waiting-summary-muted text-[9px] uppercase tracking-wider transition-colors duration-350 ${
                isDark ? 'text-[#71717A]' : 'text-[#9ca3af]'
              }`}>Starts</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Center: Announcement + Register + Countdown */}
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
            <p className="waiting-announcement-sub text-[10px] text-[#9CA3AF]">Get ready and stay here! 🚀</p>
          </div>
        </motion.div>

        {/* Register Button */}
        <Link
          href={`/quiz/${quizCode}/register`}
          className="inline-flex items-center gap-2 px-6 h-10 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-bold text-white hover:shadow-[0_0_24px_rgba(236,72,153,0.3)] transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Register for Quiz
        </Link>

        {/* Countdown */}
        <CountdownCard targetAt={room.scheduledStartAt} onStarted={handleStarted} />
      </div>

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
              className="waiting-exit-modal w-full max-w-md rounded-2xl border border-[#EC4899]/20 bg-[#111827] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="waiting-exit-modal-title text-lg font-semibold text-white">Leave Waiting Room?</h3>
                  <p className="waiting-exit-modal-sub text-xs text-[#9CA3AF]">You won't be unregistered from the quiz</p>
                </div>
              </div>

              <div className="waiting-exit-modal-body rounded-xl border border-white/[0.06] bg-[#0B0D12] p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="waiting-exit-modal-label text-sm text-[#9CA3AF]">Quiz starts in:</span>
                  <span className="waiting-exit-value text-sm font-bold text-[#F59E0B]">{remainingTime}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="waiting-exit-modal-label text-sm text-[#9CA3AF]">Your registration:</span>
                  <span className="waiting-exit-value text-sm font-bold text-[#22C55E]">Will be saved</span>
                </div>
              </div>

              <p className="waiting-exit-modal-sub text-sm text-[#9CA3AF] mb-4">
                You can come back anytime before the quiz starts. The teacher will start the quiz soon!
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExitModalOpen(false)}
                  className="flex-1 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm font-medium text-white hover:border-white/[0.12] transition-colors"
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
    </WaitingRoomThemeProvider>
  );
}
