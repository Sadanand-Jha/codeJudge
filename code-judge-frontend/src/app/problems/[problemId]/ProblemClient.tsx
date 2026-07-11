"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Problem } from "@/types/problem";
import ProblemHeader from "@/components/problem/ProblemHeader";
import ProblemInfoCard from "@/components/problem/ProblemInfoCard";
import ProblemStatement from "@/components/problem/ProblemStatement";
import SampleTestCard from "@/components/problem/SampleTestCard";
import SectionTitle from "@/components/problem/SectionTitle";

interface ProblemClientProps {
  problem: Problem;
}

export default function ProblemClient({ problem }: ProblemClientProps) {
  const breadcrumbItems = useMemo(
    () => [
      { label: "Problems", href: "/problems" },
      { label: problem.problem_id, href: `/problems/${problem.problem_id}` },
    ],
    [problem.problem_id]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        {breadcrumbItems.map((item, index) => (
          <span key={item.href} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />}
            <Link
              href={item.href}
              className="transition-colors hover:text-zinc-300"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px] xl:gap-10">
        {/* Main Content */}
        <main className="min-w-0">
          <ProblemHeader
            title={problem.title}
            contestId={problem.contest_id}
            problemIndex={problem.problem_index}
            rating={problem.rating}
            source={problem.source}
            problemId={problem.problem_id}
          />

          <ProblemStatement
            title={problem.title}
            statement={problem.statement}
            inputSpecification={problem.input_specification}
            outputSpecification={problem.output_specification}
            constraints={problem.constraints}
            notes={problem.notes}
          />

          {/* Sample Tests */}
          {problem.sample_tests.length > 0 && (
            <section className="mt-10">
              <SectionTitle>Examples</SectionTitle>
              <div className="space-y-4">
                {problem.sample_tests.map((sample, index) => (
                  <SampleTestCard
                    key={index}
                    sample={sample}
                    index={index}
                  />
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ProblemInfoCard
            rating={problem.rating}
            timeLimitMs={problem.time_limit_ms}
            memoryLimitMb={problem.memory_limit_mb}
            contestId={problem.contest_id}
            source={problem.source}
            problemId={problem.problem_id}
            tags={problem.tags}
          />

          {/* Future feature placeholders */}
          <div className="mt-4 space-y-2">
            <FeatureButton label="AI Coach" disabled />
            <FeatureButton label="Submit Solution" disabled />
            <FeatureButton label="Run Code" disabled />
          </div>

          {/* Future navigation tabs */}
          <div className="mt-6 space-y-1">
            <TabItem label="Editorial" disabled />
            <TabItem label="Discussion" disabled />
            <TabItem label="Accepted Submissions" disabled />
            <TabItem label="Related Problems" disabled />
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeatureButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors"
    >
      {label}
    </button>
  );
}

function TabItem({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      className="w-full rounded-lg px-4 py-2 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-800/40 hover:text-zinc-400"
    >
      {label}
    </button>
  );
}