import { fetchProblems } from "@/services/problems";
import { ProblemsLanding } from "./ProblemsLanding";
import type { ProblemListItem } from "@/types/problem";

export const metadata = {
  title: "Problems — ByteClash",
  description: "Competitive programming and every competitive exam — one practice hub on ByteClash.",
};

function FailedToLoad() {
  return (
    <div className="px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-md mx-auto shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Failed to load problems</h2>
          <p className="text-sm text-muted-foreground mb-6">There was an error fetching the problems list. Please try again later.</p>
        </div>
      </div>
    </div>
  );
}

export default async function ProblemsPage() {
  let problems: ProblemListItem[] | null = null;
  try {
    problems = await fetchProblems();
  } catch {
    problems = null;
  }
  if (!problems) return <FailedToLoad />;
  return <ProblemsLanding problems={problems} />;
}