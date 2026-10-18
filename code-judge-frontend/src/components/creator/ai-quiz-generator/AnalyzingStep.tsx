"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ANALYSIS_STEPS } from "./mockData";

export function AnalyzingStep({
  onComplete,
}: {
  file: { name: string; pageCount: number };
  onComplete: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (currentStep >= ANALYSIS_STEPS.length) {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }

    const delay = 400 + Math.random() * 600;
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, currentStep]);
      setCurrentStep((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  const progress = Math.min(
    100,
    ((completedSteps.length / ANALYSIS_STEPS.length) * 100)
  );

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6 pb-12 sm:space-y-8 sm:py-10">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-sun)] shadow-[4px_4px_0_var(--qs-sun)] sm:mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-3xl">
          Creating your quiz
        </h1>
        <p className="mt-2 text-sm leading-5 text-[var(--qs-muted)]">
          Please wait a moment.
        </p>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--qs-line)]">
          <motion.div
            className="h-full rounded-full bg-[var(--qs-brand)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <p className="text-right text-[11px] font-bold tabular-nums text-[var(--qs-muted)]">
          {Math.round(progress)}% complete
        </p>
      </div>

      <div className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-5 text-center">
        <p className="text-sm font-extrabold text-[var(--qs-ink)]">Generating questions…</p>
        <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">Your quiz will be ready shortly.</p>
      </div>
    </div>
  );
}
