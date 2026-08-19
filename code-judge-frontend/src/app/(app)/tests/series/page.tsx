"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TopSeriesMarketplace } from "@/components/tests/TopSeriesMarketplace";
import { SectionHeading } from "@/components/tests/ui";
import { SERIES } from "@/components/tests/mockData";
import { TestSeriesCard } from "@/components/tests/TestSeriesCard";
import type { ExamId } from "@/components/tests/types";

function AllSeriesContent() {
  const params = useSearchParams();
  const exam = params.get("exam") as ExamId | null;
  const featured = SERIES.filter((s) => s.featured).slice(0, 4);

  return (
    <div className="tests-ambient relative min-h-screen">
      <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-text-muted">
          <Link href="/tests" className="hover:text-text-primary">Tests</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-text-secondary">Test Series</span>
        </nav>

        <div className="mb-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">All Test Series</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Every free and paid test series on ByteClash — filter by exam, price, difficulty and creator.
          </p>
        </div>

        {featured.length > 0 && (
          <div className="mb-12">
            <SectionHeading title="Featured" subtitle="Editor-picked series to start with." />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featured.map((series, i) => (
                <TestSeriesCard key={series.id} series={series} index={i} />
              ))}
            </div>
          </div>
        )}

        <TopSeriesMarketplace initialExam={exam ?? "all"} />
      </div>
    </div>
  );
}

export default function AllSeriesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ai-bg" />}>
      <AllSeriesContent />
    </Suspense>
  );
}