import Link from "next/link";

export default function SubmissionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Submissions</h1>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ All Submissions</span>
        </div>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[#E6E7EB] text-[#6B7280]">
              <th className="px-3 py-1.5 text-left font-medium">ID</th>
              <th className="px-3 py-1.5 text-left font-medium">Problem</th>
              <th className="px-3 py-1.5 text-left font-medium">Verdict</th>
              <th className="px-3 py-1.5 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E6E7EB] bg-white hover:bg-[#F0F4FF]">
              <td className="px-3 py-1.5 text-[#9CA3AF]" colSpan={4}>
                No submissions yet.
              </td>
            </tr>
          </tbody>
        </table>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <Link href="/problems" className="text-[#2563EB] hover:underline">Browse problems →</Link>
        </div>
      </div>
    </div>
  );
}