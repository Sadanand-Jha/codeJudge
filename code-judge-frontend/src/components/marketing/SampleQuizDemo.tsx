"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/helpers";
import { Timer } from "lucide-react";

export interface SampleQuizQuestion {
  q: string;
  o: string[];
  a: number;
}

export interface SampleQuizSet {
  subject: string;
  questions: SampleQuizQuestion[];
}

const SAMPLE_QUESTIONS: SampleQuizQuestion[] = [
  {
    q: "Which gas do plants take in for photosynthesis?",
    o: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    a: 1,
  },
  {
    q: "What is the SI unit of force?",
    o: ["Joule", "Watt", "Newton", "Pascal"],
    a: 2,
  },
  {
    q: "Who chaired the drafting committee of the Indian Constitution?",
    o: ["Jawaharlal Nehru", "Sardar Patel", "Rajendra Prasad", "Dr. B. R. Ambedkar"],
    a: 3,
  },
];

interface SampleQuizDemoProps {
  sets?: SampleQuizSet[];
  questions?: SampleQuizQuestion[];
  label?: string;
  timerSeconds?: number;
}

const ROTATE_MS = 6000;

export default function SampleQuizDemo({
  sets,
  questions = SAMPLE_QUESTIONS,
  label = "Sample quiz",
  timerSeconds,
}: SampleQuizDemoProps) {
  const quizSets = useMemo<SampleQuizSet[]>(
    () => (sets && sets.length > 0 ? sets : [{ subject: "", questions }]),
    [sets, questions]
  );

  const [setIndex, setSetIndex] = useState(0);
  const [index, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [remaining, setRemaining] = useState(timerSeconds ?? 0);

  const activeSet = quizSets[setIndex % quizSets.length];
  const activeQuestions = activeSet.questions;
  const finished = index >= activeQuestions.length;
  const question = activeQuestions[index];
  const canRotate = quizSets.length > 1 && !paused && !answered && !finished;

  useEffect(() => {
    if (!timerSeconds || paused || picked !== null || finished) return;
    const timeout = window.setTimeout(() => {
      if (remaining <= 1) {
        setQuestionIndex((current) => current + 1);
        setPicked(null);
        setAnswered(false);
        setRemaining(timerSeconds);
      } else {
        setRemaining(remaining - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [remaining, timerSeconds, paused, picked, finished]);

  useEffect(() => {
    if (!canRotate) return;
    const timer = window.setInterval(() => {
      setSetIndex((current) => (current + 1) % quizSets.length);
      setQuestionIndex(0);
      setScore(0);
      setPicked(null);
      setAnswered(false);
      setRemaining(timerSeconds ?? 0);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [canRotate, quizSets.length, timerSeconds]);

  const pick = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    setAnswered(true);
    if (option === question.a) setScore((current) => current + 1);
  };

  const next = () => {
    setQuestionIndex((current) => current + 1);
    setPicked(null);
    setAnswered(false);
    setRemaining(timerSeconds ?? 0);
  };

  const restart = () => {
    if (quizSets.length > 1) {
      setSetIndex((current) => (current + 1) % quizSets.length);
    }
    setQuestionIndex(0);
    setScore(0);
    setPicked(null);
    setAnswered(false);
    setRemaining(timerSeconds ?? 0);
  };

  const displayLabel = activeSet.subject ? `${label} · ${activeSet.subject}` : label;

  return (
    <div
      className="qs-shadow"
      aria-label="Try a sample quiz"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="qs-card">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${setIndex}-${index}-${finished ? "done" : "play"}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {finished ? (
              <div className="px-1 py-3 text-center">
                <p className="qs-display text-[64px] leading-none text-[var(--qs-brand)]">
                  {score}/{activeQuestions.length}
                </p>
                <p className="mx-auto mt-2.5 max-w-xs text-[15px] text-[var(--qs-muted)]">
                  That&rsquo;s the player experience. Your own quiz works the same way.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <Link href="/creator/quizzes/create" className="qs-btn px-5 py-3 text-[15px]">
                    Create a quiz
                  </Link>
                  <button type="button" className="qs-btn qs-btn-ghost px-5 py-3 text-[15px]" onClick={restart}>
                    {quizSets.length > 1 ? "Try another subject" : "Try again"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="qs-meta">
                  <span>{displayLabel}</span>
                  <span>
                    Question {index + 1} of {activeQuestions.length}
                  </span>
                  {timerSeconds ? (
                    <span className="qs-timer" aria-live="off">
                      <Timer size={14} aria-hidden />
                      {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                      {String(remaining % 60).padStart(2, "0")}
                    </span>
                  ) : null}
                </div>
                <div className="qs-bar mb-5">
                  <b style={{ width: `${((index + 1) / activeQuestions.length) * 100}%` }} />
                </div>
                <h3 className="text-[25px] leading-[1.15]">{question.q}</h3>
                <div className="mt-4 grid gap-2.5">
                  {question.o.map((option, optionIndex) => {
                    const isAnswer = optionIndex === question.a;
                    const isPicked = optionIndex === picked;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={cn(
                          "qs-opt",
                          picked !== null && isAnswer && "qs-opt-ok",
                          picked !== null && isPicked && !isAnswer && "qs-opt-bad"
                        )}
                        disabled={picked !== null}
                        onClick={() => pick(optionIndex)}
                      >
                        <span className="min-w-0 text-left">{option}</span>
                        {picked !== null && isAnswer && <span className="shrink-0">Correct</span>}
                        {picked !== null && isPicked && !isAnswer && <span className="shrink-0">Not quite</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex min-h-[46px] items-center justify-between gap-3 text-[15px] text-[var(--qs-muted)]" aria-live="polite">
                  {picked === null ? (
                    <span>Pick an answer</span>
                  ) : (
                    <>
                      <span>{picked === question.a ? "Nice, that\u2019s right." : "The answer is highlighted."}</span>
                      <button type="button" className="qs-btn px-[18px] py-[11px] text-[15px]" onClick={next}>
                        {index === activeQuestions.length - 1 ? "See score" : "Next question"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
