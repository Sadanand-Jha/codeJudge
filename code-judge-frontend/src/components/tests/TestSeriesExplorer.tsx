"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, ArrowRight } from "lucide-react";
import { SERIES } from "./mockData";
import { TestSeriesCardCompact } from "./TestSeriesCard";
import { SectionHeading } from "./ui";
import { cn } from "@/lib/helpers";

type Tab = "popular" | "free" | "paid" | "teacher";

const TABS: { id: Tab; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "free", label: "Free" },
  { id: "paid", label: "Paid" },
  { id: "teacher", label: "Teacher-created" },
];

/**
 * Dedicated Test Series area — Free / Paid / Teacher-created rails so the
 * marketplace taxonomy is visible before the full marketplace below.
 */
export function TestSeriesExplorer() {
  const [tab, setTab] = useState<Tab>("popular");

  const series = useMemo(() => {
    const list = [...SERIES];
    switch (tab) {
      case "free":
        return list.filter((s) => s.price === 0).sort((a, b) => b.studentCount - a.studentCount).slice(0, 12);
      case "paid":
        return list.filter((s) => s.price > 0).sort((a, b) => b.studentCount - a.studentCount).slice(0, 12);
      case "teacher":
        return list.filter((s) => (s.source ?? "teacher") === "teacher").slice(0, 12);
      default:
        return list.sort((a, b) => b.studentCount - a.studentCount).slice(0, 12);
    }
  }, [tab]);

  return (
    <section>
      <SectionHeading
        title="Test Series"
        subtitle="Structured multi-test courses — free, paid and teacher-created."
        href="/tests?explore=1"
        icon={<Layers className="h-4.5 w-4.5" />}
      />

      {/* Segmented tab rail */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="tests-scroll-x -mx-5 mb-5 flex items-center gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-bold transition-all",
              tab === t.id
                ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
                : "border-border bg-card text-text-secondary hover:border-pink-500/25 hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
        <Link
          href="/tests/series"
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-2 text-xs font-bold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:text-ai-accent"
        >
          All Series <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>

      {/* Horizontal rail */}
      <div className="tests-scroll-x -mx-5 flex gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
        {series.map((s) => (
          <TestSeriesCardCompact key={s.id} series={s} />
        ))}
      </div>
    </section>
  );
}