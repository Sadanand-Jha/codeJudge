"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Building2, FileQuestion, Search } from "lucide-react";
import { PrepPageHeader, PrepProgressBar } from "@/components/preparation";
import { COMPANIES, COMPANY_CATEGORIES } from "./data";

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof COMPANY_CATEGORIES)[number]>("All");

  const filtered = useMemo(
    () =>
      COMPANIES.filter((c) => {
        const matchesQuery =
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.focusTopics.some((t) => t.toLowerCase().includes(query.toLowerCase()));
        const matchesCategory = category === "All" || c.category === category;
        return matchesQuery && matchesCategory;
      }),
    [query, category]
  );

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1400px]">
        <PrepPageHeader
          section="Companies"
          title="Companies"
          subtitle="Company-specific preparation tracks — interview questions, experiences and study plans."
        />

        {/* Search + category filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies or topics..."
              className="h-11 w-full rounded-xl border border-input-border bg-input-bg pl-12 pr-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {COMPANY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap rounded-lg border px-3.5 py-1.5 text-[11px] font-semibold transition-all ${
                  category === cat
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Company grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((company, i) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
            >
              <Link
                href={`/preparation/companies/${company.id}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7C3AED]/40 hover:shadow-[0_14px_36px_rgba(0,0,0,0.12)] dark:hover:border-ai-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${company.tint}`}
                    >
                      {company.letter}
                    </span>
                    <span>
                      <span className="block text-[15px] font-extrabold tracking-tight text-text-primary">
                        {company.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        {company.category}
                      </span>
                    </span>
                  </div>
                  {company.progress !== null && (
                    <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-accent">
                      {company.progress}%
                    </span>
                  )}
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">{company.tagline}</p>

                <div className="mt-4 flex items-center gap-4 text-[11px] font-semibold text-text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    {company.roles} roles
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileQuestion className="h-3.5 w-3.5" />
                    {company.questions} questions
                  </span>
                </div>

                {/* Difficulty mix */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-card-hover">
                    <span style={{ width: `${company.difficulty.easy}%` }} className="bg-success/70" />
                    <span style={{ width: `${company.difficulty.medium}%` }} className="bg-warning/70" />
                    <span style={{ width: `${company.difficulty.hard}%` }} className="bg-danger/70" />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums text-text-muted">
                    {company.difficulty.easy}/{company.difficulty.medium}/{company.difficulty.hard}
                  </span>
                </div>

                {company.progress !== null && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      <span>Your track</span>
                      <span className="tabular-nums">{company.progress}%</span>
                    </div>
                    <PrepProgressBar value={company.progress} animate={false} className="h-1" />
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-[12px] font-bold">
                  <span className="tabular-nums text-text-secondary">{company.experiences} experiences</span>
                  <span className="inline-flex items-center gap-1 text-[#7C3AED] transition-transform group-hover:translate-x-0.5 dark:text-ai-accent">
                    Prepare
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-text-muted" />
            <p className="mt-3 text-sm font-semibold text-text-primary">No companies found</p>
            <p className="mt-1 text-[13px] text-text-secondary">Try a different search or category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
