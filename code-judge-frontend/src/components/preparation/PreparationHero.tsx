"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { PrepGoal } from "./PreparationHeroTypes";

/**
 * Preparation hero — an editorial, spacious composition:
 * eyebrow → display headline → description → goal → anchor navigation,
 * with the current-state card alongside on desktop.
 */

const JUMP_LINKS = [
  { label: "Roadmaps", href: "/preparation/roadmaps" },
  { label: "Interviews", href: "/preparation/interviews" },
  { label: "Practice", href: "/preparation/practice" },
  { label: "Discussions", href: "/preparation/discussions" },
  { label: "Companies", href: "/preparation/companies" },
  { label: "Progress", href: "/preparation/progress" },
];

export function PreparationHero({
  goal,
  onChangeGoal,
}: {
  goal: PrepGoal;
  onChangeGoal: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
      <div className="grid gap-x-12 gap-y-12 px-6 pb-12 pt-12 sm:px-10 sm:pb-14 sm:pt-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-14 lg:py-20">
        {/* ── Left — editorial stack ── */}
        <div>
          {/* Eyebrow */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted"
          >
            <span className="h-1 w-1 rounded-full bg-pink-500 dark:bg-ai-accent" />
            The ByteClash Preparation Hub
          </motion.span>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06 }}
            className="mt-8 text-[44px] font-extrabold leading-[1.05] tracking-tight text-text-primary sm:text-[54px] lg:text-[58px]"
          >
            Plan. Practice.
            <br />
            <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent dark:from-pink-400 dark:via-fuchsia-400 dark:to-violet-400">
              Perform.
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 max-w-md text-[14px] leading-relaxed text-text-secondary"
          >
            Roadmaps, guided practice, mock interviews and company preparation — organized around
            one goal, so every session moves you forward.
          </motion.p>

          {/* Goal */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2"
          >
            <button
              onClick={onChangeGoal}
              className="group -ml-3 inline-flex items-center gap-2 rounded-full px-3 py-2 transition-colors hover:bg-card-hover"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Goal</span>
              <span className="max-w-[280px] truncate text-sm font-bold text-text-primary">{goal.role}</span>
              <ChevronRight className="h-3.5 w-3.5 text-text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <span className="text-xs text-text-muted">
              {goal.target} · {goal.date}
            </span>
          </motion.div>

          {/* Anchor navigation */}
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.26 }}
            className="mt-10 border-t border-border/60 pt-8"
            aria-label="Preparation sections"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Jump to</p>
            <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2.5">
              {JUMP_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[13px] font-semibold text-text-secondary transition-colors hover:text-pink-500 dark:hover:text-ai-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        </div>

        {/* ── Right — state card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:block"
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
            {/* Status line */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                In progress
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/25 bg-pink-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-pink-500 dark:border-ai-accent/30 dark:bg-ai-accent/10 dark:text-ai-accent">
                SDE track
              </span>
            </div>

            <h3 className="mt-4 text-lg font-extrabold leading-tight tracking-tight text-text-primary">
              {goal.track}
            </h3>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold tabular-nums leading-none text-text-primary">68%</span>
                <span className="text-xs text-text-muted">~6 weeks left</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-hover">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "68%" }}
                  transition={{ duration: 0.9, delay: 0.55, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600"
                />
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
                Current focus{" "}
                <span className="font-bold text-text-primary">Data Structures &amp; Algorithms</span>
              </p>
            </div>

            {/* Stat tiles — mirrors the Problems live-database stats */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "Roadmap", value: "12 / 18", cls: "text-pink-500 dark:text-ai-accent" },
                { label: "Problems", value: "124", cls: "text-blue-600 dark:text-blue-300" },
                { label: "Interviews", value: "8", cls: "text-violet-600 dark:text-violet-300" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-card-hover/70 px-3 py-2.5">
                  <div className={`text-lg font-extrabold tabular-nums leading-none ${stat.cls}`}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Primary action */}
            <Link
              href="/preparation/roadmaps"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(139,92,246,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(139,92,246,0.45)]"
            >
              Continue Preparation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* ── Mobile summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="lg:hidden"
        >
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-bold text-text-primary">{goal.track}</span>
              <span className="shrink-0 text-lg font-extrabold tabular-nums text-text-primary">68%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-hover">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "68%" }}
                transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600"
              />
            </div>
            <Link
              href="/preparation/roadmaps"
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-[13px] font-bold text-white"
            >
              Continue Preparation
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
