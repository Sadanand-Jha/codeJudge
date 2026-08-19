"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Layers, FileText, Sparkles, Lock, Flame, PlusCircle } from "lucide-react";
import type { ExamCategory, ExamMeta } from "./types";
import { EXAM_CATEGORIES, EXAM_MAP } from "./mockData";
import { DifficultyPill, SectionHeading } from "./ui";
import { ExploreRail } from "./ExploreRail";
import { cn } from "@/lib/helpers";

function CategoryCard({ category, index }: { category: ExamCategory; index: number }) {
  const Icon = category.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.24) }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-transparent"
    >
      {/* Hover glow — subtle, only on hover */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(135deg, ${category.color}18, transparent 55%)` }}
      />

      {/* Header */}
      <div className="relative flex items-start gap-4 p-5 pb-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-200 group-hover:scale-110",
            category.gradient
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-extrabold tracking-tight text-text-primary">{category.title}</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">{category.description}</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="relative grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border/60 px-0 text-center">
        {[
          { icon: Layers, label: "Tests", value: category.stats.tests.toLocaleString("en-IN") },
          { icon: FileText, label: "Series", value: String(category.stats.series) },
          { icon: Sparkles, label: "Free", value: (category.stats.free / 1000).toFixed(1) + "k" },
          { icon: Lock, label: "Paid", value: (category.stats.paid / 1000).toFixed(1) + "k" },
        ].map((s) => (
          <div key={s.label} className="bg-card px-1 py-2.5">
            <div className="flex items-center justify-center gap-1 text-[13px] font-extrabold tabular-nums text-text-primary">
              <s.icon className="h-3 w-3 text-text-muted" />
              {s.value}
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Popularity + difficulty */}
      <div className="relative mt-4 flex items-center gap-4 px-5">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 font-semibold text-text-muted">
              <Flame className="h-3 w-3" /> Popularity
            </span>
            <span className="font-bold tabular-nums text-text-primary">{category.stats.popularity}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-card-hover">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${category.stats.popularity}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.2 + index * 0.05, ease: "easeOut" }}
              className={cn("h-full rounded-full bg-gradient-to-r", category.gradient)}
            />
          </div>
        </div>
        <DifficultyPill level={category.stats.difficulty} />
      </div>

      {/* Exam chips */}
      <div className="relative mt-4 flex flex-wrap gap-2 px-5">
        {category.chips.map((chip) => {
          const exam: ExamMeta | undefined = EXAM_MAP[chip.examId];
          if (!exam) return null;
          return (
            <Link
              key={chip.label}
              href={`/tests?exam=${chip.examId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card-hover/60 py-1 pl-1.5 pr-2.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br text-white",
                  exam.gradient
                )}
              >
                <exam.icon className="h-2.5 w-2.5" />
              </span>
              {chip.label}
            </Link>
          );
        })}
      </div>

      {/* View All */}
      <div className="relative mt-4 flex items-center justify-between border-t border-border px-5 py-3">
        <span className="text-[10px] text-text-muted">
          {category.chips.length} exam groups · updated weekly
        </span>
        <Link
          href={`/tests?exam=${category.chips[0]?.examId ?? ""}`}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-pink-500 transition-colors hover:gap-1.5 dark:text-ai-accent"
        >
          View All
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/**
 * Compact "Your exam missing?" card — same grid footprint as a category card,
 * so the grid stays balanced instead of leaving a large dashed void.
 */
function RequestExamCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: 0.24 }}
      className="group relative flex flex-col rounded-2xl border border-dashed border-border bg-card/50 p-5 transition-colors duration-300 hover:border-pink-500/40 dark:hover:border-ai-accent/50"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card-hover text-text-secondary ring-1 ring-border transition-transform duration-200 group-hover:scale-110">
          <PlusCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-extrabold tracking-tight text-text-primary">Your exam missing?</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
            Can&apos;t find your exam? Request it here — new exams are added every week.
          </p>
        </div>
      </div>
      <Link
        href="/tests/create"
        className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-[11px] font-bold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
      >
        Request an exam
        <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </motion.div>
  );
}

/**
 * Explore Tests — exams organized into five thematic categories instead of a
 * flat wall of cards. Desktop composition: a 3-column main grid + a discovery
 * rail (trending tests, upcoming contest, top series, ad) so the viewport is
 * fully occupied on large monitors.
 */
export function ExamCategories({ heading = true }: { heading?: boolean }) {
  return (
    <section>
      {heading && (
        <SectionHeading
          title="Explore Tests"
          subtitle="Find your exam in one of five category groups — every exam starts with free tests."
          href="/tests?explore=1"
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:gap-8">
        {/* Main grid — 5 categories + the compact request card */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {EXAM_CATEGORIES.map((category, i) => (
            <CategoryCard key={category.id} category={category} index={i} />
          ))}

          <RequestExamCard />
        </div>

        {/* Discovery rail — fills the desktop right side with useful content */}
        <ExploreRail className="hidden lg:block" />
      </div>
    </section>
  );
}