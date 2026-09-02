"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Target,
  Users,
  Eye,
  X,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Send,
  Trophy,
  Timer,
  Copy,
  Flag,
  ChevronUp,
  ChevronDown,
  BookOpen as BookOpenIcon,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getQuizById, getQuizProblems } from "@/services/quiz";
import type { Quiz, QuizProblem } from "@/services/quiz";
import ExamModeShell from "@/components/quiz/exam/ExamModeShell";

/* ── Types ── */

type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "fill_blanks"
  | "text"
  | "integer"
  | "paragraph"
  | "match_following";

interface PreviewQuestion {
  id: number;
  q: string;
  type: QuestionType;
  options: { label: string; text: string; correct: boolean }[];
  marks: number;
  difficulty: string;
  explanation: string;
  questionNumber: number;
}

/* ── Constants ── */

const TYPE_MAP: Record<number, QuestionType> = {
  1: "single_choice",
  2: "multiple_choice",
  3: "true_false",
  4: "text",
  5: "integer",
  6: "fill_blanks",
  7: "paragraph",
  12: "match_following",
};

function isChoiceType(type: QuestionType): boolean {
  return type === "single_choice" || type === "multiple_choice" || type === "true_false";
}

function decodeHtml(str: string): string {
  if (!str) return "";
  if (typeof document === "undefined") return str;
  try {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  } catch {
    return str;
  }
}

const MECHANICS = [
  { icon: "50:50", title: "50 - 50", desc: "Eliminate 2 wrong options", left: "2 left", color: "bg-pink-50 border border-pink-200 text-pink-600" },
  { icon: "⏰", title: "Extra Time", desc: "+5 minutes", left: "1 left", color: "bg-pink-50 border border-pink-200 text-pink-600" },
  { icon: "💡", title: "Hint", desc: "Get a smart hint", left: "2 left", color: "bg-pink-50 border border-pink-200 text-pink-600" },
  { icon: "⏭", title: "Skip Question", desc: "Skip and come back later", left: "2 left", color: "bg-pink-50 border border-pink-200 text-pink-600" },
  { icon: "🛡", title: "Shield", desc: "Protect from negative marking", left: "1 left", color: "bg-pink-50 border border-pink-200 text-pink-600" },
  { icon: "2x", title: "Double Score", desc: "Next correct answer = 2x", left: "1 left", color: "bg-pink-50 border border-pink-200 text-pink-600" },
  { icon: "❤", title: "Extra Life", desc: "Get 1 extra life", left: "1 left", color: "bg-pink-50 border border-pink-200 text-pink-600" },
];

/* ── Component ── */

export default function QuizPreviewContent({ quizId }: { quizId: string }) {
  const router = useRouter();
  const onExitPreview = useCallback(() => router.push("/creator/quizzes"), [router]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [selectedMechanic, setSelectedMechanic] = useState<number | null>(null);
  const [usedMechanics, setUsedMechanics] = useState<Record<number, boolean>>({});
  const [fiftyFiftyMap, setFiftyFiftyMap] = useState<Record<number, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);

  /* Fetch quiz + problems */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [quizData, problemsData] = await Promise.all([
          getQuizById(quizId),
          getQuizProblems(quizId).catch(() => [] as QuizProblem[]),
        ]);
        if (cancelled) return;
        setQuiz(quizData);
        let mapped = problemsData.map((p, idx) => ({
          id: p.id,
          q: decodeHtml(p.problem_statement),
          type: TYPE_MAP[p.quiz_problem_type ?? 1] ?? "single_choice",
          options: p.options.map((o, oi) => ({
            label: String.fromCharCode(65 + oi),
            text: decodeHtml(o.option_statement),
            correct: o.iscorrect,
          })),
          marks: (p as QuizProblem & { marks?: number }).marks ?? 10,
          difficulty: p.difficulty_name ?? "Medium",
          explanation: decodeHtml(p.explaination ?? ""),
          questionNumber: p.question_number ?? idx + 1,
        }));
        if (mapped.length === 0) {
          mapped = [
            {
              id: 1,
              q: "What does HTML stand for?",
              type: "single_choice",
              options: [
                { label: "A", text: "HyperText Markup Language", correct: true },
                { label: "B", text: "HighText Machine Language", correct: false },
                { label: "C", text: "HyperTool Multi Language", correct: false },
                { label: "D", text: "HyperText Markdown Language", correct: false },
              ],
              marks: 10,
              difficulty: "Easy",
              explanation: "HyperText Markup Language is the standard markup language for creating web pages.",
              questionNumber: 1,
            },
            {
              id: 2,
              q: "Which CSS property controls text size?",
              type: "single_choice",
              options: [
                { label: "A", text: "font-size", correct: true },
                { label: "B", text: "text-size", correct: false },
                { label: "C", text: "font-style", correct: false },
                { label: "D", text: "text-style", correct: false },
              ],
              marks: 10,
              difficulty: "Easy",
              explanation: "font-size controls the size of text.",
              questionNumber: 2,
            },
            {
              id: 3,
              q: "Explain the difference between let and var in JavaScript.",
              type: "single_choice",
              options: [],
              marks: 10,
              difficulty: "Medium",
              explanation: "let is block-scoped, var is function-scoped.",
              questionNumber: 3,
            },
          ];
        }
        setQuestions(mapped);
        const dur = (quizData.duration ?? 30) * 60;
        setTimeLeft(dur);
      } catch (err) {
        if (!cancelled) setError("Failed to load quiz preview. Please try again.");
        console.error("Quiz preview fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  /* Live countdown */
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalMarks = useMemo(() => questions.reduce((s, q) => s + q.marks, 0), [questions]);
  const durationSec = (quiz?.duration ?? 30) * 60;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")} : ${(s % 60).toString().padStart(2, "0")}`;
  const timerProgress = durationSec > 0 ? (timeLeft / durationSec) * 100 : 0;

  const getNavigatorClass = (question: PreviewQuestion, idx: number) => {
    if (idx === current) return "bg-pink-500 text-white shadow-sm";
    if (marked[question.id]) return "bg-amber-500 text-white";
    if (answers[question.id]) return "bg-emerald-500 text-white";
    return "bg-white text-gray-500 border border-gray-200 hover:border-gray-300";
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        <p className="mt-3 text-sm text-gray-400">Loading quiz preview...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-white">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="mt-3 text-sm text-red-500">{error ?? "Quiz not found."}</p>
        <Link href="/creator/quizzes" className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
          <ArrowLeft className="h-3 w-3" /> Back to Studio
        </Link>
      </div>
    );
  }

  const q = questions[current];

  return (
    <ExamModeShell
      quizName={quiz.name}
      progressLabel={`${current + 1} / ${questions.length}`}
      timeLeft={timeLeft}
      onExitPreview={onExitPreview}
      autoEnter
      fullWidth
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-[#f5f7fb] text-gray-900">
      {/* ── MAIN GRID ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[clamp(350px,27.5vw,450px)_minmax(0,1fr)_clamp(325px,27.5vw,425px)] gap-3 p-3 overflow-hidden">
        {/* LEFT */}
        <aside className="hidden lg:flex flex-col gap-3 min-h-0 overflow-hidden order-1">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <span className="text-pink-500 text-base">◆</span>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Game Mechanics</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-tight shrink-0">Use lifelines strategically to maximize your score.</p>
            <div className="space-y-3 flex-1 flex flex-col justify-between py-1 overflow-hidden">
              {MECHANICS.map((m, i) => (
                <button
                  key={m.title}
                  onClick={() => setSelectedMechanic(i)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all",
                    usedMechanics[i] && i !== 0
                      ? "border-emerald-200 bg-emerald-50"
                      : fiftyFiftyMap[questions[current]?.id || -1] && i === 0
                      ? "border-pink-300 bg-pink-50"
                      : "border-gray-200 bg-white hover:border-pink-200 hover:bg-pink-50/50"
                  )}
                >
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold", m.color)}>{m.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-none">{m.title}</p>
                    <p className="text-xs text-gray-400 leading-tight truncate">{m.desc}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-bold", usedMechanics[i] ? "bg-emerald-100 text-emerald-600" : "bg-pink-100 text-pink-600")}>{m.left}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 shrink-0">
            <h4 className="text-xs font-bold text-gray-900 mb-2">Quiz Rules</h4>
            <ul className="space-y-1.5">
              {["Answer all questions before time runs out.", "Negative marking is applicable.", "Game mechanics can help you maximize your score.", "All the best! ✦"].map((rule) => (
                <li key={rule} className="flex items-start gap-2 text-[11px] text-gray-500 leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CENTER */}
        <main className="flex flex-col min-h-0 order-1 lg:order-2 overflow-hidden">
          <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden p-5">
            {q && (
              <>
                <div className="flex items-center justify-between shrink-0">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-600">{q.difficulty}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-pink-50 border border-pink-200 px-3 py-1 text-[11px] font-bold text-pink-600">{q.marks} Marks</span>
                    <button className="text-gray-300 hover:text-pink-500 transition-colors">
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h2 className="text-[18px] lg:text-[20px] font-semibold text-gray-900 mt-4 leading-snug" dangerouslySetInnerHTML={{ __html: q.q || "Untitled question" }} />
                <div className="mt-4 space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                  {fiftyFiftyMap[q.id] && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-[11px] font-medium text-pink-600">
                      <span className="text-xs">◐</span> 50–50 active — 2 options shown (preview only)
                    </div>
                  )}
                  {isChoiceType(q.type) ? (
                    (() => {
                      const visibleOptions = fiftyFiftyMap[q.id] ? q.options.filter((o) => fiftyFiftyMap[q.id].includes(o.label)) : q.options;
                      return visibleOptions.map((o) => {
                        const active = answers[q.id] === o.label;
                        return (
                          <button
                            key={o.label}
                            onClick={() => setAnswers((p) => ({ ...p, [q.id]: o.label }))}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all min-h-[56px]",
                              active ? "border-pink-300 bg-pink-50 shadow-[0_0_0_2px_rgba(236,72,153,0.08)]" : "border-gray-200 bg-white hover:border-pink-200 hover:bg-pink-50/30"
                            )}
                          >
                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold border", active ? "bg-pink-500 text-white border-pink-500" : "bg-pink-50 text-pink-600 border-pink-200")}>{o.label}</span>
                            <span className="flex-1 text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: o.text }} />
                          </button>
                        );
                      });
                    })()
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-medium">Type your answer below:</p>
                      <input type="text" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Enter your answer..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-100" />
                    </div>
                  )}
                  <div className="rounded-xl border border-pink-200 bg-pink-50/40 overflow-hidden mt-2">
                    <button onClick={() => setExplanationOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left h-[46px]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-pink-200 text-pink-600">
                        <BookOpenIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-900">Explanation</span>
                      {explanationOpen ? <ChevronUp className="h-4 w-4 text-pink-400" /> : <ChevronDown className="h-4 w-4 text-pink-300" />}
                    </button>
                    {explanationOpen && (
                      <div className="border-t border-pink-200 px-4 py-3 bg-white max-h-[120px] overflow-y-auto">
                        <p className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100 shrink-0">
                  <div className="flex gap-3">
                    <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                      <ChevronLeft className="h-5 w-5" /> Previous
                    </button>
                    <button onClick={() => setMarked((m) => ({ ...m, [q.id]: !m[q.id] }))} className={cn("inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold", marked[q.id] ? "border-amber-300 bg-amber-50 text-amber-600" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")}>
                      <Eye className="h-5 w-5" /> Mark for Review
                    </button>
                  </div>
                  <button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 px-7 py-3 text-sm font-bold text-white shadow-md disabled:opacity-30">
                    Next <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Mobile mechanics */}
          <div className="lg:hidden mt-3 flex items-center gap-2 overflow-x-auto p-2 bg-white border border-gray-200 rounded-xl">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-pink-500 ml-1" />
            {MECHANICS.map((m, i) => (
              <button key={m.title} onClick={() => setSelectedMechanic(i)} className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs", usedMechanics[i] ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-white")}>
                {m.icon}
              </button>
            ))}
          </div>
        </main>

        {/* RIGHT */}
        <aside className="hidden lg:flex flex-col gap-3 min-h-0 overflow-hidden order-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 h-[92px] shrink-0 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <Timer className="h-3.5 w-3.5" /> Time Left
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-pink-600">{formatTime(timeLeft)}</p>
            </div>
            <div className="relative h-16 w-16 shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#fce7f3" strokeWidth="4" />
                <circle cx="32" cy="32" r="28" fill="none" stroke="url(#timerGrad)" strokeWidth="4" strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - timerProgress / 100)}`} strokeLinecap="round" />
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 h-[68px] shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Progress</p>
              <p className="text-xs text-gray-500">
                {Object.keys(answers).length} / {questions.length}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all" style={{ width: `${questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
              <span className="h-2 w-2 rounded-full bg-pink-500" /> Question Navigator
            </p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {questions.map((question, i) => (
                <button key={i} onClick={() => setCurrent(i)} className={cn("flex h-9 w-full items-center justify-center rounded-lg text-xs font-bold", getNavigatorClass(question, i))}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px] shrink-0">
              <p className="flex items-center gap-1.5 text-gray-500">
                <span className="h-2 w-2 rounded-full bg-pink-500" /> Current
              </p>
              <p className="flex items-center gap-1.5 text-gray-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Answered
              </p>
              <p className="flex items-center gap-1.5 text-gray-500">
                <span className="h-2 w-2 rounded-full bg-gray-200 border border-gray-300" /> Not Answered
              </p>
              <p className="flex items-center gap-1.5 text-gray-500">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Marked
              </p>
            </div>
          </div>
          <Link href="/creator/quizzes" className="rounded-xl border border-pink-200 overflow-hidden bg-white shrink-0 block hover:shadow-md transition-shadow">
            <img src="/images/quiz/banner/preview_submit.png" alt="Preview Mode" className="w-full h-auto object-cover" />
          </Link>
        </aside>
      </div>

      {/* ── FOOTER 46px ── */}
      <footer className="h-[46px] shrink-0 flex items-center justify-between border-t border-gray-200 bg-white px-4 gap-2">
        <div className="flex items-center gap-4 lg:gap-6 text-[11px] text-gray-400 overflow-hidden">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            Quiz ID: <span className="font-mono text-gray-600">{quiz.code}</span>
            <Copy className="h-3 w-3 cursor-pointer text-gray-300 hover:text-gray-500" />
          </span>
          <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
            <Target className="h-3 w-3 text-pink-500" /> Total Marks: <span className="text-gray-700 font-semibold">{totalMarks}</span>
          </span>
          <span className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <Target className="h-3 w-3 text-pink-500" /> Passing Marks: <span className="text-gray-700 font-semibold">{quiz.passing_marks ?? "—"}</span>
          </span>
          <span className="hidden lg:flex items-center gap-1.5 whitespace-nowrap">
            <Target className="h-3 w-3 text-pink-500" /> Negative Marking: <span className={quiz.negative_marking ? "text-red-500 font-semibold" : "text-gray-700"}>{quiz.negative_marking ? "Yes (-1)" : "No"}</span>
          </span>
          <span className="hidden xl:flex items-center gap-1.5 whitespace-nowrap">
            <Users className="h-3 w-3 text-pink-500" /> Attempts Allowed: <span className="text-gray-700 font-semibold">1</span>
          </span>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 shrink-0">
          <Flag className="h-3 w-3" /> Report an Issue
        </button>
      </footer>

      {/* ── Mechanic Modal ── */}
      {selectedMechanic !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setSelectedMechanic(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold", MECHANICS[selectedMechanic].color)}>{MECHANICS[selectedMechanic].icon}</div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{MECHANICS[selectedMechanic].title}</h3>
                  <p className="text-[11px] text-gray-400">{MECHANICS[selectedMechanic].desc}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMechanic(null)} className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Uses remaining</p>
                <p className="text-lg font-bold text-gray-900">{MECHANICS[selectedMechanic].left}</p>
              </div>
              {usedMechanics[selectedMechanic] && selectedMechanic !== 0 && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">Used</span>}
              {selectedMechanic === 0 && fiftyFiftyMap[q?.id] && <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[10px] font-bold text-pink-600">Active on Q{current + 1}</span>}
            </div>
            {selectedMechanic === 0 && q && q.type !== "single_choice" && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">50–50 only works on MCQ (single choice). Current is {q.type.replace("_", " ")}.</p>}
            {selectedMechanic === 0 && q && q.type === "single_choice" && q.options.length < 3 && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">Not enough options for 50–50.</p>}
            <button
              onClick={() => {
                if (selectedMechanic === 0) {
                  const cur = questions[current];
                  if (!cur || cur.type !== "single_choice") return;
                  if (cur.options.length < 3) return;
                  if (fiftyFiftyMap[cur.id]) {
                    setSelectedMechanic(null);
                    return;
                  }
                  const correct = cur.options.filter((o) => o.correct);
                  const incorrect = cur.options.filter((o) => !o.correct);
                  if (correct.length !== 1 || incorrect.length === 0) return;
                  const randomIncorrect = incorrect[Math.floor(Math.random() * incorrect.length)];
                  const keep = [correct[0].label, randomIncorrect.label].sort();
                  setFiftyFiftyMap((prev) => ({ ...prev, [cur.id]: keep }));
                  setAnswers((prev) => {
                    const ans = prev[cur.id];
                    if (ans && !keep.includes(ans)) {
                      const { [cur.id]: _, ...rest } = prev;
                      return rest;
                    }
                    return prev;
                  });
                  setUsedMechanics((u) => ({ ...u, [0]: Object.keys(fiftyFiftyMap).length + 1 >= 2 }));
                } else {
                  setUsedMechanics((u) => ({ ...u, [selectedMechanic!]: true }));
                }
                setSelectedMechanic(null);
              }}
              disabled={selectedMechanic !== 0 ? !!usedMechanics[selectedMechanic!] : !q || q.type !== "single_choice" || q.options.length < 3 || !!fiftyFiftyMap[q.id] || Object.keys(fiftyFiftyMap).length >= 2}
              className={cn("mt-4 w-full rounded-xl py-2.5 text-sm font-bold", (selectedMechanic !== 0 ? !!usedMechanics[selectedMechanic!] : !q || q.type !== "single_choice" || q.options.length < 3 || !!fiftyFiftyMap[q.id] || Object.keys(fiftyFiftyMap).length >= 2) ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400" : "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg")}
            >
              {selectedMechanic === 0 ? (fiftyFiftyMap[q?.id] ? "Already applied to this question" : Object.keys(fiftyFiftyMap).length >= 2 ? "No uses left" : "Use 50–50 (preview only)") : usedMechanics[selectedMechanic!] ? "Already Used" : "Use Now"}
            </button>
          </div>
        </div>
      )}
      </div>
    </ExamModeShell>
  );
}
