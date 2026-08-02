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
import { MagicalBackground } from "@/components/quiz/live/MagicalBackground";
import { WaitingRoomToast } from "@/components/quiz/live/WaitingRoomToast";
import { mockLiveAssessmentRoom, mockEmptyLiveAssessmentRoom } from "@/mocks/liveAssessment";
import { useToast } from "@/hooks/useToast";

function useRealtimeStartFlag(quizId: string, startedRef: { current: boolean }) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    const key = `live_quiz_started_${quizId}`;
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
  }, [quizId, startedRef]);

  return started;
}

export default function WaitingRoomPage() {
  const params = useParams<{ quizId?: string }>();
  const quizId = params?.quizId || "";
  const router = useRouter();
  const toast = useToast();

  if (!quizId) notFound();

  const room = quizId === mockEmptyLiveAssessmentRoom.quizId
    ? mockEmptyLiveAssessmentRoom
    : mockLiveAssessmentRoom;

  const startedRef = useMemo(() => ({ current: false as boolean }), []);
  const started = useRealtimeStartFlag(quizId, startedRef);

  const [participants, setParticipants] = useState(room.participants);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  // Calculate remaining time
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
      window.location.href = `/quiz/${quizId}/attempt`;
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
    <div className="h-screen bg-[#09090B] flex flex-col overflow-hidden relative">
      {/* Magical Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <MagicalBackground />
      </div>

      {/* Full-screen roaming avatars - behind all UI */}
      <div className="fixed inset-0 z-[5] pointer-events-none">
        {participants.length > 0 && <AnimatedCrowd participants={participants} />}
      </div>

      {/* Custom Waiting Room Toast */}
      <WaitingRoomToast />

      {/* Top Bar */}
      <div className="relative z-[200] flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setExitModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111217]/80 backdrop-blur-xl border border-white/[0.08] text-xs font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </motion.button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">ByteClash</span>
          </div>
        </div>

        {/* Participants Button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#111217]/80 backdrop-blur-xl border border-white/[0.08] text-sm font-medium text-white hover:border-[#EC4899]/30 transition-colors"
        >
          <Users className="w-4 h-4 text-[#EC4899]" />
          Participants
          <span className="px-2 py-0.5 rounded-full bg-[#EC4899]/15 text-[10px] font-bold text-[#EC4899]">
            {participants.length}
          </span>
        </button>
      </div>

      {/* Centered Header */}
      <div className="relative z-20 flex flex-col items-center text-center pt-6 pb-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EC4899]/10 border border-[#EC4899]/20 mb-3"
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-[#EC4899]"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[10px] font-bold text-[#EC4899] uppercase tracking-wider">
            Waiting Room
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-3xl font-bold text-white mb-1"
        >
          {room.quizName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-[#9CA3AF]"
        >
          by {room.teacherName} • {room.subject}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-[#F59E0B] mt-2"
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
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111217]/60 backdrop-blur-xl border border-white/[0.06] hover:border-white/[0.12] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}30` }}
              >
                <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-[9px] text-[#71717A] uppercase tracking-wider">{card.label}</p>
                <p className="text-xs font-bold text-white">{card.value}</p>
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
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() =>
            toast.info({
              title: "Music coming soon",
              description: "Ambient classroom music will be available in a future update.",
            })
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111217]/80 backdrop-blur-xl border border-white/[0.08] text-xs font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors"
        >
          <Music className="w-3.5 h-3.5" />
          Music
        </motion.button>
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() =>
            toast.info({
              title: "Chat coming soon",
              description: "In-room chat with classmates will be available in a future update.",
            })
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111217]/80 backdrop-blur-xl border border-white/[0.08] text-xs font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </motion.button>
      </div>

      {/* Bottom Right Summary Card */}
      <div className="absolute bottom-4 right-4 z-[200]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="px-4 py-3 rounded-2xl bg-[#111217]/80 backdrop-blur-xl border border-white/[0.08] shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{room.stats.studentsJoined}</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Joined</p>
            </div>
            <div className="w-px h-8 bg-white/[0.08]" />
            <div className="text-center">
              <p className="text-lg font-bold text-[#EC4899]">15-20</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Visible</p>
            </div>
            <div className="w-px h-8 bg-white/[0.08]" />
            <div className="text-center">
              <p className="text-lg font-bold text-[#F59E0B]">Soon</p>
              <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">Starts</p>
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
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#111217]/80 backdrop-blur-xl border border-[#EC4899]/20 shadow-xl"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center text-sm">
            👩‍🏫
          </div>
          <div>
            <p className="text-xs font-medium text-white">The teacher will start the quiz soon.</p>
            <p className="text-[10px] text-[#9CA3AF]">Get ready and stay here! 🚀</p>
          </div>
        </motion.div>

        {/* Register Button */}
        <Link
          href={`/quiz/${quizId}/register`}
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
              className="w-full max-w-md rounded-2xl border border-[#EC4899]/20 bg-[#111827] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Leave Waiting Room?</h3>
                  <p className="text-xs text-[#9CA3AF]">You won't be unregistered from the quiz</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-[#0B0D12] p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#9CA3AF]">Quiz starts in:</span>
                  <span className="text-sm font-bold text-[#F59E0B]">{remainingTime}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-[#9CA3AF]">Your registration:</span>
                  <span className="text-sm font-bold text-[#22C55E]">Will be saved</span>
                </div>
              </div>

              <p className="text-sm text-[#9CA3AF] mb-4">
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
  );
}
