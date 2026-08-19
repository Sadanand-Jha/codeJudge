"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bookmark,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Check,
  X,
  ArrowUpDown,
} from "lucide-react";
import {
  PROBLEM_EXAMS,
  PROBLEM_TYPES,
  EXAM_SUBJECTS,
  SUBJECT_TOPICS,
  EXAM_STYLES,
} from "./marketplace";
import type { MarketplaceProblem, ProblemDifficulty } from "./marketplace";

const ITEMS_PER_PAGE = 50;

type StatusFilter = "all" | "solved" | "unsolved" | "bookmarked";
type PriceFilter = "all" | "free" | "premium";
type SortKey = "default" | "solved" | "acceptance" | "newest" | "rating";

function getRatingColor(rating: number): string {
  if (rating >= 2400) return "#EF4444";
  if (rating >= 2100) return "#F97316";
  if (rating >= 1900) return "#7C3AED";
  if (rating >= 1600) return "#3B82F6";
  if (rating >= 1400) return "#F59E0B";
  if (rating >= 1200) return "#22C55E";
  return "#9CA3AF";
}

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Solved", value: "solved" },
  { label: "Unsolved", value: "unsolved" },
  { label: "Bookmarked", value: "bookmarked" },
];

const priceFilters: { label: string; value: PriceFilter }[] = [
  { label: "All", value: "all" },
  { label: "Free", value: "free" },
  { label: "Premium", value: "premium" },
];

const sortOptions: { label: string; value: SortKey }[] = [
  { label: "Default", value: "default" },
  { label: "Most Solved", value: "solved" },
  { label: "Highest Acceptance", value: "acceptance" },
  { label: "Recently Added", value: "newest" },
  { label: "Rating", value: "rating" },
];

// Mock per-problem status map (would come from user progress API)
const mockStatus: Record<string, "solved" | "attempted" | "unsolved"> = {};
const mockBookmarks = new Set<string>();

interface Filters {
  query: string;
  exam: string;
  subject: string;
  topic: string;
  difficulty: "all" | ProblemDifficulty;
  type: string;
  status: StatusFilter;
  price: PriceFilter;
  tags: string[];
}

export interface ProblemBrowserProps {
  problems: MarketplaceProblem[];
  /** Locks the exam filter (e.g. "programming" on the CP page). */
  lockedExam?: string;
  defaultSubject?: string;
  defaultTopic?: string;
  initialQuery?: string;
  title?: string;
  subtitle?: string;
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

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  active,
  panelWidth = "w-52",
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  active?: boolean;
  panelWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useMenuDismiss(open, () => setOpen(false), ref);
  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${toolbarBtnBase} ${active ? toolbarBtnActive : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {current?.label ?? label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={menuPanelClass(panelWidth)}
          >
            <div className="max-h-72 overflow-y-auto py-1">
              {options.map((o) => {
                const isActive = value === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                      isActive
                        ? "text-[#A78BFA]"
                        : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                    }`}
                  >
                    {o.label}
                    {isActive && <Check className="h-3.5 w-3.5" />}
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

function TagsMenu({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useMenuDismiss(open, () => setOpen(false), ref);

  const q = query.trim().toLowerCase();
  const filtered = options.filter((t) => t.toLowerCase().includes(q));

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
        Tags
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
                placeholder="Search tags..."
                className="h-9 w-full bg-transparent pl-8 pr-3 text-xs text-text-primary outline-none placeholder:text-text-muted"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                }}
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-text-muted">No tags match</li>
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

function SortMenu({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useMenuDismiss(open, () => setOpen(false), ref);
  const current = sortOptions.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${toolbarBtnBase} ${value !== "default" ? toolbarBtnActive : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
        Sort: {current?.label ?? "Default"}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={menuPanelClass("w-48")}
          >
            <div className="py-1">
              {sortOptions.map((o) => {
                const active = value === o.value;
                return (
                  <button
                    key={o.value}
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

/* ── Small presentational atoms ─────────────────────────────────────── */

export function ExamTile({ examId, size = "md" }: { examId: string; size?: "sm" | "md" }) {
  const style = EXAM_STYLES[examId] ?? { short: examId.toUpperCase(), gradient: "from-[#7C3AED] to-violet-600" };
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-extrabold text-white ${
        size === "sm" ? "h-5 w-5 text-[8px]" : "h-9 w-9 text-[10px]"
      } ${style.gradient}`}
    >
      {style.short.slice(0, size === "sm" ? 3 : 4)}
    </span>
  );
}

function StatusIcon({ status }: { status: "solved" | "attempted" | "unsolved" }) {
  if (status === "solved") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white transition-transform duration-150 group-hover:scale-105">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  if (status === "attempted") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-amber-500/70 text-amber-500">
        <Clock className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="block h-5 w-5 rounded-full border-2 border-border-hover/70 transition-colors duration-150 group-hover:border-[#7C3AED]/70" />
  );
}

const DIFFICULTY_PILL: Record<ProblemDifficulty, string> = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  hard: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

function DifficultyBadge({ problem }: { problem: MarketplaceProblem }) {
  if (problem.rating > 0) {
    const color = getRatingColor(problem.rating);
    return (
      <span
        className="problems-difficulty-badge inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums transition-all duration-150 group-hover:scale-[1.04]"
        style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}
      >
        {problem.rating}
      </span>
    );
  }
  return (
    <span
      className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold capitalize transition-all duration-150 group-hover:scale-[1.04] ${DIFFICULTY_PILL[problem.difficulty]}`}
    >
      {problem.difficulty}
    </span>
  );
}

function Acceptance({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="problems-acceptance-track h-[6px] w-16 overflow-hidden rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[#7C3AED] transition-[width] duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums text-text-secondary">{value}%</span>
    </div>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-[11px] text-text-muted">—</span>;
  return (
    <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
      {tags.slice(0, 2).map((tag) => (
        <span key={tag} className="problems-tag rounded-full border px-2 py-0.5 text-[10px] font-medium">
          {tag}
        </span>
      ))}
      {tags.length > 2 && (
        <span className="shrink-0 text-[10px] text-text-muted">+{tags.length - 2}</span>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ── The browser ────────────────────────────────────────────────────── */

export function ProblemBrowser({
  problems,
  lockedExam,
  defaultSubject,
  defaultTopic,
  initialQuery,
  title = "Browse Problems",
  subtitle = "All problems matching your filters.",
}: ProblemBrowserProps) {
  const [filters, setFilters] = useState<Filters>({
    query: initialQuery ?? "",
    exam: lockedExam ?? "all",
    subject: defaultSubject ?? "all",
    topic: defaultTopic ?? "all",
    difficulty: "all",
    type: "all",
    status: "all",
    price: "all",
    tags: [],
  });
  const [sort, setSort] = useState<SortKey>("default");
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState<Set<string>>(mockBookmarks);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Focus search with "/" */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const effectiveExam = lockedExam ?? filters.exam;

  /* Dynamic subject + topic options */
  const subjectOptions = useMemo(() => {
    if (effectiveExam !== "all") return EXAM_SUBJECTS[effectiveExam] ?? [];
    const set = new Set<string>();
    Object.values(EXAM_SUBJECTS).forEach((arr) => arr.forEach((s) => set.add(s)));
    return [...set].sort();
  }, [effectiveExam]);

  const topicOptions = useMemo(() => {
    if (filters.subject !== "all") return SUBJECT_TOPICS[filters.subject] ?? [];
    if (effectiveExam !== "all") {
      const set = new Set<string>();
      (EXAM_SUBJECTS[effectiveExam] ?? []).forEach((s) =>
        (SUBJECT_TOPICS[s] ?? []).forEach((t) => set.add(t)),
      );
      return [...set].sort();
    }
    return [];
  }, [filters.subject, effectiveExam]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [problems]);

  const examOptions = useMemo(
    () => PROBLEM_EXAMS.map((e) => ({ value: e.id, label: e.label })),
    [],
  );

  const difficultyOptions = [
    { value: "all", label: "All Difficulties" },
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    ...PROBLEM_TYPES.map((t) => ({ value: t, label: t })),
  ];

  /* Filtering + sorting */
  const filtered = useMemo(() => {
    const { query, subject, topic, difficulty, type, status, price, tags } = filters;
    const exam = effectiveExam;
    const q = query.toLowerCase().trim();

    let list = problems.filter((p) => {
      if (q) {
        const hay = `${p.title} ${p.problem_id} ${p.subject} ${p.topic} ${p.examLabel} ${p.tags.join(" ")} ${p.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (exam !== "all" && p.examId !== exam) return false;
      if (subject !== "all" && p.subject !== subject) return false;
      if (topic !== "all" && p.topic !== topic) return false;
      if (difficulty !== "all" && p.difficulty !== difficulty) return false;
      if (type !== "all" && p.type !== type) return false;
      if (price === "free" && !p.free) return false;
      if (price === "premium" && p.free) return false;
      if (status !== "all") {
        if (status === "bookmarked") {
          if (!bookmarks.has(p.problem_id)) return false;
        } else if (status === "solved") {
          if (mockStatus[p.problem_id] !== "solved") return false;
        } else if (status === "unsolved") {
          if (mockStatus[p.problem_id] === "solved") return false;
        }
      }
      if (tags.length > 0 && !tags.some((t) => p.tags.some((tag) => tag.toLowerCase() === t.toLowerCase()))) return false;
      return true;
    });

    switch (sort) {
      case "solved":
        list = [...list].sort((a, b) => b.solves - a.solves);
        break;
      case "acceptance":
        list = [...list].sort((a, b) => b.acceptance - a.acceptance);
        break;
      case "newest":
        list = [...list].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo);
        break;
      case "rating":
        list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break;
    }
    return list;
  }, [problems, filters, bookmarks, sort, effectiveExam]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const setFilter = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const setExam = useCallback((exam: string) => {
    setFilters((f) => ({ ...f, exam, subject: "all", topic: "all" }));
    setPage(1);
  }, []);

  const setSubject = useCallback((subject: string) => {
    setFilters((f) => ({ ...f, subject, topic: "all" }));
    setPage(1);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
    setPage(1);
  }, []);

  const toggleBookmark = useCallback((problemId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) next.delete(problemId);
      else next.add(problemId);
      return next;
    });
  }, []);

  const activeFilterCount =
    (filters.subject !== "all" ? 1 : 0) +
    (filters.topic !== "all" ? 1 : 0) +
    (filters.difficulty !== "all" ? 1 : 0) +
    (filters.type !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.price !== "all" ? 1 : 0) +
    filters.tags.length +
    (lockedExam === undefined && filters.exam !== "all" ? 1 : 0);

  const clearAllFilters = () => {
    setFilters({
      query: "",
      exam: lockedExam ?? "all",
      subject: defaultSubject ?? "all",
      topic: defaultTopic ?? "all",
      difficulty: "all",
      type: "all",
      status: "all",
      price: "all",
      tags: [],
    });
    setPage(1);
  };

  const pageNumbers: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== "...") {
      pageNumbers.push("...");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-text-primary">{title}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
        </div>
        <span className="problems-results-meta text-[11px] text-text-muted">
          Showing <span className="font-medium text-text-secondary">{paginated.length}</span> of{" "}
          <span className="font-medium text-text-secondary">{filtered.length}</span> problems
        </span>
      </div>

      {/* Toolbar */}
      <div className="problems-toolbar mt-4 rounded-2xl border border-border p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search problems, topics, concepts..."
                value={filters.query}
                onChange={(e) => setFilter({ query: e.target.value })}
                className="problems-search-input h-10 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm text-text-primary outline-none transition-all placeholder:text-text-muted focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              />
              {filters.query ? (
                <button
                  type="button"
                  onClick={() => setFilter({ query: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-card-hover px-1.5 py-0.5 font-mono text-[10px] leading-none text-text-muted sm:inline-flex">
                  /
                </kbd>
              )}
            </div>

            <div className="problems-segmented inline-flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-border bg-card p-1 lg:self-auto">
              {statusFilters.map((f) => {
                const isActive = filters.status === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter({ status: f.value })}
                    className={`h-8 rounded-lg px-3 text-[11px] font-semibold transition-colors ${
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

            <div className="lg:ml-auto">
              <SortMenu value={sort} onChange={setSort} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lockedExam === undefined && (
              <FilterDropdown
                label="Exam"
                value={filters.exam}
                options={examOptions}
                onChange={setExam}
                active={filters.exam !== "all"}
              />
            )}
            <FilterDropdown
              label="Subject"
              value={filters.subject}
              options={[{ value: "all", label: "All Subjects" }, ...subjectOptions.map((s) => ({ value: s, label: s }))]}
              onChange={setSubject}
              active={filters.subject !== "all"}
            />
            <FilterDropdown
              label="Topic"
              value={filters.topic}
              options={[{ value: "all", label: "All Topics" }, ...topicOptions.map((t) => ({ value: t, label: t }))]}
              onChange={(t) => setFilter({ topic: t })}
              active={filters.topic !== "all"}
            />
            <FilterDropdown
              label="Difficulty"
              value={filters.difficulty}
              options={difficultyOptions}
              onChange={(d) => setFilter({ difficulty: d as "all" | ProblemDifficulty })}
              active={filters.difficulty !== "all"}
            />
            <FilterDropdown
              label="Type"
              value={filters.type}
              options={typeOptions}
              onChange={(t) => setFilter({ type: t })}
              active={filters.type !== "all"}
            />
            <TagsMenu options={tagOptions} selected={filters.tags} onToggle={toggleTag} />

            <div className="problems-segmented inline-flex shrink-0 items-center gap-0.5 self-start rounded-xl border border-border bg-card p-1">
              {priceFilters.map((f) => {
                const isActive = filters.price === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter({ price: f.value })}
                    className={`h-8 rounded-lg px-3 text-[11px] font-semibold transition-colors ${
                      isActive
                        ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className={`${toolbarBtnBase} ${activeFilterCount > 0 ? toolbarBtnActive : "opacity-70"}`}
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
        </div>
      </div>

      {/* Selected tag chips */}
      {filters.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {filters.tags.map((tag) => (
            <span
              key={tag}
              className="problems-topic-chip inline-flex items-center gap-1 rounded-md border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-2 py-0.5 text-[11px] font-medium text-[#A78BFA]"
            >
              {tag}
              <button type="button" onClick={() => toggleTag(tag)} className="text-[#A78BFA]/70 transition-colors hover:text-[#C4B5FD]" aria-label={`Remove ${tag} tag`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {paginated.length === 0 ? (
        <div className="problems-empty-state mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] dark:bg-ai-accent/10 dark:text-ai-accent">
            <Search className="h-5 w-5" />
          </div>
          <p className="text-base font-bold text-text-primary">No problems found</p>
          <p className="mt-1 text-sm text-text-muted">Try adjusting your filters or search query.</p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-xl bg-[#7C3AED] px-4 text-xs font-bold text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5 dark:bg-ai-accent"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="problems-table mt-4 hidden overflow-y-clip rounded-2xl border border-border bg-card shadow-sm md:block">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="problems-table-head bg-card-hover/60">
                  <th className="w-[52px] px-1 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Problem</th>
                  <th className="w-[92px] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Difficulty</th>
                  <th className="w-[140px] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">Acceptance</th>
                  <th className="hidden w-[180px] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted lg:table-cell">Tags</th>
                  <th className="w-[90px] px-2 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">Solved</th>
                  <th className="hidden w-[84px] px-2 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted md:table-cell">Updated</th>
                  <th className="w-[96px] px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((problem, idx) => {
                  const status = mockStatus[problem.problem_id] || "unsolved";
                  const isBookmarked = bookmarks.has(problem.problem_id);
                  const title =
                    problem.contest_id && problem.problem_index
                      ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
                      : problem.title;

                  return (
                    <motion.tr
                      key={problem.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.005, 0.2) }}
                      className="problems-table-row group"
                    >
                      <td className="px-1 py-3 text-center">
                        <StatusIcon status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/problems/${problem.problem_id}`}
                          className="problems-problem-link block truncate text-[13px] font-semibold leading-tight text-text-primary transition-colors hover:text-[#7C3AED] dark:hover:text-[#A78BFA]"
                        >
                          {title}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card-hover/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-muted">
                            <ExamTile examId={problem.examId} size="sm" />
                            {problem.examLabel}
                          </span>
                          <span className="truncate font-mono text-[10px] leading-none text-text-muted">
                            {problem.problem_id} · {problem.subject}
                            {problem.topic && problem.topic !== "General" ? ` · ${problem.topic}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge problem={problem} />
                      </td>
                      <td className="px-4 py-3">
                        <Acceptance value={problem.acceptance} />
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <TagPills tags={problem.tags} />
                      </td>
                      <td className="px-2 py-3 text-right text-[11px] font-medium tabular-nums text-text-secondary">
                        {formatCount(problem.solves)}
                      </td>
                      <td className="hidden px-2 py-3 text-right text-[10px] text-text-muted md:table-cell">
                        {problem.updated}
                      </td>
                      <td className="px-2 py-3">
                        <div
                          className={`flex items-center justify-end gap-1.5 transition-opacity duration-150 ${
                            isBookmarked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleBookmark(problem.problem_id)}
                            className={`rounded-md p-1.5 transition-colors ${
                              isBookmarked ? "text-[#FBBF24] hover:text-[#FCD34D]" : "text-text-muted hover:text-[#FBBF24]"
                            }`}
                            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark problem"}
                          >
                            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                          </button>
                          <Link
                            href={`/problems/${problem.problem_id}`}
                            className="problems-action-btn inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-white/[0.04] px-2.5 text-[11px] font-bold text-text-muted transition-all hover:border-[#7C3AED] hover:bg-[#7C3AED] hover:text-white"
                            aria-label={`Solve ${title}`}
                          >
                            Solve
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-3 space-y-3 md:hidden">
            {paginated.map((problem, idx) => {
              const status = mockStatus[problem.problem_id] || "unsolved";
              const isBookmarked = bookmarks.has(problem.problem_id);
              const title =
                problem.contest_id && problem.problem_index
                  ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
                  : problem.title;

              return (
                <motion.div
                  key={problem.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.005, 0.2) }}
                  className="problems-mobile-card group rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon status={status} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/problems/${problem.problem_id}`}
                        className="block truncate text-[14px] font-semibold leading-tight text-text-primary transition-colors hover:text-[#7C3AED] dark:hover:text-[#A78BFA]"
                      >
                        {title}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5">
                        <ExamTile examId={problem.examId} size="sm" />
                        <span className="truncate text-[10px] text-text-muted">
                          {problem.examLabel} · {problem.subject}
                          {problem.topic && problem.topic !== "General" ? ` · ${problem.topic}` : ""}
                        </span>
                      </div>
                    </div>
                    <DifficultyBadge problem={problem} />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Acceptance value={problem.acceptance} />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleBookmark(problem.problem_id)}
                        className={`rounded-md p-1.5 transition-colors ${
                          isBookmarked ? "text-[#FBBF24] hover:text-[#FCD34D]" : "text-text-muted hover:text-[#FBBF24]"
                        }`}
                        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark problem"}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                      </button>
                      <Link
                        href={`/problems/${problem.problem_id}`}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#7C3AED] px-3 text-[11px] font-bold text-white transition-transform hover:-translate-y-0.5 dark:bg-ai-accent"
                        aria-label={`Solve ${title}`}
                      >
                        Solve
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <TagPills tags={problem.tags} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="problems-page-btn flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-text-muted">...</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-9 w-9 rounded-lg text-xs font-medium transition-all ${
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
            className="problems-page-btn flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}