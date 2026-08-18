"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bookmark,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import type { ProblemListItem } from "@/types/problem";

const ITEMS_PER_PAGE = 100;

type DifficultyFilter = "easy" | "medium" | "hard" | null;

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
];

const DIFF_LABELS: Record<Exclude<DifficultyFilter, null>, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const difficultyOptions: { label: string; value: DifficultyFilter }[] = [
  { label: "All difficulties", value: null },
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Hard", value: "hard" },
];

const topics = [
  "Arrays",
  "Strings",
  "Binary Search",
  "Graphs",
  "Dynamic Programming",
  "Trees",
  "Greedy",
  "Math",
  "Sorting",
  "Implementation",
  "Segment Tree",
  "Bitmasking",
  "Two Pointers",
  "Stack",
  "Queue",
  "Recursion",
  "DP",
  "Combinatorics",
  "Number Theory",
  "Geometry",
];

// Mock per-problem status map (would come from user progress API)
const mockStatus: Record<string, "solved" | "attempted" | "unsolved"> = {};
const mockBookmarks = new Set<string>();

interface Filters {
  query: string;
  status: string;
  difficulty: DifficultyFilter;
  tags: string[];
}

interface ProblemsListProps {
  problems: ProblemListItem[];
}

/* ── Shared dropdown primitives ─────────────────────────────────────── */

function useMenuDismiss(
  open: boolean,
  onClose: () => void,
  ref: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, ref]);
}

const toolbarBtnBase =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary";
const toolbarBtnActive =
  "border-[#7C3AED]/40 bg-[#7C3AED]/10 text-[#A78BFA] hover:border-[#7C3AED]/60 hover:text-[#C4B5FD]";

function menuPanelClass(width: string) {
  return `absolute right-0 z-50 mt-1.5 ${width} overflow-hidden rounded-lg border border-border bg-popover shadow-2xl shadow-black/50`;
}

function DifficultyMenu({
  value,
  onChange,
}: {
  value: DifficultyFilter;
  onChange: (v: DifficultyFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useMenuDismiss(open, () => setOpen(false), ref);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${toolbarBtnBase} ${value !== null ? toolbarBtnActive : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {value !== null ? DIFF_LABELS[value] : "Difficulty"}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={menuPanelClass("w-44")}
          >
            <div className="py-1">
              {difficultyOptions.map((o) => {
                const active = value === o.value;
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? "text-[#A78BFA]"
                        : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                    }`}
                  >
                    {o.label}
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopicsMenu({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useMenuDismiss(open, () => setOpen(false), ref);

  const q = query.trim().toLowerCase();
  const filtered = topics.filter((t) => t.toLowerCase().includes(q));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        className={`${toolbarBtnBase} ${selected.length > 0 ? toolbarBtnActive : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Topics
        {selected.length > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7C3AED] px-1 text-[10px] font-semibold leading-none text-white">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={menuPanelClass("w-56")}
          >
            <div className="relative border-b border-border">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics..."
                className="h-9 w-full bg-transparent pl-8 pr-3 text-xs text-text-primary outline-none placeholder:text-text-muted"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-text-muted">No topics match</li>
              ) : (
                filtered.map((t) => {
                  const active = selected.includes(t);
                  return (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => onToggle(t)}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                          active
                            ? "text-[#A78BFA]"
                            : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                        }`}
                      >
                        {t}
                        {active && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const searchRef = useRef<HTMLInputElement>(null);

  /* Focus search with "/" */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
        const r = p.rating ?? 0;
        if (difficulty === "easy" && r >= 1200) return false;
        if (difficulty === "medium" && (r < 1200 || r >= 1600)) return false;
        if (difficulty === "hard" && r < 1600) return false;
      }
      if (tags.length > 0 && !tags.some((t) => p.tags.some((tag) => tag.toLowerCase() === t.toLowerCase()))) {
        return false;
      }
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
  const setDifficulty = useCallback((d: DifficultyFilter) => {
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
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Problems</h1>
          <p className="text-xs text-text-secondary mt-0.5">Browse and solve coding challenges.</p>
        </div>

        {/* Filter toolbar */}
        <div className="problems-toolbar mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search problems..."
              value={filters.query}
              onChange={(e) => setQuery(e.target.value)}
              className="problems-search-input h-9 w-full rounded-lg border border-border bg-card pl-9 pr-10 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
            {filters.query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card-hover px-1.5 py-0.5 font-mono text-[10px] leading-none text-text-muted sm:inline-flex">
                /
              </kbd>
            )}
          </div>

          {/* Status segmented control */}
          <div className="problems-segmented inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
            {statusFilters.map((f) => {
              const isActive = filters.status === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatus(f.value)}
                  className={`problems-segmented-btn h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#7C3AED] text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Difficulty */}
          <DifficultyMenu value={filters.difficulty} onChange={setDifficulty} />

          {/* Topics */}
          <TopicsMenu selected={filters.tags} onToggle={toggleTag} />

          {/* Clear filters */}
          <button
            type="button"
            onClick={clearAllFilters}
            className={`${toolbarBtnBase} ${
              activeFilterCount > 0 ? toolbarBtnActive : "opacity-70"
            }`}
            title="Clear all filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7C3AED] px-1 text-[10px] font-semibold leading-none text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Selected topic chips */}
        {filters.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {filters.tags.map((tag) => (
              <span
                key={tag}
                className="problems-topic-chip inline-flex items-center gap-1 rounded-md border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-2 py-0.5 text-[11px] font-medium text-[#A78BFA]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="text-[#A78BFA]/70 transition-colors hover:text-[#C4B5FD]"
                  aria-label={`Remove ${tag} topic`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Results count */}
        <div className="problems-results-meta mb-2 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            Showing <span className="font-medium text-text-secondary">{paginated.length}</span> of{" "}
            <span className="font-medium text-text-secondary">{filtered.length}</span> problems
          </span>
          {activeFilterCount > 0 && filters.query === "" && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-text-muted transition-colors hover:text-danger"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Problems table */}
        {paginated.length === 0 ? (
          <div className="problems-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.03]">
              <Search className="h-4 w-4 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-primary">No problems found</p>
            <p className="mt-1 text-xs text-text-muted">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="problems-table overflow-y-clip rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.3),0_6px_20px_rgba(0,0,0,0.12)]">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="problems-table-head bg-card-hover/60">
                  <th className="w-14 px-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Problem</th>
                  <th className="w-[76px] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Difficulty</th>
                  <th className="w-[110px] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Acceptance</th>
                  <th className="w-[150px] px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Tags</th>
                  <th className="w-[64px] px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Solved</th>
                  <th className="w-[72px] px-2 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Updated</th>
                  <th className="w-10 px-1 py-2.5"></th>
                  <th className="w-14 px-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">Action</th>
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
                      className="problems-table-row group"
                    >
                      {/* Status icon */}
                      <td className="px-1 py-2 text-center">
                        {status === "solved" ? (
                          <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                        ) : status === "attempted" ? (
                          <Clock className="h-4 w-4 text-[#F59E0B]" />
                        ) : (
                          <Circle className="h-4 w-4 text-[#3F3F46]" />
                        )}
                      </td>

                      {/* Problem title */}
                      <td className="px-4 py-2">
                        <Link
                          href={`/problems/${problem.problem_id}`}
                          className="problems-problem-link block truncate text-[13px] font-semibold leading-tight text-text-primary transition-colors hover:text-[#7C3AED]"
                        >
                          {title}
                        </Link>
                        <div className="problems-problem-id mt-0.5 truncate font-mono text-[10px] leading-none text-text-muted">
                          {problem.problem_id}
                        </div>
                      </td>

                      {/* Difficulty badge */}
                      <td className="px-4 py-2">
                        <span
                          className="problems-difficulty-badge inline-block rounded border px-1.5 py-px text-[11px] font-semibold leading-4"
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
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="problems-acceptance-track h-[3px] w-10 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-[#22C55E]"
                              style={{ width: `${acceptance}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-text-muted">{acceptance}%</span>
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                          {(problem.tags || []).slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="problems-tag rounded-full border border-border bg-white/[0.04] px-1.5 py-px text-[9px] font-medium text-text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                          {(problem.tags || []).length > 2 && (
                            <span className="shrink-0 text-[9px] text-text-muted">
                              +{problem.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Solved count */}
                      <td className="px-4 py-2 text-right text-[11px] tabular-nums text-text-secondary">
                        {solves >= 1000 ? `${(solves / 1000).toFixed(1)}K` : solves}
                      </td>

                      {/* Last updated */}
                      <td className="px-4 py-2 text-right text-[10px] text-text-muted">2d ago</td>

                      {/* Bookmark */}
                      <td className="px-1 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleBookmark(problem.problem_id)}
                          className={`transition-all ${
                            isBookmarked
                              ? "text-[#FBBF24]"
                              : "text-text-muted opacity-0 hover:text-[#FBBF24] group-hover:opacity-100"
                          }`}
                          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark problem"}
                        >
                          <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                        </button>
                      </td>

                      {/* Action */}
                      <td className="px-1 py-2 text-center">
                        <Link
                          href={`/problems/${problem.problem_id}`}
                          className="problems-action-btn inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-white/[0.04] text-text-muted opacity-0 transition-all hover:border-[#7C3AED] hover:bg-[#7C3AED] hover:text-white group-hover:opacity-100"
                          aria-label={`Open ${title}`}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
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
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="problems-page-btn flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-text-muted">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                    currentPage === p
                      ? "bg-[#7C3AED] text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]"
                      : "problems-page-btn border border-border bg-card text-text-secondary hover:bg-white/[0.04]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="problems-page-btn flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}