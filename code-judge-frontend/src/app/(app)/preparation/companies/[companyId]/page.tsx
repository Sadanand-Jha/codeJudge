"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  Code2,
  FileQuestion,
  MessagesSquare,
  Route,
  Server,
  Target,
  Video,
} from "lucide-react";
import { PrepProgressBar } from "@/components/preparation";
import { getCompanyById } from "../data";

function CompanyDetailContent({ companyId }: { companyId: string }) {
  const company = getCompanyById(companyId);

  if (!company) {
    return (
      <div className="px-6 py-6">
        <div className="mx-auto max-w-4xl text-center py-16">
          <p className="text-sm font-semibold text-text-primary">Company not found.</p>
          <Link
            href="/preparation/companies"
            className="mt-2 inline-block text-[13px] font-bold text-[#7C3AED] dark:text-ai-accent"
          >
            ← Back to Companies
          </Link>
        </div>
      </div>
    );
  }

  const readinessRows = [
    { label: "DSA", value: company.readiness.dsa },
    { label: "CS Fundamentals", value: company.readiness.csFundamentals },
    { label: "System Design", value: company.readiness.systemDesign },
    { label: "HR / Behavioral", value: company.readiness.hr },
  ];
  const overall = Math.round(
    readinessRows.reduce((s, r) => s + r.value, 0) / readinessRows.length
  );

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1400px]">
        {/* Back */}
        <Link
          href="/preparation/companies"
          className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-text-muted transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All companies
        </Link>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-border bg-card p-6 sm:p-7"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${company.tint}`}
              >
                {company.letter}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">
                    {company.name}
                  </h1>
                  <span className="rounded-full border border-border bg-card-hover px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {company.category}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-text-secondary">{company.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-semibold text-text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" /> {company.roles} open roles
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileQuestion className="h-3.5 w-3.5" /> {company.questions} interview questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MessagesSquare className="h-3.5 w-3.5" /> {company.experiences} experiences
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link
                href="/preparation/interviews"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-[13px] font-bold text-white shadow-[0_6px_20px_rgba(139,92,246,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(139,92,246,0.45)]"
              >
                <Video className="h-4 w-4" />
                Mock Interview
              </Link>
              <Link
                href={`/problems?company=${company.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card-hover px-5 text-[13px] font-bold text-text-primary transition-colors hover:border-border-hover"
              >
                <Code2 className="h-4 w-4" />
                Practice Problems
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 gap-y-8 xl:flex xl:gap-x-8">
          {/* Main column */}
          <div className="min-w-0 flex-1 space-y-8">
            {/* Readiness */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <header className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                    <h2 className="text-base font-extrabold tracking-tight text-text-primary">
                      Your readiness for {company.name}
                    </h2>
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">Based on your activity across all preparation areas.</p>
                </div>
                <span className="text-lg font-extrabold tabular-nums leading-none text-text-primary">{overall}%</span>
              </header>

              <PrepProgressBar value={overall} className="h-2" />

              <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                {readinessRows.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] font-semibold text-text-primary">{row.label}</span>
                      <span className="text-xs font-bold tabular-nums text-text-secondary">{row.value}%</span>
                    </div>
                    <PrepProgressBar value={row.value} animate={false} className="mt-2 h-1" />
                  </div>
                ))}
              </div>
            </section>

            {/* Interview questions */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <header className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                    <h2 className="text-base font-extrabold tracking-tight text-text-primary">
                      Frequently asked questions
                    </h2>
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">Ranked by how often they appear in reports.</p>
                </div>
                <Link
                  href={`/problems?company=${company.id}`}
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
                >
                  Solve in Problems
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </header>

              <div className="space-y-4">
                {company.interviewQuestions.map((q) => (
                  <div key={q.question}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[13px] font-semibold text-text-primary">{q.question}</span>
                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-text-muted">
                        asked {q.askedCount}×
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <PrepProgressBar value={q.frequency} animate={false} className="h-1 flex-1" />
                      <span
                        className={`w-14 shrink-0 rounded-md border px-1.5 py-0.5 text-center text-[9px] font-bold ${
                          q.difficulty === "Easy"
                            ? "border-success/20 bg-success/10 text-success"
                            : q.difficulty === "Medium"
                            ? "border-warning/20 bg-warning/10 text-warning"
                            : "border-danger/20 bg-danger/10 text-danger"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Experiences */}
            <section className="rounded-2xl border border-border bg-card p-6">
              <header className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <MessagesSquare className="h-4 w-4 text-[#7C3AED] dark:text-ai-accent" />
                    <h2 className="text-base font-extrabold tracking-tight text-text-primary">
                      Recent interview experiences
                    </h2>
                  </div>
                  <p className="mt-1 text-[13px] text-text-secondary">First-hand reports from the community.</p>
                </div>
                <Link
                  href="/preparation/discussions"
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-[#7C3AED] transition-colors hover:text-[#6D28D9] dark:text-ai-accent"
                >
                  Browse Discussions
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </header>

              <div className="space-y-1">
                {company.recentExperiences.map((exp) => (
                  <Link
                    key={`${exp.author}-${exp.when}`}
                    href="/preparation/discussions"
                    className="-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3 transition-colors hover:bg-card-hover"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-hover text-xs font-extrabold text-text-secondary">
                      {exp.author.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="block truncate text-[13px] font-bold text-text-primary">
                        {exp.role} — {exp.rounds}
                      </span>
                      <span className="block text-[11px] text-text-muted">
                        {exp.author} · {exp.when}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Side column */}
          <aside className="w-full shrink-0 space-y-5 xl:w-80">
            {/* Roadmap */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-text-primary">Company roadmap</h3>
              </header>
              <p className="text-[13px] leading-relaxed text-text-secondary">
                A step-by-step plan tailored to {company.name}&apos;s process.
              </p>
              <Link
                href="/preparation/roadmaps"
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 text-[12px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5"
              >
                Open Roadmap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>

            {/* CS fundamentals */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-bold text-text-primary">CS fundamentals</h3>
                </div>
                <Link
                  href="/preparation/practice"
                  className="text-[11px] font-bold text-[#7C3AED] dark:text-ai-accent"
                >
                  Practice
                </Link>
              </header>
              {company.csFundamentals.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {company.csFundamentals.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-md border border-border bg-card-hover px-2.5 py-1 text-[11px] font-semibold text-text-secondary"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-text-muted">Not a focus for this company.</p>
              )}
            </section>

            {/* System design */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-4 flex items-center gap-2">
                <Server className="h-4 w-4 text-success" />
                <h3 className="text-sm font-bold text-text-primary">System design</h3>
              </header>
              {company.systemDesign.length > 0 ? (
                <div className="space-y-1">
                  {company.systemDesign.map((topic) => (
                    <div
                      key={topic}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-medium text-text-primary transition-colors hover:bg-card-hover"
                    >
                      <span>{topic}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-text-muted">Rarely asked for this role level.</p>
              )}
            </section>

            {/* Focus topics */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-text-primary">Focus topics</h3>
              </header>
              <div className="flex flex-wrap gap-2">
                {company.focusTopics.map((topic) => (
                  <Link
                    key={topic}
                    href={`/problems?tag=${encodeURIComponent(topic)}`}
                    className="rounded-md border border-accent/20 bg-accent/[0.07] px-2.5 py-1 text-[11px] font-bold text-accent transition-colors hover:bg-accent/15"
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function CompanyDetailPage({ params }: { params: { companyId: string } }) {
  return <CompanyDetailContent companyId={params.companyId} />;
}
