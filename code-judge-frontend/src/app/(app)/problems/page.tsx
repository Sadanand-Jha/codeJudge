import { fetchProblems } from "@/services/problems";
import ProblemsList from "./ProblemsList";

export const metadata = {
  title: "Problems — CodeJudge",
  description: "Browse thousands of coding challenges from beginner to expert on CodeJudge.",
};

export default async function ProblemsPage() {
  try {
    const problems = await fetchProblems();
    return <ProblemsList problems={problems} />;
  } catch {
    return (
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl border border-white/[0.06] bg-[#111827] p-8 text-center max-w-md mx-auto shadow-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Failed to load problems</h2>
            <p className="text-sm text-[#9CA3AF] mb-6">There was an error fetching the problems list. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
}