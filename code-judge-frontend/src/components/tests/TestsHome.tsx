"use client";

import { useCallback, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  Users2,
} from "lucide-react";
import { TestsHero } from "./Hero";
import { ExamCategories } from "./ExamCategoryCard";
import { ContinueTestCard } from "./ContinueTestCard";
import { RecommendedTestCard } from "./RecommendedTestCard";
import { TestSeriesExplorer } from "./TestSeriesExplorer";
import { TestSeriesCard } from "./TestSeriesCard";
import { FreeTestCard } from "./FreeTestCard";
import { TeacherCard } from "./TeacherCard";
import { TeacherCta } from "./TeacherCta";
import { TopSeriesMarketplace } from "./TopSeriesMarketplace";
import { ContestsPreview } from "./ContestsPreview";
import { ProblemsPreview } from "./ProblemsPreview";
import { PerformanceSection } from "./PerformanceSection";
import {
  CONTINUE_TESTS,
  RECOMMENDED_TESTS,
  SERIES,
  FREE_TESTS,
  TEACHERS,
} from "./mockData";
import { SectionHeading } from "./ui";
import type { ExamId } from "./types";

const POPULAR_SERIES = SERIES.filter((s) => s.featured).slice(0, 4);

const LAYOUT_CLASSES =
  "mx-auto w-full max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-10 xl:px-12 2xl:px-16";

export function TestsHome({ initialExam, showContinue }: { initialExam?: ExamId; showContinue?: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    document.getElementById("tests-marketplace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="tests-ambient relative min-h-screen">
      <div className={LAYOUT_CLASSES}>
        {/* Spacer under sticky header */}
        <div className="pt-8" />

        {/* 1 — HERO */}
        <TestsHero onSearch={handleSearch} />

        {/* 2 — EXPLORE TESTS (grouped categories + discovery rail) */}
        <div className="mt-14">
          <ExamCategories />
        </div>

        {/* 3 — CONTINUE / RECOMMENDED (personalized) */}
        <div className="mt-14">
          {showContinue && CONTINUE_TESTS.length > 0 ? (
            <>
              <SectionHeading
                title="Continue Learning"
                subtitle="Pick up right where you left off."
                icon={<BookOpen className="h-4.5 w-4.5" />}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                {CONTINUE_TESTS.map((test, i) => (
                  <ContinueTestCard key={test.id} test={test} index={i} />
                ))}
              </div>
            </>
          ) : (
            <>
              <SectionHeading
                title="Recommended for You"
                subtitle="Based on your exams and recent practice."
                icon={<Sparkles className="h-4.5 w-4.5" />}
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {RECOMMENDED_TESTS.map((test, i) => (
                  <RecommendedTestCard key={test.id} test={test} index={i} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* 4 — TEST SERIES (free / paid / teacher-created) */}
        <div className="mt-16">
          <TestSeriesExplorer />
        </div>

        {/* 5 — CONTESTS (sibling product) */}
        <div className="mt-16">
          <ContestsPreview />
        </div>

        {/* 6 — PROBLEMS (sibling product) */}
        <div className="mt-16">
          <ProblemsPreview />
        </div>

        {/* 7 — MARKETPLACE */}
        <div id="tests-marketplace" className="mt-16 scroll-mt-24">
          <TopSeriesMarketplace
            externalQuery={searchQuery}
            initialExam={initialExam === undefined ? "all" : initialExam}
          />
        </div>

        {/* 8 — POPULAR (featured) SERIES */}
        <div className="mt-16">
          <SectionHeading
            title="Featured Test Series"
            subtitle="Hand-picked series by ByteClash educators"
            href="/tests/series"
            icon={<TrendingUp className="h-4.5 w-4.5" />}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {POPULAR_SERIES.map((series, i) => (
              <TestSeriesCard key={series.id} series={series} index={i} />
            ))}
          </div>
        </div>

        {/* 9 — FREE TESTS */}
        <div className="mt-16">
          <SectionHeading
            title="Free Tests"
            subtitle="Start practicing without spending anything."
            href="/tests?free=1"
            icon={<Sparkles className="h-4.5 w-4.5" />}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FREE_TESTS.slice(0, 4).map((test, i) => (
              <FreeTestCard key={test.id} test={test} index={i} />
            ))}
          </div>
        </div>

        {/* 10 — TOP EDUCATORS */}
        <div className="mt-16">
          <SectionHeading
            title="Top Educators"
            subtitle="Learn from the teachers thousands of students trust."
            href="/tests/teachers"
            icon={<Users2 className="h-4.5 w-4.5" />}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {TEACHERS.slice(0, 5).map((teacher, i) => (
              <TeacherCard key={teacher.id} teacher={teacher} index={i} />
            ))}
          </div>
        </div>

        {/* 11 — PERFORMANCE */}
        <div className="mt-16">
          <PerformanceSection />
        </div>

        {/* 12 — TEACHER CTA */}
        <div className="mt-16">
          <TeacherCta />
        </div>
      </div>
    </div>
  );
}