"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Database,
  FileUp,
  Layers3,
  Link2,
  NotebookPen,
  PenLine,
  Sparkles,
  Tags,
  type LucideIcon,
} from "lucide-react";

interface CreateOption {
  label: string;
  description: string;
  details: string[];
  href: string;
  icon: LucideIcon;
  badge: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    label: "Create manually",
    description: "Write and configure each problem yourself, with full control over the content.",
    details: ["Add a question statement", "Set answer choices and key", "Tag subject and difficulty"],
    href: "/creator/problems/create/manual",
    icon: PenLine,
    badge: "Full control",
  },
  {
    label: "Generate with AI",
    description: "Create a draft from your syllabus, selected topics or uploaded study material.",
    details: ["Choose a subject and scope", "Balance type and difficulty", "Review before saving"],
    href: "/creator/problems/create",
    icon: Sparkles,
    badge: "AI assisted",
  },
];

const WORKFLOW = [
  { label: "Create once", description: "Build a library of quality questions.", icon: NotebookPen },
  { label: "Organize clearly", description: "Use subject and difficulty tags.", icon: Tags },
  { label: "Reuse anywhere", description: "Add problems to tests and series.", icon: Link2 },
];

export function ProblemsLanding() {
  return (
    <main className="qs-ui mx-auto w-full max-w-[1160px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-xs font-semibold text-[var(--qs-muted)]">
        <span>Creator Studio</span>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--qs-ink)]">Assignment Builder</span>
      </nav>

      <header className="relative overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-5 py-6 text-[var(--qs-on-brand)] shadow-[6px_6px_0_var(--qs-sun)] sm:px-8 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-[var(--qs-sun)]/15" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-[22%] h-36 w-36 rounded-full bg-[var(--qs-sun)]/10" />
        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-1.5 text-xs font-extrabold text-[#1a1240]">
              <Layers3 className="h-3.5 w-3.5 text-[#1a1240]" />
              Creator Studio · Problem library
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Assignment Builder
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--qs-on-brand)]/85 sm:text-base">
              Create, organize, and reuse practice problems across your tests and learning materials.
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-xl border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3.5 py-2.5 text-sm font-extrabold text-[#1a1240]">
            <Database className="h-4 w-4 text-[#1a1240]" />
            Saved to your question bank
          </div>
        </div>
      </header>

      <section aria-labelledby="create-assignment-heading" className="pt-8">
        <div className="mb-5">
          <h2 id="create-assignment-heading" className="text-lg font-extrabold text-[var(--qs-ink)]">
            Start with a new assignment
          </h2>
          <p className="mt-1 text-sm text-[var(--qs-muted)]">
            Choose how you want to prepare your questions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {CREATE_OPTIONS.map(({ label, description, details, href, icon: Icon, badge }) => (
            <Link
              key={label}
              href={href}
              className="group flex min-h-[245px] flex-col rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[4px_4px_0_var(--qs-sun)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--qs-sun)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--qs-brand)] sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-2.5 py-1 text-[11px] font-bold text-[var(--qs-brand)]">
                  {badge}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-[var(--qs-ink)]">{label}</h3>
              <p className="mt-1.5 max-w-lg text-sm leading-6 text-[var(--qs-muted)]">{description}</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {details.map((detail) => (
                  <li key={detail} className="flex items-start gap-2 text-xs leading-5 text-[var(--qs-muted)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--qs-ok)]" />
                    {detail}
                  </li>
                ))}
              </ul>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-extrabold text-[var(--qs-brand)]">
                {label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:text-[var(--qs-ink)]" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="workflow-heading" className="mt-8 rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] p-5 shadow-[4px_4px_0_var(--qs-sun)] sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="workflow-heading" className="text-base font-extrabold text-[var(--qs-ink)]">
              Built for a repeatable workflow
            </h2>
            <p className="mt-1 text-sm text-[var(--qs-muted)]">
              Keep your content structured and ready for the next assessment.
            </p>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--qs-muted)] sm:mt-0">
            <FileUp className="h-4 w-4 text-[var(--qs-brand)]" />
            Bulk import and edit supported
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {WORKFLOW.map(({ label, description, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3 border-t-2 border-[var(--qs-line)] pt-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-brand)]">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-[var(--qs-ink)]">{label}</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--qs-muted)]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
