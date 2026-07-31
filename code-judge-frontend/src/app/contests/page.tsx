import Link from "next/link";
import { Trophy, Clock, Users, ArrowRight, Calendar } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";

export const metadata = {
  title: "Contests — ByteClash",
  description: "Compete in coding contests on ByteClash.",
};

const upcomingContests = [
  { id: "1", name: "Weekly Contest 420", startsIn: "02h 15m", participants: 1240, duration: "90 min" },
  { id: "2", name: "Biweekly Contest 121", startsIn: "1d 4h", participants: 890, duration: "120 min" },
  { id: "3", name: "ByteClash Round #900", startsIn: "3d 6h", participants: 2100, duration: "120 min" },
];

const pastContests = [
  { id: "4", name: "Weekly Contest 419", date: "Dec 15, 2024", participants: 1850, rank: 245 },
  { id: "5", name: "Biweekly Contest 120", date: "Dec 8, 2024", participants: 1620, rank: 189 },
  { id: "6", name: "ByteClash Round #895", date: "Dec 1, 2024", participants: 2200, rank: 678 },
  { id: "7", name: "Weekly Contest 418", date: "Nov 24, 2024", participants: 1750, rank: 512 },
];

export default function ContestsPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Contests</h1>
            <p className="text-sm text-[#9CA3AF] mt-1">Compete with coders worldwide and climb the ranks.</p>
          </div>

          {/* Upcoming Contests */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Upcoming Contests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingContests.map((contest) => (
                <div
                  key={contest.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111827] p-5 transition-all hover:border-[#7C3AED]/30 hover:shadow-[0_0_24px_rgba(124,58,237,0.08)]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 rounded-full blur-[60px]" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-[#7C3AED]" />
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-full border border-[#22C55E]/20">
                        Upcoming
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-3">{contest.name}</h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                        Starts in {contest.startsIn}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
                        {contest.participants.toLocaleString()} registered
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
                        {contest.duration}
                      </div>
                    </div>
                    <button className="w-full px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all">
                      Register Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Contests */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Past Contests</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#111827]/40">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-[#111827]">
                    <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Contest</th>
                    <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Date</th>
                    <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Participants</th>
                    <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Your Rank</th>
                    <th className="text-center text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {pastContests.map((contest) => (
                    <tr
                      key={contest.id}
                      className="group border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/contests/${contest.id}`}
                          className="text-sm font-medium text-white hover:text-[#7C3AED] transition-colors"
                        >
                          {contest.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">{contest.date}</td>
                      <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">{contest.participants.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-[#7C3AED]">#{contest.rank}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/contests/${contest.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#9CA3AF] hover:text-white hover:bg-[#7C3AED] hover:border-[#7C3AED] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}