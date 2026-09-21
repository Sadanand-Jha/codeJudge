"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Users,
  Target,
  Award,
  Sparkles,
  Loader2,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getQuizByCode, joinQuiz, type Quiz } from "@/services/quiz";
import { toast } from "@/lib/toast";

type Step = "code" | "details";

export default function JoinQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [raw, setRaw] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const groups = digits.match(/.{1,4}/g) ?? [];
  const display = groups.join("-");
  const valid = digits.length === 16;

  const handleLookup = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getQuizByCode(digits);
      setQuiz(data as unknown as Quiz);
      setStep("details");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Quiz not found. Please check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!quiz || joining) return;
    setJoining(true);
    try {
      await joinQuiz({ code: quiz.code });
      toast.success({ title: "Joined!", description: `You've joined "${quiz.name}"` });
      router.push(`/quiz/${quiz.code}/waiting`);
    } catch (err: any) {
      toast.error({
        title: "Could not join",
        description: err?.response?.data?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setJoining(false);
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "Not set";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  };

  const getTimeRemaining = (iso: string | null) => {
    if (!iso) return null;
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "Started";
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getQuizStatus = () => {
    if (!quiz) return null;
    const now = Date.now();
    const start = quiz.starttime ? new Date(quiz.starttime).getTime() : null;
    const end = quiz.endtime ? new Date(quiz.endtime).getTime() : null;

    if (start && now < start) return { label: "Upcoming", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    if (end && now > end) return { label: "Ended", color: "text-red-500 bg-red-500/10 border-red-500/20" };
    return { label: "Live", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
  };

  const status = getQuizStatus();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 h-14">
          <Link
            href="/quiz"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-text-secondary hover:bg-card-hover transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-sm font-bold text-text-primary">Join Quiz</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {step === "code" ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#BE185D] mx-auto">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Enter Quiz Code</h2>
                  <p className="text-sm text-text-muted mt-1">
                    Enter the 16-character code shared by your teacher
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Quiz Code
                </label>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={19}
                  value={display}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="ABCD-1234-EFGH-5678"
                  className="w-full text-center text-2xl font-mono font-bold tracking-[0.2em] px-4 py-4 rounded-xl border border-border bg-input-bg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-[#EC4899]/40 focus:ring-2 focus:ring-[#EC4899]/10 transition-all"
                  autoFocus
                />

                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                    <p className="text-xs text-red-500">{error}</p>
                  </div>
                )}

                {!valid && digits.length > 0 && (
                  <p className="text-[11px] text-text-muted text-center">
                    Enter the full 16-character code ({digits.length}/16)
                  </p>
                )}

                <button
                  onClick={handleLookup}
                  disabled={!valid || loading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-bold text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Look Up Quiz <ChevronRight className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </motion.div>
          ) : quiz ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <button
                onClick={() => { setStep("code"); setQuiz(null); setError(null); setRaw(""); }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change code
              </button>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="bg-gradient-to-r from-[#EC4899]/10 to-[#BE185D]/10 px-6 py-5 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h2 className="text-xl font-bold text-text-primary truncate">{quiz.name}</h2>
                      <p className="text-xs text-text-muted">
                        by {quiz.creator_name || "Unknown"} &bull; Code: <span className="font-mono text-text-secondary">{quiz.code}</span>
                      </p>
                    </div>
                    {status && (
                      <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {status.label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard
                      icon={Clock}
                      label="Duration"
                      value={quiz.duration ? `${quiz.duration} min` : "Not set"}
                      color="#3B82F6"
                    />
                    <InfoCard
                      icon={Target}
                      label="Total Marks"
                      value={quiz.total_marks?.toString() || "—"}
                      color="#A855F7"
                    />
                    <InfoCard
                      icon={Award}
                      label="Passing Marks"
                      value={quiz.passing_marks?.toString() || "—"}
                      color="#22C55E"
                    />
                    <InfoCard
                      icon={BookOpen}
                      label="Difficulty"
                      value={quiz.difficulty?.toString() || "—"}
                      color="#F59E0B"
                    />
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Schedule</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <Calendar className="h-3.5 w-3.5" />
                          Starts
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-text-primary">{formatDateTime(quiz.starttime)}</p>
                          {quiz.starttime && (
                            <p className="text-[10px] text-text-muted">{getTimeRemaining(quiz.starttime)}</p>
                          )}
                        </div>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <Calendar className="h-3.5 w-3.5" />
                          Ends
                        </div>
                        <p className="text-xs font-medium text-text-primary">{formatDateTime(quiz.endtime)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Settings</h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Negative Marking</span>
                        <span className={quiz.negative_marking ? "text-red-500 font-medium" : "text-text-secondary"}>
                          {quiz.negative_marking ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Shuffle Questions</span>
                        <span className="text-text-secondary">{quiz.shuffle_questions ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Shuffle Options</span>
                        <span className="text-text-secondary">{quiz.shuffle_options ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Leaderboard</span>
                        <span className="text-text-secondary">{quiz.leaderboard ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleJoin}
                disabled={joining || status?.label === "Ended"}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-bold text-white hover:shadow-[0_0_24px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status?.label === "Ended" ? (
                  "Quiz Has Ended"
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Join Quiz
                  </>
                )}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <p className="text-sm font-bold text-text-primary pl-0.5">{value}</p>
    </div>
  );
}
