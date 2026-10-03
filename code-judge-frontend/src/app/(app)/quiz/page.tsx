"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Check, FileText, History, KeyRound, ShieldCheck, Rocket, Radar, Gauge, Satellite, PartyPopper, Sparkles, WandSparkles } from "lucide-react";
import GuestGuard from "@/components/guards/GuestGuard";

import YourActivitySection from "@/components/quiz/live/YourActivitySection";
import QuizPartyAtmosphere, { QuizPartyColorStrip } from "@/components/quiz/live/QuizPartyAtmosphere";
import QuizPageReady from "@/components/quiz/live/QuizPageReady";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";

/* ── Same ambient background as the upgrade/pricing page ── */
function QuizPageBackground() {
  const isMobile = useIsMobile();
  const stars = useMemo(
    () =>
      Array.from({ length: 48 }).map((_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 1 + (i % 3),
        opacity: 0.3 + ((i * 13) % 50) / 100,
        delay: `${((i * 7) % 40) / 10}s`,
        duration: `${2.5 + ((i * 11) % 30) / 10}s`,
      })),
    []
  );
  const shootingStars = useMemo(
    () => [
      { id: 0, left: "18%", top: "12%", delay: "1.5s", duration: "7s" },
      { id: 1, left: "62%", top: "28%", delay: "4.5s", duration: "9s" },
    ],
    []
  );
  // Mobile: flat mesh only (all hooks above stay unconditional). The desktop
  // version mounts 48 twinkling stars, shooting stars, 3 animated nebulas,
  // a planet and 3 blur-[100px] orbs.
  if (isMobile) {
    return (
      <>
        <div className="pricing-bg-light pointer-events-none absolute inset-0 z-0 opacity-100 dark:opacity-0" aria-hidden="true" />
        <div className="pricing-bg-space pointer-events-none absolute inset-0 z-0 opacity-0 dark:opacity-100" aria-hidden="true" />
      </>
    );
  }
  return (
    <>
      {/* Light theme mesh + blobs */}
      <div className="pricing-bg-light pointer-events-none absolute inset-0 z-0 opacity-100 transition-opacity duration-500 ease-out dark:opacity-0" aria-hidden="true">
        <div className="pricing-blob pricing-blob-1" />
        <div className="pricing-blob pricing-blob-2" />
        <div className="pricing-blob pricing-blob-3" />
      </div>
      {/* Dark deep-space + stars + nebulas */}
      <div className="pricing-bg-space pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 ease-out dark:opacity-100" aria-hidden="true">
        <div className="pricing-stars">
          {stars.map((s) => (
            <span
              key={s.id}
              className="pricing-star"
              style={{
                left: s.left,
                top: s.top,
                width: `${s.size}px`,
                height: `${s.size}px`,
                "--star-opacity": s.opacity,
                "--twinkle-delay": s.delay,
                "--twinkle-duration": s.duration,
              } as React.CSSProperties}
            />
          ))}
        </div>
        {shootingStars.map((ss) => (
          <span
            key={ss.id}
            className="pricing-shooting-star"
            style={{
              left: ss.left,
              top: ss.top,
              "--shoot-delay": ss.delay,
              "--shoot-duration": ss.duration,
            } as React.CSSProperties}
          />
        ))}
        <div className="pricing-nebula -left-20 top-20 h-[320px] w-[320px] bg-[#7C3AED]/20" />
        <div className="pricing-nebula -right-20 bottom-20 h-[380px] w-[380px] bg-[#EC4899]/20" style={{ animationDelay: "6s" }} />
        <div className="pricing-nebula left-1/3 top-1/2 h-[300px] w-[300px] bg-[#6366F1]/15" style={{ animationDelay: "12s" }} />
        <div className="absolute -right-20 top-20 h-52 w-52 rounded-full bg-gradient-to-br from-violet-300/45 via-violet-600/40 to-[#21104D] opacity-70 shadow-[inset_-24px_-18px_40px_rgba(5,3,25,.7),0_0_90px_rgba(124,58,237,.22)]">
          <span className="absolute left-[22%] top-[26%] h-5 w-5 rounded-full bg-white/[0.07]" />
          <span className="absolute left-1/2 top-1/2 h-[145%] w-[195%] -translate-x-1/2 -translate-y-1/2 rotate-[-17deg] rounded-[50%] border-[4px] border-violet-100/10 border-l-violet-100/35" />
        </div>
        <div className="absolute left-1/2 top-[36%] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full border border-violet-100/[0.045]" />
        <div className="absolute left-1/2 top-[45%] h-[28rem] w-[70rem] -translate-x-1/2 rotate-[-10deg] rounded-[50%] border border-cyan-100/[0.04]" />
      </div>
      {/* Local ambient orbs — clearly visible soft color balloons in both themes */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 -top-28 h-[360px] w-[360px] rounded-full bg-[#8B7CFF]/15 blur-[100px] dark:bg-[#7C3AED]/30" />
        <div className="absolute -right-24 top-10 h-[320px] w-[320px] rounded-full bg-[#EC4899]/10 blur-[100px] dark:bg-[#EC4899]/20" />
        <div className="absolute left-[28%] top-[42%] h-[300px] w-[300px] rounded-full bg-[#4F9DFF]/10 blur-[100px] dark:bg-[#6366F1]/15" />
      </div>
    </>
  );
}

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
      <span className="inline-flex h-5 items-center gap-1 text-[8px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-300">
        {isFinished ? "Quiz draft ready" : stream.paused ? "AI is thinking" : "AI is building"}
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
          <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
        </span>
      </span>

      <div className="mt-1 h-[52px] w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-2 font-mono text-[10px] leading-4 dark:border-emerald-400/15 dark:bg-emerald-400/[0.05]">
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
                    ? "font-bold text-[#343A4E] dark:text-[#DCE2ED]"
                    : isReflection
                      ? "italic text-violet-600 dark:text-violet-300"
                      : row.done
                        ? "text-[#6B7688] dark:text-[#8B95A7]"
                        : "text-[#343A4E] dark:text-[#DCE2ED]"
                )}
              >
                <span className={cn("mr-1", isResult ? "text-emerald-500" : isReflection ? "text-violet-500" : "text-emerald-500/70")}>
                  {isResult && row.done ? "✓" : isReflection ? "∿" : "›"}
                </span>
                {row.text}
                {(row.active || (stream.paused && row.index === visibleRows[visibleRows.length - 1]?.index) || (isStreaming && isResult && row.done)) && (
                  <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-emerald-500 align-middle" />
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
    <section className="group relative overflow-hidden rounded-[28px] border border-violet-200/80 bg-white/80 shadow-[0_28px_80px_-44px_rgba(91,33,182,.8)] backdrop-blur-2xl dark:border-violet-400/15 dark:bg-[#0E1321]/88 dark:shadow-[0_32px_90px_-38px_rgba(3,2,18,.98)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-24 -top-28 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute -bottom-28 right-[16%] h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-[-5%] top-[-70%] h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.055]" style={{ backgroundImage: "linear-gradient(rgba(124,58,237,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,.7) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_.86fr] lg:items-center lg:gap-7">
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-[0_14px_28px_-12px_rgba(124,58,237,.9)]">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-[#20263A] dark:text-white">AI Quiz Studio</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/[0.08] dark:text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
                  AI online
                </span>
              </div>
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
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-500 dark:text-fuchsia-300">{copyBeat.eyebrow}</p>
              <h3 className="mt-1.5 line-clamp-2 max-w-xl text-xl font-black leading-tight tracking-[-0.025em] text-[#171B2C] dark:text-white sm:text-2xl">{copyBeat.headline}</h3>
              <p className="mt-2 line-clamp-1 max-w-xl text-xs leading-5 text-[#667085] dark:text-[#A6AFC0]">{copyBeat.support}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/creator/quizzes/create" className="group/button inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 px-5 text-xs font-black text-white shadow-[0_16px_32px_-14px_rgba(124,58,237,.95)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_38px_-13px_rgba(124,58,237,1)]">
              <WandSparkles className="h-4 w-4" /> Create with AI <ArrowRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="relative w-full min-w-0 overflow-hidden rounded-[20px] border border-violet-200/80 bg-[#FAFAFF]/92 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_18px_45px_-30px_rgba(76,29,149,.65)] dark:border-white/[0.08] dark:bg-[#090D18]/88">
          <div className="flex items-center gap-3 border-b border-violet-100 pb-2 dark:border-white/[0.07]">
            <div className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#70778A] dark:text-[#8791A5]">Live AI draft</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeMoment} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }} className="py-2.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><FileText className="h-3.5 w-3.5" /></span>
                <div className="w-0 min-w-0 flex-1">
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#98A2B3]">Your prompt</span>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-[#343A4E] dark:text-[#DCE2ED]">“{moment.prompt}”</p>
                </div>
              </div>
              <div className="my-1.5 ml-3.5 h-3 border-l border-dashed border-violet-300 dark:border-violet-400/25" />
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><Check className="h-3.5 w-3.5" /></span>
                <div className="w-0 min-w-0 flex-1">
                  <AIThinkingConsole key={activeMoment} thinking={moment.thinking} result={moment.result} />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-auto">
            <div className="h-1 overflow-hidden rounded-full bg-violet-100 dark:bg-white/[0.06]">
              <motion.div key={`progress-${activeMoment}`} initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: CYCLE_SECONDS, ease: "linear" }} className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400" />
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {AI_STUDIO_MOMENTS.map((item, index) => (
                <button key={item.source} type="button" onClick={() => { setActiveMoment(index); setElapsedSeconds(0); }} className={`h-1.5 rounded-full transition-all ${index === activeMoment ? "w-7 bg-violet-500" : "w-1.5 bg-violet-200 hover:bg-violet-300 dark:bg-white/15 dark:hover:bg-white/25"}`} aria-label={`Show ${item.source} example`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuizHome() {
  const { theme } = useTheme();
  const partyMode = theme === "light";

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#F7F8FA] px-4 pb-6 pt-10 text-[#101828] dark:bg-[#0B0D10] dark:text-[#F4F6FA] sm:px-6 sm:pb-8 sm:pt-12">
      <QuizPageBackground />
      <QuizPartyAtmosphere showBottomStrip={false} />
      <div className="relative z-10 mx-auto w-full max-w-[1320px] sm:w-[calc(100%-48px)]">
      <QuizPageReady>
      <main className="w-full space-y-5 sm:space-y-6">
        <header className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 px-5 py-6 shadow-[0_28px_90px_-42px_rgba(65,44,155,.7)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#101421]/78 dark:shadow-[0_32px_100px_-36px_rgba(3,2,18,.95)] sm:px-8 sm:py-8 lg:grid lg:grid-cols-[1.25fr_.75fr] lg:items-center lg:gap-8">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -left-28 -top-36 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-cyan-400/[0.08] blur-3xl" />
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.055]" style={{ backgroundImage: "linear-gradient(rgba(139,124,255,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(139,124,255,.75) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />
          </div>

          <div className="relative min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/60 bg-pink-100/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-pink-600 dark:border-violet-500/20 dark:bg-violet-500/[0.08] dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              {partyMode ? "ByteClash AI Quiz Party" : "ByteClash AI Mission Control"}
            </div>
            <h1 className="mt-4 max-w-3xl text-[34px] font-black leading-[1.05] tracking-[-0.045em] text-[#101828] dark:text-white sm:text-[46px] lg:text-[54px]">
              {partyMode ? "Quiz time just got sweeter." : "This is not just a quiz."}
              <span className="block bg-gradient-to-r from-pink-500 via-orange-400 to-cyan-500 bg-clip-text text-transparent dark:from-violet-600 dark:via-fuchsia-500 dark:to-cyan-500">{partyMode ? "Grab a scoop and join the party!" : "It’s your next space mission."}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-[13px] leading-6 text-[#475467] dark:text-[#A1ABBC] sm:text-[15px]">
              {partyMode ? "Pop the balloons, splash some color, and turn every question into a cheerful little celebration." : "Receive your launch code, enter the assessment cockpit, and prove your skills beyond the classroom. Every attempt is a new destination."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/quiz/join" className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 px-6 text-sm font-bold text-white shadow-[0_14px_32px_-14px_rgba(244,114,182,.9)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(244,114,182,.95)] dark:from-[#705CF1] dark:via-[#8B7CFF] dark:to-[#A46EFF] dark:shadow-[0_14px_32px_-14px_rgba(124,92,255,.95)] dark:hover:shadow-[0_18px_40px_-12px_rgba(124,92,255,1)]">
                {partyMode ? <PartyPopper className="h-4 w-4" /> : <Rocket className="h-4 w-4" />} {partyMode ? "Join the quiz party" : "Launch a mission"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="#activity" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#DDE2EA] bg-white/55 px-5 text-sm font-semibold text-[#344054] transition hover:border-violet-500/30 hover:text-violet-600 dark:border-white/[0.09] dark:bg-white/[0.035] dark:text-[#BAC3D3] dark:hover:text-violet-300">
                <History className="h-4 w-4" /> {partyMode ? "See my quiz treats" : "Open mission logs"}
              </Link>
              <Link href="/creator/quizzes/create" className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet-300/55 bg-gradient-to-r from-violet-50/90 to-fuchsia-50/85 px-5 text-sm font-bold text-violet-700 shadow-[0_14px_30px_-20px_rgba(124,58,237,.7)] transition hover:-translate-y-0.5 hover:border-violet-400 dark:border-violet-400/25 dark:from-violet-500/10 dark:to-fuchsia-500/10 dark:text-violet-200">
                <WandSparkles className="h-4 w-4" /> Create your own quiz <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {!partyMode && <div className="relative mx-auto mt-8 hidden h-[260px] w-full max-w-[360px] lg:block" aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-500/15" />
            <div className="absolute left-1/2 top-1/2 h-32 w-64 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-[50%] border border-cyan-400/15" />
            <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-300/20 bg-gradient-to-br from-[#2D2368] via-[#5B45C4] to-[#171333] text-5xl shadow-[inset_-16px_-12px_28px_rgba(5,3,25,.55),0_0_60px_rgba(124,92,255,.28)]">🧑‍🚀</div>
            <div className="absolute left-[8%] top-[18%] rounded-xl border border-cyan-300/10 bg-[#081226]/50 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-cyan-200/65 backdrop-blur-md"><Radar className="mr-1.5 inline h-3.5 w-3.5" />Signal locked</div>
            <div className="absolute bottom-[12%] right-[2%] rounded-xl border border-violet-300/10 bg-[#120d29]/55 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.13em] text-violet-200/70 backdrop-blur-md"><Gauge className="mr-1.5 inline h-3.5 w-3.5" />Systems ready</div>
            <div className="absolute right-[12%] top-[6%] h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,.75)]" />
          </div>}
          {partyMode && <div className="relative mx-auto mt-8 hidden h-[260px] w-full max-w-[360px] lg:block" aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-pink-200/70 via-amber-100/70 to-cyan-100/70 blur-sm" />
            <div className="absolute left-1/2 top-[42%] grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[38px] border-4 border-white bg-gradient-to-br from-pink-300 to-pink-500 text-6xl shadow-[0_20px_45px_-18px_rgba(244,114,182,.65)]">🍨</div>
            <span className="absolute left-[8%] top-[14%] text-5xl drop-shadow-lg">🎈</span>
            <span className="absolute right-[7%] top-[18%] text-4xl drop-shadow-lg">🍭</span>
            <span className="absolute bottom-[12%] left-[15%] text-4xl drop-shadow-lg">💦</span>
            <span className="absolute bottom-[10%] right-[12%] text-4xl drop-shadow-lg">🎉</span>
          </div>}
        </header>

        <div className="hidden sm:block">
          <AIQuizStudioCard />
        </div>

        {/* ── Primary actions (compact) ── */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <ActionCard
            href="/quiz/join"
            icon={KeyRound}
            title={partyMode ? "Enter your party code" : "Enter launch code"}
            description={partyMode ? "Use your 16-letter quiz pass and step into the celebration." : "Use your secure 16-letter mission key and prepare for departure."}
            cta={partyMode ? "Join the fun" : "Begin launch sequence"}
            primary
            party={partyMode}
          />
          <ActionCard
            href="/quiz/attempts"
            icon={History}
            title={partyMode ? "My quiz treats" : "Mission archive"}
            description={partyMode ? "Revisit your scores, happy wins, and colorful quiz memories." : "Review completed expeditions, scores, ranks, and flight history."}
            cta={partyMode ? "Open treat shelf" : "Open mission logs"}
            party={partyMode}
          />
        </section>

        {/* ── Trust strip (existing content, compact) ── */}
        <section className="flex flex-col gap-2 rounded-2xl border border-[#E4E7EC] bg-white/75 px-4 py-3 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#111622]/75 sm:flex-row sm:items-center sm:gap-6">
          <span className="inline-flex items-center gap-2 text-xs text-[#475467] dark:text-[#9AA4B5]">
            <Satellite className="h-4 w-4 shrink-0 text-[#039855] dark:text-[#20D889]" />
            <span>
              <strong className="font-semibold text-[#101828] dark:text-[#F4F6FA]">{partyMode ? "Party pass — " : "Flight clearance — "}</strong>
              {partyMode ? "Every quiz code is checked before the fun begins." : "Every launch code is verified before boarding begins."}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-[#475467] dark:text-[#9AA4B5] sm:border-l sm:border-[#E4E7EC] sm:pl-6 sm:dark:border-[#252D3A]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#1570EF] dark:text-[#4F9DFF]" />
            <span>
              <strong className="font-semibold text-[#101828] dark:text-[#F4F6FA]">{partyMode ? "Safe play — " : "Protected cockpit — "}</strong>
              {partyMode ? "Your answers stay private while the colors and confetti fly." : "Your assessment session and answers remain secure throughout the mission."}
            </span>
          </span>
        </section>

        <div id="activity" className="scroll-mt-20">
          <YourActivitySection missionMode={!partyMode} />
        </div>
      </main>
      </QuizPageReady>
      </div>
      <QuizPartyColorStrip className="relative z-20 -mx-4 mb-[-1.5rem] mt-8 sm:-mx-6 sm:mb-[-2rem]" />
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

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  cta,
  primary = false,
  party = false,
}: {
  href: string;
  icon: typeof KeyRound;
  title: string;
  description: string;
  cta: string;
  primary?: boolean;
  party?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-start gap-4 overflow-hidden rounded-[24px] border p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 sm:p-6 ${
        party
          ? primary
            ? "border-pink-300/60 bg-gradient-to-br from-white/90 to-pink-50/85 shadow-[0_20px_55px_-32px_rgba(244,114,182,.8)] hover:border-pink-400/70"
            : "border-cyan-200/70 bg-gradient-to-br from-white/85 to-cyan-50/75 shadow-[0_20px_55px_-36px_rgba(34,199,232,.6)] hover:border-cyan-300"
          : primary
          ? "border-[#8B7CFF]/40 bg-white/85 shadow-[0_20px_55px_-32px_rgba(109,77,255,.8)] hover:border-[#8B7CFF]/65 hover:shadow-[0_24px_60px_-30px_rgba(109,77,255,.9)] dark:border-[#8B7CFF]/30 dark:bg-[#121725]/80 dark:shadow-[0_20px_60px_-34px_rgba(109,77,255,.7)]"
          : "border-[#E4E7EC] bg-white/75 shadow-[0_20px_55px_-38px_rgba(16,24,40,.45)] hover:border-[#BDB4FF]/60 hover:shadow-[0_24px_60px_-34px_rgba(109,77,255,.5)] dark:border-white/[0.08] dark:bg-[#101520]/75 dark:hover:border-violet-400/30"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${
          party ? (primary ? "bg-pink-400/25 opacity-80" : "bg-cyan-400/20 opacity-70") : primary ? "bg-violet-500/20 opacity-70" : "bg-cyan-400/10 opacity-40"
        }`}
      />
      <span
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-inner ${
          party
            ? primary
              ? "border-pink-300/50 bg-pink-100/70 text-pink-600"
              : "border-cyan-300/50 bg-cyan-100/65 text-cyan-600"
            : primary
            ? "border-[#8B7CFF]/25 bg-[#8B7CFF]/12 text-[#6B5CFF] dark:bg-violet-500/10 dark:text-[#A99FFF]"
            : "border-[#DDE2EA] bg-[#F2F4F7] text-[#475467] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-cyan-300"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.17em] text-[#98A2B3] dark:text-[#68758A]">
          {party ? (primary ? "Your party pass" : "Sweet memories") : (primary ? "Primary flight path" : "Mission intelligence")}
        </span>
        <span className="block text-[15px] font-semibold text-[#101828] dark:text-[#F4F6FA] sm:text-base">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-[#475467] dark:text-[#9AA4B5] sm:text-sm">
          {description}
        </span>
        <span
          className={`mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
            party && primary
              ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white group-hover:from-pink-600 group-hover:to-orange-500"
              : primary
              ? "bg-[#8B7CFF] text-white group-hover:bg-[#7A6BF5]"
              : "border border-[#E4E7EC] bg-[#F2F4F7] text-[#475467] group-hover:border-[#D0D5DD] group-hover:text-[#101828] dark:border-[#252D3A] dark:bg-[#19202C] dark:text-[#9AA4B5] dark:group-hover:border-[#353f52] dark:group-hover:text-[#F4F6FA]"
          }`}
        >
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}
