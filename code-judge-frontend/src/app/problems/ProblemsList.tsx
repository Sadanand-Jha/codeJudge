"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { ProblemListItem } from "@/types/problem";
import RatingBadge from "@/components/problem/RatingBadge";
import TagBadge from "@/components/problem/TagBadge";

interface ProblemsListProps {
  problems: ProblemListItem[];
}

export default function ProblemsList({ problems }: ProblemsListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProblems = useMemo(() => {
    if (!searchQuery.trim()) return problems;
    const q = searchQuery.toLowerCase();
    return problems.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.problem_id.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        (p.source && p.source.toLowerCase().includes(q))
    );
  }, [problems, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <span className="flex items-center gap-2">
          <Link
            href="/problems"
            className="transition-colors hover:text-zinc-300"
          >
            Problems
          </Link>
        </span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">
          Problems
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Browse all coding problems. Click on any problem to view its full
          details.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by title, ID, tag, or source..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-500 backdrop-blur-sm transition-colors focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
        />
      </div>

      {/* Results count */}
      <p className="mb-4 text-xs text-zinc-500">
        Showing {filteredProblems.length} of {problems.length} problems
      </p>

      {/* Problems Table */}
      {filteredProblems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 py-16 text-center">
          <Search className="mb-3 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">
            No problems match your search.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Title
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 md:table-cell">
                  Rating
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 lg:table-cell">
                  Tags
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 sm:table-cell">
                  Source
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredProblems.map((problem) => (
                <tr
                  key={problem.problem_id}
                  className="group transition-colors hover:bg-zinc-800/30"
                >
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-zinc-500">
                      {problem.problem_id}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/problems/${problem.problem_id}`}
                      className="text-sm font-medium text-zinc-200 transition-colors group-hover:text-blue-400"
                    >
                      {problem.contest_id && problem.problem_index
                        ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
                        : problem.title}
                    </Link>
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    {problem.rating !== null ? (
                      <RatingBadge rating={problem.rating} />
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="hidden max-w-[240px] px-5 py-4 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {problem.tags.length > 0 ? (
                        problem.tags.slice(0, 3).map((tag) => (
                          <TagBadge key={tag} tag={tag} />
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                      {problem.tags.length > 3 && (
                        <span className="text-xs text-zinc-500">
                          +{problem.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <span className="text-xs text-zinc-500">
                      {problem.source || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/problems/${problem.problem_id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-blue-400"
                    >
                      View
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}