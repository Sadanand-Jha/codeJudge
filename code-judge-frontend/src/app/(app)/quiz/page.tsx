"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, BrainCircuit, Check, FileText, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import GuestGuard from "@/components/guards/GuestGuard";

import YourActivitySection from "@/components/quiz/live/YourActivitySection";
import QuizPageReady from "@/components/quiz/live/QuizPageReady";
import QuizCodeForm from "@/components/marketing/QuizCodeForm";
import SampleQuizDemo, { type SampleQuizQuestion } from "@/components/marketing/SampleQuizDemo";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";

const QUIZ_HUB_SAMPLE_QUESTIONS: SampleQuizQuestion[] = [
  {
    q: "Which data structure follows Last-In-First-Out (LIFO) order?",
    o: ["Queue", "Stack", "Linked list", "Binary tree"],
    a: 1,
  },
  {
    q: "What is the time complexity of binary search on a sorted array?",
    o: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
    a: 2,
  },
  {
    q: "Which of these is a primitive type in JavaScript?",
    o: ["Array", "Object", "Symbol", "Function"],
    a: 2,
  },
];

const AI_STUDIO_MOMENTS = [
  {
    prompt: "OS deadlocks for BTech 3rd sem",
    result: "10 placement-style questions with hints and explanations",
    source: "Topic to quiz",
    thinking: [
      "Understanding BTech 3rd-semester learning goals…",
      "Mapping deadlocks to the operating-systems syllabus…",
      "Extracting mutual exclusion, hold-and-wait + preemption…",
      "Connecting circular wait with resource-allocation graphs…",
      "Hmm… the first draft feels too theory-heavy.",
      "Finding high-value placement interview patterns…",
      "Drafting scenario-based process and resource questions…",
      "Creating believable distractors from common mistakes…",
      "Wait—one distractor makes the answer too obvious.",
      "Rewriting it around a realistic scheduling mistake…",
      "Checking every option for ambiguity and overlap…",
      "Adding short hints without revealing the answer…",
      "Writing step-by-step explanations for each solution…",
      "Thinking deeper… will a third-semester student infer this?",
      "Balancing easy, medium, and challenge questions…",
      "Estimating attempt time and cognitive load…",
      "Validating answer keys against core OS rules…",
      "Running a final duplication and quality scan…",
    ],
  },
  {
    prompt: "Turn my DBMS normalization notes into a quiz",
    result: "Key concepts found, balanced and ready for revision",
    source: "Document to quiz",
    thinking: [
      "Reading every section of the uploaded DBMS notes…",
      "Detecting headings, examples, tables + definitions…",
      "Mapping the progression from 1NF through BCNF…",
      "Extracting candidate keys and functional dependencies…",
      "Identifying partial and transitive dependencies…",
      "Hmm… this BCNF example is too dense for quick revision.",
      "Separating update, insertion, and deletion anomalies…",
      "Finding examples suitable for decomposition questions…",
      "Turning dense paragraphs into focused recall prompts…",
      "Wait—two questions are testing the same exact idea.",
      "Replacing one with a dependency-preservation scenario…",
      "Generating application-based normalization problems…",
      "Building plausible distractors from common confusions…",
      "Checking lossless join and dependency preservation…",
      "Rethinking the mix… adding one visual table-based prompt.",
      "Adding concise answer keys and revision notes…",
      "Balancing concept recall with problem solving…",
      "Running a final coverage and accuracy review…",
    ],
  },
  {
    prompt: "A rapid-fire DSA + JavaScript challenge",
    result: "Questions, answer keys, and interview-style explanations",
    source: "Idea to quiz",
    thinking: [
      "Understanding the rapid-fire challenge format…",
      "Mixing DSA patterns with JavaScript fundamentals…",
      "Selecting arrays, strings, stacks, and hash maps…",
      "Adding closures, promises, scope + event-loop traps…",
      "Hmm… closures and event loop back-to-back may feel repetitive.",
      "Designing short code snippets that scan quickly…",
      "Generating output-prediction interview questions…",
      "Creating distractors from real debugging mistakes…",
      "Wait—that edge case only works in non-strict mode.",
      "Rewriting the snippet for consistent browser behavior…",
      "Checking snippets for valid modern JavaScript…",
      "Writing crisp interview-style explanations…",
      "Alternating conceptual and code-based questions…",
      "Thinking… does the difficulty ramp feel fair yet?",
      "Tuning difficulty for a mixed-skill batch…",
      "Setting a fast but achievable response rhythm…",
      "Verifying answer keys with edge cases…",
      "Polishing the final challenge flow…",
    ],
  },
];

const AI_STUDIO_COPY_BEATS = [
  {
    eyebrow: "One prompt. Full quiz.",
    headline: "Stop formatting. Start teaching.",
    support: "Drop the topic. AI attacks the first draft instantly.",
  },
  {
    eyebrow: "Your syllabus. AI on full throttle.",
    headline: "Questions. Distractors. Explanations. Done.",
    support: "From rough idea to ready-to-play before your coffee cools.",
  },
  {
    eyebrow: "Kill the blank page.",
    headline: "Turn raw notes into a quiz—fast.",
    support: "Upload it. Shape it. Launch something your class will finish.",
  },
  {
    eyebrow: "No boring worksheets.",
    headline: "Make revision impossible to ignore.",
    support: "AI builds the momentum. You stay in complete control.",
  },
  {
    eyebrow: "Draft less. Challenge more.",
    headline: "Build smarter questions at ridiculous speed.",
    support: "Difficulty, hints, answer keys, and polish—all moving together.",
  },
  {
    eyebrow: "Your next quiz is already moving.",
    headline: "Think it. Type it. Watch AI build it.",
    support: "Go from five words to a classroom-ready experience.",
  },
];

const THINKING_TOKENS_PER_SECOND = 120;

function AIThinkingConsole({ thinking, result }: { thinking: string[]; result: string }) {
  const [stream, setStream] = useState({ chars: 0, speed: THINKING_TOKENS_PER_SECOND, paused: false });
  const allLines = useMemo(() => [...thinking, result], [thinking, result]);
  const total = useMemo(() => allLines.reduce((sum, line) => sum + line.length, 0), [allLines]);
  const pauseBoundaries = useMemo(() => {
    let cursor = 0;
    const boundaries: number[] = [];
    for (const line of allLines) {
      cursor += line.length;
      if (/^(Hmm|Wait|Thinking|Rethinking)/.test(line)) boundaries.push(cursor);
    }
    return boundaries;
  }, [allLines]);

  useEffect(() => {
    let pauseIndex = 0;
    let pauseUntil = 0;
    let burstUntil = 0;
    let liveSpeed = THINKING_TOKENS_PER_SECOND;
    let fraction = 0;
    let previousTick = performance.now();

    const fast = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min((now - previousTick) / 1_000, 0.1);
      previousTick = now;

      setStream((current) => {
        if (current.chars >= total) {
          window.clearInterval(fast);
          return { chars: current.chars, speed: 0, paused: false };
        }

        const nextPause = pauseBoundaries[pauseIndex];
        if (nextPause !== undefined && current.chars >= nextPause && pauseUntil === 0) {
          pauseUntil = now + 650;
          fraction = 0;
          return { chars: nextPause, speed: 0, paused: true };
        }

        if (pauseUntil > now) {
          return current.paused ? current : { ...current, speed: 0, paused: true };
        }

        if (pauseUntil !== 0) {
          pauseUntil = 0;
          pauseIndex += 1;
          burstUntil = now + 750;
          liveSpeed = 250;
        }

        if (now < burstUntil) liveSpeed = 250;
        else liveSpeed = Math.max(THINKING_TOKENS_PER_SECOND, liveSpeed - 10);

        fraction += liveSpeed * elapsed;
        const wholeChars = Math.floor(fraction);
        fraction -= wholeChars;
        const boundary = pauseBoundaries[pauseIndex] ?? total;
        const chars = Math.min(total, boundary, current.chars + wholeChars);

        return { chars, speed: Math.round(liveSpeed), paused: false };
      });
    }, 50);
    return () => window.clearInterval(fast);
  }, [pauseBoundaries, total]);

  let remaining = stream.chars;
  const rows: { index: number; text: string; done: boolean; active: boolean }[] = [];
  for (const [index, line] of allLines.entries()) {
    if (remaining >= line.length) {
      rows.push({ index, text: line, done: true, active: false });
      remaining -= line.length;
    } else if (remaining > 0) {
      rows.push({ index, text: line.slice(0, remaining), done: false, active: true });
      remaining = 0;
    } else {
      rows.push({ index, text: "", done: false, active: false });
    }
  }

  const visibleRows = rows.filter((row) => row.text).slice(-2);
  const isStreaming = stream.chars < total;
  const isFinished = stream.chars >= total;

  return (
    <div className="w-full min-w-0">
      <span className="inline-flex h-5 items-center gap-1 text-[8px] font-black uppercase tracking-[0.15em] text-[var(--qs-ok)]">
        {isFinished ? "Quiz draft ready" : stream.paused ? "AI is thinking" : "AI is building"}
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
          <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--qs-ok)] [animation-delay:0ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--qs-ok)] [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-[var(--qs-ok)] [animation-delay:300ms]" />
        </span>
      </span>

      <div className="mt-1 h-[52px] w-full min-w-0 max-w-full overflow-hidden rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-2 font-mono text-[10px] leading-4">
        <span className="sr-only">AI pauses to think, accelerates to 250 tokens per second, then settles back to 120. Only the latest two steps are shown.</span>
        <AnimatePresence initial={false} mode="popLayout">
          {visibleRows.map((row) => {
            const isResult = row.index === rows.length - 1;
            const isReflection = /^(Hmm|Wait|Thinking|Rethinking)/.test(row.text);
            return (
              <motion.p
                layout
                key={row.index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className={cn(
                  "h-4 truncate whitespace-nowrap",
                  isResult && row.done
                    ? "font-bold text-[var(--qs-ink)]"
                    : isReflection
                      ? "italic text-[var(--qs-brand)]"
                      : row.done
                        ? "text-[var(--qs-muted)]"
                        : "text-[var(--qs-ink)]"
                )}
              >
                <span className={cn("mr-1", isResult ? "text-[var(--qs-ok)]" : isReflection ? "text-[var(--qs-brand)]" : "text-[var(--qs-ok)] opacity-70")}>
                  {isResult && row.done ? "✓" : isReflection ? "∿" : "›"}
                </span>
                {row.text}
                {(row.active || (stream.paused && row.index === visibleRows[visibleRows.length - 1]?.index) || (isStreaming && isResult && row.done)) && (
                  <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-[var(--qs-ok)] align-middle" />
                )}
              </motion.p>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AIQuizStudioCard() {
  const [activeMoment, setActiveMoment] = useState(0);
  const [activeCopyBeat, setActiveCopyBeat] = useState(0);
  const [, setElapsedSeconds] = useState(0);
  const moment = AI_STUDIO_MOMENTS[activeMoment];
  const copyBeat = AI_STUDIO_COPY_BEATS[activeCopyBeat];

  const CYCLE_SECONDS = 10;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => {
        if (current >= CYCLE_SECONDS - 1) {
          setActiveMoment((active) => (active + 1) % AI_STUDIO_MOMENTS.length);
          return 0;
        }
        return current + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const copyInterval = window.setInterval(() => {
      setActiveCopyBeat((current) => (current + 1) % AI_STUDIO_COPY_BEATS.length);
    }, 1_800);

    return () => window.clearInterval(copyInterval);
  }, []);

  return (
    <section className="qs-shadow">
      <div className="qs-card lg:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_.86fr] lg:items-center lg:gap-8">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="qs-display text-lg">AI Quiz Studio</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--qs-ok)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--qs-ok)] opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--qs-ok)]" />
                  </span>
                  AI online
                </span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeCopyBeat}
                initial={{ opacity: 0, x: 24, skewX: -3 }}
                animate={{ opacity: 1, x: 0, skewX: 0 }}
                exit={{ opacity: 0, x: -24, skewX: 3 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4 h-[116px] overflow-hidden"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--qs-brand)]">{copyBeat.eyebrow}</p>
                <h3 className="mt-1.5 line-clamp-2 max-w-xl text-2xl font-extrabold leading-tight">{copyBeat.headline}</h3>
                <p className="mt-2 line-clamp-1 max-w-xl text-sm text-[var(--qs-muted)]">{copyBeat.support}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/creator/quizzes/create" className="qs-btn group/button px-6">
                <WandSparkles className="h-4 w-4" /> Create with AI
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="relative w-full min-w-0 overflow-hidden rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
            <div className="flex items-center gap-3 border-b-2 border-[var(--qs-line)] pb-2">
              <div className="flex items-center gap-2">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-bad)]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-sun)]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--qs-ok)]" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--qs-muted)]">Live AI draft</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeMoment} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }} className="py-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <div className="w-0 min-w-0 flex-1">
                    <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--qs-muted)]">Your prompt</span>
                    <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--qs-ink)]">“{moment.prompt}”</p>
                  </div>
                </div>
                <div className="my-1.5 ml-3.5 h-3 border-l-2 border-dashed border-[var(--qs-line)]" />
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--qs-okbg)] text-[var(--qs-ok)]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <div className="w-0 min-w-0 flex-1">
                    <AIThinkingConsole key={activeMoment} thinking={moment.thinking} result={moment.result} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto">
              <div className="qs-bar">
                <motion.div
                  key={`progress-${activeMoment}`}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: CYCLE_SECONDS, ease: "linear" }}
                  className="h-full rounded-full bg-[var(--qs-brand)]"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {AI_STUDIO_MOMENTS.map((item, index) => (
                  <button
                    key={item.source}
                    type="button"
                    onClick={() => { setActiveMoment(index); setElapsedSeconds(0); }}
                    className={`h-1.5 rounded-full transition-all ${index === activeMoment ? "w-7 bg-[var(--qs-brand)]" : "w-1.5 bg-[var(--qs-line)] hover:bg-[var(--qs-brand)]/40"}`}
                    aria-label={`Show ${item.source} example`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="grid gap-3 rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-4 sm:grid-cols-2">
      <span className="inline-flex items-start gap-2.5 text-sm text-[var(--qs-muted)]">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-ok)]" />
        <span>
          <strong className="font-bold text-[var(--qs-ink)]">Verified entry — </strong>
          Every quiz code is checked before a quiz begins.
        </span>
      </span>
      <span className="inline-flex items-start gap-2.5 text-sm text-[var(--qs-muted)] sm:border-l-2 sm:border-[var(--qs-line)] sm:pl-5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--qs-brand)]" />
        <span>
          <strong className="font-bold text-[var(--qs-ink)]">Private by default — </strong>
          Your answers stay secure throughout every attempt.
        </span>
      </span>
    </section>
  );
}

function QuizHome() {
  const { theme } = useTheme();
  const missionMode = theme === "dark";

  return (
    <div className="qs-ui relative min-h-[calc(100dvh-3.5rem)]">
      <QuizPageReady>
        <div className="qs-wrap relative pb-12 pt-4 sm:pt-6">
          <main className="w-full space-y-8">
            <header className="grid items-center gap-11 pt-4 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  QuizSupport quiz hub
                </span>
                <h1 className="mt-4 max-w-[13em] text-[clamp(34px,4.6vw,56px)] font-extrabold">
                  Make a quiz in minutes.
                  <span className="block text-[var(--qs-brand)]">Share it with a code.</span>
                </h1>
                <p className="mb-7 mt-4 max-w-[30em] text-[var(--qs-muted)]">
                  Enter your quiz code to join a live quiz.
                </p>
                <QuizCodeForm />
                <p className="qs-sub mt-2">
                  Want to build your own?{" "}
                  <Link href="/creator/quizzes/create">Create a quiz for free</Link>
                </p>
              </div>
              <div className="hidden md:block">
                <SampleQuizDemo questions={QUIZ_HUB_SAMPLE_QUESTIONS} label="Sample live quiz" />
              </div>
            </header>

            <div className="hidden md:block">
              <AIQuizStudioCard />
            </div>

            <TrustStrip />

            <div id="activity" className="scroll-mt-20">
              <YourActivitySection missionMode={missionMode} />
            </div>
          </main>
        </div>
      </QuizPageReady>
    </div>
  );
}

export default function QuizDashboardPage() {
  return (
    <GuestGuard action="join-contest">
      <QuizHome />
    </GuestGuard>
  );
}
