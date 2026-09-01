"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Clock,
  Calendar,
  Check,
  Shield,
  Timer,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import GuestGuard from "@/components/guards/GuestGuard";
import { getContestById, registerForContest, type Contest } from "@/services/contests";
import { useToast } from "@/hooks/useToast";

function ContestRegisterContent({ params }: { params: { contestId: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [readRules, setReadRules] = useState(false);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    async function fetchContest() {
      try {
        const data = await getContestById(params.contestId);
        setContest(data);
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

  const canRegister = agreed && readRules;

  const formatDate = (starttime: string | null) => {
    if (!starttime) return "TBD";
    return new Date(starttime).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
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

  const handleRegister = async () => {
    if (!canRegister) {
      toast.error({
        title: "Please Confirm",
        description: "You must agree to the rules and confirm you've read the instructions.",
      });
      return;
    }
    setRegistering(true);
    try {
      await registerForContest(rated);
      toast.success({
        title: "Registered!",
        description: "You have successfully registered for the contest.",
      });
      router.push(`/contests/${params.contestId}`);
    } catch (err: any) {
      toast.error({
        title: "Registration Failed",
        description: err?.response?.data?.message || "Please try again.",
      });
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-card animate-pulse rounded-lg" />
            <div className="h-64 rounded-2xl bg-card animate-pulse" />
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
            <p className="text-sm text-muted-foreground">Contest not found.</p>
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
            <Link href="/contests" className="text-muted-foreground hover:text-white text-sm flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Contests
            </Link>
          </div>

          {/* Contest Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border-hover bg-card overflow-hidden"
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
                  <p className="text-sm text-muted-foreground">Register to participate in this contest</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-[#0B0D12] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
                    Start Time
                  </div>
                  <p className="text-sm font-semibold text-white">{formatDate(contest.starttime)}</p>
                </div>
                <div className="rounded-xl border border-border bg-[#0B0D12] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Timer className="w-3.5 h-3.5 text-[#F59E0B]" />
                    Duration
                  </div>
                  <p className="text-sm font-semibold text-white">{formatDuration(contest.duration)}</p>
                </div>
                <div className="rounded-xl border border-border bg-[#0B0D12] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3.5 h-3.5 text-[#22C55E]" />
                    Status
                  </div>
                  <p className="text-sm font-semibold text-[#22C55E]">Upcoming</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rules Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border-hover bg-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#7C3AED]" />
              Contest Rules
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" />
                You must be logged in to participate in the contest.
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" />
                The contest will start at the scheduled time and run for the specified duration.
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" />
                Solutions must be submitted before the contest ends.
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#22C55E] mt-0.5 shrink-0" />
                Plagiarism or cheating will result in disqualification.
              </li>
            </ul>

            {/* Rated toggle */}
            <div className="mt-6 rounded-xl border border-border bg-[#0B0D12] p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">Rated Contest</p>
                  <p className="text-xs text-muted-foreground">Your rating will be affected by your performance</p>
                </div>
                <button
                  onClick={() => setRated(!rated)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${rated ? "bg-[#7C3AED]" : "bg-white/[0.1]"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${rated ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </label>
            </div>

            {/* Confirmations */}
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  onClick={() => setReadRules(!readRules)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    readRules ? "bg-[#7C3AED] border-[#7C3AED]" : "border-white/[0.15]"
                  }`}
                >
                  {readRules && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-sm text-muted-foreground">I have read and understood all the contest rules</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  onClick={() => setAgreed(!agreed)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    agreed ? "bg-[#7C3AED] border-[#7C3AED]" : "border-white/[0.15]"
                  }`}
                >
                  {agreed && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-sm text-muted-foreground">I agree to participate in this contest</span>
              </label>
            </div>

            {/* Register Button */}
            <button
              onClick={handleRegister}
              disabled={registering}
              className="mt-6 w-full px-4 py-3 rounded-xl bg-[#7C3AED] text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {registering ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Registering...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Confirm Registration
                </span>
              )}
            </button>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ContestRegisterPage({ params }: { params: { contestId: string } }) {
  return (
    <GuestGuard action="join-contest">
      <ContestRegisterContent params={params} />
    </GuestGuard>
  );
}