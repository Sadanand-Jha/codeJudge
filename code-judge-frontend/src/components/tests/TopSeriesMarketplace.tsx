"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, FilterX } from "lucide-react";
import { SERIES, TEACHERS } from "./mockData";
import { TestSeriesCard } from "./TestSeriesCard";
import { SectionHeading } from "./ui";
import type { Difficulty } from "./types";
import { cn } from "@/lib/helpers";

type FilterKey = "all" | string;
type SortKey = "popular" | "rating" | "newest" | "price-low" | "price-high";
type PricingKey = "all" | "free" | "paid";
type SourceKey = "all" | "platform" | "teacher";

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "jee", label: "JEE" },
  { id: "neet", label: "NEET" },
  { id: "ssc", label: "SSC" },
  { id: "upsc", label: "UPSC" },
  { id: "banking", label: "Banking" },
  { id: "cuet", label: "CUET" },
  { id: "gate", label: "GATE" },
  { id: "cat", label: "CAT" },
  { id: "dsa", label: "DSA" },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "popular", label: "Most Popular" },
  { id: "rating", label: "Highest Rated" },
  { id: "newest", label: "Recently Added" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
];

const DIFFICULTIES: { id: Difficulty | "all"; label: string }[] = [
  { id: "all", label: "All Difficulties" },
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

const SOURCES: { id: SourceKey; label: string }[] = [
  { id: "all", label: "Any Creator" },
  { id: "platform", label: "Platform Official" },
  { id: "teacher", label: "Teacher-created" },
];

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all",
        active
          ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_3px_10px_rgba(236,72,153,0.28)]"
          : "text-text-secondary hover:bg-card-hover hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

export function TopSeriesMarketplace({
  externalQuery = "",
  initialExam = "all",
}: {
  externalQuery?: string;
  initialExam?: FilterKey;
}) {
  const [filter, setFilter] = useState<FilterKey>(initialExam);
  const [sort, setSort] = useState<SortKey>("popular");
  const [pricing, setPricing] = useState<PricingKey>("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [source, setSource] = useState<SourceKey>("all");
  const [teacherId, setTeacherId] = useState<string>("all");
  const [query, setQuery] = useState(externalQuery);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = SERIES.filter((s) => {
      if (filter !== "all" && s.examId !== filter) return false;
      if (pricing !== "all" && (pricing === "free") !== (s.price === 0)) return false;
      if (difficulty !== "all" && s.difficulty !== difficulty) return false;
      if (source !== "all" && (s.source ?? "teacher") !== source) return false;
      if (teacherId !== "all" && s.teacher.id !== teacherId) return false;
      if (
        q &&
        !`${s.title} ${s.examName} ${s.teacher.name} ${s.subjects.join(" ")}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "rating":
          return b.rating - a.rating;
        case "newest":
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        default:
          return b.studentCount - a.studentCount;
      }
    });
    return list;
  }, [filter, sort, pricing, difficulty, source, teacherId, query]);

  const activeFilters =
    (pricing !== "all" ? 1 : 0) +
    (difficulty !== "all" ? 1 : 0) +
    (source !== "all" ? 1 : 0) +
    (teacherId !== "all" ? 1 : 0) +
    (filter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilter("all");
    setPricing("all");
    setDifficulty("all");
    setSource("all");
    setTeacherId("all");
    setQuery("");
  };

  return (
    <section>
      <SectionHeading
        title="Test Series Marketplace"
        subtitle="Discover free and paid test series by exam, difficulty, price and creator."
      />

      {/* Filters + sort */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="mb-6 space-y-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Exam rail */}
          <div className="tests-scroll-x -mx-5 flex items-center gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition-all",
                  filter === f.id
                    ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
                    : "border-border bg-card text-text-secondary hover:border-pink-500/30 hover:text-text-primary"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search + sort */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search series..."
                className="h-10 w-48 rounded-xl border border-input-border bg-input-bg pl-8 pr-3 text-xs text-text-primary placeholder-text-muted focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort test series"
              className="h-10 w-44 rounded-xl border border-input-border bg-input-bg px-3 text-xs font-semibold text-text-primary focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-border bg-card p-1">
            <SegBtn active={pricing === "all"} onClick={() => setPricing("all")}>All</SegBtn>
            <SegBtn active={pricing === "free"} onClick={() => setPricing("free")}>Free</SegBtn>
            <SegBtn active={pricing === "paid"} onClick={() => setPricing("paid")}>Paid</SegBtn>
          </div>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}
            aria-label="Filter by difficulty"
            className="h-9 rounded-xl border border-input-border bg-input-bg px-3 text-xs font-semibold text-text-primary focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => setSource(e.target.value as SourceKey)}
            aria-label="Filter by creator"
            className="h-9 rounded-xl border border-input-border bg-input-bg px-3 text-xs font-semibold text-text-primary focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          >
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            aria-label="Filter by teacher"
            className="h-9 max-w-[180px] rounded-xl border border-input-border bg-input-bg px-3 text-xs font-semibold text-text-primary focus:border-pink-500/40 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
          >
            <option value="all">Any Teacher</option>
            {TEACHERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:text-ai-accent"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear ({activeFilters})
            </button>
          )}
        </div>
      </motion.div>

      {/* Grid */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <SlidersHorizontal className="h-6 w-6 text-text-muted" />
          <p className="mt-3 text-sm font-semibold text-text-primary">No test series found</p>
          <p className="mt-1 text-xs text-text-muted">Try a different exam, price or creator combination.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((series, i) => (
            <TestSeriesCard key={series.id} series={series} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}