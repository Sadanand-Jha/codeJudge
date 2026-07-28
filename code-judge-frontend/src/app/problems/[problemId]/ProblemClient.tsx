"use client";

import Link from "next/link";
import type { Problem } from "@/types/problem";
import SampleTestTabs from "@/components/problem/SampleTestTabs";
import MathRenderer from "@/components/problem/MathRenderer";
import ContestInfoWidget from "@/components/problem/ContestInfoWidget";
import SubmitWidget from "@/components/problem/SubmitWidget";
import ContestMaterialsWidget from "@/components/problem/ContestMaterialsWidget";

interface ProblemClientProps {
  problem: Problem;
}

export default function ProblemClient({ problem }: ProblemClientProps) {
  const displayTitle = problem.contest_id && problem.problem_index
    ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
    : problem.title;

  const timeLimitStr = problem.time_limit_ms >= 1000
    ? `${(problem.time_limit_ms / 1000).toFixed(1)} second${problem.time_limit_ms >= 2000 ? "s" : ""}`
    : `${problem.time_limit_ms} ms`;
  const memoryLimitStr = problem.memory_limit_mb >= 1024
    ? `${(problem.memory_limit_mb / 1024).toFixed(1)} GB`
    : `${problem.memory_limit_mb} megabytes`;

  return (
    <div className="min-h-screen bg-white font-[Arial,Helvetica,sans-serif]">
      <div className="mx-auto max-w-[1260px] px-4 py-6">
        {/* Two-column layout: 75% left, 25% right */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ==============================
              LEFT COLUMN — Problem Content
              ============================== */}
          <div className="w-full lg:w-[75%] min-w-0">
            {/* Back link */}
            <Link
              href="/problems"
              className="text-xs text-[#2563EB] hover:underline"
            >
              &larr; Back to Problems
            </Link>

            {/* Centered Header: Title + Metadata */}
            <div className="text-center mt-4 mb-6">
              <h1 className="text-xl font-bold text-[#222]">
                {displayTitle}
              </h1>
              <div className="mt-2 text-xs text-[#888] leading-5">
                <div>time limit per test: {timeLimitStr}</div>
                <div>memory limit per test: {memoryLimitStr}</div>
              </div>
            </div>

            {/* Problem Statement */}
            <section className="mb-6">
              <MathRenderer html={problem.statement} />
            </section>

            {/* Input Specification */}
            <section className="mb-6">
              <h2 className="text-base font-bold text-[#222] mb-2">Input</h2>
              <MathRenderer html={problem.input_specification} />
            </section>

            {/* Output Specification */}
            <section className="mb-6">
              <h2 className="text-base font-bold text-[#222] mb-2">Output</h2>
              <MathRenderer html={problem.output_specification} />
            </section>

            {/* Constraints */}
            {problem.constraints && (
              <section className="mb-6">
                <h2 className="text-base font-bold text-[#222] mb-2">Constraints</h2>
                <MathRenderer html={problem.constraints} />
              </section>
            )}

            {/* Examples */}
            {problem.sample_tests.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-bold text-[#222] mb-3">Examples</h2>
                <SampleTestTabs samples={problem.sample_tests} />
              </section>
            )}

            {/* Notes */}
            {problem.notes && (
              <section className="mb-6">
                <h2 className="text-base font-bold text-[#222] mb-2">Note</h2>
                <MathRenderer html={problem.notes} />
              </section>
            )}
          </div>

          {/* ==============================
              RIGHT COLUMN — Sidebar Widgets
              ============================== */}
          <aside className="w-full lg:w-[25%] space-y-4">
            {/* Contest Info Widget */}
            <ContestInfoWidget
              contestName={problem.contest_id ? undefined : undefined}
              contestId={problem.contest_id}
              status="practice"
            />

            {/* Submit Widget */}
            <SubmitWidget problemId={problem.problem_id} />

            {/* Contest Materials Widget */}
            <ContestMaterialsWidget />

            {/* Tags */}
            {problem.tags.length > 0 && (
              <div className="border border-[#E6E7EB] rounded-sm overflow-hidden">
                <div className="bg-[#F4F4F4] px-3 py-2 text-sm text-[#2563EB] font-medium">
                  <span className="mr-1">→</span>
                  Tags
                </div>
                <div className="bg-white px-3 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {problem.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm bg-[#E6E7EB] px-2 py-0.5 text-xs text-[#555]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="border border-[#E6E7EB] rounded-sm overflow-hidden">
              <div className="bg-[#F4F4F4] px-3 py-2 text-sm text-[#2563EB] font-medium">
                <span className="mr-1">→</span>
                Quick Links
              </div>
              <div className="bg-white px-3 py-3">
                <ul className="space-y-1 text-sm">
                  <li>
                    <Link
                      href={`/problems/${problem.problem_id}/editor`}
                      className="text-[#2563EB] hover:underline"
                    >
                      Submit Solution
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/problems/${problem.problem_id}/submissions`}
                      className="text-[#2563EB] hover:underline"
                    >
                      Submissions
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/problems/${problem.problem_id}/discussion`}
                      className="text-[#2563EB] hover:underline"
                    >
                      Discussion
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}