import Link from "next/link";

export default function ContestsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Contests</h1>
      </div>

      {/* Upcoming Contests */}
      <div className="mb-4 border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Upcoming Contests</span>
        </div>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <p>No upcoming contests at this time. Check back later.</p>
        </div>
      </div>

      {/* Past Contests */}
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Past Contests</span>
        </div>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[#E6E7EB] text-[#6B7280]">
              <th className="px-3 py-1.5 text-left font-medium">#</th>
              <th className="px-3 py-1.5 text-left font-medium">Name</th>
              <th className="px-3 py-1.5 text-right font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E6E7EB] bg-white hover:bg-[#F0F4FF]">
              <td className="px-3 py-1.5">
                <Link href="/contests/1" className="text-[#6A5ACD] hover:text-[#2563EB]">1</Link>
              </td>
              <td className="px-3 py-1.5">
                <Link href="/contests/1" className="text-[#2563EB] hover:underline">Codeforces Round #1</Link>
              </td>
              <td className="px-3 py-1.5 text-right text-[#9CA3AF]">Jan 15, 2025</td>
            </tr>
            <tr className="border-b border-[#E6E7EB] bg-[#FAFAFB] hover:bg-[#F0F4FF]">
              <td className="px-3 py-1.5">
                <Link href="/contests/2" className="text-[#6A5ACD] hover:text-[#2563EB]">2</Link>
              </td>
              <td className="px-3 py-1.5">
                <Link href="/contests/2" className="text-[#2563EB] hover:underline">Codeforces Round #2</Link>
              </td>
              <td className="px-3 py-1.5 text-right text-[#9CA3AF]">Feb 1, 2025</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}