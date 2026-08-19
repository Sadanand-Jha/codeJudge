"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Database, Terminal, Flame, Layers, BookOpen } from "lucide-react";
import type { ProblemListItem } from "@/types/problem";
import {
  PROBLEM_EXAMS,
  EXAM_SUBJECTS,
  SUBJECT_TOPICS,
  MARKETPLACE_PROBLEMS,
  mergeProblems,
} from "./marketplace";
import { ExamTile } from "./ProblemBrowser";
import { ProblemsHero } from "./ProblemsHero";

const LAYOUT_CLASSES =
  "mx-auto w-full max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-10 xl:px-12 2xl:px-16";

function routeForExam(exam: string): string {
  return exam === "programming" ? "/problems/competitive-programming" : `/problems/${exam}`;
}

const STREAMS = PROBLEM_EXAMS.filter((e) => e.id !== "all" && e.id !== "programming");

export function ProblemsLanding({ problems }: { problems: ProblemListItem[] }) {
  const router = useRouter();

  const cpProblems = useMemo(
    () => mergeProblems(problems).filter((p) => p.real),
    [problems],
  );
  const cpRatings = cpProblems.map((p) => p.rating).filter((r) => r > 0);
  const cpAvg = cpRatings.length ? Math.round(cpRatings.reduce((s, r) => s + r, 0) / cpRatings.length) : 0;
  const cpMax = cpRatings.length ? Math.max(...cpRatings) : 0;

  const streamCards = useMemo(
    () =>
      STREAMS.map((exam) => {
        const list = MARKETPLACE_PROBLEMS.filter((p) => p.examId === exam.id);
        const subjects = EXAM_SUBJECTS[exam.id] ?? [];
        const chapters = subjects.reduce((s, sub) => s + (SUBJECT_TOPICS[sub]?.length ?? 0), 0);
        return { ...exam, questions: list.length, subjects: subjects.length, chapters };
      }),
    [],
  );

  return (
    <div className="problems-page-shell problems-ambient relative min-h-screen">
      <div className={LAYOUT_CLASSES}>
        <div className="pt-8" />
        <ProblemsHero
          onSearch={(q) => router.push(`/problems/competitive-programming?q=${encodeURIComponent(q)}`)}
          onSelectExam={(exam) => router.push(routeForExam(exam))}
        />

        {/* CP spotlight — links to the dedicated competitive programming page */}
        <section className="mt-8">
          <Link
            href="/problems/competitive-programming"
            className="problems-cp-spotlight group relative block overflow-hidden rounded-3xl border border-border bg-card/60 backdrop-blur-sm transition-colors hover:border-violet-500/40 dark:hover:border-ai-accent/40"
          >
            <div className="problems-cp-glow" />
            <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:border-ai-accent/30 dark:bg-ai-accent/10 dark:text-ai-accent">
                  <Terminal className="h-3 w-3" />
                  Competitive Programming
                </div>
                <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-text-primary sm:text-[30px]">
                  Live problems from the
                  <br />
                  <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-violet-400 dark:to-fuchsia-400">
                    ByteClash database.
                  </span>
                </h2>
                <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-text-secondary">
                  DSA, algorithms and coding challenges rated 800 → 2400, pulled straight from the
                  database and ready to solve.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(139,92,246,0.35)] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_28px_rgba(139,92,246,0.45)]">
                  <Database className="h-4 w-4" />
                  Browse live problems
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div className="relative">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_16px_44px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Live database stats
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      {cpProblems.length > 0 ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { label: "Problems", value: String(cpProblems.length), accent: "text-blue-600 dark:text-blue-300" },
                      { label: "Avg Rating", value: cpAvg ? String(cpAvg) : "—", accent: "text-violet-600 dark:text-ai-accent" },
                      { label: "Max Rating", value: cpMax ? String(cpMax) : "—", accent: "text-fuchsia-600 dark:text-fuchsia-300" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl bg-card-hover/70 px-3 py-2.5">
                        <div className={`text-lg font-extrabold tabular-nums leading-none ${s.accent}`}>{s.value}</div>
                        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["Arrays", "DP", "Graphs", "Binary Search", "Greedy", "Strings"].map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-card-hover/80 px-2 py-0.5 text-[10px] font-semibold text-text-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* Stream picker — competitive exams */}
        <section className="mt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                  Choose your stream
                </h2>
              </div>
              <p className="mt-1 text-[13px] text-text-secondary">
                Pick a competitive exam to practice — mix, subject-wise and chapter-wise.
              </p>
            </div>
            <span className="text-xs font-semibold text-text-muted">{STREAMS.length} streams</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {streamCards.map((exam, i) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.35) }}
              >
                <Link
                  href={`/problems/${exam.id}`}
                  className="problems-cat-card group flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7C3AED]/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)] dark:hover:border-ai-accent/40"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <ExamTile examId={exam.id} size="md" />
                      <span className="text-[15px] font-extrabold tracking-tight text-text-primary">
                        {exam.label}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold text-text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        {exam.subjects} subjects
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {exam.chapters} chapters
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[12px] font-bold tabular-nums text-text-secondary">
                      {exam.questions} questions
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#7C3AED] transition-transform group-hover:translate-x-0.5 dark:text-ai-accent">
                      Practice
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}