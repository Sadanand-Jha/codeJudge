"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Target,
  Users,
  Eye,
  X,
  Moon,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import ExamModeShell from "@/components/quiz/exam/ExamModeShell";

const DUMMY_QUIZ = {
  name: "Sample Quiz – Preview",
  code: "PREVIEW1234567890",
  duration: 30,
  total_marks: 100,
  passing_marks: 40,
  status: "Published",
  questions: 3,
  attempts: 1,
  visibility: "Public",
  negative: "-0.25",
};

const QUESTIONS = [
  {
    id: 1,
    q: "What does HTML stand for?",
    options: [
      { label: "A", text: "HyperText Markup Language", correct: true },
      { label: "B", text: "HighText Machine Language", correct: false },
      { label: "C", text: "HyperTool Multi Language", correct: false },
      { label: "D", text: "HyperText Markdown Language", correct: false },
    ],
    marks: 10,
    difficulty: "Easy",
    explanation: "HyperText Markup Language is the standard markup language for creating web pages.",
  },
  {
    id: 2,
    q: "Which CSS property controls text size?",
    options: [
      { label: "A", text: "font-size", correct: true },
      { label: "B", text: "text-size", correct: false },
      { label: "C", text: "font-style", correct: false },
      { label: "D", text: "text-style", correct: false },
    ],
    marks: 10,
    difficulty: "Easy",
    explanation: "font-size controls the size of text.",
  },
  {
    id: 3,
    q: "Explain the difference between let and var in JavaScript.",
    options: [],
    marks: 10,
    difficulty: "Medium",
    explanation: "let is block-scoped, var is function-scoped.",
  },
];

const MECHANICS = [
  { icon: "◐", title: "50–50", desc: "Eliminate 2 wrong options", left: "2 left" },
  { icon: "◑", title: "Extra Time", desc: "+5 minutes", left: "1 left" },
  { icon: "💡", title: "Hint", desc: "Get a smart hint", left: "2 left" },
  { icon: "⏭", title: "Skip Question", desc: "Skip and come back later", left: "2 left" },
  { icon: "🛡", title: "Shield", desc: "Protect from negative marking", left: "1 left" },
  { icon: "⚡", title: "Double Score", desc: "Next correct answer = 2x", left: "1 left" },
  { icon: "❤", title: "Extra Life", desc: "Get 1 extra life", left: "1 left" },
];

export default function QuizPreviewContent({ quizId }: { quizId: string }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [selectedMechanic, setSelectedMechanic] = useState<number | null>(null);
  const [usedMechanics, setUsedMechanics] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(DUMMY_QUIZ.duration * 60);
  const q = QUESTIONS[current];

  // Live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-[100dvh] h-[100svh] w-full flex-col overflow-hidden bg-background text-text-primary sm:min-h-screen sm:h-auto sm:overflow-visible" style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Top bar — compact on mobile */}
      <div className="flex h-[clamp(2.5rem,7dvh,3rem)] shrink-0 items-center justify-between border-b border-border bg-card/90 px-[clamp(0.5rem,2vw,1rem)] backdrop-blur sm:px-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-violet-600 to-pink-600">
              <span className="text-xs font-bold text-white">{"</>"}</span>
            </div>
            <span className="text-sm font-bold tracking-tight">
              Code<span className="text-pink-500">Judge</span>
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
          <span className="flex items-center gap-1.5 rounded-full bg-pink-500/10 px-2 py-0.5 text-[11px] font-semibold text-pink-600 dark:text-pink-400">
            <Eye className="h-3 w-3" /> Preview Mode
          </span>
          <span className="text-text-muted">You are viewing as a student. No data is saved.</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card">
            <Moon className="h-3.5 w-3.5" />
          </button>
          <Link href={`/creator/quizzes/${quizId}/edit`} className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-card-hover">
            <Share2 className="h-3.5 w-3.5" /> Share Quiz
          </Link>
          <Link href="/creator/quizzes" className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card hover:bg-card-hover">
            <X className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-600/80 dark:text-amber-400/70">
        <span className="h-1 w-1 rounded-full bg-amber-500/60 animate-pulse" />
        Tab switching &amp; window changes are monitored during exam
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pb-[env(safe-area-inset-bottom)] sm:overflow-visible sm:pb-0">
      {/* Title + banner — backend banner folder (image only here, not whole page) */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <img src="/images/quiz/banner/light.png" alt="" className="h-full w-full object-cover block dark:hidden" />
          <img src="/images/quiz/banner/dark.png" alt="" className="h-full w-full object-cover hidden dark:block" />
          <div className="absolute inset-0 bg-white/65 dark:bg-black/55 backdrop-blur-[0.5px]" />
        </div>
        <div className="relative px-3 py-3 sm:px-6 sm:py-5">
          <Link href="/creator/quizzes" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold hover:bg-card-hover sm:px-3 sm:py-1.5 sm:text-xs">
            <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Back to Studio
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
            <h1 className="text-sm font-bold leading-tight sm:text-[clamp(1.125rem,4vw,1.5rem)]">{DUMMY_QUIZ.name}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 sm:px-2 sm:text-[11px]">
              <span className="h-1 w-1 rounded-full bg-emerald-500 sm:h-1.5 sm:w-1.5" /> Published
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-600 dark:text-white/70 sm:mt-1 sm:text-xs">
            {DUMMY_QUIZ.questions} Q &nbsp;•&nbsp; {DUMMY_QUIZ.duration} min &nbsp;•&nbsp; {DUMMY_QUIZ.total_marks} Marks
          </p>

          <div className="mt-3 hidden grid-cols-2 gap-2 sm:mt-4 sm:grid sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Questions", value: "3", sub: "Total", icon: BookOpen },
              { label: "Duration", value: "30 min", sub: "Time Limit", icon: Clock },
              { label: "Total Marks", value: "100", sub: "Pass Marks: 40", icon: Target },
              { label: "Visibility", value: "Public", sub: "Medium", icon: Users },
              { label: "Attempts", value: "1", sub: "Allowed", icon: Users },
              { label: "Negative Marking", value: "−0.25", sub: "Per wrong answer", icon: Target },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">{s.label}</p>
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-[10px] text-text-muted">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3 col — wrapped in reusable ExamMode for fullscreen + violation handling */}
      <ExamModeShell quizName={DUMMY_QUIZ.name} progressLabel={`Q ${current + 1} / ${QUESTIONS.length}`} timeLeft={timeLeft} maxViolations={3} onExitPreview={() => {}}>
        <div className="mx-auto flex h-full min-h-0 max-w-[1400px] flex-col gap-[clamp(0.5rem,0.8dvh,0.75rem)] overflow-hidden p-[clamp(0.5rem,1.5vw,1rem)] sm:grid sm:h-auto sm:min-h-0 sm:max-h-none sm:grid-cols-[260px_1fr_300px] sm:gap-4 sm:p-4 sm:overflow-visible">
        {/* Left — hidden on mobile, visible on desktop */}
        <div className="hidden min-h-0 flex-col space-y-2 overflow-y-auto overscroll-contain rounded-xl sm:order-1 sm:flex sm:max-h-none sm:overflow-visible sm:space-y-3">
          <div className="rounded-xl border border-border bg-card p-2 sm:p-3">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold sm:text-xs">
              <span className="text-pink-500">◈</span> Game Mechanics
            </h3>
            <p className="mt-0.5 hidden text-[10px] text-text-muted sm:block">Use strategically to boost your score!</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2 sm:grid-cols-1">
              {MECHANICS.map((m) => (
                <div key={m.title} className="flex items-center gap-1.5 rounded-lg border border-border bg-card-hover/50 px-1.5 py-1.5 sm:gap-2 sm:px-2 sm:py-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-card text-[11px] sm:h-7 sm:w-7 sm:text-xs">{m.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold sm:text-xs">{m.title}</p>
                    <p className="hidden text-[10px] text-text-muted sm:block">{m.desc}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-card px-1 py-0.5 text-[9px] font-bold border border-border sm:px-1.5 sm:text-[10px]">{m.left}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden rounded-xl border border-border bg-card p-2 sm:block sm:p-3">
            <h4 className="flex items-center gap-1.5 text-xs font-bold">Quiz Rules</h4>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-text-muted">
              <li>• Answer all questions before time runs out.</li>
              <li>• Negative marking is applicable.</li>
              <li>• Game mechanics can help you maximize your score.</li>
              <li>• All the best! ✦</li>
            </ul>
          </div>
        </div>

        {/* Center — mobile first, viewport-aware */}
        <div className="order-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-pink-500/20 bg-card p-2.5 sm:order-2 sm:p-4 sm:min-h-0 sm:overflow-visible sm:flex-none">
          {/* Progress + Navigator — mobile only, at top */}
          <div className="mb-2 shrink-0 space-y-1.5 sm:hidden">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${(Object.keys(answers).length / QUESTIONS.length) * 100}%` }} />
              </div>
              <span className="text-[10px] font-bold text-text-muted">{Object.keys(answers).length}/{QUESTIONS.length}</span>
            </div>
            {/* Navigator dots */}
            <div className="flex items-center gap-1.5">
              {QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn("flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold", i === current ? "bg-pink-500 text-white" : answers[QUESTIONS[i].id] ? "bg-emerald-500 text-white" : "border border-border bg-card text-text-muted")}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 sm:px-2 sm:text-[10px]">{q.difficulty}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 sm:px-2 sm:py-1 sm:text-[11px]">{q.marks} Marks</span>
              <Bookmark className="h-3.5 w-3.5 text-text-muted sm:h-4 sm:w-4" />
            </div>
          </div>

          <h2 className="mt-2.5 shrink-0 text-[clamp(0.8125rem,3.2vw,1rem)] font-semibold leading-snug break-words sm:mt-4">{q.q}</h2>

          <div className="flex-1 min-h-0 mt-2 space-y-1.5 overflow-y-auto overscroll-contain pr-1 sm:mt-4 sm:flex-none sm:min-h-0 sm:max-h-[45dvh] sm:space-y-2 sm:overflow-visible sm:pr-0">
            {q.options.map((o) => {
              const active = answers[q.id] === o.label;
              return (
                <button
                  key={o.label}
                  onClick={() => setAnswers((p) => ({ ...p, [q.id]: o.label }))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left text-sm transition-colors sm:gap-3 sm:px-3 sm:py-3",
                    active ? "border-pink-500 bg-pink-500/10" : "border-border bg-card hover:border-pink-500/30"
                  )}
                >
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs", active ? "bg-pink-500 text-white" : "bg-card border border-border")}>
                    {o.label}
                  </span>
                  <span className="flex-1 text-xs sm:text-sm">{o.text}</span>
                </button>
              );
            })}

            <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/10 p-2.5 dark:bg-[#1e1a3a] sm:mt-4 sm:p-3">
              <p className="text-[11px] font-bold text-violet-600 dark:text-violet-300 sm:text-xs">Explanation</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted sm:text-xs">{q.explanation}</p>
            </div>
          </div>

          <div className="shrink-0 border-t border-border pt-2 pb-[env(safe-area-inset-bottom)] sm:mt-4 sm:pt-4 sm:pb-4">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <div className="flex gap-1.5 sm:gap-2">
                <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold hover:bg-card-hover disabled:opacity-40 sm:px-3 sm:py-2 sm:text-xs">
                  <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Previous
                </button>
                <button onClick={() => setMarked((m) => ({ ...m, [q.id]: !m[q.id] }))} className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold sm:px-3 sm:py-2 sm:text-xs", marked[q.id] ? "border-amber-500 bg-amber-500 text-white" : "border-border bg-card hover:bg-card-hover")}>
                  <Bookmark className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Mark for Review</span><span className="sm:hidden">Mark</span>
                </button>
              </div>
              <button onClick={() => setCurrent((c) => Math.min(QUESTIONS.length - 1, c + 1))} disabled={current === QUESTIONS.length - 1} className="inline-flex items-center gap-1 rounded-lg bg-pink-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-pink-600 disabled:opacity-40 sm:px-4 sm:py-2 sm:text-xs">
                Next <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mechanic icons — mobile only, between question and sidebar */}
        <div className="order-2 flex shrink-0 items-center gap-1 overflow-x-auto overscroll-contain rounded-xl border border-border bg-card px-2 py-1.5 sm:order-none sm:hidden">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-pink-500" />
          {MECHANICS.map((m, i) => (
            <button
              key={m.title}
              onClick={() => setSelectedMechanic(i)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors",
                usedMechanics[i]
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                  : "border-border bg-card hover:border-pink-500/40 hover:bg-pink-500/5"
              )}
              title={m.title}
            >
              {m.icon}
            </button>
          ))}
        </div>

        {/* Right — compact, not pushing viewport */}
        <div className="order-3 flex min-h-0 shrink-0 flex-col space-y-1.5 overflow-y-auto overscroll-contain rounded-xl sm:order-3 sm:max-h-none sm:space-y-3 sm:overflow-visible">
          {/* Timer — hidden on mobile (shown in ExamModeShell header) */}
          <div className="hidden rounded-xl border border-border bg-card p-4 sm:block">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Time Left
                </p>
                <p className={cn("mt-1 font-mono text-xl font-bold", timeLeft <= 60 ? "text-red-500" : timeLeft <= 300 ? "text-amber-500" : "")}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</p>
              </div>
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-[3px] border-border" />
                <div className="absolute inset-0 rounded-full border-[3px] border-pink-500" style={{ clipPath: `inset(0 0 0 ${100 - (timeLeft / (DUMMY_QUIZ.duration * 60)) * 100}%)` }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-pink-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Progress — compact on mobile */}
          <div className="hidden rounded-xl border border-border bg-card p-2 sm:block sm:p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold sm:text-xs">Progress</p>
              <p className="text-[10px] text-text-muted sm:text-xs">{Object.keys(answers).length}/{QUESTIONS.length}</p>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${(Object.keys(answers).length / QUESTIONS.length) * 100}%` }} />
            </div>
          </div>

          {/* Question Navigator — compact */}
          <div className="hidden rounded-xl border border-border bg-card p-2 sm:block sm:p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold sm:text-xs">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-pink-500/15 text-pink-500 sm:h-5 sm:w-5">○</span> Navigator
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:mt-3 sm:gap-2">
              {QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold sm:h-9 sm:w-9 sm:rounded-xl sm:text-sm", i === current ? "bg-pink-500 text-white" : answers[QUESTIONS[i].id] ? "bg-emerald-500 text-white" : "border border-border bg-card text-text-muted")}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-2 hidden space-y-1 text-[10px] sm:mt-3 sm:space-y-1.5 sm:text-[11px]">
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 rounded-full bg-border" /> Not Visited
              </p>
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Visited
              </p>
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Answered
              </p>
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 bg-amber-500" /> Marked
              </p>
            </div>
          </div>

          <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-pink-500 bg-pink-500/10 py-2.5 text-xs font-bold text-pink-600 hover:bg-pink-500 hover:text-white dark:text-pink-400 sm:py-3 sm:text-sm">
            <span className="h-3.5 w-3.5 sm:h-4 sm:w-4">↗</span> Submit Quiz
          </button>
          <p className="hidden text-center text-[11px] text-text-muted sm:block">You can review before submitting</p>
        </div>
      </div>
      </ExamModeShell>
      </div>

      {/* Mechanic Detail Modal */}
      {selectedMechanic !== null && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => setSelectedMechanic(null)}>
          <div
            className="w-full max-w-sm rounded-t-2xl border border-border bg-card p-4 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-xl">
                  {MECHANICS[selectedMechanic].icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{MECHANICS[selectedMechanic].title}</h3>
                  <p className="text-[11px] text-text-muted">{MECHANICS[selectedMechanic].desc}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMechanic(null)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card hover:bg-card-hover">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <div>
                <p className="text-[11px] text-text-muted">Uses remaining</p>
                <p className="text-lg font-bold">{MECHANICS[selectedMechanic].left}</p>
              </div>
              {usedMechanics[selectedMechanic] && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Used</span>
              )}
            </div>

            <button
              onClick={() => {
                setUsedMechanics((u) => ({ ...u, [selectedMechanic]: true }));
                setSelectedMechanic(null);
              }}
              disabled={usedMechanics[selectedMechanic]}
              className={cn(
                "mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition-colors",
                usedMechanics[selectedMechanic]
                  ? "cursor-not-allowed border border-border bg-card text-text-muted"
                  : "bg-pink-500 text-white hover:bg-pink-600 shadow-[0_4px_16px_rgba(236,72,153,0.3)]"
              )}
            >
              {usedMechanics[selectedMechanic] ? "Already Used" : "Use Now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
