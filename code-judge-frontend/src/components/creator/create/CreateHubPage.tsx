"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList,
  ListChecks,
  Layers,
  NotebookPen,
  Presentation,
  ArrowRight,
  Sparkles,
  FilePlus2,
  Upload,
  Clock3,
  Settings2,
  GraduationCap,
} from "lucide-react";
import { PageHeader, MockDataTag, Panel } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

type CreateType = "quiz" | "test" | "series" | "problem" | "assessment";

interface CreateOption {
  id: CreateType;
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardList;
  gradient: string;
  accent: string;
  tag: string;
  features: string[];
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    id: "quiz",
    title: "Quiz",
    description: "A quick, interactive assessment with instant scoring and feedback.",
    href: "/creator/quizzes/create",
    icon: ListChecks,
    gradient: "from-emerald-500 to-teal-600",
    accent: "text-emerald-500",
    tag: "Quick & interactive",
    features: ["Instant results", "Timer & scoring", "Public or private"],
  },
  {
    id: "test",
    title: "Test",
    description: "A full-length mock test with sections, negative marking and percentile.",
    href: "/creator/tests/create",
    icon: ClipboardList,
    gradient: "from-pink-500 to-violet-600",
    accent: "text-pink-500",
    tag: "Full-length mocks",
    features: ["Sections & subjects", "Negative marking", "Percentile scoring"],
  },
  {
    id: "assessment",
    title: "Assessment",
    description: "A classroom assessment assigned to a class or batch with a due date.",
    href: "/creator/tests/create?type=assessment",
    icon: Presentation,
    gradient: "from-sky-500 to-indigo-600",
    accent: "text-sky-500",
    tag: "Classroom",
    features: ["Assign to classes", "Due dates", "Grade book"],
  },
  {
    id: "series",
    title: "Test Series",
    description: "Bundle multiple tests into a series and sell them together.",
    href: "/creator/series/create",
    icon: Layers,
    gradient: "from-violet-500 to-purple-600",
    accent: "text-violet-500",
    tag: "Bundle & sell",
    features: ["Bundle tests", "Flexible pricing", "Scheduled release"],
  },
  {
    id: "problem",
    title: "Problem",
    description: "A standalone coding or practice problem for your question bank.",
    href: "/creator/problems/create",
    icon: NotebookPen,
    gradient: "from-amber-500 to-orange-600",
    accent: "text-amber-500",
    tag: "Practice",
    features: ["Code or MCQ", "Difficulty levels", "Reusable anywhere"],
  },
];

export function CreateHubPage({ demoState }: { demoState?: "empty" | "error" }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New"
        subtitle="Choose what you want to build — one flow, built around your content type."
        badge={<MockDataTag />}
        actions={
          <Link
            href="/creator/ai-studio"
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-text-primary sm:flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            AI Studio
          </Link>
        }
      />

      {/* Feature strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Clock3, label: "Reusable question bank", sub: "Build once, reuse across everything" },
          { icon: Upload, label: "Import & AI generation", sub: "From files, topics or prompts" },
          { icon: Settings2, label: "Type-aware builder", sub: "Right tools appear for the right type" },
          { icon: GraduationCap, label: "Sell or assign", sub: "Publish, price or share with classes" },
        ].map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-violet-500">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">{f.label}</p>
                <p className="text-[11px] text-text-secondary">{f.sub}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Type cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CREATE_OPTIONS.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + i * 0.06 }}
            >
              <Link
                href={opt.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-border-hover hover:shadow-[0_0_24px_rgba(236,72,153,0.08)]"
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-[0.16]",
                    "bg-gradient-to-br",
                    opt.gradient
                  )}
                />
                <div className="flex items-start justify-between">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", opt.gradient)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-border bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-muted">
                    {opt.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold tracking-tight text-text-primary">{opt.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{opt.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {opt.features.map((f) => (
                    <span key={f} className="rounded-md border border-border bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                      {f}
                    </span>
                  ))}
                </div>
                <div className={cn("mt-auto flex items-center gap-1.5 pt-5 text-[12px] font-semibold", opt.accent)}>
                  <FilePlus2 className="h-3.5 w-3.5" />
                  Create {opt.title}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Recent drafts */}
      <Panel
        title="Recent Drafts"
        subtitle="Pick up where you left off"
        action={
          <Link href="/creator/tests" className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 dark:text-ai-accent">
            View all content →
          </Link>
        }
      >
        <div className="space-y-2">
          {demoState === "empty" ? (
            <p className="py-6 text-center text-sm text-text-secondary">No drafts yet — start creating above.</p>
          ) : (
            [
              { name: "JEE Physics Mock Test #5", type: "Test", meta: "40 questions · 180 min", status: "Draft" },
              { name: "NEET Biology Quiz: Genetics", type: "Quiz", meta: "15 questions · 20 min", status: "Draft" },
              { name: "CAT 2027 Full Mock", type: "Test", meta: "3 sections · 120 min", status: "Scheduled" },
            ].map((d) => (
              <Link
                key={d.name}
                href="/creator/tests/create"
                className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3 transition-colors hover:border-pink-500/30 hover:bg-pink-500/[0.03]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold text-text-primary">{d.name}</p>
                    <span className="rounded-md border border-border bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-muted">
                      {d.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-secondary">{d.meta}</p>
                </div>
                <span className="shrink-0 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                  {d.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}