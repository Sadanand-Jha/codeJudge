"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Clock, ArrowRight, Calendar } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import GuestGuard from "@/components/guards/GuestGuard";
import { getAllContests, type Contest } from "@/services/contests";
import { useToast } from "@/hooks/useToast";

function ContestsContent() {
  const toast = useToast();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContests() {
      try {
        const data = await getAllContests();
        setContests(data);
      } catch (err) {
        console.error("Failed to fetch contests:", err);
        toast.error({
          title: "Failed to Load Contests",
          description: "Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchContests();
  }, []);

  const now = new Date();
  const upcomingContests = contests.filter((c) => c.starttime && new Date(c.starttime) > now);
  const pastContests = contests.filter((c) => !c.starttime || new Date(c.starttime) <= now);

  const formatStartsIn = (starttime: string | null) => {
    if (!starttime) return "TBD";
    const diff = new Date(starttime).getTime() - Date.now();
    if (diff <= 0) return "Started";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return "—";
    return `${duration} min`;
  };

  const formatDate = (starttime: string | null) => {
    if (!starttime) return "—";
    return new Date(starttime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-6 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-[#111827] animate-pulse rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-[#111827] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

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
            {upcomingContests.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827]/40 p-8 text-center">
                <p className="text-sm text-[#9CA3AF]">No upcoming contests right now.</p>
              </div>
            ) : (
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
                          Starts in {formatStartsIn(contest.starttime)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                          <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
                          {formatDuration(contest.duration)}
                        </div>
                      </div>
                      <Link
                        href={`/contests/${contest.id}/register`}
                        className="block w-full px-3 py-2 rounded-lg text-[11px] font-semibold text-center text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
                      >
                        Register Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Contests */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Past Contests</h2>
            {pastContests.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-[#111827]/40 p-8 text-center">
                <p className="text-sm text-[#9CA3AF]">No past contests yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#111827]/40">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-[#111827]">
                      <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Contest</th>
                      <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Date</th>
                      <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Duration</th>
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
                        <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">{formatDate(contest.starttime)}</td>
                        <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">{formatDuration(contest.duration)}</td>
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
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ContestsPage() {
  return (
    <GuestGuard action="join-contest">
      <ContestsContent />
    </GuestGuard>
  );
}