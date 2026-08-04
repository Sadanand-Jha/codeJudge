"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CircleDashed,
  CircleDot,
  Layers3,
  Medal,
  Play,
  PieChart,
  Target,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";

type QuestionStatus = "correct" | "wrong" | "skipped";

interface AttemptReviewQuestion {
  id: string;
  number: number;
  statement: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options: Array<{ id: string; label: string; text: string }>;
  correctOptionId: string;
  selectedOptionId?: string;
  explanation?: string;
  marksObtained: number;
  maxMarks: number;
  timeSpent: string;
}

interface AttemptReviewData {
  quizName: string;
  subject: string;
  attemptDate: string;
  duration: string;
  score: string;
  percentage: number;
  rank?: number;
  submittedAt: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  percentile: number;
  insights: {
    strongestTopic: string;
    weakestTopic: string;
    longestQuestions: string[];
    fastestQuestions: string[];
    topicAccuracy: Array<{ topic: string; accuracy: number }>;
    difficultyPerformance: Array<{ difficulty: string; accuracy: number }>;
  };
  questions: AttemptReviewQuestion[];
}

const ATTEMPT_DATA: AttemptReviewData = {
  quizName: "Graph Algorithms Sprint",
  subject: "Data Structures",
  attemptDate: "Aug 3, 2026 · 9:30 AM",
  duration: "18m 24s",
  score: "18/20",
  percentage: 90,
  rank: 7,
  submittedAt: "Aug 3, 2026 · 9:49 AM",
  totalQuestions: 6,
  correct: 4,
  wrong: 1,
  skipped: 1,
  percentile: 91,
  insights: {
    strongestTopic: "Shortest Path Algorithms",
    weakestTopic: "Traversal Edge Cases",
    longestQuestions: ["Question 3", "Question 5"],
    fastestQuestions: ["Question 1", "Question 2"],
    topicAccuracy: [
      { topic: "Graph Traversal", accuracy: 88 },
      { topic: "Shortest Path", accuracy: 95 },
      { topic: "MST", accuracy: 72 },
    ],
    difficultyPerformance: [
      { difficulty: "Easy", accuracy: 100 },
      { difficulty: "Medium", accuracy: 83 },
      { difficulty: "Hard", accuracy: 67 },
    ],
  },
  questions: [
    {
      id: "q1",
      number: 1,
      statement: "Which traversal is typically used to compute shortest path in an unweighted graph?",
      difficulty: "Easy",
      options: [
        { id: "a", label: "A", text: "DFS" },
        { id: "b", label: "B", text: "BFS" },
        { id: "c", label: "C", text: "Dijkstra" },
        { id: "d", label: "D", text: "Kruskal" },
      ],
      correctOptionId: "b",
      selectedOptionId: "b",
      explanation: "BFS explores layers level by level, so it yields the minimum number of edges in an unweighted graph.",
      marksObtained: 4,
      maxMarks: 4,
      timeSpent: "1m 02s",
    },
    {
      id: "q2",
      number: 2,
      statement: "Which algorithm finds the minimum spanning tree using edge sorting?",
      difficulty: "Easy",
      options: [
        { id: "a", label: "A", text: "Prim" },
        { id: "b", label: "B", text: "Kruskal" },
        { id: "c", label: "C", text: "Bellman-Ford" },
        { id: "d", label: "D", text: "Floyd-Warshall" },
      ],
      correctOptionId: "b",
      selectedOptionId: "b",
      explanation: "Kruskal sorts all edges and picks the smallest valid edge while avoiding cycles.",
      marksObtained: 4,
      maxMarks: 4,
      timeSpent: "1m 18s",
    },
    {
      id: "q3",
      number: 3,
      statement: "Select the traversal order for a level-order walk of a tree.",
      difficulty: "Medium",
      options: [
        { id: "a", label: "A", text: "Root, left subtree, right subtree" },
        { id: "b", label: "B", text: "Left subtree only" },
        { id: "c", label: "C", text: "Level by level from root" },
        { id: "d", label: "D", text: "Deepest leaves first" },
      ],
      correctOptionId: "c",
      selectedOptionId: "a",
      explanation: "Level order visits each level from top to bottom and left to right.",
      marksObtained: 0,
      maxMarks: 4,
      timeSpent: "2m 31s",
    },
    {
      id: "q4",
      number: 4,
      statement: "Which of these is a sign of a greedy strategy?",
      difficulty: "Medium",
      options: [
        { id: "a", label: "A", text: "Local optimal choice at each step" },
        { id: "b", label: "B", text: "Backtracking all possibilities" },
        { id: "c", label: "C", text: "Memoizing overlapping subproblems" },
        { id: "d", label: "D", text: "Randomized sampling" },
      ],
      correctOptionId: "a",
      selectedOptionId: "a",
      explanation: "Greedy algorithms make the locally best choice at each step.",
      marksObtained: 4,
      maxMarks: 4,
      timeSpent: "1m 04s",
    },
    {
      id: "q5",
      number: 5,
      statement: "Which graph property is required for Dijkstra to remain valid?",
      difficulty: "Hard",
      options: [
        { id: "a", label: "A", text: "No cycles" },
        { id: "b", label: "B", text: "Undirected edges only" },
        { id: "c", label: "C", text: "Non-negative edge weights" },
        { id: "d", label: "D", text: "All vertices connected" },
      ],
      correctOptionId: "c",
      selectedOptionId: "d",
      explanation: "Dijkstra fails when negative edge weights can invalidate a shortest-path relaxation.",
      marksObtained: 0,
      maxMarks: 4,
      timeSpent: "3m 10s",
    },
    {
      id: "q6",
      number: 6,
      statement: "How many edges are in a spanning tree with n vertices?",
      difficulty: "Easy",
      options: [
        { id: "a", label: "A", text: "n" },
        { id: "b", label: "B", text: "n - 1" },
        { id: "c", label: "C", text: "n + 1" },
        { id: "d", label: "D", text: "2n" },
      ],
      correctOptionId: "b",
      selectedOptionId: undefined,
      explanation: "A spanning tree connects all n vertices with exactly n - 1 edges.",
      marksObtained: 0,
      maxMarks: 4,
      timeSpent: "0m 40s",
    },
  ],
};

function questionStatus(question: AttemptReviewQuestion): QuestionStatus {
  if (!question.selectedOptionId) return "skipped";
  return question.selectedOptionId === question.correctOptionId ? "correct" : "wrong";
}

function statusColor(status: QuestionStatus) {
  switch (status) {
    case "correct":
      return "bg-emerald-500 text-emerald-400";
    case "wrong":
      return "bg-rose-500 text-rose-400";
    case "skipped":
      return "bg-zinc-500 text-zinc-400";
  }
}

export default function AttemptReviewExperience() {
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  const progress = useMemo(() => {
    return Math.round((ATTEMPT_DATA.percentage / 100) * 360);
  }, []);

  const analytics = useMemo(() => {
    const labels = [
      { label: "Correct", value: ATTEMPT_DATA.correct, color: "#22C55E" },
      { label: "Wrong", value: ATTEMPT_DATA.wrong, color: "#F43F5E" },
      { label: "Skipped", value: ATTEMPT_DATA.skipped, color: "#6B7280" },
    ];
    return labels;
  }, []);

  const currentQuestion = ATTEMPT_DATA.questions[selectedQuestion];

  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <div className="mx-auto max-w-[1600px] p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mb-3 sm:mb-4 flex items-center justify-between gap-3">
          <Link href="/quiz" className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 sm:px-4 py-2 text-sm font-medium text-white transition-all hover:border-white/[0.16] hover:bg-white/[0.06]">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
            <span className="rounded-full border border-[#EC4899]/20 bg-[#EC4899]/10 px-2.5 sm:px-3 py-1 font-medium text-[#F472B6] text-[10px] sm:text-xs">Attempt Review</span>
            <span className="hidden md:inline">LeetCode-style response review</span>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.25fr_360px]">
          <div className="space-y-4">
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#10131A] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#71717A]">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[#A1A1AA]">{ATTEMPT_DATA.subject}</span>
                    {ATTEMPT_DATA.rank !== undefined && <span className="rounded-full border border-[#F59E0B]/20 bg-[#F59E0B]/10 px-2.5 py-1 text-[#FBBF24]">Rank #{ATTEMPT_DATA.rank}</span>}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{ATTEMPT_DATA.quizName}</h1>
                    <p className="mt-1 text-sm text-[#A1A1AA]">Attempted on {ATTEMPT_DATA.attemptDate} · Submitted at {ATTEMPT_DATA.submittedAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative h-28 w-28 shrink-0 rounded-full border border-white/[0.08] bg-[#0B0D12] p-3">
                    <div
                      className="absolute inset-3 rounded-full"
                      style={{ background: `conic-gradient(#EC4899 ${progress}deg, rgba(255,255,255,0.06) ${progress}deg)` }}
                    />
                    <div className="absolute inset-6 rounded-full border border-white/[0.08] bg-[#09090B] flex flex-col items-center justify-center text-center">
                      <div className="text-2xl font-bold">{ATTEMPT_DATA.percentage}%</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[#71717A]">Score</div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SummaryCard label="Score" value={ATTEMPT_DATA.score} icon={Target} />
                    <SummaryCard label="Duration" value={ATTEMPT_DATA.duration} icon={Clock3} />
                    <SummaryCard label="Rank" value={ATTEMPT_DATA.rank ? `#${ATTEMPT_DATA.rank}` : "-"} icon={Trophy} />
                    <SummaryCard label="Submitted At" value={ATTEMPT_DATA.submittedAt} icon={Timer} />
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-3xl border border-white/[0.08] bg-[#10131A] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Question Palette</h2>
                  <p className="text-sm text-[#A1A1AA]">Green = correct, red = wrong, gray = skipped, blue = current question</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Correct</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Wrong</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" />Skipped</span>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-10">
                {ATTEMPT_DATA.questions.map((question, index) => {
                  const state = questionStatus(question);
                  const isActive = selectedQuestion === index;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setSelectedQuestion(index)}
                      className={`flex h-11 items-center justify-center rounded-2xl border text-sm font-semibold transition-all ${
                        isActive
                          ? "border-sky-400/40 bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20"
                          : state === "correct"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : state === "wrong"
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                          : "border-white/[0.08] bg-white/[0.03] text-zinc-300"
                      }`}
                    >
                      {question.number}
                    </button>
                  );
                })}
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl border border-white/[0.08] bg-[#10131A] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">Question {currentQuestion.number}</span>
                    <span className="rounded-full border border-[#EC4899]/20 bg-[#EC4899]/10 px-2.5 py-1 text-[10px] font-semibold text-[#F472B6]">{currentQuestion.difficulty}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold leading-snug text-white">{currentQuestion.statement}</h3>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <button
                    onClick={() => setSelectedQuestion((current) => Math.max(0, current - 1))}
                    disabled={selectedQuestion === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white transition-all hover:border-white/[0.16] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous Question
                  </button>
                  <button
                    onClick={() => setSelectedQuestion((current) => Math.min(ATTEMPT_DATA.questions.length - 1, current + 1))}
                    disabled={selectedQuestion === ATTEMPT_DATA.questions.length - 1}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white transition-all hover:border-white/[0.16] disabled:opacity-40"
                  >
                    Next Question
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isCorrect = option.id === currentQuestion.correctOptionId;
                  const isSelected = option.id === currentQuestion.selectedOptionId;
                  const selectedWrong = isSelected && !isCorrect;
                  return (
                    <div
                      key={option.id}
                      className={`rounded-2xl border px-4 py-3 transition-all ${
                        isCorrect
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : selectedWrong
                          ? "border-rose-500/30 bg-rose-500/10"
                          : isSelected
                          ? "border-sky-400/30 bg-sky-500/10"
                          : "border-white/[0.08] bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold ${isCorrect ? "border-emerald-500/30 bg-emerald-500 text-white" : selectedWrong ? "border-rose-500/30 bg-rose-500 text-white" : isSelected ? "border-sky-400/30 bg-sky-500 text-white" : "border-white/[0.12] bg-white/[0.03] text-[#A1A1AA]"}`}>
                          {option.label}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm text-white">
                            {option.text}
                            {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                            {isSelected && <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-sky-300">Your Answer</span>}
                            {isCorrect && <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">Correct Answer</span>}
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[#A1A1AA]">Marks Obtained {isCorrect ? currentQuestion.marksObtained : isSelected ? currentQuestion.marksObtained : 0}/{currentQuestion.maxMarks}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatBlock label="Your Answer" value={currentQuestion.selectedOptionId ? currentQuestion.selectedOptionId.toUpperCase() : "Skipped"} icon={CircleDot} />
                <StatBlock label="Correct Answer" value={currentQuestion.correctOptionId.toUpperCase()} icon={CheckCircle2} />
                <StatBlock label="Marks Obtained" value={`${currentQuestion.marksObtained}/${currentQuestion.maxMarks}`} icon={Medal} />
                <StatBlock label="Time Spent" value={currentQuestion.timeSpent} icon={Timer} />
              </div>

              {currentQuestion.explanation && (
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                    <BookOpen className="h-4 w-4 text-[#EC4899]" />
                    Explanation
                  </div>
                  <p className="text-sm leading-7 text-[#D1D5DB]">{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between sm:hidden">
                <button
                  onClick={() => setSelectedQuestion((current) => Math.max(0, current - 1))}
                  disabled={selectedQuestion === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white transition-all hover:border-white/[0.16] disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setSelectedQuestion((current) => Math.min(ATTEMPT_DATA.questions.length - 1, current + 1))}
                  disabled={selectedQuestion === ATTEMPT_DATA.questions.length - 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white transition-all hover:border-white/[0.16] disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
          </div>

          <div className="space-y-4">
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/[0.08] bg-[#10131A] p-5">
              <h2 className="text-lg font-semibold">Result Analytics</h2>
              <p className="mt-1 text-sm text-[#A1A1AA]">Score, ranking, and answer breakdown at a glance.</p>
              <div className="mt-4 space-y-3">
                <AnalyticsMetric label="Overall Score" value={ATTEMPT_DATA.score} icon={Target} />
                <AnalyticsMetric label="Accuracy" value={`${ATTEMPT_DATA.percentage}%`} icon={PieChart} />
                <AnalyticsMetric label="Attempt Time" value={ATTEMPT_DATA.attemptDate} icon={Clock3} />
                <AnalyticsMetric label="Avg Time / Question" value="2m 03s" icon={Timer} />
                <AnalyticsMetric label="Correct" value={ATTEMPT_DATA.correct} icon={CheckCircle2} />
                <AnalyticsMetric label="Wrong" value={ATTEMPT_DATA.wrong} icon={XCircle} />
                <AnalyticsMetric label="Skipped" value={ATTEMPT_DATA.skipped} icon={CircleDashed} />
                <AnalyticsMetric label="Rank" value={`#${ATTEMPT_DATA.rank}`} icon={Trophy} />
                <AnalyticsMetric label="Percentile" value={`${ATTEMPT_DATA.percentile}%`} icon={Zap} />
              </div>

              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-white">
                  <span>Correct vs Wrong vs Skipped</span>
                  <BarChart3 className="h-4 w-4 text-[#EC4899]" />
                </div>
                <div className="flex h-36 items-end gap-3">
                  {analytics.map((entry) => (
                    <div key={entry.label} className="flex flex-1 flex-col items-center gap-2 text-center">
                      <div
                        className="w-full rounded-2xl"
                        style={{ height: `${entry.label === "Correct" ? 90 : entry.label === "Wrong" ? 56 : 34}px`, backgroundColor: `${entry.color}20`, border: `1px solid ${entry.color}33` }}
                      />
                      <div className="text-[10px] text-[#A1A1AA]">{entry.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-3xl border border-white/[0.08] bg-[#10131A] p-5">
              <h2 className="text-lg font-semibold">Performance Insights</h2>
              <div className="mt-4 space-y-3 text-sm text-[#D1D5DB]">
                <InsightRow label="Strongest Topic" value={ATTEMPT_DATA.insights.strongestTopic} />
                <InsightRow label="Weakest Topic" value={ATTEMPT_DATA.insights.weakestTopic} />
                <InsightRow label="Longest Questions" value={ATTEMPT_DATA.insights.longestQuestions.join(", ")} />
                <InsightRow label="Fastest Solved" value={ATTEMPT_DATA.insights.fastestQuestions.join(", ")} />
              </div>

              <div className="mt-4 grid gap-3">
                <MiniChart title="Accuracy by Topic" values={ATTEMPT_DATA.insights.topicAccuracy} />
                <MiniChart title="Difficulty-wise Performance" values={ATTEMPT_DATA.insights.difficultyPerformance} />
              </div>
            </motion.section>

            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-3xl border border-white/[0.08] bg-[#10131A] p-5">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedQuestion((current) => Math.max(0, current - 1))}
                  disabled={selectedQuestion === 0}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-white/[0.16] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Question
                </button>
                <button
                  onClick={() => setSelectedQuestion((current) => Math.min(ATTEMPT_DATA.questions.length - 1, current + 1))}
                  disabled={selectedQuestion === ATTEMPT_DATA.questions.length - 1}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-white/[0.16] disabled:opacity-40"
                >
                  Next Question
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#71717A]">
        <Icon className="h-3.5 w-3.5 text-[#EC4899]" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function StatBlock({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#71717A]">
        <Icon className="h-3.5 w-3.5 text-[#EC4899]" />
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function AnalyticsMetric({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
        <Icon className="h-4 w-4 text-[#EC4899]" />
        {label}
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-[#71717A]">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function MiniChart({ title, values }: { title: string; values: Array<{ topic?: string; difficulty?: string; accuracy: number }> }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-3 space-y-3">
        {values.map((item) => (
          <div key={item.topic || item.difficulty}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-[#A1A1AA]">
              <span>{item.topic || item.difficulty}</span>
              <span>{item.accuracy}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06]">
              <div className="h-2 rounded-full bg-gradient-to-r from-[#EC4899] to-[#F472B6]" style={{ width: `${item.accuracy}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}