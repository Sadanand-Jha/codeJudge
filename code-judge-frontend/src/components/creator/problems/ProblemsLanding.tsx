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
  ai?: boolean;
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
    ai: true,
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
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--qs-ink)] sm:text-4xl">
            Problems
          </h1>
          <p className="mt-1.5 text-sm text-[var(--qs-muted)]">
            Build and manage a reusable bank of practice problems that can be attached to any test.
          </p>
        </div>
      </div>

      <div className="qs-shadow mt-6 mb-6 mr-4">
        <div className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--qs-brand)] px-5 py-4 text-[var(--qs-on-brand)] sm:px-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--qs-sun)] text-[#1a1240]">
                <NotebookPen className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold">Problem bank</h2>
                <p className="text-[13px] opacity-90">
                  Manual &amp; AI authoring available — every problem is reusable across tests.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--qs-on-brand)]/30 bg-[var(--qs-on-brand)]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em]">
              <Database className="h-3.5 w-3.5" />
              Reusable
            </span>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2.5 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-2.5 text-[13px] font-medium text-[var(--qs-ink)]"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={toggleOptions}
                aria-expanded={showOptions}
                aria-controls="create-problem-options"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-6 py-3 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition hover:brightness-105 sm:w-auto"
              >
                Create Problem
                <ChevronDown className={cn("h-4 w-4 transition-transform", showOptions && "rotate-180")} />
              </button>
              <Link
                href="/creator"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-3 text-sm font-extrabold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)] sm:w-auto"
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
                  <div className="mt-6 border-t-2 border-[var(--qs-line)] pt-5">
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
                            className={cn(
                              "group relative flex h-full items-center gap-3.5 overflow-hidden rounded-[18px] border-2 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--qs-sun)]",
                              option.ai
                                ? "border-[var(--qs-ink)] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-white"
                                : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:border-[var(--qs-ink)]"
                            )}
                          >
                            {option.ai && (
                              <span
                                aria-hidden="true"
                                className="qs-ai-shimmer pointer-events-none absolute inset-y-0 left-0 w-14 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              />
                            )}
                            <span
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-2",
                                option.ai
                                  ? "border-white/40 bg-white/15 text-white"
                                  : "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                              )}
                            >
                              <option.icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block text-[14px] font-bold",
                                  option.ai ? "text-white" : "text-[var(--qs-ink)]"
                                )}
                              >
                                {option.label}
                              </span>
                              <span
                                className={cn(
                                  "mt-0.5 block text-[12px] leading-relaxed",
                                  option.ai ? "text-white/85" : "text-[var(--qs-muted)]"
                                )}
                              >
                                {option.description}
                              </span>
                            </span>
                            <ArrowRight
                              className={cn(
                                "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                                option.ai ? "text-white" : "text-[var(--qs-muted)] group-hover:text-[var(--qs-brand)]"
                              )}
                            />
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
      </div>
    </div>
  );
}
