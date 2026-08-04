"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Bookmark,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { ProblemListItem } from "@/types/problem";

const ITEMS_PER_PAGE = 100;

function getRatingColor(rating: number): string {
  if (rating >= 2400) return "#EF4444";
  if (rating >= 2100) return "#F97316";
  if (rating >= 1900) return "#7C3AED";
  if (rating >= 1600) return "#3B82F6";
  if (rating >= 1400) return "#F59E0B";
  if (rating >= 1200) return "#22C55E";
  return "#9CA3AF";
}

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Solved", value: "solved" },
  { label: "Attempted", value: "attempted" },
  { label: "Unsolved", value: "unsolved" },
  { label: "Bookmarked", value: "bookmarked" },
  { label: "Recommended", value: "recommended" },
];

const difficultyLevels = [
  { label: "800", min: 800, max: 899 },
  { label: "1000", min: 1000, max: 1199 },
  { label: "1200", min: 1200, max: 1399 },
  { label: "1400", min: 1400, max: 1599 },
  { label: "1600", min: 1600, max: 1799 },
  { label: "1800", min: 1800, max: 1999 },
  { label: "2000+", min: 2000, max: 9999 },
];

const topics = [
  "Arrays", "Graphs", "DP", "Trees", "Math", "Greedy",
  "Strings", "Binary Search", "Sorting", "Implementation",
];

// Mock per-problem status map (would come from user progress API)
const mockStatus: Record<string, "solved" | "attempted" | "unsolved"> = {};
const mockBookmarks = new Set<string>();

interface Filters {
  query: string;
  status: string;
  difficulty: number | null;
  tags: string[];
}

interface ProblemsListProps {
  problems: ProblemListItem[];
}

export default function ProblemsList({ problems }: ProblemsListProps) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    status: "all",
    difficulty: null,
    tags: [],
  });
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState<Set<string>>(mockBookmarks);

  const getStatus = (problemId: string): "solved" | "attempted" | "unsolved" =>
    mockStatus[problemId] || "unsolved";

  const filtered = useMemo(() => {
    const { query, status, difficulty, tags } = filters;
    const q = query.toLowerCase().trim();
    return problems.filter((p) => {
      if (q) {
        const matchId = p.problem_id.toLowerCase().includes(q);
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchSource = p.source?.toLowerCase().includes(q);
        if (!matchId && !matchTitle && !matchTags && !matchSource) return false;
      }
      if (status !== "all") {
        if (status === "bookmarked") {
          if (!bookmarks.has(p.problem_id)) return false;
        } else if (status === "recommended") {
          // Mock: recommend problems with rating between 1200 and 1600
          const r = p.rating ?? 0;
          if (r < 1200 || r > 1600) return false;
        } else {
          if (getStatus(p.problem_id) !== status) return false;
        }
      }
      if (difficulty !== null) {
        const rating = p.rating ?? 0;
        if (difficulty >= 2000) {
          if (rating < 2000) return false;
        } else {
          if (rating < difficulty || rating >= difficulty + 200) return false;
        }
      }
      if (tags.length > 0 && !tags.some((t) => p.tags.includes(t))) return false;
      return true;
    });
  }, [problems, filters, bookmarks]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const setQuery = useCallback((q: string) => {
    setFilters((f) => ({ ...f, query: q }));
    setPage(1);
  }, []);
  const setStatus = useCallback((v: string) => {
    setFilters((f) => ({ ...f, status: v }));
    setPage(1);
  }, []);
  const setDifficulty = useCallback((d: number | null) => {
    setFilters((f) => ({ ...f, difficulty: d }));
    setPage(1);
  }, []);
  const toggleTag = useCallback((tag: string) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
    setPage(1);
  }, []);

  const toggleBookmark = (problemId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) next.delete(problemId);
      else next.add(problemId);
      return next;
    });
  };

  const activeFilterCount =
    (filters.status !== "all" ? 1 : 0) +
    (filters.difficulty !== null ? 1 : 0) +
    filters.tags.length;

  const clearAllFilters = () => {
    setFilters({ query: "", status: "all", difficulty: null, tags: [] });
    setPage(1);
  };

  // Pagination page numbers
  const pageNumbers: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== "...") {
      pageNumbers.push("...");
    }
  }

  return (
    <div className="px-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Problems</h1>
          <p className="text-sm text-text-secondary mt-1">Browse and solve coding challenges.</p>
        </div>

        {/* Search Bar */}
        <div className="relative group mb-5">
          <div className="relative flex items-center bg-card border border-border rounded-2xl px-4 py-3 group-focus-within:border-accent/40 group-focus-within:shadow-[0_0_20px_rgba(37,99,235,0.08)] transition-all">
            <Search className="w-5 h-5 text-text-secondary shrink-0" />
            <input
              type="text"
              placeholder="Search by title, ID, tag or company..."
              value={filters.query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder-text-secondary ml-3"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-text-secondary bg-card-hover border border-border rounded-lg">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted mr-1">Status</span>
          {statusFilters.map((f) => {
            const isActive = filters.status === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]"
                    : "bg-card-hover text-text-secondary border border-border hover:border-border-hover hover:text-text-primary"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Difficulty Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted mr-1">Difficulty</span>
          <button
            onClick={() => setDifficulty(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              filters.difficulty === null
                ? "bg-card-hover text-text-primary border border-border-hover"
                : "bg-card-hover text-text-secondary border border-border hover:border-border-hover"
            }`}
          >
            All
          </button>
          {difficultyLevels.map((d) => {
            const isActive = filters.difficulty === d.min;
            const color = getRatingColor(d.min);
            return (
              <button
                key={d.label}
                onClick={() => setDifficulty(d.min)}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border"
                style={{
                  color,
                  borderColor: isActive ? `${color}40` : "rgba(0,0,0,0.08)",
                  backgroundColor: isActive ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.02)",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {/* Topic Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280] mr-1">Topic</span>
          {topics.map((tag) => {
            const isActive = filters.tags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                  isActive
                    ? "bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/30"
                    : "bg-white/[0.04] text-[#9CA3AF] border-white/[0.06] hover:border-white/[0.12] hover:text-white"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        {/* Results count + active filters */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-[#6B7280]">
            Showing <span className="text-[#9CA3AF] font-medium">{paginated.length}</span> of{" "}
            <span className="text-[#9CA3AF] font-medium">{filtered.length}</span> problems
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[10px] text-[#9CA3AF] hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Premium Table */}
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.06] bg-[#111827] py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-[#6B7280]" />
            </div>
            <p className="text-sm font-medium text-[#9CA3AF]">No problems found</p>
            <p className="mt-1 text-xs text-[#6B7280]">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#111827]/40">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#111827]">
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3 w-10">Status</th>
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Problem</th>
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Difficulty</th>
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Acceptance</th>
                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Tags</th>
                  <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Solved</th>
                  <th className="text-right text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3">Updated</th>
                  <th className="text-center text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3 w-10"></th>
                  <th className="text-center text-[10px] font-medium uppercase tracking-wider text-[#6B7280] px-4 py-3 w-12">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((problem, idx) => {
                  const rating = problem.rating ?? 0;
                  const ratingColor = getRatingColor(rating);
                  const status = getStatus(problem.problem_id);
                  const isBookmarked = bookmarks.has(problem.problem_id);
                  const title =
                    problem.contest_id && problem.problem_index
                      ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
                      : problem.title;
                  // Mock acceptance/solves based on rating
                  const acceptance = Math.max(20, Math.min(90, 100 - Math.floor(rating / 25)));
                  const solves = Math.max(100, 50000 - rating * 20);

                  return (
                    <motion.tr
                      key={problem.problem_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.005, 0.2) }}
                      className="group border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors relative"
                    >
                      {/* Status icon */}
                      <td className="px-4 py-3">
                        {status === "solved" ? (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        ) : status === "attempted" ? (
                          <Clock className="w-4 h-4 text-[#F59E0B]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#3F3F46]" />
                        )}
                      </td>

                      {/* Problem title */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/problems/${problem.problem_id}`}
                          className="text-sm font-medium text-white hover:text-[#7C3AED] transition-colors"
                        >
                          {title}
                        </Link>
                        <div className="text-[10px] text-[#6B7280] mt-0.5 font-mono">{problem.problem_id}</div>
                      </td>

                      {/* Difficulty badge */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                          style={{
                            color: ratingColor,
                            borderColor: `${ratingColor}30`,
                            backgroundColor: `${ratingColor}10`,
                          }}
                        >
                          {rating || "—"}
                        </span>
                      </td>

                      {/* Acceptance */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#22C55E]"
                              style={{ width: `${acceptance}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#9CA3AF]">{acceptance}%</span>
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(problem.tags || []).slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full text-[9px] font-medium text-[#9CA3AF] bg-white/[0.04] border border-white/[0.06]"
                            >
                              {tag}
                            </span>
                          ))}
                          {(problem.tags || []).length > 2 && (
                            <span className="text-[9px] text-[#6B7280]">+{problem.tags.length - 2}</span>
                          )}
                        </div>
                      </td>

                      {/* Solved count */}
                      <td className="px-4 py-3 text-right text-xs text-[#9CA3AF]">
                        {solves >= 1000 ? `${(solves / 1000).toFixed(1)}K` : solves}
                      </td>

                      {/* Last updated */}
                      <td className="px-4 py-3 text-right text-[10px] text-[#6B7280]">2d ago</td>

                      {/* Bookmark */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleBookmark(problem.problem_id)}
                          className={`transition-all ${
                            isBookmarked
                              ? "text-[#FBBF24]"
                              : "text-[#6B7280] opacity-0 group-hover:opacity-100 hover:text-[#FBBF24]"
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                        </button>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/problems/${problem.problem_id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#9CA3AF] hover:text-white hover:bg-[#7C3AED] hover:border-[#7C3AED] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-[#9CA3AF] bg-[#111827] border border-white/[0.06] hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-2 text-xs text-[#6B7280]">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-medium transition-all ${
                    currentPage === p
                      ? "bg-[#7C3AED] text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                      : "text-[#9CA3AF] bg-[#111827] border border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-[#9CA3AF] bg-[#111827] border border-white/[0.06] hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}