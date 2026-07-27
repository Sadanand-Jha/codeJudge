import Link from "next/link";

export default function InterviewPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Interview Preparation</h1>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#E6E7EB] bg-white p-4">
          <h3 className="text-sm font-bold text-[#111827] mb-1">Data Structures</h3>
          <p className="text-[10px] text-[#6B7280] mb-2">Arrays, Linked Lists, Trees, Graphs</p>
          <Link href="/problems?tag=Data+Structures" className="text-[10px] text-[#2563EB] hover:underline">Practice →</Link>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4">
          <h3 className="text-sm font-bold text-[#111827] mb-1">Algorithms</h3>
          <p className="text-[10px] text-[#6B7280] mb-2">Sorting, DP, Graph Algorithms</p>
          <Link href="/problems?tag=Algorithms" className="text-[10px] text-[#2563EB] hover:underline">Practice →</Link>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4">
          <h3 className="text-sm font-bold text-[#111827] mb-1">System Design</h3>
          <p className="text-[10px] text-[#6B7280] mb-2">Coming soon</p>
        </div>
        <div className="border border-[#E6E7EB] bg-white p-4">
          <h3 className="text-sm font-bold text-[#111827] mb-1">Mock Interviews</h3>
          <p className="text-[10px] text-[#6B7280] mb-2">Coming soon</p>
        </div>
      </div>
    </div>
  );
}