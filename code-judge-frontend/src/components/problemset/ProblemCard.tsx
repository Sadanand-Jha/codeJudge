"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bookmark, Clock, ArrowRight } from "lucide-react";
import type { ProblemListItem } from "@/types/problem";

function getRatingColor(rating: number): string {
  if (rating >= 2400) return "#EF4444";
  if (rating >= 2100) return "#F97316";
  if (rating >= 1900) return "#7C3AED";
  if (rating >= 1600) return "#3B82F6";
  if (rating >= 1400) return "#F59E0B";
  if (rating >= 1200) return "#22C55E";
  return "#9CA3AF";
}

interface ProblemCardProps {
  problem: ProblemListItem;
  index?: number;
}

export default function ProblemCard({ problem, index = 0 }: ProblemCardProps) {
  const rating = problem.rating ?? 0;
  const ratingColor = getRatingColor(rating);
  const title = problem.contest_id && problem.problem_index
    ? `${problem.contest_id}${problem.problem_index} — ${problem.title}`
    : problem.title;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-[0_0_24px_rgba(37,99,235,0.1)] hover:border-accent/30"
    >
      {/* Top Row: ID + Bookmark */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-text-secondary">{problem.problem_id}</span>
        <button className="text-text-secondary hover:text-gold transition-colors">
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Title */}
      <Link href={`/problems/${problem.problem_id}`} className="block mb-3">
        <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
          {title}
        </h3>
      </Link>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span
          className="px-2 py-0.5 rounded-md text-[10px] font-semibold border"
          style={{
            color: ratingColor,
            borderColor: `${ratingColor}30`,
            backgroundColor: `${ratingColor}10`,
          }}
        >
          {rating}
        </span>
        {(problem.tags || []).slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-md text-[10px] font-medium text-text-secondary bg-card-hover border border-border"
          >
            {tag}
          </span>
        ))}
        {(problem.tags || []).length > 3 && (
          <span className="px-2 py-0.5 rounded-md text-[10px] text-text-muted">
            +{problem.tags.length - 3}
          </span>
        )}
      </div>

      {/* Bottom Row: Stats + Solve Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-text-secondary">
          <span>61% Acceptance</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> 35 min
          </span>
          <span>18.2K solves</span>
        </div>
        <Link
          href={`/problems/${problem.problem_id}/editor`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-accent opacity-0 group-hover:opacity-100 transition-all hover:shadow-[0_0_12px_rgba(37,99,235,0.3)]"
        >
          Solve <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.div>
  );
}