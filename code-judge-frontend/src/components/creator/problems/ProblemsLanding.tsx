"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Database,
  NotebookPen,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";

/**
 * /creator/problems — landing for the Problems workspace.
 *
 * "Create Problem" is a deliberate first step: it reveals the two authoring
 * paths (write it yourself / generate with AI) instead of pushing the creator
 * straight into one of them.
 */

interface CreateOption {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    label: "Create by own",
    description: "Write a problem manually — statement, options and answer key.",
    href: "/creator/problems/create/manual",
    icon: PenLine,
    gradient: "from-pink-500 to-violet-600",
  },
  {
    label: "Generate with AI",
    description: "Let AI draft questions from your syllabus or an uploaded document.",
    href: "/creator/problems/create",
    icon: Sparkles,
    gradient: "from-violet-500 to-indigo-600",
  },
];

const FEATURES = [
  "Question bank of reusable problems",
  "Subject & difficulty tagging",
  "Bulk import and edit",
  "Attach problems to tests and series",
];

export function ProblemsLanding() {
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  const toggleOptions = () => {
    const next = !showOptions;
    setShowOptions(next);
    if (next) {
      // Wait for the reveal to mount, then bring it into view.
      requestAnimationFrame(() => {
        optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-[0.15] blur-3xl"
          style={{ background: "radial-gradient(circle, #EC4899, #8B5CF6)" }}
        />

        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-pink-500/10 to-violet-600/10 text-[#8B5CF6]">
            <NotebookPen className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-text-primary">Problems</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            Build and manage a reusable bank of practice problems that can be attached to any test.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-text-muted">
            <Database className="h-3.5 w-3.5" />
            Manual &amp; AI authoring available
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-text-secondary"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#8B5CF6]" />
              {feature}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={toggleOptions}
            aria-expanded={showOptions}
            aria-controls="create-problem-options"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-3 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:brightness-105 sm:w-auto sm:py-2.5"
          >
            Create Problem
            <ChevronDown className={cn("h-4 w-4 transition-transform", showOptions && "rotate-180")} />
          </button>
          <Link
            href="/creator"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-[13px] font-semibold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 sm:w-auto sm:py-2.5 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
          >
            Go to Creator Dashboard
          </Link>
        </div>

        {/* The two authoring paths — revealed by "Create Problem". */}
        <AnimatePresence initial={false}>
          {showOptions && (
            <motion.div
              id="create-problem-options"
              ref={optionsRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">
                  How do you want to build it?
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {CREATE_OPTIONS.map((option, index) => (
                    <motion.div
                      key={option.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: 0.06 * (index + 1) }}
                    >
                      <Link
                        href={option.href}
                        className="group flex h-full items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-pink-500/30 hover:shadow-[0_8px_24px_rgba(236,72,153,0.12)]"
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)]",
                            option.gradient
                          )}
                        >
                          <option.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-text-primary">{option.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-text-secondary">
                            {option.description}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-pink-500" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}