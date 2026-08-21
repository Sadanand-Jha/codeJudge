"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, PartyPopper } from "lucide-react";
import type { AiQuizConfig } from "./types";

export function CreateStep({
  config,
}: {
  config: AiQuizConfig;
  onComplete: () => void;
}) {
  const [created, setCreated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCreated(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (created) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20"
        >
          <PartyPopper className="h-8 w-8 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Quiz Created Successfully
        </h1>
        <p className="text-sm text-text-secondary">
          Your quiz <span className="font-semibold text-text-primary">{config.name}</span> has
          been created with {config.problems.length} questions.
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <a
            href="/creator/quizzes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-card-hover"
          >
            View All Quizzes
          </a>
          <a
            href="/creator/quizzes/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
          >
            Create Another
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
        <Loader2 className="h-7 w-7 animate-spin text-white" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">
        Creating your quiz…
      </h1>
      <p className="text-sm text-text-secondary">
        Setting up questions, scoring, and quiz configuration.
      </p>
      <div className="flex items-center justify-center gap-3 text-xs text-text-muted">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>This usually takes a few seconds</span>
      </div>
    </div>
  );
}
