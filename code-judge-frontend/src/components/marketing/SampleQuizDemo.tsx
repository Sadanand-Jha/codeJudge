"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/helpers";

export interface SampleQuizQuestion {
  q: string;
  o: string[];
  a: number;
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
  questions?: SampleQuizQuestion[];
  label?: string;
}

export default function SampleQuizDemo({ questions = SAMPLE_QUESTIONS, label = "Sample quiz" }: SampleQuizDemoProps) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const finished = index >= questions.length;
  const question = questions[index];

  const pick = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === question.a) setScore((current) => current + 1);
  };

  const next = () => {
    setIndex((current) => current + 1);
    setPicked(null);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setPicked(null);
  };

  return (
    <div className="qs-shadow" aria-label="Try a sample quiz">
      <div className="qs-card">
        {finished ? (
          <div className="px-1 py-3 text-center">
            <p className="qs-display text-[64px] leading-none text-[var(--qs-brand)]">
              {score}/{questions.length}
            </p>
            <p className="mx-auto mt-2.5 max-w-xs text-[15px] text-[var(--qs-muted)]">
              That&rsquo;s the player experience. Your own quiz works the same way.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <Link href="/creator/quizzes/create" className="qs-btn px-5 py-3 text-[15px]">
                Create a quiz
              </Link>
              <button type="button" className="qs-btn qs-btn-ghost px-5 py-3 text-[15px]" onClick={restart}>
                Try again
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="qs-meta">
              <span>{label}</span>
              <span>
                Question {index + 1} of {questions.length}
              </span>
            </div>
            <div className="qs-bar mb-5">
              <b style={{ width: `${(index / questions.length) * 100}%` }} />
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
                    {index === questions.length - 1 ? "See score" : "Next question"}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
