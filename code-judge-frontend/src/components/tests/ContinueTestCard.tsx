"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Play, FileQuestion } from "lucide-react";
import type { ContinueTest } from "./types";
import { cn } from "@/lib/helpers";

export function ContinueTestCard({ test, index = 0 }: { test: ContinueTest; index?: number }) {
  const pct = test.percentComplete;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.06, 0.2) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/30 hover:shadow-[0_14px_34px_rgba(236,72,153,0.10)] dark:hover:border-ai-accent/30 dark:hover:shadow-[0_14px_38px_rgba(139,92,246,0.14)]"
    >
      {/* Top accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 to-violet-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{test.examName}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-bold text-pink-500 dark:bg-ai-accent/10 dark:text-ai-accent">
          In Progress
        </span>
      </div>

      <h3 className="mt-2 text-[14px] font-bold leading-snug text-text-primary group-hover:text-pink-500 dark:group-hover:text-ai-accent">
        {test.title}
      </h3>
      <div className="mt-0.5 text-xs text-text-secondary">{test.section}</div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-text-primary">{pct}% completed</span>
          <span className="text-text-muted">
            {test.questionsRemaining} questions remaining
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-card-hover">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
            className={cn("tests-fill-bar h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500")}
          />
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-text-muted" />
          {test.minutesLeft} min left
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileQuestion className="h-3.5 w-3.5 text-text-muted" />
          {test.totalQuestions} total Qs
        </span>
      </div>

      <Link
        href="/tests/attempt/ct_mock04"
        className="mt-5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-[12px] font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(236,72,153,0.42)]"
      >
        <Play className="h-3.5 w-3.5" />
        Continue Test
      </Link>
    </motion.div>
  );
}
