"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Calendar,
  Timer,
  ArrowLeft,
  Code2,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import GuestGuard from "@/components/guards/GuestGuard";
import { getContestById, getContestProblems, type Contest, type ContestProblem } from "@/services/contests";
import { useToast } from "@/hooks/useToast";

function ContestDetailContent({ params }: { params: { contestId: string } }) {
  const toast = useToast();
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContest() {
      try {
        const [contestData, problemsData] = await Promise.all([
          getContestById(params.contestId),
          getContestProblems(params.contestId),
        ]);
        setContest(contestData);
        setProblems(problemsData);
      } catch (err) {
        console.error("Failed to fetch contest:", err);
        toast.error({
          title: "Failed to Load Contest",
          description: "Please try again later.",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchContest();
  }, [params.contestId]);

  const formatDate = (starttime: string | null) => {
    if (!starttime) return "TBD";
    return new Date(starttime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return "—";
    return `${duration} minutes`;
  };

  const formatTimeLimit = (ms: number) => {
    return `${ms / 1000} sec`;
  };

  const formatMemoryLimit = (mb: number) => {
    return `${mb} MB`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-[#111827] animate-pulse rounded-lg" />
            <div className="h-40 rounded-2xl bg-[#111827] animate-pulse" />
            <div className="h-64 rounded-2xl bg-[#111827] animate-pulse" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!contest) {
    return (
      <AppLayout>
        <div className="px-6 py-6">
          <div className="max-w-4xl mx-auto text-center py-16">
            <p className="text-sm text-[#9CA3AF]">Contest not found.</p>
            <Link href="/contests" className="text-[#7C3AED] text-sm mt-2 inline-block">
              ← Back to Contests
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link href="/contests" className="text-[#9CA3AF] hover:text-white text-sm flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Contests
            </Link>
          </div>

          {/* Contest Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">{contest.name}</h1>
                  </div>
                  <p className="text-sm text-[#9CA3AF]">{problems.length} problems</p>
                </div>
                <Link
                  href={`/contests/${contest.id}/register`}
                  className="px-4 py-2 rounded-lg bg-[#7C3AED] text-xs font-bold text-white hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
                >
                  Register
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-[#0B0D12] p-4">
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
                    Start Time
                  </div>
                  <p className="text-sm font-semibold text-white">{formatDate(contest.starttime)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0B0D12] p-4">
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                    <Timer className="w-3.5 h-3.5 text-[#F59E0B]" />
                    Duration
                  </div>
                  <p className="text-sm font-semibold text-white">{formatDuration(contest.duration)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0B0D12] p-4">
                  <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                    <Code2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    Problems
                  </div>
                  <p className="text-sm font-semibold text-white">{problems.length}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Problems List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#7C3AED]" />
              Problems
            </h2>
            {problems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#9CA3AF]">No problems available for this contest yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">#</th>
                      <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Title</th>
                      <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Rating</th>
                      <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Time Limit</th>
                      <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Memory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {problems.map((problem) => (
                      <tr
                        key={problem.id}
                        className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-xs text-[#9CA3AF]">{problem.problem_index || problem.id}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/problems/${problem.problem_id}`}
                            className="text-sm font-medium text-white hover:text-[#7C3AED] transition-colors"
                          >
                            {problem.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">{problem.rating || "—"}</td>
                        <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">{formatTimeLimit(problem.time_limit_ms)}</td>
                        <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">{formatMemoryLimit(problem.memory_limit_mb)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ContestDetailPage({ params }: { params: { contestId: string } }) {
  return (
    <GuestGuard action="join-contest">
      <ContestDetailContent params={params} />
    </GuestGuard>
  );
}
