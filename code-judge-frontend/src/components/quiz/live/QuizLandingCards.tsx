"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { JoinQuizModal } from "./JoinQuizModal";
import { QuizWarpExperience } from "./QuizWarpExperience";
import PreviousQuizzesSection from "./PreviousQuizzesSection";
import { getQuizByCode } from "@/services/quiz";

/** Maximum loading screen duration in ms. */
const MAX_LOADING_MS = 4000;

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
      {/* Decorative glow */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-gradient-to-br ${gradient} opacity-[0.08] blur-3xl rounded-full`} />
      <div className="relative flex flex-col items-center text-center p-6 sm:p-8 h-full">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <motion.div
            className={`mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} shadow-lg`}
            whileHover={{ scale: 1.08, rotate: 3 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <span className="text-4xl">{icon}</span>
          </motion.div>
          <h3 className="text-2xl font-bold text-text-primary mb-2">{title}</h3>
          <p className="text-sm text-text-secondary flex-1 max-w-xs leading-relaxed">{description}</p>
        </div>
        <motion.span
          className={`mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r ${gradient} text-xs font-bold text-white shadow-lg`}
          whileHover={{ scale: 1.04 }}
        >
          {href ? "Open" : "Get Started"}
        </motion.span>
      </div>
    </>
  );

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-card p-[1px] cursor-pointer h-full min-h-[280px]"
      onClick={onClick}
    >
      {content}
    </motion.div>
  );
}

export function QuizLandingCards() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [connectingCode, setConnectingCode] = useState<string | null>(null);
  const [forceComplete, setForceComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleJoin = (code: string) => {
    setJoinOpen(false);
    setConnectingCode(code);
    setForceComplete(false);

    const startTime = Date.now();

    // Start the API call to validate/fetch the quiz by code
    getQuizByCode(code)
      .then(() => {
        const elapsed = Date.now() - startTime;
        // If the API responded before the 4s cap, complete the loading early
        if (elapsed < MAX_LOADING_MS) {
          setForceComplete(true);
        }
        // If elapsed >= MAX_LOADING_MS, the timeout already triggered forceComplete
      })
      .catch(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < MAX_LOADING_MS) {
          setForceComplete(true);
        }
        // The target page will handle the error (e.g. "quiz not found")
      });

    // Cap the loading screen at 4 seconds regardless of API response time
    timeoutRef.current = setTimeout(() => {
      setForceComplete(true);
    }, MAX_LOADING_MS);
  };

  const handleConnectingComplete = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setConnectingCode(null);
    setForceComplete(false);
  }, []);

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div id="join-quiz" className="h-full">
          <LandingCard
            icon="🎓"
            title="Join Quiz"
            description="Enter the code shared by your teacher to join a live assessment."
            gradient="from-[#EC4899] to-[#BE185D]"
            onClick={() => setJoinOpen(true)}
          />
        </div>
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

      <PreviousQuizzesSection />

      <JoinQuizModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoin={handleJoin}
      />

      {connectingCode && (
        <QuizWarpExperience
          code={connectingCode}
          onComplete={handleConnectingComplete}
          duration={MAX_LOADING_MS}
          forceComplete={forceComplete}
        />
      )}
    </>
  );
}

export default QuizLandingCards;