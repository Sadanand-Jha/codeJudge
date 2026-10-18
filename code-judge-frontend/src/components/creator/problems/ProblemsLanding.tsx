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
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    label: "Create by own",
    description: "Write a problem manually — statement, options and answer key.",
    href: "/creator/problems/create/manual",
    icon: PenLine,
  },
  {
    label: "Generate with AI",
    description: "Let AI draft questions from your syllabus or an uploaded document.",
    href: "/creator/problems/create",
    icon: Sparkles,
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
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-[28px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle, rgba(236,72,153,0.14), rgba(139,92,246,0.12) 45%, transparent 70%)",
          }}
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
            <NotebookPen className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-[var(--qs-ink)]">Problems</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--qs-muted)]">
            Build and manage a reusable bank of practice problems that can be attached to any test.
          </p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-1.5 text-[11px] font-bold text-[var(--qs-muted)]">
            <Database className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
            Manual &amp; AI authoring available
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)]/60 px-4 py-2.5 text-[13px] font-medium text-[var(--qs-ink)]"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
              {feature}
            </div>
          ))}
        </div>

        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={toggleOptions}
            aria-expanded={showOptions}
            aria-controls="create-problem-options"
            className="qs-btn w-full rounded-full sm:w-auto"
          >
            Create Problem
            <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", showOptions && "rotate-180")} />
          </button>
          <Link href="/creator" className="qs-btn qs-btn-ghost w-full rounded-full sm:w-auto">
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
              <div className="relative mt-8 border-t-2 border-[var(--qs-line)] pt-6">
                <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
                  How do you want to build it?
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {CREATE_OPTIONS.map((option, index) => (
                    <motion.div
                      key={option.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: 0.06 * (index + 1) }}
                    >
                      <Link
                        href={option.href}
                        className="group flex h-full items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--qs-brand)]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                          <option.icon className="h-4.5 w-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-[var(--qs-ink)]">{option.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--qs-muted)]">
                            {option.description}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
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
