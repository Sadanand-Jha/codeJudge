"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Timer,
  Database,
  ArrowUpDown,
  X,
} from "lucide-react";
import type { ProblemListItem } from "@/types/problem";
import RatingBadge from "@/components/problem/RatingBadge";
import TagBadge from "@/components/problem/TagBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SortField = "id" | "rating" | "title";
type SortDir = "asc" | "desc";

interface Filters {
  query: string;
  ratingMin: number | null;
  ratingMax: number | null;
  tags: string[];
  source: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${mb}MB`;
}

const ALL_TAGS = [
  "Greedy",
  "Math",
  "Implementation",
  "Data Structures",
  "Dynamic Programming",
  "Graphs",
  "Strings",
  "Sorting",
  "Binary Search",
  "Number Theory",
  "Combinatorics",
  "Geometry",
  "Bitmasks",
  "Trees",
];

/** Filter / sort problems and always sort by ID asc as secondary */
function filterAndSortProblems(
  problems: ProblemListItem[],
  filters: Filters,
  sortField: SortField,
  sortDir: SortDir,
): ProblemListItem[] {
  const { query, ratingMin, ratingMax, tags, source } = filters;
  const q = query.toLowerCase().trim();

  return problems
    .filter((p) => {
      if (q) {
        const matchId = p.problem_id.toLowerCase().includes(q);
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchSource = p.source?.toLowerCase().includes(q) ?? false;
        if (!matchId && !matchTitle && !matchTags && !matchSource) return false;
      }
      if (ratingMin !== null && (p.rating ?? 0) < ratingMin) return false;
      if (ratingMax !== null && (p.rating ?? 9999) > ratingMax) return false;
      if (tags.length > 0 && !tags.some((t) => p.tags.includes(t))) return false;
      if (source && p.source !== source) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") cmp = a.problem_id.localeCompare(b.problem_id);
      else if (sortField === "rating") cmp = (a.rating ?? 0) - (b.rating ?? 0);
      else if (sortField === "title") cmp = a.title.localeCompare(b.title);
      if (sortDir === "desc") cmp = -cmp;
      if (cmp === 0) cmp = a.problem_id.localeCompare(b.problem_id);
      return cmp;
    });
}

/* ------------------------------------------------------------------ */
/*  Filter Dropdown                                                    */
/* ------------------------------------------------------------------ */

function FilterDropdown({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[#E6E7EB] bg-white px-4 py-2.5 text-sm font-medium text-[#6B7280] transition-all hover:border-[#D1D5E0] hover:text-[#111827]"
      >
        {icon}
        {label}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[#E6E7EB] bg-white p-4 shadow-xl shadow-black/5 backdrop-blur-xl">
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

interface ProblemsListProps {
  problems: ProblemListItem[];
}

export default function ProblemsList({ problems }: ProblemsListProps) {
  const [filters, setFilters] = useState<Filters>({
    query: "",
    ratingMin: null,
    ratingMax: null,
    tags: [],
    source: null,
  });
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(
    () => filterAndSortProblems(problems, filters, sortField, sortDir),
    [problems, filters, sortField, sortDir],
  );

  const uniqueSources = useMemo(
    () => [...new Set(problems.map((p) => p.source).filter(Boolean))] as string[],
    [problems],
  );

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  const setQuery = useCallback((query: string) => {
    setFilters((f) => ({ ...f, query }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setFilters((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }, []);

  const hasActiveFilters =
    filters.query ||
    filters.ratingMin !== null ||
    filters.ratingMax !== null ||
    filters.tags.length > 0 ||
    filters.source;

  const clearFilters = useCallback(() => {
    setFilters({ query: "", ratingMin: null, ratingMax: null, tags: [], source: null });
  }, []);

  // SSR / initial load — render real content immediately
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* ---------- Header ---------- */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111827]">
          Problems
        </h1>
        <p className="mt-3 text-lg text-[#6B7280]">
          Practice competitive programming problems. Search, filter and solve.
        </p>
      </div>

      {/* ---------- Search + Filters ---------- */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by title, ID, tag or source..."
            value={filters.query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-[#E6E7EB] bg-white py-4 pl-14 pr-12 text-lg text-[#111827] placeholder-[#9CA3AF] outline-none transition-all focus:border-[#2563EB]/30 focus:ring-2 focus:ring-[#2563EB]/10"
          />
          {filters.query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#9CA3AF] hover:text-[#6B7280]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Rating filter */}
          <FilterDropdown label="Rating" icon={<ArrowUpDown className="h-4 w-4" />}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Min
                </label>
                <input
                  type="number"
                  placeholder="800"
                  value={filters.ratingMin ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      ratingMin: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="w-full rounded-xl border border-[#E6E7EB] bg-white px-4 py-2.5 text-base text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/30"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Max
                </label>
                <input
                  type="number"
                  placeholder="3500"
                  value={filters.ratingMax ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      ratingMax: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="w-full rounded-xl border border-[#E6E7EB] bg-white px-4 py-2.5 text-base text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/30"
                />
              </div>
            </div>
          </FilterDropdown>

          {/* Tags filter */}
          <FilterDropdown label="Tags" icon={<span className="text-xs">#</span>}>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map((tag) => {
                const active = filters.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? "border-[#2563EB]/30 bg-[#2563EB]/10 text-[#2563EB]"
                        : "border-[#E6E7EB] text-[#6B7280] hover:border-[#D1D5E0] hover:text-[#111827]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </FilterDropdown>

          {/* Source filter */}
          <FilterDropdown label="Source" icon={<span className="text-xs">S</span>}>
            <div className="space-y-1.5">
              <button
                onClick={() => setFilters((f) => ({ ...f, source: null }))}
                className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                  filters.source === null
                    ? "bg-[#2563EB]/10 text-[#2563EB]"
                    : "text-[#6B7280] hover:bg-[#F5F5F7] hover:text-[#111827]"
                }`}
              >
                All sources
              </button>
              {uniqueSources.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilters((f) => ({ ...f, source: s }))}
                  className={`w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                    filters.source === s
                      ? "bg-[#2563EB]/10 text-[#2563EB]"
                      : "text-[#6B7280] hover:bg-[#F5F5F7] hover:text-[#111827]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Sort */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#E6E7EB] bg-white p-1.5">
            {(["rating", "id", "title"] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-all ${
                  sortField === field
                    ? "bg-[#2563EB]/10 text-[#2563EB]"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {field}
                {sortField === field && (
                  <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
                )}
              </button>
            ))}
          </div>

          {/* Active filter count / clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {/* Active tag pills */}
        {filters.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/10 px-3 py-1.5 text-sm font-medium text-[#2563EB]"
              >
                {tag}
                <button onClick={() => toggleTag(tag)} className="hover:text-[#1D4ED8]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Result count ---------- */}
      <div className="mb-6 text-sm text-[#9CA3AF]">
        Showing {filtered.length} of {problems.length} problems
      </div>

      {/* ---------- Card List ---------- */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E6E7EB] bg-white py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-[#D1D5DB]" />
          <p className="text-lg font-medium text-[#6B7280]">No problems found</p>
          <p className="mt-2 text-base text-[#9CA3AF]">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((problem) => (
            <ProblemCard
              key={problem.problem_id}
              problem={problem}
            />
          ))}
        </div>
      )}

      {/* ---------- Bottom spacing ---------- */}
      <div className="h-12" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProblemCard                                                       */
/* ------------------------------------------------------------------ */

function ProblemCard({
   problem,
 }: {
   problem: ProblemListItem;
 }) {
   return (
     <motion.div layout>
       <Link
         href={`/problems/${problem.problem_id}`}
         className="group block cursor-pointer rounded-2xl border border-[#E6E7EB] bg-white transition-all duration-200 hover:border-[#D1D5E0] hover:shadow-lg hover:shadow-black/5"
       >
         <div className="flex items-start justify-between p-6">
           <div className="flex-1 min-w-0">
             <div className="mb-2 font-mono text-sm font-medium tracking-tight text-[#9CA3AF]">
               {problem.problem_id}
             </div>
             <h3 className="truncate text-lg font-semibold text-[#111827] transition-colors group-hover:text-[#2563EB]">
               {problem.contest_id && problem.problem_index
                 ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
                 : problem.title}
             </h3>
             <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6B7280]">
               {problem.source && (
                 <span className="flex items-center gap-1.5">
                   <span className="text-[#D1D5DB]">·</span>
                   {problem.source}
                 </span>
               )}
               <span className="flex items-center gap-1.5">
                 <Timer className="h-4 w-4" />
                 {formatTime(problem.time_limit_ms)}
               </span>
               <span className="flex items-center gap-1.5">
                 <Database className="h-4 w-4" />
                 {formatMemory(problem.memory_limit_mb)}
               </span>
             </div>
           </div>

           <div className="ml-4 flex flex-col items-end gap-2">
             <RatingBadge rating={problem.rating} size="sm" />
             <ChevronRight
               className="h-5 w-5 text-[#D1D5DB] transition-all duration-200 group-hover:text-[#9CA3AF]"
             />
           </div>
         </div>

         <div className="flex flex-wrap items-center gap-2 border-t border-[#E6E7EB]/60 px-6 py-4">
           {problem.tags.length > 0 ? (
             problem.tags.map((tag) => <TagBadge key={tag} tag={tag} />)
           ) : (
             <span className="text-sm text-[#D1D5DB]">No tags</span>
           )}
         </div>
       </Link>
     </motion.div>
   );
 }