"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Search,
  Sparkles,
  Trophy,
  BookOpen,
  Building2,
  Layers3,
  BadgeCheck,
  RotateCcw,
  Eye,
  BarChart3,
} from "lucide-react";

type AttemptStatus = "Completed" | "Submitted" | "Timed Out" | "Left Early";
type AttemptVisibility = "Public" | "College" | "Classroom";

interface AttemptCardData {
  id: string;
  attemptId: string;
  quizId: string;
  title: string;
  subject: string;
  createdBy: string;
  creatorRole: "Teacher" | "Admin";
  visibility: AttemptVisibility;
  attemptedAt: string;
  submittedAt: string;
  timeTaken: string;
  scoreEarned: number;
  totalScore: number;
  percentage: number;
  rank?: number;
  status: AttemptStatus;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  allowReattempt: boolean;
}

const MOCK_ATTEMPTS: AttemptCardData[] = [
  {
    id: "attempt-001",
    attemptId: "attempt-001",
    quizId: "quiz-graphs-01",
    title: "Graph Algorithms Sprint",
    subject: "Data Structures",
    createdBy: "Prof. S. Rao",
    creatorRole: "Teacher",
    visibility: "Classroom",
    attemptedAt: "2026-08-03T09:30:00.000Z",
    submittedAt: "2026-08-03T09:49:24.000Z",
    timeTaken: "18m 24s",
    scoreEarned: 18,
    totalScore: 20,
    percentage: 90,
    rank: 7,
    status: "Completed",
    totalQuestions: 20,
    correctAnswers: 18,
    wrongAnswers: 1,
    skippedQuestions: 1,
    allowReattempt: true,
  },
  {
    id: "attempt-002",
    attemptId: "attempt-002",
    quizId: "quiz-sql-02",
    title: "SQL Mastery Checkpoint",
    subject: "Database Systems",
    createdBy: "Admin Team",
    creatorRole: "Admin",
    visibility: "Public",
    attemptedAt: "2026-08-01T18:05:00.000Z",
    submittedAt: "2026-08-01T18:31:42.000Z",
    timeTaken: "26m 42s",
    scoreEarned: 14,
    totalScore: 20,
    percentage: 70,
    rank: 31,
    status: "Submitted",
    totalQuestions: 20,
    correctAnswers: 14,
    wrongAnswers: 4,
    skippedQuestions: 2,
    allowReattempt: false,
  },
  {
    id: "attempt-003",
    attemptId: "attempt-003",
    quizId: "quiz-os-03",
    title: "Operating Systems Challenge",
    subject: "Computer Science",
    createdBy: "Dr. Mehta",
    creatorRole: "Teacher",
    visibility: "College",
    attemptedAt: "2026-07-29T13:10:00.000Z",
    submittedAt: "2026-07-29T13:34:12.000Z",
    timeTaken: "24m 12s",
    scoreEarned: 11,
    totalScore: 20,
    percentage: 55,
    rank: 44,
    status: "Timed Out",
    totalQuestions: 20,
    correctAnswers: 11,
    wrongAnswers: 6,
    skippedQuestions: 3,
    allowReattempt: true,
  },
  {
    id: "attempt-004",
    attemptId: "attempt-004",
    quizId: "quiz-dsa-04",
    title: "Arrays and Two Pointers",
    subject: "Algorithms",
    createdBy: "Prof. Iyer",
    creatorRole: "Teacher",
    visibility: "Classroom",
    attemptedAt: "2026-07-25T08:00:00.000Z",
    submittedAt: "2026-07-25T08:14:33.000Z",
    timeTaken: "14m 33s",
    scoreEarned: 20,
    totalScore: 20,
    percentage: 100,
    rank: 1,
    status: "Completed",
    totalQuestions: 20,
    correctAnswers: 20,
    wrongAnswers: 0,
    skippedQuestions: 0,
    allowReattempt: false,
  },
  {
    id: "attempt-005",
    attemptId: "attempt-005",
    quizId: "quiz-networks-05",
    title: "Networking Fundamentals Review",
    subject: "Computer Networks",
    createdBy: "Admin Team",
    creatorRole: "Admin",
    visibility: "Public",
    attemptedAt: "2026-07-22T15:20:00.000Z",
    submittedAt: "2026-07-22T15:39:58.000Z",
    timeTaken: "19m 58s",
    scoreEarned: 12,
    totalScore: 20,
    percentage: 60,
    rank: 26,
    status: "Left Early",
    totalQuestions: 20,
    correctAnswers: 12,
    wrongAnswers: 5,
    skippedQuestions: 3,
    allowReattempt: true,
  },
  {
    id: "attempt-006",
    attemptId: "attempt-006",
    quizId: "quiz-java-06",
    title: "Java OOP Deep Dive",
    subject: "Programming Languages",
    createdBy: "Ms. Khan",
    creatorRole: "Teacher",
    visibility: "College",
    attemptedAt: "2026-07-18T11:45:00.000Z",
    submittedAt: "2026-07-18T12:09:11.000Z",
    timeTaken: "24m 11s",
    scoreEarned: 16,
    totalScore: 20,
    percentage: 80,
    rank: 12,
    status: "Submitted",
    totalQuestions: 20,
    correctAnswers: 16,
    wrongAnswers: 2,
    skippedQuestions: 2,
    allowReattempt: true,
  },
  {
    id: "attempt-007",
    attemptId: "attempt-007",
    quizId: "quiz-ml-07",
    title: "Machine Learning Basics",
    subject: "Artificial Intelligence",
    createdBy: "Dr. Patel",
    creatorRole: "Teacher",
    visibility: "Public",
    attemptedAt: "2026-07-14T10:15:00.000Z",
    submittedAt: "2026-07-14T10:28:41.000Z",
    timeTaken: "13m 41s",
    scoreEarned: 9,
    totalScore: 20,
    percentage: 45,
    rank: 55,
    status: "Timed Out",
    totalQuestions: 20,
    correctAnswers: 9,
    wrongAnswers: 7,
    skippedQuestions: 4,
    allowReattempt: false,
  },
];

const STATUS_OPTIONS: Array<AttemptStatus | "All"> = ["All", "Completed", "Submitted", "Timed Out", "Left Early"];
const SCORE_OPTIONS = ["All", "90+", "70-89", "50-69", "Below 50"];
const SORT_OPTIONS = ["Newest", "Oldest", "Highest Score", "Lowest Score"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(status: AttemptStatus) {
  switch (status) {
    case "Completed":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Submitted":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "Timed Out":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Left Early":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  }
}

function visibilityTone(visibility: AttemptVisibility) {
  switch (visibility) {
    case "Public":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "College":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "Classroom":
      return "bg-pink-500/10 text-pink-400 border-pink-500/20";
  }
}

function scoreTone(percentage: number) {
  if (percentage >= 85) return "text-emerald-400";
  if (percentage >= 70) return "text-sky-400";
  if (percentage >= 50) return "text-amber-400";
  return "text-rose-400";
}

function scoreFilterMatch(percentage: number, filter: string) {
  switch (filter) {
    case "90+":
      return percentage >= 90;
    case "70-89":
      return percentage >= 70 && percentage < 90;
    case "50-69":
      return percentage >= 50 && percentage < 70;
    case "Below 50":
      return percentage < 50;
    default:
      return true;
  }
}

export default function PreviousQuizzesSection() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [dateRange, setDateRange] = useState("All time");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("All");
  const [score, setScore] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsHydrated(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  const allSubjects = useMemo(() => ["All", ...new Set(MOCK_ATTEMPTS.map((attempt) => attempt.subject))], []);

  const filteredAttempts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    return MOCK_ATTEMPTS.filter((attempt) => {
      const matchesSearch =
        !query ||
        [attempt.title, attempt.subject, attempt.createdBy, attempt.creatorRole, attempt.visibility, attempt.status]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesSubject = subject === "All" || attempt.subject === subject;
      const matchesStatus = status === "All" || attempt.status === status;
      const matchesScore = scoreFilterMatch(attempt.percentage, score);

      const attemptDate = new Date(attempt.attemptedAt);
      const matchesDateRange =
        dateRange === "All time" ||
        (dateRange === "Last 7 days" && now.getTime() - attemptDate.getTime() <= 7 * 24 * 60 * 60 * 1000) ||
        (dateRange === "Last 30 days" && now.getTime() - attemptDate.getTime() <= 30 * 24 * 60 * 60 * 1000) ||
        (dateRange === "Last 90 days" && now.getTime() - attemptDate.getTime() <= 90 * 24 * 60 * 60 * 1000);

      return matchesSearch && matchesSubject && matchesStatus && matchesScore && matchesDateRange;
    });
  }, [dateRange, score, search, status, subject]);

  const sortedAttempts = useMemo(() => {
    const items = [...filteredAttempts];
    items.sort((a, b) => {
      if (sortBy === "Oldest") return new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime();
      if (sortBy === "Highest Score") return b.percentage - a.percentage;
      if (sortBy === "Lowest Score") return a.percentage - b.percentage;
      return new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime();
    });
    return items;
  }, [filteredAttempts, sortBy]);

  const pageSize = 4;
  const totalAttempts = sortedAttempts.length;
  const totalPages = Math.max(1, Math.ceil(totalAttempts / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = sortedAttempts.slice(pageStart, pageStart + pageSize);
  const pageEnd = Math.min(pageStart + pageItems.length, totalAttempts);

  useEffect(() => {
    setPage(1);
  }, [search, subject, dateRange, status, score, sortBy]);

  const quickSummary = useMemo(() => {
    const completed = MOCK_ATTEMPTS.filter((attempt) => attempt.status === "Completed").length;
    const averageScore = Math.round(
      MOCK_ATTEMPTS.reduce((sum, attempt) => sum + attempt.percentage, 0) / Math.max(1, MOCK_ATTEMPTS.length)
    );
    const averageTime = Math.round(
      MOCK_ATTEMPTS.reduce((sum, attempt) => sum + Number(attempt.timeTaken.split("m")[0]), 0) / Math.max(1, MOCK_ATTEMPTS.length)
    );
    return { completed, averageScore, averageTime };
  }, []);

  return (
    <section className="mb-8 sm:mb-10">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#111217] via-[#0F1117] to-[#09090B] p-[1px] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(236,72,153,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.12),_transparent_28%)]" />
        <div className="relative rounded-3xl bg-[#0B0D12]/95 backdrop-blur-xl p-4 sm:p-6 lg:p-7">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6 mb-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#EC4899]/20 bg-[#EC4899]/10 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F472B6]">
                  <Sparkles className="w-3 h-3" />
                  Student activity
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] font-medium text-[#A1A1AA]">
                  <BookOpen className="w-3 h-3" />
                  Previous quizzes
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Previous Quizzes</h2>
              <p className="mt-1.5 max-w-2xl text-sm text-[#A1A1AA]">
                Review completed, submitted, timed-out, and early-exit attempts with deep score breakdowns, rankings, and reattempt actions.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
              <SummaryStat label="Total Attempts" value={MOCK_ATTEMPTS.length} icon={Layers3} />
              <SummaryStat label="Completed" value={quickSummary.completed} icon={BadgeCheck} />
              <SummaryStat label="Avg Score" value={`${quickSummary.averageScore}%`} icon={BarChart3} />
              <SummaryStat label="Avg Time" value={`${quickSummary.averageTime}m`} icon={Clock3} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 mb-5">
            <FieldInput
              icon={Search}
              label="Search Quiz"
              placeholder="Quiz title, subject, creator..."
              value={search}
              onChange={setSearch}
              className="xl:col-span-2"
            />
            <FieldSelect label="Subject" value={subject} options={allSubjects} onChange={setSubject} />
            <FieldSelect label="Date Range" value={dateRange} options={["All time", "Last 7 days", "Last 30 days", "Last 90 days"]} onChange={setDateRange} />
            <FieldSelect label="Status" value={status} options={[...STATUS_OPTIONS]} onChange={(v) => setStatus(v as (typeof STATUS_OPTIONS)[number])} />
            <FieldSelect label="Score" value={score} options={SCORE_OPTIONS} onChange={setScore} />
            <FieldSelect label="Sort By" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
          </div>

          {!isHydrated ? (
            <AttemptSkeletonGrid />
          ) : MOCK_ATTEMPTS.length === 0 ? (
            <EmptyState />
          ) : sortedAttempts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/[0.08] bg-white/[0.03] px-5 py-8 text-center"
            >
              <p className="text-base font-semibold text-white">No matching quizzes found.</p>
              <p className="mt-1 text-sm text-[#A1A1AA]">Try a different filter or search term.</p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {pageItems.map((attempt, index) => (
                  <AttemptCard key={attempt.id} attempt={attempt} index={index} />
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <div className="text-xs text-[#A1A1AA]">
                  Showing <span className="font-semibold text-white">{pageStart + 1}</span>–<span className="font-semibold text-white">{pageEnd}</span> of <span className="font-semibold text-white">{totalAttempts}</span> quizzes
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-flex text-xs text-[#71717A]">View Attempt Page</span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white transition-all hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNumber = i + 1;
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-all ${
                            pageNumber === currentPage
                              ? "bg-[#EC4899]/15 text-white ring-1 ring-[#EC4899]/30"
                              : "bg-white/[0.03] text-[#A1A1AA] hover:text-white"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white transition-all hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-[#A1A1AA] mb-1">
        <Icon className="w-3.5 h-3.5 text-[#EC4899]" />
        <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function FieldInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  icon: any;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1.5 ${className || ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71717A]">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#0B0D12] px-3 py-2.5 transition-all focus-within:border-[#EC4899]/30 focus-within:ring-1 focus-within:ring-[#EC4899]/20">
        <Icon className="w-4 h-4 shrink-0 text-[#71717A]" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-white placeholder:text-[#52525B] outline-none"
        />
      </div>
    </label>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71717A]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/[0.08] bg-[#0B0D12] px-3 py-2.5 text-sm text-white outline-none transition-all focus:border-[#EC4899]/30 focus:ring-1 focus:ring-[#EC4899]/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AttemptCard({ attempt, index }: { attempt: AttemptCardData; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#10131A] transition-all hover:border-[#EC4899]/25 hover:shadow-[0_18px_48px_rgba(236,72,153,0.10)]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-stretch lg:p-5">
        <button
          type="button"
          onClick={() => window.location.assign(`/quiz/${attempt.quizId}/attempt/${attempt.attemptId}`)}
          className="text-left"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusTone(attempt.status)}`}>
                  {attempt.status}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${visibilityTone(attempt.visibility)}`}>
                  {attempt.visibility}
                </span>
                {attempt.rank !== undefined && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-[#D1D5DB]">
                    <Trophy className="w-3 h-3 text-[#F59E0B]" />
                    Rank #{attempt.rank}
                  </span>
                )}
              </div>

              <h3 className="truncate text-lg font-semibold text-white transition-colors group-hover:text-[#F9A8D4]">{attempt.title}</h3>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                {attempt.subject} · Created by {attempt.createdBy} ({attempt.creatorRole})
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
                <InfoChip label="Attempted" value={formatDate(attempt.attemptedAt)} icon={CalendarDays} />
                <InfoChip label="Time Taken" value={attempt.timeTaken} icon={Clock3} />
                <InfoChip label="Score" value={`${attempt.scoreEarned}/${attempt.totalScore}`} icon={BadgeCheck} />
                <InfoChip label="Percent" value={`${attempt.percentage}%`} icon={BarChart3} tone={scoreTone(attempt.percentage)} />
                <InfoChip label="Questions" value={attempt.totalQuestions} icon={Layers3} />
                <InfoChip label="Submitted" value={formatDate(attempt.submittedAt)} icon={CalendarDays} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                <span>Correct {attempt.correctAnswers}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>Wrong {attempt.wrongAnswers}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>Skipped {attempt.skippedQuestions}</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>Created by {attempt.createdBy}</span>
              </div>
            </div>
          </div>
        </button>

        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0B0D12] p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#A1A1AA]">
              <span>Performance</span>
              <span className={`font-semibold ${scoreTone(attempt.percentage)}`}>{attempt.percentage}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06]">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${attempt.percentage >= 85 ? "from-emerald-400 to-cyan-400" : attempt.percentage >= 70 ? "from-sky-400 to-cyan-300" : attempt.percentage >= 50 ? "from-amber-400 to-orange-300" : "from-rose-400 to-pink-300"}`}
                style={{ width: `${attempt.percentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-[#A1A1AA]">
              <MetricTile label="Correct" value={attempt.correctAnswers} tone="text-emerald-400" />
              <MetricTile label="Wrong" value={attempt.wrongAnswers} tone="text-rose-400" />
              <MetricTile label="Skipped" value={attempt.skippedQuestions} tone="text-zinc-400" />
              <MetricTile label="Questions" value={attempt.totalQuestions} tone="text-white" />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`/quiz/${attempt.quizId}/attempt/${attempt.attemptId}`}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:border-white/[0.16] hover:bg-white/[0.06]"
            >
              <Eye className="w-3.5 h-3.5" />
              View Attempt
            </Link>
            <Link
              href={`/quiz/${attempt.quizId}/results/${attempt.attemptId}`}
              onClick={(event) => event.stopPropagation()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs font-semibold text-sky-300 transition-all hover:bg-sky-500/15"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              View Result
            </Link>
            {attempt.allowReattempt && (
              <Link
                href="#join-quiz"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EC4899]/30 bg-[#EC4899]/10 px-4 py-2.5 text-xs font-semibold text-[#F472B6] transition-all hover:bg-[#EC4899]/15"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reattempt
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function InfoChip({
  label,
  value,
  icon: Icon,
  tone = "text-white",
}: {
  label: string;
  value: string | number;
  icon: any;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[#71717A]">
        <Icon className="w-3 h-3 text-[#EC4899]" />
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${tone} truncate`}>{value}</div>
    </div>
  );
}

function MetricTile({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#71717A]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function AttemptSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-20 rounded-full bg-white/[0.08]" />
              <div className="h-6 w-24 rounded-full bg-white/[0.08]" />
            </div>
            <div className="h-5 w-3/4 rounded bg-white/[0.08]" />
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, itemIndex) => (
                <div key={itemIndex} className="h-16 rounded-2xl bg-white/[0.06]" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#10131A] p-6 sm:p-10"
    >
      <div className="absolute -right-16 top-4 h-48 w-48 rounded-full bg-[#EC4899]/10 blur-3xl" />
      <div className="relative mx-auto max-w-xl text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.03]">
          <Building2 className="h-9 w-9 text-[#F472B6]" />
        </div>
        <h3 className="text-2xl font-semibold text-white">You haven't attempted any quizzes yet.</h3>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          Join your first quiz to unlock a personal history of scores, rankings, mistakes, and reattempts.
        </p>
        <Link
          href="#join-quiz"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(236,72,153,0.22)] transition-transform hover:scale-[1.02]"
        >
          Join Your First Quiz
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}