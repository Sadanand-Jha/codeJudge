"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Save,
  CheckCircle2,
  Circle,
  CloudUpload,
  X,
  Timer,
  FileText,
} from "lucide-react";
import { MOCK_ATTEMPT_SECTIONS } from "./mockData";
import { QuestionPalette, type QuestionStatus } from "./QuestionPalette";
import { cn } from "@/lib/helpers";

type AnswerValue = string | number | null;

interface AnswerState {
  selected: AnswerValue;
  status: QuestionStatus;
}

function formatClock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TestAttempt({ testTitle = "JEE Main Mock Test 01" }: { testTitle?: string }) {
  const router = useRouter();
  const sections = MOCK_ATTEMPT_SECTIONS;
  const [sectionIdx, setSectionIdx] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(100 * 60); // 100 minutes
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSection = sections[sectionIdx];
  const question = currentSection.questions[qIndex];

  const allQuestions = useMemo(
    () => sections.flatMap((s) => s.questions),
    [sections]
  );

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          router.push("/tests/results/atn_9f3k2");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  // Auto-save indicator
  useEffect(() => {
    const t = setTimeout(() => {
      setLastSaved(new Date());
    }, 800);
    return () => clearTimeout(t);
  }, [answers]);

  const entry = answers[question.id];
  const status = entry?.status ?? "not-visited";

  const selectOption = (optId: string) => {
    const val = question.kind === "multi" ? toggleMulti(optId) : optId;
    setAnswers((prev) => {
      const answered = val !== null && val !== "";
      const next: QuestionStatus = reviewed[question.id]
        ? answered
          ? "answered-marked"
          : "marked"
        : answered
        ? "answered"
        : "not-answered";
      return { ...prev, [question.id]: { selected: val, status: next } };
    });
  };

  const toggleMulti = (optId: string): string => {
    const cur = answers[question.id]?.selected;
    const arr = typeof cur === "string" && cur.length > 1 ? cur.split(",") : cur ? [String(cur)] : [];
    const next = arr.includes(optId) ? arr.filter((x) => x !== optId) : [...arr, optId];
    return next.join(",");
  };

  const inputNumerical = (v: string) => {
    setAnswers((prev) => {
      const val = v === "" ? null : v;
      const answered = val !== null && val !== "";
      const next: QuestionStatus = reviewed[question.id]
        ? answered
          ? "answered-marked"
          : "marked"
        : answered
        ? "answered"
        : "not-answered";
      return { ...prev, [question.id]: { selected: val as AnswerValue, status: next } };
    });
  };

  const markForReview = () => {
    const nextReview = !reviewed[question.id];
    setReviewed((prev) => ({ ...prev, [question.id]: nextReview }));
    setAnswers((prev) => {
      const cur = prev[question.id]?.selected ?? null;
      const answered = cur !== null && cur !== "";
      const next: QuestionStatus = nextReview
        ? answered
          ? "answered-marked"
          : "marked"
        : answered
        ? "answered"
        : "not-visited";
      return { ...prev, [question.id]: { selected: cur, status: next } };
    });
  };

  const clearResponse = () => {
    setAnswers((prev) => {
      const base: QuestionStatus = reviewed[question.id] ? "marked" : "not-answered";
      return { ...prev, [question.id]: { selected: null, status: base } };
    });
  };

  const goTo = (idx: number) => {
    setQIndex(idx);
    setPaletteOpen(false);
  };

  const jumpToQuestion = (globalIndex: number) => {
    let acc = 0;
    for (let s = 0; s < sections.length; s++) {
      const qs = sections[s].questions;
      if (globalIndex < acc + qs.length) {
        setSectionIdx(s);
        setQIndex(globalIndex - acc);
        break;
      }
      acc += qs.length;
    }
    setPaletteOpen(false);
  };

  const paletteEntries = allQuestions.map((q, i) => ({
    index: i + 1,
    status: answers[q.id]?.status ?? ("not-visited" as QuestionStatus),
  }));

  const answeredCount = allQuestions.filter((q) => answers[q.id]?.status === "answered" || answers[q.id]?.status === "answered-marked").length;
  const markedCount = allQuestions.filter((q) => answers[q.id]?.status === "marked" || answers[q.id]?.status === "answered-marked").length;

  const isAnswered = status === "answered" || status === "answered-marked";

  return (
    <div className="flex min-h-screen flex-col bg-ai-bg">
      {/* ===== Top bar ===== */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ai-border bg-ai-bg/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <button
          onClick={() => router.push("/tests")}
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-card-hover"
          aria-label="Exit test"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-text-primary">{testTitle}</div>
          <div className="text-[10px] text-text-muted">
            Section {sectionIdx + 1} of {sections.length} · {currentSection.name}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11px] text-emerald-500 sm:inline-flex">
            <CloudUpload className="h-3.5 w-3.5" />
            {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Auto-save on"}
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5">
            <Timer className="h-4 w-4 text-pink-500 dark:text-ai-accent" />
            <span className={cn("font-mono text-sm font-bold tabular-nums", timeLeft < 600 ? "text-rose-500" : "text-text-primary")}>
              {formatClock(timeLeft)}
            </span>
          </div>
          <button
            onClick={() => setSubmitOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.3)] transition-all hover:-translate-y-0.5"
          >
            <Flag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Submit</span>
          </button>
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="mx-auto grid w-full max-w-[1240px] flex-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_280px]">
        {/* Question area */}
        <main className="min-w-0">
          {/* Section tabs */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {sections.map((s, i) => (
              <button
                key={s.name}
                onClick={() => {
                  setSectionIdx(i);
                  setQIndex(0);
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-colors",
                  i === sectionIdx
                    ? "border-transparent bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-[0_4px_12px_rgba(236,72,153,0.3)]"
                    : "border-border bg-card text-text-secondary hover:border-pink-500/30 hover:text-text-primary"
                )}
              >
                {s.name}
                <span className="ml-1.5 opacity-70">{s.questions.length}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${sectionIdx}-${qIndex}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-card p-5 sm:p-7"
            >
              {/* Question header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-xs font-extrabold text-pink-500 dark:bg-ai-accent/10 dark:text-ai-accent">
                    {question.index}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">{question.section}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> +{question.marks} marks
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Circle className="h-3 w-3" /> −{question.negativeMarks} negative
                  </span>
                </div>
              </div>

              {/* Question text */}
              <h2 className="mt-5 text-[15px] font-medium leading-relaxed text-text-primary sm:text-base">
                {question.text}
              </h2>

              {/* Options */}
              <div className="mt-6 space-y-3">
                {question.kind === "numerical" ? (
                  <div>
                    <label className="text-xs font-semibold text-text-secondary">Enter your answer</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Type your numerical answer…"
                      value={answers[question.id]?.selected === null ? "" : String(answers[question.id]?.selected ?? "")}
                      onChange={(e) => inputNumerical(e.target.value)}
                      className="mt-2 h-12 w-full max-w-xs rounded-xl border border-input-border bg-input-bg px-4 font-mono text-sm text-text-primary placeholder-text-muted focus:border-pink-500/50 focus:outline-none focus:ring-2 focus:ring-pink-500/15"
                    />
                  </div>
                ) : (
                  question.options?.map((opt) => {
                    const isMulti = question.kind === "multi";
                    const raw = answers[question.id]?.selected;
                    const selectedSet = isMulti && typeof raw === "string" ? raw.split(",").filter(Boolean) : [];
                    const isSelected = isMulti ? selectedSet.includes(opt.id) : raw === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => selectOption(opt.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all",
                          isSelected
                            ? "border-pink-500/50 bg-pink-500/8 shadow-[0_4px_16px_rgba(236,72,153,0.12)] dark:border-ai-accent/50 dark:bg-ai-accent/8"
                            : "border-border bg-card-hover/40 hover:border-border-hover hover:bg-card-hover"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors",
                            isMulti ? "rounded" : "rounded-full",
                            isSelected ? "border-pink-500 bg-pink-500 text-white dark:border-ai-accent dark:bg-ai-accent" : "border-border-hover bg-card"
                          )}
                        >
                          {isMulti ? (
                            isSelected && <span className="text-[10px] font-bold">✓</span>
                          ) : (
                            isSelected && <span className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </span>
                        <span className="font-medium text-text-primary">{opt.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => qIndex > 0 && goTo(qIndex - 1)}
              disabled={qIndex === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              onClick={markForReview}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all",
                reviewed[question.id]
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-500 dark:text-violet-300"
                  : "border-border bg-card text-text-primary hover:border-violet-500/40 hover:text-violet-500"
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              {reviewed[question.id] ? "Marked for Review" : "Mark for Review"}
            </button>
            <button
              onClick={clearResponse}
              disabled={!answers[question.id]?.selected}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-text-primary transition-colors hover:border-rose-500/40 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Clear Response
            </button>

            <div className="ml-auto flex items-center gap-2.5">
              <button
                onClick={() => setPaletteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-text-primary transition-colors lg:hidden"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Palette
              </button>
              <button
                onClick={() => qIndex < currentSection.questions.length - 1 ? goTo(qIndex + 1) : setSubmitOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5",
                  isAnswered
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                    : "bg-gradient-to-r from-pink-500 to-violet-600 shadow-[0_4px_14px_rgba(236,72,153,0.3)]"
                )}
              >
                {qIndex === currentSection.questions.length - 1 ? (
                  <>Submit Test</>
                ) : (
                  <>
                    Save & Next <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </main>

        {/* Question palette (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Question Palette</h3>
              <span className="rounded-full bg-card-hover px-2 py-0.5 text-[10px] font-bold text-text-muted">
                {answeredCount}/{allQuestions.length} answered
              </span>
            </div>
            <div className="mt-4">
              <QuestionPalette entries={paletteEntries} currentIndex={qIndex + 1} onSelect={jumpToQuestion} />
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-[11px] text-text-secondary">
              <div className="flex items-center justify-between">
                <span>Answered</span>
                <span className="font-bold tabular-nums text-text-primary">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Marked for review</span>
                <span className="font-bold tabular-nums text-text-primary">{markedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Not answered</span>
                <span className="font-bold tabular-nums text-text-primary">{allQuestions.length - answeredCount}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ===== Mobile palette drawer ===== */}
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/60 lg:hidden"
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full rounded-t-2xl border-t border-border bg-card p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">Question Palette</h3>
                <span className="rounded-full bg-card-hover px-2 py-0.5 text-[10px] font-bold text-text-muted">
                  {answeredCount}/{allQuestions.length} answered
                </span>
              </div>
              <div className="mt-4 max-h-[40vh] overflow-y-auto">
                <QuestionPalette entries={paletteEntries} currentIndex={qIndex + 1} onSelect={jumpToQuestion} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Submit confirm ===== */}
      <AnimatePresence>
        {submitOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSubmitOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Save className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-text-primary">Submit Test?</h3>
              <p className="mt-1 text-sm text-text-secondary">
                You have {answeredCount} answered, {markedCount} marked for review and{" "}
                {allQuestions.length - answeredCount} unanswered questions.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSubmitOpen(false)}
                  className="h-11 rounded-xl border border-border bg-card text-sm font-bold text-text-primary transition-colors hover:bg-card-hover"
                >
                  Continue Test
                </button>
                <button
                  onClick={() => router.push("/tests/results/atn_9f3k2")}
                  className="h-11 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-sm font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.3)] transition-all hover:-translate-y-0.5"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}