"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, FileQuestion, Layers, ArrowRight, ShieldCheck, BadgeCheck } from "lucide-react";
import type { SeriesMeta } from "./types";
import { EXAM_MAP } from "./mockData";
import { SeriesThumbnail } from "./SeriesThumbnail";
import { DifficultyPill, ExamChip, FreeBadge, PriceTag, Stars, VerifiedName } from "./ui";
import { cn } from "@/lib/helpers";

export function TestSeriesCard({ series, index = 0 }: { series: SeriesMeta; index?: number }) {
  const exam = EXAM_MAP[series.examId];
  const free = series.price === 0;
  const official = series.source === "platform";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/30 hover:shadow-[0_16px_40px_rgba(236,72,153,0.10)] dark:hover:border-ai-accent/30 dark:hover:shadow-[0_16px_44px_rgba(139,92,246,0.16)]"
    >
      <Link href={`/tests/series/${series.id}`} className="flex flex-1 flex-col">
        {/* Thumbnail */}
        <div className="relative">
          <SeriesThumbnail exam={exam} />
          {free && (
            <div className="absolute left-3 top-3">
              <FreeBadge className="border-white/30 bg-black/30 text-white backdrop-blur-sm dark:border-white/25" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-2">
            <ExamChip label={series.examName} className={exam.chipClass} />
            <DifficultyPill level={series.difficulty} />
          </div>
          <h3 className="mt-2.5 line-clamp-2 text-[15px] font-bold leading-snug text-text-primary transition-colors group-hover:text-pink-500 dark:group-hover:text-ai-accent">
            {series.title}
          </h3>

          <div className="mt-1.5 flex items-center gap-1 text-xs text-text-secondary">
            <VerifiedName name={series.teacher.name} verified={series.teacher.verified} className="text-xs" />
            <span className="text-text-muted">· {series.teacher.role}</span>
            {official && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-500 dark:text-violet-300">
                <ShieldCheck className="h-3 w-3" /> Official
              </span>
            )}
          </div>

          {/* Rating + students */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-text-primary">
              <Stars rating={series.rating} size={12} />
              {series.rating.toFixed(1)}
            </span>
            <span className="text-text-muted">·</span>
            <span className="inline-flex items-center gap-1 text-text-secondary">
              <Users className="h-3 w-3 text-text-muted" />
              {(series.studentCount / 1000).toFixed(1)}K students
            </span>
          </div>

          {/* Tests / questions */}
          <div className="mt-3 flex items-center gap-3 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-text-muted" />
              {series.testCount} Tests
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileQuestion className="h-3.5 w-3.5 text-text-muted" />
              {Math.round(series.questionCount / series.testCount)} Qs/test
            </span>
          </div>

          {/* Progress — only when the student has started it */}
          {typeof series.progress === "number" && series.progress > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-text-secondary">Your progress</span>
                <span className="font-bold tabular-nums text-pink-500 dark:text-ai-accent">{series.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-card-hover">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
                  style={{ width: `${series.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Price + CTA */}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3.5">
            {free ? (
              <span className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-emerald-600 dark:text-emerald-300">
                <BadgeCheck className="h-4 w-4" /> Free
              </span>
            ) : (
              <PriceTag price={series.price} originalPrice={series.originalPrice} />
            )}
            <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-pink-500/12 to-violet-600/12 px-3 py-1.5 text-[11px] font-bold text-pink-500 transition-colors group-hover:from-pink-500 group-hover:to-violet-600 group-hover:text-white dark:text-ai-accent">
              {free ? "Start" : "View"}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* Compact variant — used in horizontal rails where full cards are too tall. */
export function TestSeriesCardCompact({ series }: { series: SeriesMeta }) {
  const exam = EXAM_MAP[series.examId];
  const free = series.price === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
      className={cn(
        "group relative w-[240px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card",
        "transition-all duration-300 hover:-translate-y-1 hover:border-pink-500/30 hover:shadow-[0_14px_34px_rgba(236,72,153,0.10)]",
        "dark:hover:border-ai-accent/30 dark:hover:shadow-[0_14px_38px_rgba(139,92,246,0.15)]"
      )}
    >
      <Link href={`/tests/series/${series.id}`} className="block">
        <SeriesThumbnail exam={exam} compact />
        <div className="p-3.5">
          <div className="flex items-center justify-between gap-2">
            <ExamChip label={series.examName} className={exam.chipClass} />
            <DifficultyPill level={series.difficulty} />
          </div>
          <h3 className="mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-text-primary group-hover:text-pink-500 dark:group-hover:text-ai-accent">
            {series.title}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <Stars rating={series.rating} size={11} />
            <span className="font-bold text-text-primary">{series.rating.toFixed(1)}</span>
            <span className="text-text-muted">· {(series.studentCount / 1000).toFixed(1)}K</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            {free ? <FreeBadge /> : <PriceTag price={series.price} originalPrice={series.originalPrice} />}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}