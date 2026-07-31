/**
 * ================================================================
 * Problem Detail Page  (/problems/[problemId])
 * ================================================================
 * 
 * CONNECTION FLOW:
 * 
 *   User visits /problems/4A
 *     │
 *     ├── This is a Next.js SERVER COMPONENT (SSR)
 *     │   - params → { problemId: "4A" }
 *     │   - Fetches data on the server before rendering
 *     │   - SEO: generateMetadata() sets <title> and <meta> from problem data
 *     │
 *     ├── fetchProblem("4A")
 *     │   → GET http://localhost:8000/api/problems/4A
 *     │   → Backend responds: { success: true, data: Problem }
 *     │   → Service unwraps the envelope → returns Problem
 *     │
 *     ├── Success: <ProblemClient problem={Problem} />
 *     │   → Client component with:
 *     │     - ProblemHeader (title, contest, rating, source)
 *     │     - ProblemStatement (HTML statement, input, output, constraints)
 *     │     - SampleTestCard (input/output/explanation for each sample)
 *     │     - ProblemInfoCard (sidebar with limits, tags, etc.)
 *     │
 *     └── Error: Renders "Problem not found" with link back to /problems
 * 
 * 
 * PROPS PASSED DOWN:
 *   ProblemClient receives: Problem
 *   Shape: { id, problem_id, title, statement, input_specification,
 *            output_specification, constraints, notes, time_limit,
 *            time_limit_ms, space_limit, memory_limit_mb, rating,
 *            source, contest_id, problem_index, tags, sample_tests }
 * 
 * ================================================================
 */

import Link from "next/link";
import { fetchProblem } from "@/services/problems";
import ProblemClient from "./ProblemClient";
import ProblemSkeleton from "@/components/problem/ProblemSkeleton";
import type { ProblemPageProps } from "@/types/problem";

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { problemId } = await params;

  try {
    const problem = await fetchProblem(problemId);
    return <ProblemClient problem={problem} />;
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F3F4F6]">
            <svg
              className="h-8 w-8 text-[#9CA3AF]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[#111827]">
            Problem not found
          </h2>
          <p className="mb-6 text-sm text-[#6B7280]">
            The problem you are looking for does not exist or could not be loaded.
          </p>
          <Link
            href="/problems"
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Browse Problems
          </Link>
        </div>
      </div>
    );
  }
}

export async function generateMetadata({ params }: ProblemPageProps) {
  const { problemId } = await params;

  try {
    const problem = await fetchProblem(problemId);
    return {
      title: `${problem.title} — ByteClash`,
      description: problem.statement
        ? problem.statement.replace(/<[^>]*>/g, "").slice(0, 160)
        : `Solve ${problem.title} on ByteClash`,
    };
  } catch {
    return {
      title: "Problem — ByteClash",
    };
  }
}