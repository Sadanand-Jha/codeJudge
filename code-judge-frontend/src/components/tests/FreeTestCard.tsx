"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileQuestion, Timer, Play } from "lucide-react";
import type { FreeTest } from "./types";
import { EXAM_MAP } from "./mockData";
import { DifficultyPill, FreeBadge } from "./ui";

export function FreeTestCard({ test, index = 0 }: { test: FreeTest; index?: number }) {
  const exam = EXAM_MAP[test.examId];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
      className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_14px_34px_rgba(16,185,129,0.10)]"
    >
      {/* Exam icon */}
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${exam.gradient}`}>
          <exam.icon className="h-5 w-5" />
        </div>
        <FreeBadge />
      </div>

      <div className="mt-3.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {test.examName} · {test.subject}
      </div>
      <h3 className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug text-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
        {test.title}
      </h3>
      <div className="mt-1 text-xs text-text-secondary">{test.topic}</div>

      <div className="mt-4 flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <FileQuestion className="h-3.5 w-3.5 text-text-muted" />
          {test.questionCount} Questions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-text-muted" />
          {test.minutes} min
        </span>
        <DifficultyPill level={test.difficulty} />
      </div>

      <Link
        href={`/tests/attempt/${test.id}`}
        className="mt-5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 text-[12px] font-bold text-emerald-600 transition-all hover:bg-emerald-500 hover:text-white dark:text-emerald-300 dark:hover:text-white"
      >
        <Play className="h-3.5 w-3.5" />
        Start Test
      </Link>

      <div className="mt-3 text-center text-[10px] text-text-muted">
        {(test.attempts / 1000).toFixed(1)}K attempts
      </div>
    </motion.div>
  );
}
