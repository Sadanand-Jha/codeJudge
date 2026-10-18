"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, PartyPopper } from "lucide-react";
import Link from "next/link";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
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
      <div className="mx-auto max-w-lg space-y-5 py-8 pb-12 text-center sm:space-y-6 sm:py-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] shadow-[5px_5px_0_var(--qs-sun)]"
        >
          <PartyPopper className="h-8 w-8 text-white" />
        </motion.div>
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
          Quiz Created Successfully
        </h1>
        <p className="break-words text-sm leading-5 text-[var(--qs-muted)]">
          Your quiz <span className="font-extrabold text-[var(--qs-ink)]">{config.name}</span> has
          been created with {config.problems.length} questions.
        </p>
        <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:pt-4">
          <Link
            href="/creator/quizzes"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-sm font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)]"
          >
            View All Quizzes
          </Link>
          <Link
            href="/creator/quizzes/create"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition hover:brightness-105"
          >
            Create Another
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 py-10 text-center sm:space-y-6 sm:py-12">
      <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="mx-auto block animate-pulse motion-reduce:animate-none" />
      <h1 className="text-xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-2xl">
        Creating your quiz…
      </h1>
      <p className="text-sm text-[var(--qs-muted)]">
        Setting up questions, scoring, and quiz configuration.
      </p>
      <div className="flex items-center justify-center gap-3 text-xs font-medium text-[var(--qs-muted)]">
        <SecureLogo variant="mark" size={12} className="animate-pulse motion-reduce:animate-none" />
        <span>This usually takes a few seconds</span>
      </div>
    </div>
  );
}
