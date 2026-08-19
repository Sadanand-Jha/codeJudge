"use client";

import { motion } from "framer-motion";
import { FileQuestion, Timer, Sparkles, TrendingUp } from "lucide-react";
import type { RecommendedTest } from "./types";
import { DifficultyPill, FreeBadge, PrimaryButton } from "./ui";
import { cn } from "@/lib/helpers";

export function RecommendedTestCard({ test, index = 0 }: { test: RecommendedTest; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.2) }}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-[0_14px_34px_rgba(139,92,246,0.10)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-pink-500/15 text-violet-500 ring-1 ring-inset ring-violet-500/20 dark:text-violet-300">
          <Sparkles className="h-[18px] w-[18px]" />
        </div>
        {test.free ? <FreeBadge /> : <TrendingUp className="h-4 w-4 text-emerald-500" />}
      </div>

      <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold text-text-secondary">
        <span
          className={cn(
            "mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-current"
          )}
        />
        {test.reason}
      </span>

      <h3 className="mt-2 line-clamp-2 text-[14px] font-bold leading-snug text-text-primary group-hover:text-violet-500 dark:group-hover:text-violet-300">
        {test.title}
      </h3>
      <div className="mt-0.5 text-xs text-text-secondary">{test.examName}</div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <FileQuestion className="h-3.5 w-3.5 text-text-muted" />
          {test.questionCount} Qs
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Timer className="h-3.5 w-3.5 text-text-muted" />
          {test.minutes} min
        </span>
        <DifficultyPill level={test.difficulty} />
      </div>

      <div className="mt-4 flex-1" />
      <PrimaryButton href={test.free ? `/tests/attempt/${test.id}` : "/tests/series/s_jeemain2027"} className="w-full">
        {test.free ? "Start Free Test" : "View Test Series"}
      </PrimaryButton>
    </motion.div>
  );
}