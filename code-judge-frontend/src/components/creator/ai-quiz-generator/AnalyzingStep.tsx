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
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20 sm:mb-4 sm:h-14 sm:w-14">
          <Sparkles className="h-6 w-6 text-white sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
          Creating your quiz
        </h1>
        <p className="mt-2 text-sm leading-5 text-text-secondary">
          Please wait a moment.
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <p className="text-right text-[11px] text-text-muted">
          {Math.round(progress)}% complete
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-5 text-center">
        <p className="text-sm font-medium text-text-primary">Generating questions…</p>
        <p className="mt-1 text-xs text-text-muted">Your quiz will be ready shortly.</p>
      </div>
    </div>
  );
}
