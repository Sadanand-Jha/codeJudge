"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
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
      return "bg-success/10 text-success border-success/20";
    case "Submitted":
      return "bg-accent/10 text-accent border-accent/20";
    case "Timed Out":
      return "bg-warning/10 text-warning border-warning/20";
    case "Left Early":
      return "bg-danger/10 text-danger border-danger/20";
  }
}

function visibilityTone(visibility: AttemptVisibility) {
  switch (visibility) {
    case "Public":
      return "bg-success/10 text-success border-success/20";
    case "College":
      return "bg-accent/10 text-accent border-accent/20";
    case "Classroom":
      return "bg-[#EC4899]/10 text-[#EC4899] border-[#EC4899]/20";
  }
}

function scoreTone(percentage: number) {
  if (percentage >= 85) return "text-success";
  if (percentage >= 70) return "text-accent";
  if (percentage >= 50) return "text-warning";
  return "text-danger";
}

function scoreBarTone(percentage: number) {
  if (percentage >= 85) return "bg-success";
  if (percentage >= 70) return "bg-accent";
  if (percentage >= 50) return "bg-warning";
  return "bg-danger";
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

  const pageSize = 20;
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-[1px] shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(124,58,237,0.06),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.04),_transparent_28%)]" />
        <div className="relative rounded-2xl bg-card backdrop-blur-xl p-3 sm:p-4 lg:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-accent/20 bg-accent/10 text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
                  <Sparkles className="w-2.5 h-2.5" />
                  Student activity
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-card-hover text-[9px] font-medium text-text-secondary">
                  <BookOpen className="w-2.5 h-2.5" />
                  Previous quizzes
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">Previous Quizzes</h2>
              <p className="mt-1 max-w-2xl text-xs text-text-secondary">
                Review completed, submitted, timed-out, and early-exit attempts with deep score breakdowns, rankings, and reattempt actions.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <SummaryStat label="Total" value={MOCK_ATTEMPTS.length} icon={Layers3} />
              <SummaryStat label="Completed" value={quickSummary.completed} icon={BadgeCheck} />
              <SummaryStat label="Avg Score" value={`${quickSummary.averageScore}%`} icon={BarChart3} />
              <SummaryStat label="Avg Time" value={`${quickSummary.averageTime}m`} icon={Clock3} />
            </div>
          </div>

          {/* Search - always visible */}
          <div className="mb-2.5">
            <FieldInput
              icon={Search}
              label="Search Quiz"
              placeholder="Quiz title, subject, creator..."
              value={search}
              onChange={setSearch}
            />
          </div>

          {/* Filter button for mobile, filters for desktop */}
          <div className="mb-4">
            {/* Mobile: Filter Button + Bottom Sheet */}
            <div className="md:hidden">
              <MobileFilterBottomSheet
                subject={subject}
                setSubject={setSubject}
                dateRange={dateRange}
                setDateRange={setDateRange}
                status={status}
                setStatus={setStatus as any}
                score={score}
                setScore={setScore}
                sortBy={sortBy}
                setSortBy={setSortBy}
                allSubjects={allSubjects}
              />
            </div>

            {/* Desktop: Inline filters */}
            <div className="hidden md:grid gap-2.5 md:grid-cols-2 xl:grid-cols-6">
              <FieldSelect label="Subject" value={subject} options={allSubjects} onChange={setSubject} />
              <FieldSelect label="Date Range" value={dateRange} options={["All time", "Last 7 days", "Last 30 days", "Last 90 days"]} onChange={setDateRange} />
              <FieldSelect label="Status" value={status} options={[...STATUS_OPTIONS]} onChange={(v) => setStatus(v as (typeof STATUS_OPTIONS)[number])} />
              <FieldSelect label="Score" value={score} options={SCORE_OPTIONS} onChange={setScore} />
              <FieldSelect label="Sort By" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
            </div>
          </div>

          {!isHydrated ? (
            <AttemptSkeletonGrid />
          ) : MOCK_ATTEMPTS.length === 0 ? (
            <EmptyState />
          ) : sortedAttempts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card-hover px-5 py-8 text-center"
            >
              <p className="text-base font-semibold text-text-primary">No matching quizzes found.</p>
              <p className="mt-1 text-sm text-text-secondary">Try a different filter or search term.</p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2">
                {pageItems.map((attempt, index) => (
                  <AttemptCard key={attempt.id} attempt={attempt} index={index} />
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card-hover px-3 py-2">
                <div className="text-xs text-text-secondary">
                  Showing <span className="font-semibold text-text-primary">{pageStart + 1}</span>–<span className="font-semibold text-text-primary">{pageEnd}</span> of <span className="font-semibold text-text-primary">{totalAttempts}</span> quizzes
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex text-xs text-text-muted">View Attempt Page</span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card-hover px-2.5 py-1.5 text-xs font-medium text-text-primary transition-all hover:border-border-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNumber = i + 1;
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setPage(pageNumber)}
                          className={`h-7 min-w-7 rounded-md px-1.5 text-xs font-semibold transition-all ${
                            pageNumber === currentPage
                              ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                              : "bg-card-hover text-text-secondary hover:text-text-primary"
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
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card-hover px-2.5 py-1.5 text-xs font-medium text-text-primary transition-all hover:border-border-hover disabled:cursor-not-allowed disabled:opacity-40"
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
    <div className="rounded-lg border border-border bg-card-hover px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-text-secondary mb-0.5">
        <Icon className="w-3 h-3 text-accent" />
        <span className="text-[9px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <div className="text-sm font-bold text-text-primary">{value}</div>
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
    <label className={`space-y-1 ${className || ""}`}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 transition-all focus-within:border-accent/30 focus-within:ring-1 focus-within:ring-accent/20">
        <Icon className="w-3.5 h-3.5 shrink-0 text-text-muted" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
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
    <label className="space-y-1">
      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-card px-2.5 py-2 text-xs text-text-primary outline-none transition-all focus:border-accent/30 focus:ring-1 focus:ring-accent/20"
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      whileHover={{ y: -1 }}
      className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-accent/25 hover:shadow-md"
    >
      <div className="relative p-2 lg:p-2.5">
        {/* Row 1: Badges + Title + Score */}
        <div className="flex items-start gap-2">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1 shrink-0 pt-0.5">
            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold ${statusTone(attempt.status)}`}>
              {attempt.status}
            </span>
            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold ${visibilityTone(attempt.visibility)}`}>
              {attempt.visibility}
            </span>
            {attempt.rank !== undefined && (
              <span className="inline-flex items-center gap-0.5 rounded border border-border bg-card-hover px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary">
                <Trophy className="w-2.5 h-2.5 text-warning" />
                #{attempt.rank}
              </span>
            )}
          </div>

          {/* Title + Subtitle */}
          <button
            type="button"
            onClick={() => window.location.assign(`/quiz/${attempt.quizId}/attempt/${attempt.attemptId}`)}
            className="min-w-0 flex-1 text-left"
          >
            <h3 className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-accent">{attempt.title}</h3>
            <p className="truncate text-[11px] text-text-secondary">
              {attempt.subject} · {attempt.createdBy} ({attempt.creatorRole})
            </p>
          </button>

          {/* Score + Progress bar - desktop */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <span className={`text-sm font-bold ${scoreTone(attempt.percentage)}`}>{attempt.percentage}%</span>
            <div className="h-1.5 w-14 rounded-full bg-border overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${scoreBarTone(attempt.percentage)}`}
                style={{ width: `${attempt.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Metadata inline + Stats + Actions */}
        <div className="mt-1.5 flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-text-muted">
            <span className="inline-flex items-center gap-0.5">
              <CalendarDays className="w-2.5 h-2.5" />
              {formatDate(attempt.attemptedAt)}
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-border" />
            <span className="inline-flex items-center gap-0.5">
              <Clock3 className="w-2.5 h-2.5" />
              {attempt.timeTaken}
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-border" />
            <span className="inline-flex items-center gap-0.5">
              <BadgeCheck className="w-2.5 h-2.5" />
              {attempt.scoreEarned}/{attempt.totalScore}
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-border" />
            <span className={`inline-flex items-center gap-0.5 font-semibold ${scoreTone(attempt.percentage)}`}>
              <BarChart3 className="w-2.5 h-2.5" />
              {attempt.percentage}%
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-border" />
            <span className="inline-flex items-center gap-0.5">
              <Layers3 className="w-2.5 h-2.5" />
              {attempt.totalQuestions}Q
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-border" />
            <span className="inline-flex items-center gap-0.5">
              <CalendarDays className="w-2.5 h-2.5" />
              {formatDate(attempt.submittedAt)}
            </span>
          </div>

          {/* Stats + Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Compact 2x2 stats as inline chips */}
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-card-hover px-2 py-1">
              <span className="text-[10px] font-semibold text-success">✓ {attempt.correctAnswers}</span>
              <span className="text-[10px] font-semibold text-danger">✗ {attempt.wrongAnswers}</span>
              <span className="text-[10px] font-semibold text-text-muted">⊘ {attempt.skippedQuestions}</span>
              <span className="text-[10px] font-semibold text-text-secondary">Σ {attempt.totalQuestions}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Link
                href={`/quiz/${attempt.quizId}/attempt/${attempt.attemptId}`}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card-hover px-2 py-1 text-[10px] font-semibold text-text-primary transition-all hover:border-border-hover"
              >
                <Eye className="w-3 h-3" />
                View
              </Link>
              <Link
                href={`/quiz/${attempt.quizId}/results/${attempt.attemptId}`}
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent transition-all hover:bg-accent/15"
              >
                <BarChart3 className="w-3 h-3" />
                Result
              </Link>
              {attempt.allowReattempt && (
                <Link
                  href="#join-quiz"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent transition-all hover:bg-accent/15"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reattempt
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Score + Progress bar */}
        <div className="mt-1.5 flex items-center gap-2 lg:hidden">
          <span className={`text-xs font-bold ${scoreTone(attempt.percentage)}`}>{attempt.percentage}%</span>
          <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${scoreBarTone(attempt.percentage)}`}
              style={{ width: `${attempt.percentage}%` }}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function AttemptSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card-hover p-2.5">
          <div className="animate-pulse space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-border" />
              <div className="h-4 w-20 rounded bg-border" />
              <div className="h-4 w-10 rounded bg-border" />
            </div>
            <div className="h-3.5 w-2/3 rounded bg-border" />
            <div className="h-2.5 w-1/2 rounded bg-border" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileFilterBottomSheet({ subject, setSubject, dateRange, setDateRange, status, setStatus, score, setScore, sortBy, setSortBy, allSubjects }: {
  subject: string;
  setSubject: (v: string) => void;
  dateRange: string;
  setDateRange: (v: string) => void;
  status: any;
  setStatus: (v: any) => void;
  score: string;
  setScore: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  allSubjects: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = [
    subject !== "All",
    dateRange !== "All time",
    status !== "All",
    score !== "All",
    sortBy !== "Newest"
  ].filter(Boolean).length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full h-10 rounded-lg border border-border bg-card-hover text-xs font-semibold text-text-primary flex items-center justify-center gap-2 transition-all hover:border-border-hover hover:bg-card-hover"
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
        {activeFiltersCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[9px] font-bold">
            {activeFiltersCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[60] max-h-[85vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 shadow-2xl"
            >
              <div className="flex justify-center mb-2">
                <div className="w-8 h-1 rounded-full bg-border" />
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-text-primary">Filters</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-card-hover text-text-muted hover:text-text-primary transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs text-text-primary outline-none"
                  >
                    {allSubjects.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs text-text-primary outline-none"
                  >
                    {["All time", "Last 7 days", "Last 30 days", "Last 90 days"].map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs text-text-primary outline-none"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">Score</label>
                  <select
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs text-text-primary outline-none"
                  >
                    {SCORE_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs text-text-primary outline-none"
                  >
                    {SORT_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSubject("All");
                    setDateRange("All time");
                    setStatus("All");
                    setScore("All");
                    setSortBy("Newest");
                  }}
                  className="w-full h-10 rounded-lg border border-border bg-card-hover text-xs font-semibold text-text-primary hover:border-border-hover hover:bg-card-hover transition-all"
                >
                  Reset All Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="absolute -right-16 top-4 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card-hover">
          <Building2 className="h-7 w-7 text-accent" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">You haven't attempted any quizzes yet.</h3>
        <p className="mt-1.5 text-sm text-text-secondary">
          Join your first quiz to unlock a personal history of scores, rankings, mistakes, and reattempts.
        </p>
        <Link
          href="#join-quiz"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
        >
          Join Your First Quiz
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}