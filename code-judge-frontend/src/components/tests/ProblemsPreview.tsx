"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, Braces, CheckCircle2, ArrowRight, Terminal } from "lucide-react";
import { PROBLEM_LANGUAGES, PROBLEM_TOPICS } from "./mockData";
import { DifficultyPill, SectionHeading } from "./ui";
import { cn } from "@/lib/helpers";

const TOPIC_DOT: Record<string, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-rose-500",
};

/**
 * Problems preview — the coding sibling product. Coding-first typography
 * (mono accents, bracket motifs) so it reads as a different product than the
 * exam rails around it.
 */
export function ProblemsPreview() {
  const totalProblems = PROBLEM_TOPICS.reduce((sum, t) => sum + t.count, 0);

  return (
    <section>
      <SectionHeading
        title="Problems"
        subtitle="Practice coding problems and master DSA — one problem at a time."
        href="/problems"
        icon={<Code2 className="h-4.5 w-4.5" />}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-card"
      >
        {/* Coding grid texture */}
        <div className="tests-thumb-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Topics */}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md">
                <Braces className="h-4 w-4" />
              </span>
              <h3 className="text-[15px] font-extrabold tracking-tight text-text-primary">Browse by Topic</h3>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROBLEM_TOPICS.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Link
                    href={`/problems?tag=${t.name}`}
                    className="group/t flex items-center justify-between gap-2 rounded-xl border border-border bg-card-hover/50 px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-blue-500/25 hover:shadow-[0_8px_22px_rgba(59,130,246,0.10)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-bold text-text-primary group-hover/t:text-blue-500 dark:group-hover/t:text-blue-300">
                        {t.name}
                      </span>
                      <span className="block font-mono text-[9px] tabular-nums text-text-muted">
                        {t.count.toLocaleString("en-IN")} problems
                      </span>
                    </span>
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", TOPIC_DOT[t.difficulty])} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Languages + CTA */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-hover text-text-secondary ring-1 ring-border">
                <Terminal className="h-4 w-4" />
              </span>
              <h3 className="text-[15px] font-extrabold tracking-tight text-text-primary">Solve in your Language</h3>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PROBLEM_LANGUAGES.map((lang) => (
                <span
                  key={lang.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card-hover/50 px-2.5 py-1.5 font-mono text-[11px] font-bold text-text-primary"
                >
                  {lang.name}
                  <span className="font-normal text-text-muted">{lang.count.toLocaleString("en-IN")}</span>
                </span>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold tabular-nums tracking-tight text-text-primary">
                  {totalProblems.toLocaleString("en-IN")}
                </div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Problems</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-extrabold tabular-nums tracking-tight text-text-primary">20</div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Topics</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-2xl font-extrabold tabular-nums tracking-tight text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  287
                </div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Solved by you</div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <Link
                href="/problems"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(59,130,246,0.28)] transition-all hover:-translate-y-0.5"
              >
                Open Problem Set
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <p className="mt-2.5 flex items-center gap-1 text-[10px] text-text-muted">
                <DifficultyPill level="easy" /> <DifficultyPill level="medium" /> <DifficultyPill level="hard" />
                <span className="ml-1">acceptance & company tags on every problem</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}