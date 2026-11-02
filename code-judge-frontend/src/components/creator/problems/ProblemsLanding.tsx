"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Database,
  FileUp,
  Link2,
  NotebookPen,
  PenLine,
  Sparkles,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";

interface CreateOption {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  ai?: boolean;
}

interface Feature {
  label: string;
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
    ai: true,
  },
];

const FEATURES: Feature[] = [
  { label: "Question bank of reusable problems", icon: Database },
  { label: "Subject & difficulty tagging", icon: Tags },
  { label: "Bulk import and edit", icon: FileUp },
  { label: "Attach problems to tests and series", icon: Link2 },
];

export function ProblemsLanding() {
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  const toggleOptions = () => {
    const next = !showOptions;
    setShowOptions(next);
    if (next) {
      requestAnimationFrame(() => {
        optionsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  return (
    <div className="w-full">
      <section className="relative overflow-hidden bg-[#2d2260] text-[var(--qs-on-brand)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 bg-[#5b4bb8]"
          style={{ clipPath: "polygon(36% 0, 100% 0, 100% 72%, 0 100%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-[38%] h-64 w-64 bg-[#4a3f5e]"
          style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 bottom-0 h-28 w-72 bg-[#3d3181]"
          style={{ clipPath: "polygon(18% 100%, 100% 0, 100% 100%)" }}
        />

        <div className="relative mx-auto min-h-[261px] w-full max-w-[1160px] px-5 py-7 sm:px-7 sm:py-8 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240] shadow-[3px_3px_0_rgba(26,18,64,0.35)]">
                <NotebookPen className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/70">
                  Creator Studio · Problem bank
                </p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--qs-on-brand)] sm:text-[2.6rem] sm:leading-[1.05]">
                  Problems
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/90">
                  Build and manage a reusable bank of practice problems that can be attached to any test,
                  quiz or series.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border-2 border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.1)] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/90">
              <Database className="h-3.5 w-3.5" />
              Reusable
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { label: "Manual + AI authoring", icon: Sparkles },
              { label: "Tagged by subject & difficulty", icon: Tags },
              { label: "Works across tests and series", icon: Link2 },
            ].map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.1)] px-3 py-1.5 text-[11px] font-semibold text-white/95"
              >
                <Icon className="h-3.5 w-3.5 text-[var(--qs-sun)]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1160px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <section className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-muted)]">
                What&apos;s inside
              </p>
              <h2 className="mt-0.5 text-lg font-extrabold text-[var(--qs-ink)]">One bank, every test</h2>
            </div>
            <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-brand)]">
              Reusable
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 sm:p-5">
            {FEATURES.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="group flex items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:border-[var(--qs-ink)] hover:shadow-[3px_3px_0_var(--qs-sun)]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-brand)] transition-colors group-hover:border-[var(--qs-ink)] group-hover:bg-[var(--qs-brand)] group-hover:text-[var(--qs-on-brand)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-bold leading-5 text-[var(--qs-ink)]">{label}</span>
              </div>
            ))}
          </div>

          <div className="mx-4 mb-4 flex items-start gap-2.5 rounded-xl border-2 border-dashed border-[var(--qs-line)] px-3.5 py-3 sm:mx-5 sm:mb-5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
            <p className="text-[11px] font-medium leading-5 text-[var(--qs-muted)]">
              Every problem you create here stays reusable — add it to a test now or save it for later.
            </p>
          </div>
        </section>

        <aside className="relative overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-5 text-[var(--qs-on-brand)] shadow-[5px_5px_0_var(--qs-sun)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full border-[18px] border-white/10"
          />
          <div className="relative">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
              Start building
            </p>
            <h2 className="mt-1.5 text-xl font-extrabold leading-tight">Add your next problem</h2>
            <p className="mt-2 text-[13px] leading-6 text-white/90">
              Write it yourself or let AI draft from your syllabus or an uploaded document.
            </p>

            <button
              type="button"
              onClick={toggleOptions}
              aria-expanded={showOptions}
              aria-controls="create-problem-options"
              className="mt-5 inline-flex w-full items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3 text-sm font-extrabold text-[#1a1240] shadow-[4px_4px_0_rgba(26,18,64,0.35)] transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <span className="inline-flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Create Problem
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showOptions && "rotate-180")} />
            </button>

            <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
              Manual or AI — your choice
            </p>
          </div>
        </aside>
      </div>

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
            <div className="mt-5 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
              <div className="text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-muted)]">
                  How do you want to build it?
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
                  Both paths save straight into your reusable problem bank.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        "group relative flex h-full items-center gap-3.5 overflow-hidden rounded-[18px] border-2 px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--qs-sun)]",
                        option.ai
                          ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                          : "border-[var(--qs-line)] bg-[var(--qs-bg)] hover:border-[var(--qs-ink)]"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2",
                          option.ai
                            ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]"
                            : "border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-brand)]"
                        )}
                      >
                        <option.icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[14px] font-extrabold",
                            option.ai ? "text-[var(--qs-on-brand)]" : "text-[var(--qs-ink)]"
                          )}
                        >
                          {option.label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-[12px] font-medium leading-relaxed",
                            option.ai ? "text-[var(--qs-on-brand)]/90" : "text-[var(--qs-muted)]"
                          )}
                        >
                          {option.description}
                        </span>
                      </span>
                      <ArrowRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                          option.ai
                            ? "text-[var(--qs-on-brand)]"
                            : "text-[var(--qs-muted)] group-hover:text-[var(--qs-brand)]"
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
  );
}
