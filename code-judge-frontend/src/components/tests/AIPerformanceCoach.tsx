"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Target } from "lucide-react";
import type { TestResultData } from "./types";

/**
 * Subtle AI performance coach — useful insights, not gimmicks.
 * No robots, no heavy AI gradients.
 */
export function AIPerformanceCoach({ data }: { data: TestResultData }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/6 via-transparent to-pink-500/6 p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-bold text-violet-500 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI Performance Coach
          </span>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-secondary">{data.aiCoach.summary}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {data.aiCoach.steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.08 }}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-violet-600 text-[10px] font-extrabold text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-bold text-text-primary">{step.title}</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">{step.detail}</p>
            </motion.div>
          ))}
        </div>

        <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(236,72,153,0.42)]">
          <Target className="h-4 w-4" />
          Start Personalized Practice
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.section>
  );
}