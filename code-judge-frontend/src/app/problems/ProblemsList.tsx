"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { ProblemListItem } from "@/types/problem";

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

  const hasActiveFilters =
    filters.query ||
    filters.ratingMin !== null ||
    filters.ratingMax !== null ||
    filters.tags.length > 0 ||
    filters.source;

  const clearFilters = useCallback(() => {
    setFilters({ query: "", ratingMin: null, ratingMax: null, tags: [], source: null });
  }, []);

  return (
    <div className="flex flex-col">
      {/* ---------- Search + Filter Bar ---------- */}
      <div className="mb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search problems..."
            value={filters.query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded border border-[#E6E7EB] bg-white py-1 pl-6 pr-2 text-[11px] text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#2563EB]/40"
          />
        </div>

        {/* Sort toggles */}
        <div className="flex items-center gap-0.5 rounded border border-[#E6E7EB] bg-white px-1 py-0.5">
          {(["id", "title", "rating"] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                sortField === field
                  ? "bg-[#2563EB]/10 text-[#2563EB]"
                  : "text-[#6B7280] hover:text-[#111827]"
              }`}
            >
              {field}
              {sortField === field && (
                <span className="ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="rounded px-2 py-1 text-[10px] text-[#9CA3AF] hover:text-[#6B7280]"
          >
            Clear
          </button>
        )}
      </div>

      {/* ---------- Result count ---------- */}
      <div className="mb-1 text-[10px] text-[#9CA3AF]">
        Showing {filtered.length} of {problems.length} problems
      </div>

      {/* ---------- Problems Table ---------- */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[#E6E7EB] bg-white py-12 text-center">
          <Search className="mb-2 h-6 w-6 text-[#D1D5DB]" />
          <p className="text-xs font-medium text-[#6B7280]">No problems found</p>
          <p className="mt-0.5 text-[10px] text-[#9CA3AF]">
            Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-[#E6E7EB] bg-[#FAFAFB] text-[#6B7280]">
                <th className="px-2 py-1.5 text-left font-medium w-[60px]">
                  <div className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    <span>#</span>
                  </div>
                </th>
                <th className="px-2 py-1.5 text-left font-medium">Name</th>
                <th className="px-2 py-1.5 text-center w-[60px]"></th>
                <th className="px-2 py-1.5 text-right font-medium w-[80px]">
                  <svg
                    className="inline-block h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                    <polyline points="9 11 12 14 15 11" />
                  </svg>
                </th>
              </tr>
            </thead>
            {/* Table Body */}
            <tbody>
              {filtered.map((problem, idx) => {
                const title = problem.contest_id && problem.problem_index
                  ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
                  : problem.title;

                return (
                  <tr
                    key={problem.problem_id}
                    className={`border-b border-[#E6E7EB] ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFB]"
                    } hover:bg-[#F0F4FF] transition-colors`}
                  >
                    {/* # column */}
                    <td className="px-2 py-1.5">
                      <Link
                        href={`/problems/${problem.problem_id}`}
                        className="font-mono text-[#6A5ACD] hover:text-[#2563EB]"
                      >
                        {problem.problem_id}
                      </Link>
                    </td>
                    {/* Name column */}
                    <td className="px-2 py-1.5">
                      <Link
                        href={`/problems/${problem.problem_id}`}
                        className="text-[#2563EB] hover:underline"
                      >
                        {title}
                      </Link>
                    </td>
                    {/* Action icons column */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[#D1D5DB]">
                        {/* Paper plane (submit) */}
                        <svg
                          className="h-3.5 w-3.5 cursor-pointer hover:text-[#2563EB]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        {/* Star (favorite) */}
                        <svg
                          className="h-3.5 w-3.5 cursor-pointer hover:text-[#F59E0B]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </div>
                    </td>
                    {/* Solve count column */}
                    <td className="px-2 py-1.5 text-right">
                      <Link
                        href={`/problems/${problem.problem_id}/status`}
                        className="text-[#2563EB] hover:underline font-mono"
                      >
                        x{10000 + idx * 37}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Bottom spacing ---------- */}
      <div className="h-4" />
    </div>
  );
}