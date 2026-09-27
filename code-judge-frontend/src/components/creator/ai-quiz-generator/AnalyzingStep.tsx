"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import { ANALYSIS_STEPS } from "./mockData";

export function AnalyzingStep({
  file,
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
          <Brain className="h-6 w-6 text-white sm:h-7 sm:w-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
          Analyzing problem list
        </h1>
        <p className="mt-2 break-words text-sm leading-5 text-text-secondary">
          Reading <span className="font-medium text-text-primary">{file.name}</span> ({file.pageCount} page{file.pageCount !== 1 ? "s" : ""})
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

      {/* Steps */}
      <div className="space-y-1 rounded-xl border border-border bg-card p-2 sm:p-4">
        {ANALYSIS_STEPS.map((step, i) => {
          const isDone = completedSteps.includes(i);
          const isCurrent = i === currentStep;
          const isPending = i > currentStep;

          return (
            <motion.div
              key={step}
              initial={false}
              animate={{ opacity: isPending ? 0.4 : 1 }}
              className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-2.5 sm:px-3"
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-violet-500 text-white"
                    : "bg-white/[0.06] text-text-muted"
                )}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : isCurrent ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  isDone
                    ? "text-text-secondary line-through"
                    : isCurrent
                    ? "font-medium text-text-primary"
                    : "text-text-muted"
                )}
              >
                {step}
              </span>
              {isDone && (
                <span className="shrink-0 text-[10px] font-medium text-emerald-500">
                  Done
                </span>
              )}
              {isCurrent && (
                <span className="shrink-0 text-[10px] font-medium text-violet-500">
                  Processing…
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
