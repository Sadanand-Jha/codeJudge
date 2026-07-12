"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Problem } from "@/types/problem";
import ProblemDescriptionCard from "@/components/problem/ProblemDescriptionCard";
import ProblemSidebar from "@/components/problem/ProblemSidebar";
import SampleTestTabs from "@/components/problem/SampleTestTabs";
import DifficultyBadge from "@/components/problem/DifficultyBadge";
import RatingBadge from "@/components/problem/RatingBadge";
import ConstraintsDisplay from "@/components/problem/ConstraintsDisplay";

interface ProblemClientProps {
  problem: Problem;
}

export default function ProblemClient({ problem }: ProblemClientProps) {
  const breadcrumbItems = useMemo(
    () => [
      { label: "Problems", href: "/problems" },
      { label: problem.problem_id, href: `/problems/${problem.problem_id}` },
    ],
    [problem.problem_id],
  );

  const displayTitle = problem.contest_id && problem.problem_index
    ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
    : problem.title;

  console.log("ProblemClient rendering:", problem.problem_id, problem.title);

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-[#6B7280]">
        {breadcrumbItems.map((item, index) => (
          <span key={item.href} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-[#D1D5DB]" />}
            <Link
              href={item.href}
              className="transition-colors hover:text-[#111827]"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* Header */}
      <header className="mb-10">
        <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-[#111827] md:text-5xl">
          {displayTitle}
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          {problem.rating !== null && (
            <div className="flex items-center gap-3">
              <RatingBadge rating={problem.rating} size="md" />
              <DifficultyBadge rating={problem.rating} />
            </div>
          )}
          {problem.source && (
            <span className="text-sm text-[#6B7280]">
              Source: <span className="font-medium text-[#111827]">{problem.source}</span>
            </span>
          )}
          {problem.contest_id && problem.problem_index && (
            <span className="text-sm text-[#6B7280]">
              Contest: <span className="font-medium text-[#111827]">{problem.contest_id}</span>
            </span>
          )}
          <span className="font-mono text-sm text-[#6B7280]">
            ID: {problem.problem_id}
          </span>
        </div>
      </header>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[70%_30%]">
        {/* Main Content */}
        <main className="space-y-6">
          <div className="card-premium p-10">
            <h2 className="mb-6 text-2xl font-bold text-[#111827]">Problem Statement</h2>
            <div dangerouslySetInnerHTML={{ __html: problem.statement }} />
          </div>
          <div className="card-premium p-10">
            <h2 className="mb-6 text-2xl font-bold text-[#111827]">Input</h2>
            <div dangerouslySetInnerHTML={{ __html: problem.input_specification }} />
          </div>
          <div className="card-premium p-10">
            <h2 className="mb-6 text-2xl font-bold text-[#111827]">Output</h2>
            <div dangerouslySetInnerHTML={{ __html: problem.output_specification }} />
          </div>
          {problem.constraints && (
            <div className="card-premium p-10">
              <h2 className="mb-6 text-2xl font-bold text-[#111827]">Constraints</h2>
              <ConstraintsDisplay constraints={problem.constraints} />
            </div>
          )}
          {problem.notes && (
            <div className="card-premium p-10">
              <h2 className="mb-6 text-2xl font-bold text-[#111827]">Note</h2>
              <div dangerouslySetInnerHTML={{ __html: problem.notes }} />
            </div>
          )}
          {problem.sample_tests.length > 0 && (
            <div className="card-premium p-10">
              <h2 className="mb-6 text-2xl font-bold text-[#111827]">Examples</h2>
              <SampleTestTabs samples={problem.sample_tests} />
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <div className="lg:sticky lg:top-12">
          <ProblemSidebar
            rating={problem.rating}
            timeLimitMs={problem.time_limit_ms}
            memoryLimitMb={problem.memory_limit_mb}
            contestId={problem.contest_id}
            source={problem.source}
            problemId={problem.problem_id}
            tags={problem.tags}
          />
        </div>
      </div>
    </div>
  );
}