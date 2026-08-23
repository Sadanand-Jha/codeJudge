"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Trophy, Gauge } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useBillingData } from "@/components/creator/billing/hooks";
import {
  PageHeader,
  MockDataTag,
  Panel,
  StatCard,
  StatCardSkeleton,
  PanelSkeleton,
  SegmentedControl,
  StatusBadge,
  type StatusTone,
  EmptyState,
  ErrorState,
  BillButton,
} from "@/components/creator/billing/ui";
import { MiniBarChart } from "./charts";
import { RANGE_OPTIONS, buildTrend, type Range } from "./shared";

const TEST_OPTIONS = [
  { id: "jee", label: "JEE Main Mock #12" },
  { id: "neet", label: "NEET Physics Drill" },
  { id: "lr", label: "Logical Reasoning Set 3" },
  { id: "calc", label: "Advanced Calculus" },
] as const;

type TestId = (typeof TEST_OPTIONS)[number]["id"];

interface QuestionRow {
  q: number;
  type: string;
  topic: string;
  correctPct: number;
  timeSec: number;
  status: "Easy" | "Medium" | "Hard";
}

interface TestData {
  id: TestId;
  name: string;
  attempts: number;
  completionRate: number;
  avgScore: number;
  difficultyIndex: number;
  distribution: Array<{ label: string; value: number }>;
  questions: QuestionRow[];
  attemptsSeries: Record<Range, Array<{ label: string; value: number }>>;
}

const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY14 = Array.from({ length: 14 }, (_, i) => `D${i + 1}`);
const WEEK12 = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

const TREND_WEIGHTS: Record<Range, number[]> = {
  "7d": [0.72, 0.81, 0.68, 0.88, 0.95, 1.0, 0.86],
  "30d": [
    0.62, 0.7, 0.66, 0.78, 0.74, 0.85, 0.81, 0.9, 0.88, 0.96, 0.92, 1.0, 0.97, 0.89,
  ],
  "90d": [
    0.55, 0.61, 0.66, 0.7, 0.74, 0.79, 0.83, 0.88, 0.92, 0.96, 1.0, 0.95,
  ],
};

const TESTS: Record<TestId, TestData> = {
  jee: {
    id: "jee",
    name: "JEE Main Mock Test #12",
    attempts: 1248,
    completionRate: 78.4,
    avgScore: 67.2,
    difficultyIndex: 0.62,
    distribution: [
      { label: "0-9", value: 8 },
      { label: "10-19", value: 15 },
      { label: "20-29", value: 28 },
      { label: "30-39", value: 45 },
      { label: "40-49", value: 62 },
      { label: "50-59", value: 78 },
      { label: "60-69", value: 84 },
      { label: "70-79", value: 66 },
      { label: "80-89", value: 41 },
      { label: "90-100", value: 18 },
    ],
    questions: [
      { q: 1, type: "MCQ", topic: "Kinematics", correctPct: 82, timeSec: 45, status: "Easy" },
      { q: 2, type: "MCQ", topic: "Laws of Motion", correctPct: 74, timeSec: 52, status: "Easy" },
      { q: 3, type: "Numerical", topic: "Work & Energy", correctPct: 61, timeSec: 68, status: "Medium" },
      { q: 4, type: "MCQ", topic: "Rotational Motion", correctPct: 55, timeSec: 74, status: "Medium" },
      { q: 5, type: "Integer", topic: "Thermodynamics", correctPct: 42, timeSec: 89, status: "Hard" },
      { q: 6, type: "Numerical", topic: "Gravitation", correctPct: 66, timeSec: 58, status: "Medium" },
      { q: 7, type: "MCQ", topic: "SHM", correctPct: 78, timeSec: 49, status: "Easy" },
      { q: 8, type: "Integer", topic: "Optics", correctPct: 38, timeSec: 96, status: "Hard" },
    ],
    attemptsSeries: {
      "7d": buildTrend(142, TREND_WEIGHTS["7d"], WEEKDAY),
      "30d": buildTrend(148, TREND_WEIGHTS["30d"], DAY14),
      "90d": buildTrend(151, TREND_WEIGHTS["90d"], WEEK12),
    },
  },
  neet: {
    id: "neet",
    name: "NEET Physics Drill",
    attempts: 986,
    completionRate: 71.9,
    avgScore: 63.8,
    difficultyIndex: 0.55,
    distribution: [
      { label: "0-9", value: 10 },
      { label: "10-19", value: 21 },
      { label: "20-29", value: 34 },
      { label: "30-39", value: 52 },
      { label: "40-49", value: 69 },
      { label: "50-59", value: 80 },
      { label: "60-69", value: 72 },
      { label: "70-79", value: 54 },
      { label: "80-89", value: 30 },
      { label: "90-100", value: 12 },
    ],
    questions: [
      { q: 1, type: "MCQ", topic: "Units & Measurement", correctPct: 84, timeSec: 40, status: "Easy" },
      { q: 2, type: "MCQ", topic: "Kinematics", correctPct: 78, timeSec: 47, status: "Easy" },
      { q: 3, type: "MCQ", topic: "Newton's Laws", correctPct: 66, timeSec: 59, status: "Medium" },
      { q: 4, type: "Numerical", topic: "Work, Energy & Power", correctPct: 58, timeSec: 71, status: "Medium" },
      { q: 5, type: "MCQ", topic: "Rotational Motion", correctPct: 51, timeSec: 76, status: "Medium" },
      { q: 6, type: "Integer", topic: "Thermodynamics", correctPct: 44, timeSec: 88, status: "Hard" },
      { q: 7, type: "MCQ", topic: "Electrostatics", correctPct: 72, timeSec: 54, status: "Easy" },
      { q: 8, type: "Numerical", topic: "Current Electricity", correctPct: 49, timeSec: 82, status: "Hard" },
    ],
    attemptsSeries: {
      "7d": buildTrend(112, TREND_WEIGHTS["7d"], WEEKDAY),
      "30d": buildTrend(118, TREND_WEIGHTS["30d"], DAY14),
      "90d": buildTrend(121, TREND_WEIGHTS["90d"], WEEK12),
    },
  },
  lr: {
    id: "lr",
    name: "Logical Reasoning Set 3",
    attempts: 742,
    completionRate: 82.1,
    avgScore: 71.5,
    difficultyIndex: 0.48,
    distribution: [
      { label: "0-9", value: 6 },
      { label: "10-19", value: 12 },
      { label: "20-29", value: 22 },
      { label: "30-39", value: 36 },
      { label: "40-49", value: 55 },
      { label: "50-59", value: 74 },
      { label: "60-69", value: 88 },
      { label: "70-79", value: 79 },
      { label: "80-89", value: 52 },
      { label: "90-100", value: 24 },
    ],
    questions: [
      { q: 1, type: "MCQ", topic: "Syllogisms", correctPct: 88, timeSec: 38, status: "Easy" },
      { q: 2, type: "MCQ", topic: "Blood Relations", correctPct: 81, timeSec: 44, status: "Easy" },
      { q: 3, type: "MCQ", topic: "Seating Arrangement", correctPct: 69, timeSec: 61, status: "Medium" },
      { q: 4, type: "MCQ", topic: "Series Completion", correctPct: 74, timeSec: 52, status: "Easy" },
      { q: 5, type: "MCQ", topic: "Coding-Decoding", correctPct: 63, timeSec: 66, status: "Medium" },
      { q: 6, type: "Match", topic: "Analogy Sets", correctPct: 57, timeSec: 72, status: "Medium" },
      { q: 7, type: "MCQ", topic: "Data Sufficiency", correctPct: 48, timeSec: 85, status: "Hard" },
      { q: 8, type: "MCQ", topic: "Logical Puzzles", correctPct: 52, timeSec: 79, status: "Hard" },
    ],
    attemptsSeries: {
      "7d": buildTrend(84, TREND_WEIGHTS["7d"], WEEKDAY),
      "30d": buildTrend(89, TREND_WEIGHTS["30d"], DAY14),
      "90d": buildTrend(92, TREND_WEIGHTS["90d"], WEEK12),
    },
  },
  calc: {
    id: "calc",
    name: "Advanced Calculus Test",
    attempts: 514,
    completionRate: 64.7,
    avgScore: 58.6,
    difficultyIndex: 0.71,
    distribution: [
      { label: "0-9", value: 16 },
      { label: "10-19", value: 28 },
      { label: "20-29", value: 44 },
      { label: "30-39", value: 61 },
      { label: "40-49", value: 70 },
      { label: "50-59", value: 66 },
      { label: "60-69", value: 52 },
      { label: "70-79", value: 38 },
      { label: "80-89", value: 22 },
      { label: "90-100", value: 9 },
    ],
    questions: [
      { q: 1, type: "MCQ", topic: "Limits", correctPct: 76, timeSec: 50, status: "Easy" },
      { q: 2, type: "Numerical", topic: "Differentiation", correctPct: 68, timeSec: 62, status: "Medium" },
      { q: 3, type: "MCQ", topic: "Applications of Derivatives", correctPct: 59, timeSec: 70, status: "Medium" },
      { q: 4, type: "Integer", topic: "Definite Integrals", correctPct: 46, timeSec: 92, status: "Hard" },
      { q: 5, type: "MCQ", topic: "Indefinite Integrals", correctPct: 54, timeSec: 74, status: "Medium" },
      { q: 6, type: "Numerical", topic: "Differential Equations", correctPct: 41, timeSec: 95, status: "Hard" },
      { q: 7, type: "MCQ", topic: "Series & Sequences", correctPct: 63, timeSec: 66, status: "Medium" },
      { q: 8, type: "Integer", topic: "Multivariable Calculus", correctPct: 32, timeSec: 102, status: "Hard" },
    ],
    attemptsSeries: {
      "7d": buildTrend(58, TREND_WEIGHTS["7d"], WEEKDAY),
      "30d": buildTrend(61, TREND_WEIGHTS["30d"], DAY14),
      "90d": buildTrend(64, TREND_WEIGHTS["90d"], WEEK12),
    },
  },
};

const Q_STATUS_TONE: Record<QuestionRow["status"], StatusTone> = {
  Easy: "emerald",
  Medium: "amber",
  Hard: "rose",
};

export function TestAnalyticsPage({ demoState }: { demoState?: "empty" | "error" }) {
  const [testId, setTestId] = useState<TestId>("jee");
  const [range, setRange] = useState<Range>("30d");
  const isMobile = useMediaQuery("(max-width: 768px)");
  const effectiveRange: Range = isMobile ? "7d" : range;
  const { state, data, retry } = useBillingData(() => ({ tests: TESTS }), {
    delayMs: 650,
    demoState,
  });

  const test = data?.tests[testId];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Test Analytics"
        subtitle="Understand how each test performs"
        badge={<MockDataTag />}
        actions={
          <SegmentedControl value={testId} onChange={setTestId} options={TEST_OPTIONS} size="md" />
        }
      />

      {state === "loading" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PanelSkeleton title="Score distribution" />
            <PanelSkeleton title="Attempts over time" />
          </div>
          <PanelSkeleton title="Question-level breakdown" />
        </div>
      )}

      {state === "error" && <ErrorState onRetry={retry} />}

      {state === "empty" && (
        <EmptyState
          title="No test analytics yet"
          description="Once students attempt your tests, score distributions and question-level insights will appear here."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}

      {state === "ready" && data && test && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Attempts"
              value={test.attempts}
              display={test.attempts.toLocaleString("en-IN")}
              delta={6.2}
              hint="vs previous period"
              accent="info"
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Completion Rate"
              value={test.completionRate}
              display={`${test.completionRate}%`}
              delta={3.4}
              hint="of attempts finished"
              accent="success"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Avg Score"
              value={test.avgScore}
              display={`${test.avgScore}%`}
              delta={-1.2}
              hint="across all attempts"
              accent="gold"
              icon={<Trophy className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Difficulty Index"
              value={test.difficultyIndex}
              display={test.difficultyIndex.toFixed(2)}
              delta={4.8}
              hint="higher = harder"
              accent="warning"
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Score distribution" subtitle="How student scores are spread">
              <MiniBarChart data={test.distribution} height={210} formatter={(v) => `${v} students`} />
            </Panel>

            <Panel
              title="Attempts over time"
              subtitle={`${test.name} — last ${effectiveRange === "7d" ? "7 days" : effectiveRange === "30d" ? "14 days" : "12 weeks"}`}
              action={
                <SegmentedControl
                  value={effectiveRange}
                  onChange={setRange}
                  options={isMobile ? RANGE_OPTIONS.filter((o) => o.id === "7d") : RANGE_OPTIONS}
                />
              }
            >
              <MiniBarChart data={test.attemptsSeries[effectiveRange]} height={isMobile ? 160 : 210} />
            </Panel>
          </div>

          <Panel title="Question-level breakdown" subtitle="Per-question performance for this test">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-3">Q#</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Topic</th>
                    <th className="px-3 py-3">Correct %</th>
                    <th className="px-3 py-3">Time Spent</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {test.questions.map((q, i) => (
                    <motion.tr
                      key={q.q}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-3 py-3.5 font-semibold text-text-primary tabular-nums">{q.q}</td>
                      <td className="px-3 py-3.5 text-text-secondary">{q.type}</td>
                      <td className="px-3 py-3.5 text-text-primary">{q.topic}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-9 text-right font-semibold text-text-primary tabular-nums">
                            {q.correctPct}%
                          </span>
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
                              style={{ width: `${q.correctPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-xs tabular-nums text-text-secondary">{q.timeSec}s</td>
                      <td className="px-3 py-3.5">
                        <StatusBadge label={q.status} tone={Q_STATUS_TONE[q.status]} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2.5 md:hidden">
              {test.questions.map((q, i) => (
                <motion.div
                  key={q.q}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/60 bg-white/[0.02] p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary">
                        Q{q.q} · {q.topic}
                      </p>
                      <p className="mt-0.5 text-[11px] text-text-muted">
                        {q.type} · {q.timeSec}s · {q.correctPct}% correct
                      </p>
                    </div>
                    <StatusBadge label={q.status} tone={Q_STATUS_TONE[q.status]} />
                  </div>
                </motion.div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}