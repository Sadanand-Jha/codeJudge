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
import { getAdminQuizById, getQuizProblemsPublic, getQuizGameMechanics, type QuizGameMechanic } from "@/services/quiz";
import type { QuizBasic, PublicQuizProblem } from "@/services/quiz";
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

/* ── Mechanic Icon/Color Map ── */
const MECHANIC_META: Record<string, { icon: string; title: string; desc: string; color: string }> = {
  FIFTY_FIFTY: { icon: "50:50", title: "50 - 50", desc: "Eliminate 2 wrong options", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" },
  EXTRA_TIME: { icon: "⏰", title: "Extra Time", desc: "+5 minutes", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" },
  HINT: { icon: "💡", title: "Hint", desc: "Get a smart hint", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" },
  SKIP_QUESTION: { icon: "⏭", title: "Skip Question", desc: "Skip and come back later", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" },
  SHIELD: { icon: "🛡", title: "Shield", desc: "Protect from negative marking", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" },
  DOUBLE_SCORE: { icon: "2x", title: "Double Score", desc: "Next correct answer = 2x", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" },
  EXTRA_LIFE: { icon: "❤", title: "Extra Life", desc: "Get 1 extra life", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" },
};

interface DisplayMechanic {
  code: string;
  icon: string;
  title: string;
  desc: string;
  left: string;
  color: string;
  enabled: boolean;
  quantity: number;
}

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
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [mechanics, setMechanics] = useState<DisplayMechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  /* Fetch quiz + problems */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [quizData, problemsData] = await Promise.all([
          getAdminQuizById(quizId),
          getQuizProblemsPublic(quizId),
        ]);
        if (cancelled) return;
        setQuiz(quizData);
        const mapped = problemsData.map((p, idx) => ({
          id: p.id,
          q: decodeHtml(p.problem_statement),
          type: TYPE_MAP[p.quiz_problem_type ?? 1] ?? "single_choice",
          options: p.options.map((o, oi) => ({
            label: String.fromCharCode(65 + oi),
            text: decodeHtml(o.option_statement),
            correct: false,
          })),
          marks: (p as PublicQuizProblem & { marks?: number }).marks ?? 10,
          difficulty: p.difficulty_name ?? "Medium",
          explanation: decodeHtml(p.explaination ?? ""),
          questionNumber: p.question_number ?? idx + 1,
        }));
        setQuestions(mapped);
        const dur = (quizData.duration ?? 30) * 60;
        setTimeLeft(dur);

        // Fetch game mechanics from backend
        try {
          const dbMechanics = await getQuizGameMechanics(quizId);
          if (!cancelled && dbMechanics.length > 0) {
            setMechanics(
              dbMechanics
                .filter((m) => m.enabled)
                .map((m) => {
                  const meta = MECHANIC_META[m.code] ?? { icon: "⚙", title: m.name, desc: m.description ?? "", color: "bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400" };
                  return {
                    code: m.code,
                    icon: meta.icon,
                    title: meta.title,
                    desc: meta.desc,
                    left: `${m.quantity} left`,
                    color: meta.color,
                    enabled: m.enabled,
                    quantity: m.quantity,
                  };
                })
            );
          } else if (!cancelled) {
            // Fallback to defaults if no mechanics saved
            setMechanics(
              Object.entries(MECHANIC_META).map(([code, meta]) => ({
                code,
                icon: meta.icon,
                title: meta.title,
                desc: meta.desc,
                left: "0 left",
                color: meta.color,
                enabled: false,
                quantity: 0,
              }))
            );
          }
        } catch {
          // Non-critical — show defaults
        }
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
    return "bg-white dark:bg-card text-gray-500 dark:text-text-muted border border-gray-200 dark:border-border hover:border-gray-300 dark:hover:border-border-hover";
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        <p className="mt-3 text-sm text-text-muted">Loading quiz preview...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="flex h-[100dvh] w-full flex-col items-center justify-center bg-background">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="mt-3 text-sm text-red-500">{error ?? "Quiz not found."}</p>
        <Link href="/creator/quizzes" className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-card-hover">
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
      <div className="flex h-full w-full flex-col overflow-hidden bg-background text-text-primary">
      {/* ── MAIN GRID ── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[clamp(350px,27.5vw,450px)_minmax(0,1fr)_clamp(325px,27.5vw,425px)] gap-3 p-3 overflow-hidden">
        {/* LEFT */}
        <aside className="hidden lg:flex flex-col gap-3 min-h-0 overflow-hidden order-1">
          <div className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <span className="text-pink-500 text-base">◆</span>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Game Mechanics</h3>
            </div>
            <p className="text-xs text-text-muted mb-4 leading-tight shrink-0">Use lifelines strategically to maximize your score.</p>
            <div className="space-y-3 flex-1 flex flex-col justify-between py-1 overflow-hidden">
              {mechanics.map((m, i) => (
                <button
                  key={m.title}
                  onClick={() => setSelectedMechanic(i)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all",
                    usedMechanics[i] && i !== 0
                      ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
                      : fiftyFiftyMap[questions[current]?.id || -1] && i === 0
                      ? "border-pink-300 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/10"
                      : "border-border bg-card hover:border-pink-200 dark:hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/5"
                  )}
                >
                  <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold", m.color)}>{m.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary leading-none">{m.title}</p>
                    <p className="text-xs text-text-muted leading-tight truncate">{m.desc}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-bold", usedMechanics[i] ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400")}>{m.left}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-sm p-4 shrink-0">
            <h4 className="text-xs font-bold text-text-primary mb-2">Quiz Rules</h4>
            <ul className="space-y-1.5">
              {["Answer all questions before time runs out.", "Negative marking is applicable.", "Game mechanics can help you maximize your score.", "All the best! ✦"].map((rule) => (
                <li key={rule} className="flex items-start gap-2 text-[11px] text-text-muted leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* CENTER */}
        <main className="flex flex-col min-h-0 order-1 lg:order-2 overflow-hidden">
          <div className="flex-1 min-h-0 bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden p-3 sm:p-5">
            {q && (
              <>
                <div className="flex items-center justify-between shrink-0 gap-2">
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{q.difficulty}</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="rounded-full bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-pink-600 dark:text-pink-400">{q.marks} Marks</span>
                    <button className="text-gray-300 dark:text-text-muted hover:text-pink-500 transition-colors">
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h2 className="text-base sm:text-[18px] lg:text-[20px] font-semibold text-text-primary mt-3 sm:mt-4 leading-snug" dangerouslySetInnerHTML={{ __html: q.q || "Untitled question" }} />
                <div className="mt-3 sm:mt-4 space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                  {fiftyFiftyMap[q.id] && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-pink-200 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/10 px-3 py-2 text-[11px] font-medium text-pink-600 dark:text-pink-400">
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
                              "w-full flex items-center gap-2 sm:gap-3 rounded-xl border px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-all min-h-[48px] sm:min-h-[56px]",
                              active ? "border-pink-300 dark:border-pink-500/50 bg-pink-50 dark:bg-pink-500/10 shadow-[0_0_0_2px_rgba(236,72,153,0.08)]" : "border-border bg-card hover:border-pink-200 dark:hover:border-pink-500/30 hover:bg-pink-50/30 dark:hover:bg-pink-500/5"
                            )}
                          >
                            <span className={cn("flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-[10px] sm:text-xs font-bold border", active ? "bg-pink-500 text-white border-pink-500" : "bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/30")}>{o.label}</span>
                            <span className="flex-1 text-xs sm:text-sm text-text-secondary" dangerouslySetInnerHTML={{ __html: o.text }} />
                          </button>
                        );
                      });
                    })()
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-text-muted font-medium">Type your answer below:</p>
                      <input type="text" value={answers[q.id] ?? ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Enter your answer..." className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-pink-300 dark:focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-500/10" />
                    </div>
                  )}
                  <div className="rounded-xl border border-pink-200 dark:border-pink-500/30 bg-pink-50/40 dark:bg-pink-500/5 overflow-hidden mt-2">
                    <button onClick={() => setExplanationOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-left h-[42px] sm:h-[46px]">
                      <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-white dark:bg-card border border-pink-200 dark:border-pink-500/30 text-pink-600 dark:text-pink-400">
                        <BookOpenIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </span>
                      <span className="flex-1 text-xs sm:text-sm font-medium text-text-primary">Explanation</span>
                      {explanationOpen ? <ChevronUp className="h-4 w-4 text-pink-400" /> : <ChevronDown className="h-4 w-4 text-pink-300 dark:text-pink-500/50" />}
                    </button>
                    {explanationOpen && (
                      <div className="border-t border-pink-200 dark:border-pink-500/30 px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-card max-h-[120px] overflow-y-auto">
                        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 mt-auto border-t border-border shrink-0 gap-2">
                  <div className="flex gap-2 sm:gap-3">
                    <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} className="inline-flex items-center gap-1 sm:gap-2 rounded-lg border border-border bg-card px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-text-secondary hover:bg-card-hover disabled:opacity-30">
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="hidden xs:inline">Previous</span>
                    </button>
                    <button onClick={() => setMarked((m) => ({ ...m, [q.id]: !m[q.id] }))} className={cn("inline-flex items-center gap-1 sm:gap-2 rounded-lg border px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold", marked[q.id] ? "border-amber-300 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "border-border bg-card text-text-secondary hover:bg-card-hover")}>
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="hidden sm:inline">Mark for Review</span>
                    </button>
                  </div>
                  {current === questions.length - 1 ? (
                    <button onClick={() => setShowSubmitModal(true)} className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 sm:px-7 py-2 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg">
                      <Send className="h-4 w-4 sm:h-5 sm:w-5" /> <span className="hidden sm:inline">Submit Quiz</span>
                    </button>
                  ) : (
                    <button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} className="inline-flex items-center gap-1 sm:gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 px-4 sm:px-7 py-2 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-md">
                      <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          {/* Mobile mechanics */}
          <div className="lg:hidden mt-2 sm:mt-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto p-1.5 sm:p-2 bg-card border border-border rounded-xl">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-pink-500 ml-1" />
            {mechanics.map((m, i) => (
              <button key={m.title} onClick={() => setSelectedMechanic(i)} className={cn("flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] sm:text-xs", usedMechanics[i] ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border bg-card")}>
                {m.icon}
              </button>
            ))}
          </div>
        </main>

        {/* RIGHT */}
        <aside className="hidden lg:flex flex-col gap-3 min-h-0 overflow-hidden order-3">
          <div className="rounded-xl border border-border bg-card p-4 h-[92px] shrink-0 flex items-center justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                <Timer className="h-3.5 w-3.5" /> Time Left
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-pink-600 dark:text-pink-400">{formatTime(timeLeft)}</p>
            </div>
            <div className="relative h-16 w-16 shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="4" />
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
          <div className="rounded-xl border border-border bg-card p-4 h-[68px] shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Progress</p>
              <p className="text-xs text-text-muted">
                {Object.keys(answers).length} / {questions.length}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all" style={{ width: `${questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider shrink-0">
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
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 rounded-full bg-pink-500" /> Current
              </p>
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Answered
              </p>
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 rounded-full bg-border border border-border" /> Not Answered
              </p>
              <p className="flex items-center gap-1.5 text-text-muted">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Marked
              </p>
            </div>
          </div>
          <Link href="/creator/quizzes" className="rounded-xl border border-pink-200 dark:border-pink-500/30 overflow-hidden bg-card shrink-0 block hover:shadow-md transition-shadow">
            <img src="/images/quiz/banner/preview_submit.png" alt="Preview Mode" className="w-full h-auto object-cover" />
          </Link>
        </aside>
      </div>

      {/* ── FOOTER 46px ── */}
      <footer className="h-[46px] shrink-0 flex items-center justify-between border-t border-border bg-card px-2 sm:px-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 text-[10px] sm:text-[11px] text-text-muted overflow-hidden min-w-0">
          <span className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0">
            <span className="hidden sm:inline">Quiz ID:</span>
            <span className="font-mono text-text-secondary">{quiz.code}</span>
            <Copy className="h-3 w-3 cursor-pointer text-text-muted hover:text-text-secondary" />
          </span>
          <span className="hidden sm:flex items-center gap-1.5 whitespace-nowrap">
            <Target className="h-3 w-3 text-pink-500" /> Total Marks: <span className="text-text-primary font-semibold">{totalMarks}</span>
          </span>
          <span className="hidden md:flex items-center gap-1.5 whitespace-nowrap">
            <Target className="h-3 w-3 text-pink-500" /> Passing Marks: <span className="text-text-primary font-semibold">{quiz.passing_marks ?? "—"}</span>
          </span>
          <span className="hidden lg:flex items-center gap-1.5 whitespace-nowrap">
            <Target className="h-3 w-3 text-pink-500" /> Negative Marking: <span className={quiz.negative_marking ? "text-red-500 font-semibold" : "text-text-primary"}>{quiz.negative_marking ? "Yes (-1)" : "No"}</span>
          </span>
          <span className="hidden xl:flex items-center gap-1.5 whitespace-nowrap">
            <Users className="h-3 w-3 text-pink-500" /> Attempts Allowed: <span className="text-text-primary font-semibold">1</span>
          </span>
        </div>
        <button className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-border bg-card-hover px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold text-text-muted hover:bg-card shrink-0">
          <Flag className="h-3 w-3" /> <span className="hidden sm:inline">Report an Issue</span>
        </button>
      </footer>

      {/* ── Mechanic Modal ── */}
      {selectedMechanic !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={() => setSelectedMechanic(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold", mechanics[selectedMechanic].color)}>{mechanics[selectedMechanic].icon}</div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">{mechanics[selectedMechanic].title}</h3>
                  <p className="text-[11px] text-text-muted">{mechanics[selectedMechanic].desc}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMechanic(null)} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card-hover text-text-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card-hover p-3">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Uses remaining</p>
                <p className="text-lg font-bold text-text-primary">{mechanics[selectedMechanic].left}</p>
              </div>
              {usedMechanics[selectedMechanic] && selectedMechanic !== 0 && <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Used</span>}
              {selectedMechanic === 0 && fiftyFiftyMap[q?.id] && <span className="rounded-full bg-pink-100 dark:bg-pink-500/10 px-2.5 py-0.5 text-[10px] font-bold text-pink-600 dark:text-pink-400">Active on Q{current + 1}</span>}
            </div>
            {selectedMechanic === 0 && q && q.type !== "single_choice" && <p className="mt-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">50–50 only works on MCQ (single choice). Current is {q.type.replace("_", " ")}.</p>}
            {selectedMechanic === 0 && q && q.type === "single_choice" && q.options.length < 3 && <p className="mt-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">Not enough options for 50–50.</p>}
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
                  let keep: string[] = [];
                  if (correct.length === 1) {
                    const incorrect = cur.options.filter((o) => !o.correct);
                    if (incorrect.length === 0) return;
                    const randomIncorrect = incorrect[Math.floor(Math.random() * incorrect.length)];
                    keep = [correct[0].label, randomIncorrect.label].sort();
                  } else {
                    if (cur.options.length < 2) return;
                    keep = [...cur.options]
                      .sort(() => Math.random() - 0.5)
                      .slice(0, 2)
                      .map((o) => o.label)
                      .sort();
                  }
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
              className={cn("mt-4 w-full rounded-xl py-2.5 text-sm font-bold", (selectedMechanic !== 0 ? !!usedMechanics[selectedMechanic!] : !q || q.type !== "single_choice" || q.options.length < 3 || !!fiftyFiftyMap[q.id] || Object.keys(fiftyFiftyMap).length >= 2) ? "cursor-not-allowed border border-border bg-card-hover text-text-muted" : "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg")}
            >
              {selectedMechanic === 0 ? (fiftyFiftyMap[q?.id] ? "Already applied to this question" : Object.keys(fiftyFiftyMap).length >= 2 ? "No uses left" : "Use 50–50 (preview only)") : usedMechanics[selectedMechanic!] ? "Already Used" : "Use Now"}
            </button>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSubmitModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Send className="h-6 w-6" />
            </div>
            <h3 className="text-center text-lg font-bold text-text-primary">Submit quiz?</h3>
            <p className="mt-1 text-center text-sm text-text-muted">This preview will end and return you to the quizzes list.</p>

            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-card-hover">
                Continue Preview
              </button>
              <button onClick={onExitPreview} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg">
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ExamModeShell>
  );
}
