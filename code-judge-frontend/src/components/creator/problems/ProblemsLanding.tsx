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
    <main className="qs-ui mx-auto w-full max-w-[1160px] px-3 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold text-[var(--qs-muted)] sm:mb-5 sm:gap-2 sm:text-xs">
        <span>Creator Studio</span>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--qs-ink)]">Assignment Builder</span>
      </nav>

      <header className="relative overflow-hidden rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-brand)] px-3.5 py-4 text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] sm:rounded-[22px] sm:border-2 sm:px-8 sm:py-8 sm:shadow-[6px_6px_0_var(--qs-sun)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border-[24px] border-[var(--qs-sun)]/15" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-[22%] h-36 w-36 rounded-full bg-[var(--qs-sun)]/10" />
        <div className="relative flex flex-col justify-between gap-3 sm:flex-row sm:items-end sm:gap-6">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2 py-0.5 text-[9px] font-extrabold text-[#1a1240] sm:mb-3 sm:gap-2 sm:border-2 sm:px-3 sm:py-1.5 sm:text-xs">
              <Layers3 className="h-3 w-3 text-[#1a1240] sm:h-3.5 sm:w-3.5" />
              Creator Studio · Problem library
            </div>
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight sm:text-4xl">
              Assignment Builder
            </h1>
            <p className="mt-1 max-w-xl text-[11.5px] leading-5 text-[var(--qs-on-brand)]/85 sm:mt-2 sm:text-base sm:leading-6">
              Create, organize, and reuse practice problems across your tests and learning materials.
            </p>
          </div>
          <div className="flex w-fit items-center gap-1.5 rounded-[9px] border border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-1.5 text-[10.5px] font-extrabold text-[#1a1240] sm:gap-2 sm:rounded-xl sm:border-2 sm:px-3.5 sm:py-2.5 sm:text-sm">
            <Database className="h-3.5 w-3.5 text-[#1a1240] sm:h-4 sm:w-4" />
            Saved to your question bank
          </div>
        </div>
      </header>

      <section aria-labelledby="create-assignment-heading" className="pt-5 sm:pt-8">
        <div className="mb-3 sm:mb-5">
          <h2 id="create-assignment-heading" className="text-[15px] font-extrabold text-[var(--qs-ink)] sm:text-lg">
            Start with a new assignment
          </h2>
          <p className="mt-0.5 text-[11.5px] text-[var(--qs-muted)] sm:mt-1 sm:text-sm">
            Choose how you want to prepare your questions.
          </p>
        </div>

        <div className="grid gap-2.5 md:gap-4">
          {CREATE_OPTIONS.map(({ label, description, details, href, icon: Icon, badge }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] p-3.5 shadow-[2px_3px_0_var(--qs-sun)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--qs-sun)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--qs-brand)] sm:min-h-[245px] sm:rounded-[20px] sm:border-2 sm:p-6 sm:shadow-[4px_4px_0_var(--qs-sun)]"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <span className="grid h-9 w-9 place-items-center rounded-[10px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)] sm:h-11 sm:w-11 sm:rounded-[13px] sm:border-2">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="rounded-full border border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-2 py-0.5 text-[9.5px] font-bold text-[var(--qs-brand)] sm:border-2 sm:px-2.5 sm:py-1 sm:text-[11px]">
                  {badge}
                </span>
              </div>
              <h3 className="mt-3 text-[15px] font-extrabold text-[var(--qs-ink)] sm:mt-5 sm:text-lg">{label}</h3>
              <p className="mt-1 max-w-lg text-[11.5px] leading-5 text-[var(--qs-muted)] sm:mt-1.5 sm:text-sm sm:leading-6">{description}</p>
              <ul className="mt-2.5 grid gap-1.5 sm:mt-4 sm:grid-cols-2 sm:gap-2">
                {details.map((detail) => (
                  <li key={detail} className="flex items-start gap-1.5 text-[10.5px] leading-4 text-[var(--qs-muted)] sm:gap-2 sm:text-xs sm:leading-5">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--qs-ok)] sm:h-3.5 sm:w-3.5" />
                    {detail}
                  </li>
                ))}
              </ul>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[12px] font-extrabold text-[var(--qs-brand)] sm:gap-2 sm:pt-5 sm:text-sm">
                {label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 group-hover:text-[var(--qs-ink)] sm:h-4 sm:w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="workflow-heading" className="mt-5 rounded-[14px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-bg)] p-3.5 shadow-[2px_3px_0_var(--qs-sun)] sm:mt-8 sm:rounded-[20px] sm:border-2 sm:p-6 sm:shadow-[4px_4px_0_var(--qs-sun)]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="workflow-heading" className="text-[14px] font-extrabold text-[var(--qs-ink)] sm:text-base">
              Built for a repeatable workflow
            </h2>
            <p className="mt-0.5 text-[11.5px] text-[var(--qs-muted)] sm:mt-1 sm:text-sm">
              Keep your content structured and ready for the next assessment.
            </p>
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--qs-muted)] sm:mt-0 sm:gap-2 sm:text-xs">
            <FileUp className="h-3.5 w-3.5 text-[var(--qs-brand)] sm:h-4 sm:w-4" />
            Bulk import and edit supported
          </div>
        </div>

        <div className="mt-3 grid gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-4">
          {WORKFLOW.map(({ label, description, icon: Icon }) => (
            <div key={label} className="flex items-start gap-2.5 border-t border-[var(--qs-line)] pt-2.5 sm:gap-3 sm:border-t-2 sm:pt-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border-[1.5px] border-[var(--qs-ink)] bg-[var(--qs-surface)] text-[var(--qs-brand)] sm:h-9 sm:w-9 sm:rounded-[10px] sm:border-2">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
              <div>
                <h3 className="text-[12px] font-extrabold text-[var(--qs-ink)] sm:text-sm">{label}</h3>
                <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--qs-muted)] sm:mt-1 sm:text-xs sm:leading-5">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
