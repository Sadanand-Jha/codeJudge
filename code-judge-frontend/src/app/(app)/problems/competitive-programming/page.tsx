import { fetchProblems } from "@/services/problems";
import { CompetitiveProgrammingPage } from "./CompetitiveProgrammingPage";
import type { ProblemListItem } from "@/types/problem";

export const metadata = {
  title: "Competitive Programming — ByteClash",
  description: "Live competitive programming and DSA problems from the ByteClash database.",
};

export default async function CompetitiveProgrammingRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let problems: ProblemListItem[] | null = null;
  try {
    problems = await fetchProblems();
  } catch {
    problems = null;
  }

  if (!problems) {
    return (
      <div className="px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#7C3AED]/10">
              <DatabaseIcon />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">Failed to load problems</h2>
            <p className="mb-6 text-sm text-text-muted">There was an error fetching the problems list. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return <CompetitiveProgrammingPage problems={problems} initialQuery={q} />;
}

function DatabaseIcon() {
  return (
    <svg className="h-8 w-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  );
}