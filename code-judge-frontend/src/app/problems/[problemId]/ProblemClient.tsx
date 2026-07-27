"use client";

import Link from "next/link";
import type { Problem } from "@/types/problem";
import SampleTestTabs from "@/components/problem/SampleTestTabs";
import DifficultyBadge from "@/components/problem/DifficultyBadge";
import RatingBadge from "@/components/problem/RatingBadge";
import ConstraintsDisplay from "@/components/problem/ConstraintsDisplay";
import MathRenderer from "@/components/problem/MathRenderer";

interface ProblemClientProps {
  problem: Problem;
}

export default function ProblemClient({ problem }: ProblemClientProps) {
  const displayTitle = problem.contest_id && problem.problem_index
    ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
    : problem.title;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col lg:flex-row min-h-screen">
        {/* Main Content */}
        <main className="min-w-0 flex-1 px-6 py-8 overflow-x-hidden">
          {/* Title & Meta */}
          <div className="mb-6">
            <Link
              href="/problems"
              className="text-sm text-[#776acf] hover:underline"
            >
              &larr; Back to Problems
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-[#222]">
              {displayTitle}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#666]">
              {problem.rating !== null && (
                <>
                  <RatingBadge rating={problem.rating} size="sm" />
                  <DifficultyBadge rating={problem.rating} />
                </>
              )}
              <span>
                time limit per test: <strong>{problem.time_limit_ms >= 1000 ? `${(problem.time_limit_ms / 1000).toFixed(1)} s` : `${problem.time_limit_ms} ms`}</strong>
              </span>
              <span>
                memory limit per test: <strong>{problem.memory_limit_mb >= 1024 ? `${(problem.memory_limit_mb / 1024).toFixed(1)} GB` : `${problem.memory_limit_mb} MB`}</strong>
              </span>
              {problem.source && <span>source: <strong>{problem.source}</strong></span>}
            </div>
          </div>

          {/* Problem Statement */}
          <section className="mb-8">
            <MathRenderer html={problem.statement} />
          </section>

          {/* Input Specification */}
          <section className="mb-8">
            <h2 className="mb-2 text-lg font-semibold text-[#222]">Input</h2>
            <MathRenderer html={problem.input_specification} />
          </section>

          {/* Output Specification */}
          <section className="mb-8">
            <h2 className="mb-2 text-lg font-semibold text-[#222]">Output</h2>
            <MathRenderer html={problem.output_specification} />
          </section>

          {/* Constraints */}
          {problem.constraints && (
            <section className="mb-8">
              <h2 className="mb-2 text-lg font-semibold text-[#222]">Constraints</h2>
              <ConstraintsDisplay constraints={problem.constraints} />
            </section>
          )}

          {/* Examples */}
          {problem.sample_tests.length > 0 && (
            <section className="mb-8">
              <SampleTestTabs samples={problem.sample_tests} />
            </section>
          )}

          {/* Notes - Hidden */}
          {/* 
          {problem.notes && (
            <section className="mb-8">
              <h2 className="mb-2 text-lg font-semibold text-[#222]">Note</h2>
              <MathRenderer html={problem.notes} />
            </section>
          )}
          */}
        </main>

        {/* Sidebar */}
        <aside className="border-l border-[#ddd] bg-[#f8f9fa] px-6 py-8">
          <div className="mb-6">
            <Link
              href={`/problems/${problem.problem_id}/editor`}
              className="block w-full rounded bg-[#776acf] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#6658c7] transition-colors"
            >
              Submit Solution
            </Link>
          </div>

          <div className="space-y-4 text-sm text-[#555]">
            <div>
              <div className="mb-1 font-semibold text-[#333]">Problem ID</div>
              <div className="font-mono">{problem.problem_id}</div>
            </div>
            {problem.contest_id && (
              <div>
                <div className="mb-1 font-semibold text-[#333]">Contest</div>
                <div>{problem.contest_id}</div>
              </div>
            )}
            {problem.tags.length > 0 && (
              <div>
                <div className="mb-2 font-semibold text-[#333]">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {problem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-[#e8e8f0] px-2 py-0.5 text-xs text-[#776acf]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}