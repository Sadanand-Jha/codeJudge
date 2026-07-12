/**
 * ================================================================
 * Problems List Page  (/problems)
 * ================================================================
 * 
 * CONNECTION FLOW:
 * 
 *   User visits /problems
 *     │
 *     ├── This is a Next.js SERVER COMPONENT (SSR)
 *     │   - Fetches data on the server before rendering
 *     │   - SEO: metadata for title & description
 *     │
 *     ├── fetchProblems()
 *     │   → GET http://localhost:8000/api/problems
 *     │   → Backend responds: { success: true, data: ProblemListItem[] }
 *     │   → Service unwraps the envelope → returns ProblemListItem[]
 *     │
 *     ├── Success: <ProblemsList problems={ProblemListItem[]} />
 *     │   → Client component with search/filter/table
 *     │
 *     └── Error: Renders "Failed to load problems" with error UI
 * 
 * 
 * PROPS PASSED DOWN:
 *   ProblemsList receives: ProblemListItem[]
 *   Each item shape: { id, problem_id, title, rating, time_limit,
 *                      space_limit, tags, source, contest_id, problem_index }
 * 
 * ================================================================
 */

import { fetchProblems } from "@/services/problems";
import ProblemsList from "./ProblemsList";

export const metadata = {
  title: "Problems — CodeJudge",
  description: "Browse all coding problems on CodeJudge",
};

export default async function ProblemsPage() {
  try {
    const problems = await fetchProblems();
    return <ProblemsList problems={problems} />;
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
            Failed to load problems
          </h2>
          <p className="mb-6 text-sm text-[#6B7280]">
            There was an error fetching the problems list. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}