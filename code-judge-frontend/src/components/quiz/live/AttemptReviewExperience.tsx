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
      return "bg-success/20 text-success";
    case "wrong":
      return "bg-danger/20 text-danger";
    case "skipped":
      return "bg-text-muted/20 text-text-muted";
  }
}

// Donut chart helper - computes SVG arc path for a segment
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function DonutChart({ correct, wrong, skipped }: { correct: number; wrong: number; skipped: number }) {
  const total = Math.max(1, correct + wrong + skipped);
  const correctPct = (correct / total) * 100;
  const wrongPct = (wrong / total) * 100;
  const skippedPct = (skipped / total) * 100;

  const segments = [
    { pct: correctPct, color: "var(--success)" },
    { pct: wrongPct, color: "var(--danger)" },
    { pct: skippedPct, color: "var(--text-muted)" },
  ].filter((s) => s.pct > 0);

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const start = cumulative;
    const end = cumulative + seg.pct * 3.6;
    cumulative = end;
    return { ...seg, start, end };
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="12" />
          {arcs.map((arc, i) => (
            <path
              key={i}
              d={describeArc(50, 50, 40, arc.start, arc.end)}
              fill="none"
              stroke={arc.color}
              strokeWidth="12"
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-text-primary leading-none">{correct + wrong + skipped}</span>
          <span className="text-[8px] uppercase tracking-wider text-text-muted mt-0.5">Total</span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          <span className="text-text-secondary">Correct</span>
          <span className="ml-auto font-semibold text-text-primary">{correct} ({Math.round(correctPct)}%)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          <span className="text-text-secondary">Wrong</span>
          <span className="ml-auto font-semibold text-text-primary">{wrong} ({Math.round(wrongPct)}%)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="h-2.5 w-2.5 rounded-full bg-text-muted" />
          <span className="text-text-secondary">Skipped</span>
          <span className="ml-auto font-semibold text-text-primary">{skipped} ({Math.round(skippedPct)}%)</span>
        </div>
      </div>
    </div>
  );
}

export default function AttemptReviewExperience() {
  const [selectedQuestion, setSelectedQuestion] = useState(0);

  const progress = useMemo(() => {
    return Math.round((ATTEMPT_DATA.percentage / 100) * 360);
  }, []);

  const currentQuestion = ATTEMPT_DATA.questions[selectedQuestion];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="mx-auto max-w-[1600px] p-2 sm:p-3 md:p-4 lg:p-4">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between gap-3">
          <Link href="/quiz" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card-hover px-3 sm:px-3.5 py-1.5 text-sm font-medium text-text-primary transition-all hover:border-border-hover hover:bg-card-hover">
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="rounded-full border border-accent/20 bg-accent/10 px-2.5 sm:px-3 py-0.5 font-medium text-accent text-[10px] sm:text-xs">Attempt Review</span>
            <span className="hidden md:inline">LeetCode-style response review</span>
          </div>
        </div>

        <div className="grid gap-2.5 xl:grid-cols-[1.3fr_340px]">
          <div className="space-y-2.5">
            {/* Summary Card */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-border bg-card p-3">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-text-muted">
                    <span className="rounded-full border border-border bg-card-hover px-2 py-0.5 text-text-secondary">{ATTEMPT_DATA.subject}</span>
                    {ATTEMPT_DATA.rank !== undefined && <span className="rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-gold">Rank #{ATTEMPT_DATA.rank}</span>}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight sm:text-xl text-text-primary">{ATTEMPT_DATA.quizName}</h1>
                    <p className="mt-0.5 text-[11px] text-text-secondary">Attempted on {ATTEMPT_DATA.attemptDate} · Submitted at {ATTEMPT_DATA.submittedAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0 rounded-full border border-border bg-card-hover p-1.5">
                    <div
                      className="absolute inset-1.5 rounded-full"
                      style={{ background: `conic-gradient(var(--accent) ${progress}deg, var(--border) ${progress}deg)` }}
                    />
                    <div className="absolute inset-3 rounded-full border border-border bg-background flex flex-col items-center justify-center text-center">
                      <div className="text-sm font-bold text-text-primary leading-none">{ATTEMPT_DATA.percentage}%</div>
                      <div className="text-[7px] uppercase tracking-[0.14em] text-text-muted mt-0.5">Score</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <SummaryCard label="Score" value={ATTEMPT_DATA.score} icon={Target} />
                    <SummaryCard label="Duration" value={ATTEMPT_DATA.duration} icon={Clock3} />
                    <SummaryCard label="Rank" value={ATTEMPT_DATA.rank ? `#${ATTEMPT_DATA.rank}` : "-"} icon={Trophy} />
                    <SummaryCard label="Submitted" value={ATTEMPT_DATA.submittedAt} icon={Timer} />
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Question Palette */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-semibold text-text-primary">Question Palette</h2>
                  <p className="text-[10px] text-text-secondary">Green = correct, red = wrong, gray = skipped, blue = current</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Correct</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" />Wrong</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-text-muted" />Skipped</span>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 lg:grid-cols-10">
                {ATTEMPT_DATA.questions.map((question, index) => {
                  const state = questionStatus(question);
                  const isActive = selectedQuestion === index;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setSelectedQuestion(index)}
                      className={`flex h-7 items-center justify-center rounded-md border text-[11px] font-semibold transition-all ${
                        isActive
                          ? "border-accent/40 bg-accent/15 text-accent ring-1 ring-accent/20"
                          : state === "correct"
                          ? "border-success/20 bg-success/10 text-success"
                          : state === "wrong"
                          ? "border-danger/20 bg-danger/10 text-danger"
                          : "border-border bg-card-hover text-text-secondary"
                      }`}
                    >
                      {question.number}
                    </button>
                  );
                })}
              </div>
            </motion.section>

            {/* Question Card */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border bg-card-hover px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-text-secondary">Question {currentQuestion.number}</span>
                    <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold text-accent">{currentQuestion.difficulty}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-semibold leading-snug text-text-primary">{currentQuestion.statement}</h3>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <button
                    onClick={() => setSelectedQuestion((current) => Math.max(0, current - 1))}
                    disabled={selectedQuestion === 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card-hover px-2 py-1 text-[11px] font-medium text-text-primary transition-all hover:border-border-hover disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Prev
                  </button>
                  <button
                    onClick={() => setSelectedQuestion((current) => Math.min(ATTEMPT_DATA.questions.length - 1, current + 1))}
                    disabled={selectedQuestion === ATTEMPT_DATA.questions.length - 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card-hover px-2 py-1 text-[11px] font-medium text-text-primary transition-all hover:border-border-hover disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {currentQuestion.options.map((option) => {
                  const isCorrect = option.id === currentQuestion.correctOptionId;
                  const isSelected = option.id === currentQuestion.selectedOptionId;
                  const selectedWrong = isSelected && !isCorrect;
                  return (
                    <div
                      key={option.id}
                      className={`rounded-lg border px-2.5 py-1.5 transition-all ${
                        isCorrect
                          ? "border-success/30 bg-success/10"
                          : selectedWrong
                          ? "border-danger/30 bg-danger/10"
                          : isSelected
                          ? "border-accent/30 bg-accent/10"
                          : "border-border bg-card-hover"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[9px] font-bold ${isCorrect ? "border-success/30 bg-success text-white" : selectedWrong ? "border-danger/30 bg-danger text-white" : isSelected ? "border-accent/30 bg-accent text-white" : "border-border bg-card-hover text-text-secondary"}`}>
                          {option.label}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-xs text-text-primary">
                            {option.text}
                            {isCorrect && <CheckCircle2 className="h-3 w-3 text-success" />}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-1 text-[9px] font-medium">
                            {isSelected && <span className="rounded-full border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-accent">Your Answer</span>}
                            {isCorrect && <span className="rounded-full border border-success/20 bg-success/10 px-1.5 py-0.5 text-success">Correct Answer</span>}
                            <span className="rounded-full border border-border bg-card-hover px-1.5 py-0.5 text-text-secondary">Marks {isCorrect ? currentQuestion.marksObtained : isSelected ? currentQuestion.marksObtained : 0}/{currentQuestion.maxMarks}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stats row - one compact row */}
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-1">
                <StatBlock label="Your Answer" value={currentQuestion.selectedOptionId ? currentQuestion.selectedOptionId.toUpperCase() : "Skipped"} icon={CircleDot} />
                <StatBlock label="Correct Answer" value={currentQuestion.correctOptionId.toUpperCase()} icon={CheckCircle2} />
                <StatBlock label="Marks Obtained" value={`${currentQuestion.marksObtained}/${currentQuestion.maxMarks}`} icon={Medal} />
                <StatBlock label="Time Spent" value={currentQuestion.timeSpent} icon={Timer} />
              </div>

              {currentQuestion.explanation && (
                <div className="mt-2 rounded-lg border border-border bg-card-hover p-2.5">
                  <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <BookOpen className="h-3 w-3 text-accent" />
                    Explanation
                  </div>
                  <p className="text-[11px] leading-5 text-text-secondary">{currentQuestion.explanation}</p>
                </div>
              )}

              {/* Navigation - below question content */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedQuestion((current) => Math.max(0, current - 1))}
                  disabled={selectedQuestion === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 py-1.5 text-[11px] font-medium text-text-primary transition-all hover:border-border-hover disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous Question
                </button>
                <button
                  onClick={() => setSelectedQuestion((current) => Math.min(ATTEMPT_DATA.questions.length - 1, current + 1))}
                  disabled={selectedQuestion === ATTEMPT_DATA.questions.length - 1}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card-hover px-3 py-1.5 text-[11px] font-medium text-text-primary transition-all hover:border-border-hover disabled:opacity-40"
                >
                  Next Question
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
          </div>

          <div className="space-y-2.5">
            {/* Result Analytics */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-2.5">
              <h2 className="text-xs font-semibold text-text-primary">Result Analytics</h2>
              <p className="mt-0.5 text-[10px] text-text-secondary">Score, ranking, and answer breakdown.</p>
              <div className="mt-2 space-y-1">
                <AnalyticsMetric label="Overall Score" value={ATTEMPT_DATA.score} icon={Target} />
                <AnalyticsMetric label="Accuracy" value={`${ATTEMPT_DATA.percentage}%`} icon={PieChart} />
                <AnalyticsMetric label="Attempt Time" value={ATTEMPT_DATA.attemptDate} icon={Clock3} />
                <AnalyticsMetric label="Avg Time / Q" value="2m 03s" icon={Timer} />
                <AnalyticsMetric label="Correct" value={ATTEMPT_DATA.correct} icon={CheckCircle2} />
                <AnalyticsMetric label="Wrong" value={ATTEMPT_DATA.wrong} icon={XCircle} />
                <AnalyticsMetric label="Skipped" value={ATTEMPT_DATA.skipped} icon={CircleDashed} />
                <AnalyticsMetric label="Rank" value={`#${ATTEMPT_DATA.rank}`} icon={Trophy} />
                <AnalyticsMetric label="Percentile" value={`${ATTEMPT_DATA.percentile}%`} icon={Zap} />
              </div>

              <div className="mt-2.5 rounded-xl border border-border bg-card-hover p-2.5">
                <div className="mb-2 flex items-center justify-between text-[11px] text-text-primary">
                  <span>Correct vs Wrong vs Skipped</span>
                  <PieChart className="h-3 w-3 text-accent" />
                </div>
                <DonutChart correct={ATTEMPT_DATA.correct} wrong={ATTEMPT_DATA.wrong} skipped={ATTEMPT_DATA.skipped} />
              </div>
            </motion.section>

            {/* Performance Insights */}
            <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border bg-card p-2.5">
              <h2 className="text-xs font-semibold text-text-primary">Performance Insights</h2>
              <div className="mt-2 space-y-1 text-[11px] text-text-secondary">
                <InsightRow label="Strongest Topic" value={ATTEMPT_DATA.insights.strongestTopic} />
                <InsightRow label="Weakest Topic" value={ATTEMPT_DATA.insights.weakestTopic} />
                <InsightRow label="Longest Questions" value={ATTEMPT_DATA.insights.longestQuestions.join(", ")} />
                <InsightRow label="Fastest Solved" value={ATTEMPT_DATA.insights.fastestQuestions.join(", ")} />
              </div>

              <div className="mt-2 grid gap-1.5">
                <MiniChart title="Accuracy by Topic" values={ATTEMPT_DATA.insights.topicAccuracy} />
                <MiniChart title="Difficulty-wise Performance" values={ATTEMPT_DATA.insights.difficultyPerformance} />
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
    <div className="rounded-lg border border-border bg-card-hover px-2 py-1">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] text-text-muted">
        <Icon className="h-2.5 w-2.5 text-accent" />
        {label}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold text-text-primary truncate max-w-[100px]">{value}</div>
    </div>
  );
}

function StatBlock({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-lg border border-border bg-card-hover px-2 py-1">
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-[0.1em] text-text-muted">
        <Icon className="h-2.5 w-2.5 text-accent" />
        {label}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold text-text-primary truncate">{value}</div>
    </div>
  );
}

function AnalyticsMetric({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card-hover px-2.5 py-1">
      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
        <Icon className="h-3 w-3 text-accent" />
        {label}
      </div>
      <div className="text-[11px] font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card-hover px-2.5 py-1">
      <div className="text-[8px] uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className="mt-0.5 text-[11px] font-medium text-text-primary truncate">{value}</div>
    </div>
  );
}

function MiniChart({ title, values }: { title: string; values: Array<{ topic?: string; difficulty?: string; accuracy: number }> }) {
  return (
    <div className="rounded-lg border border-border bg-card-hover p-2">
      <div className="text-[11px] font-semibold text-text-primary">{title}</div>
      <div className="mt-1.5 space-y-1.5">
        {values.map((item) => (
          <div key={item.topic || item.difficulty}>
            <div className="mb-0.5 flex items-center justify-between text-[9px] text-text-secondary">
              <span>{item.topic || item.difficulty}</span>
              <span>{item.accuracy}%</span>
            </div>
            <div className="h-1 rounded-full bg-border">
              <div className="h-1 rounded-full bg-gradient-to-r from-accent to-accent-secondary" style={{ width: `${item.accuracy}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}