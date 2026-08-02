"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { JoinQuizModal } from "./JoinQuizModal";
import { QuizWarpExperience } from "./QuizWarpExperience";

/** Mock: in a real app the entered code resolves to a real quizId. */
const MOCK_ACTIVE_QUIZ_ID = "quiz_002";

interface LandingCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  onClick?: () => void;
  href?: string;
}

function LandingCard({ icon, title, description, gradient, onClick, href }: LandingCardProps) {
  const content = (
    <>
      <div
        className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-r ${gradient} opacity-10 blur`}
      />
      <div className="relative flex flex-col items-center text-center p-1">
        <div className="text-4xl mb-2">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
        <p className="text-sm text-[#A1A1AA] flex-1">{description}</p>
        <motion.span
          className={`mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r ${gradient} text-xs font-bold text-white`}
          whileHover={{ scale: 1.04 }}
        >
          {href ? "Open" : "Get Started"}
        </motion.span>
      </div>
    </>
  );

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#171923] to-[#111217] p-[1px] cursor-pointer h-full"
      onClick={onClick}
    >
      {content}
    </motion.div>
  );
}

export function QuizLandingCards() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [connectingCode, setConnectingCode] = useState<string | null>(null);
  const router = useRouter();

  const handleJoin = (code: string) => {
    setJoinOpen(false);
    setConnectingCode(code);
  };

  const handleConnectingComplete = () => {
    setConnectingCode(null);
  };

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <LandingCard
          icon="🎓"
          title="Join Quiz"
          description="Enter the code shared by your teacher to join a live assessment."
          gradient="from-[#EC4899] to-[#BE185D]"
          onClick={() => setJoinOpen(true)}
        />
        <Link href="/quiz/create" className="block h-full">
          <LandingCard
            icon="✨"
            title="Create Quiz"
            description="Design a new assessment, add questions, set timing and publish."
            gradient="from-[#8B5CF6] to-[#A855F7]"
            href="/quiz/create"
          />
        </Link>
      </section>

      <JoinQuizModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoin={handleJoin}
      />

      {connectingCode && (
        <QuizWarpExperience
          code={connectingCode}
          onComplete={handleConnectingComplete}
        />
      )}
    </>
  );
}

export default QuizLandingCards;
