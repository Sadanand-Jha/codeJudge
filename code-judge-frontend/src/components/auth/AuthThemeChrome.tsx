"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, CheckCircle2, FileText, IceCreamCone, Layers3, LoaderCircle, Rocket, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/helpers";

export function AuthLoader({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-6 w-6 animate-spin text-current", className)} aria-label="Loading" />;
}

const REGISTER_AI_DEMOS = [
  {
    prompt: "Turn my DBMS notes into a revision quiz",
    result: "12 balanced questions ready to review",
    output: ["12 questions", "Answer keys", "3 difficulty levels"],
    steps: [
      "Reading headings, tables, and examples…",
      "Mapping 1NF through BCNF concepts…",
      "Extracting candidate keys and dependencies…",
      "Hmm… the first draft feels too recall-heavy.",
      "Adding one decomposition-based scenario…",
      "Writing believable distractors from common errors…",
      "Wait—two questions test the same exact idea.",
      "Replacing one with a lossless-join challenge…",
      "Checking answers, hints, and coverage…",
    ],
  },
  {
    prompt: "Create an OS mock test for placements",
    result: "A focused placement round is ready",
    output: ["15 questions", "Smart hints", "Interview style"],
    steps: [
      "Mapping deadlocks, scheduling, and memory…",
      "Finding high-value interview patterns…",
      "Drafting process and resource scenarios…",
      "Thinking… will this expose real understanding?",
      "Turning definitions into application questions…",
      "Balancing speed with conceptual depth…",
      "Wait—one distractor reveals the answer.",
      "Rewriting it around a scheduling mistake…",
      "Running the final ambiguity scan…",
    ],
  },
  {
    prompt: "Build a rapid JavaScript challenge",
    result: "A high-energy coding quiz is ready",
    output: ["10 challenges", "Code outputs", "Explanations"],
    steps: [
      "Mixing closures, promises, and event loops…",
      "Generating compact output-prediction snippets…",
      "Checking modern JavaScript behavior…",
      "Hmm… the difficulty jumps too suddenly.",
      "Adding a cleaner warm-up question…",
      "Creating distractors from debugging mistakes…",
      "Wait—that edge case depends on strict mode.",
      "Rewriting it for consistent browser behavior…",
      "Polishing explanations and final flow…",
    ],
  },
];

function RegisterAIShowcase() {
  const [activeDemo, setActiveDemo] = useState(0);
  const [stream, setStream] = useState({ chars: 0, paused: false });
  const demo = REGISTER_AI_DEMOS[activeDemo];
  const allLines = useMemo(() => [...demo.steps, demo.result], [demo]);
  const total = useMemo(() => allLines.reduce((sum, line) => sum + line.length, 0), [allLines]);
  const pauseBoundaries = useMemo(() => {
    let cursor = 0;
    const boundaries: number[] = [];
    for (const line of allLines) {
      cursor += line.length;
      if (/^(Hmm|Wait|Thinking)/.test(line)) boundaries.push(cursor);
    }
    return boundaries;
  }, [allLines]);

  useEffect(() => {
    let pauseIndex = 0;
    let pauseUntil = 0;
    let burstUntil = 0;
    let speed = 120;
    let fraction = 0;
    let completedAt = 0;
    let previousTick = performance.now();

    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min((now - previousTick) / 1_000, 0.1);
      previousTick = now;

      setStream((current) => {
        if (current.chars >= total) {
          if (completedAt === 0) completedAt = now;
          if (now - completedAt > 1_250) {
            window.clearInterval(interval);
            setActiveDemo((index) => (index + 1) % REGISTER_AI_DEMOS.length);
            return { chars: 0, paused: false };
          }
          return current;
        }

        const nextPause = pauseBoundaries[pauseIndex];
        if (nextPause !== undefined && current.chars >= nextPause && pauseUntil === 0) {
          pauseUntil = now + 650;
          fraction = 0;
          return { chars: nextPause, paused: true };
        }

        if (pauseUntil > now) return current.paused ? current : { ...current, paused: true };

        if (pauseUntil !== 0) {
          pauseUntil = 0;
          pauseIndex += 1;
          burstUntil = now + 700;
          speed = 250;
        }

        speed = now < burstUntil ? 250 : Math.max(120, speed - 10);
        fraction += speed * elapsed;
        const wholeChars = Math.floor(fraction);
        fraction -= wholeChars;
        const boundary = pauseBoundaries[pauseIndex] ?? total;

        return {
          chars: Math.min(total, boundary, current.chars + wholeChars),
          paused: false,
        };
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, [activeDemo, pauseBoundaries, total]);

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

  const visibleRows = rows.filter((row) => row.text).slice(-3);
  const isFinished = stream.chars >= total;

  return (
    <div className="relative my-8 overflow-hidden rounded-[26px] border border-white/80 bg-white/72 p-5 shadow-[0_24px_60px_-38px_rgba(79,70,229,.85)] dark:border-white/[0.08] dark:bg-white/[0.045]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="absolute -bottom-16 left-1/4 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
      </div>

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,.9)]">
            <BrainCircuit className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-[#20263A] dark:text-white">ByteClash AI Studio</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-violet-500 dark:text-violet-300">Prompt → reason → polished quiz</p>
          </div>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em]", isFinished ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : stream.paused ? "bg-violet-500/10 text-violet-600 dark:text-violet-300" : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300")}>
          {isFinished ? "Ready" : stream.paused ? "Thinking" : "Building"}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeDemo}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.22 }}
          className="relative mt-4"
        >
          <div className="flex items-center gap-2 rounded-xl border border-violet-100/90 bg-violet-50/65 px-3.5 py-2.5 dark:border-violet-300/10 dark:bg-violet-500/[0.06]">
            <FileText className="h-3.5 w-3.5 shrink-0 text-violet-500" />
            <p className="truncate font-mono text-[10px] font-bold text-[#3E455A] dark:text-[#D5DBE7]">“{demo.prompt}”</p>
          </div>

          <div className="mt-3 min-h-[84px] overflow-hidden rounded-xl border border-emerald-200/70 bg-emerald-50/55 px-3.5 py-2.5 font-mono text-[9px] leading-5 dark:border-emerald-300/10 dark:bg-emerald-500/[0.045]">
            <AnimatePresence initial={false} mode="popLayout">
              {visibleRows.map((row) => {
                const isResult = row.index === rows.length - 1;
                const isReflection = /^(Hmm|Wait|Thinking)/.test(row.text);
                return (
                  <motion.p
                    layout
                    key={row.index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.13 }}
                    className={cn("h-5 truncate whitespace-nowrap", isResult && row.done ? "font-black text-emerald-700 dark:text-emerald-300" : isReflection ? "italic text-violet-600 dark:text-violet-300" : "text-[#667085] dark:text-[#98A2B3]")}
                  >
                    <span className={cn("mr-1", isReflection ? "text-violet-500" : "text-emerald-500")}>{isResult && row.done ? "✓" : isReflection ? "∿" : "›"}</span>
                    {row.text}
                    {(row.active || (stream.paused && row.index === visibleRows[visibleRows.length - 1]?.index)) && <span className="ml-0.5 inline-block h-2.5 w-[2px] animate-pulse bg-emerald-500 align-middle" />}
                  </motion.p>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {demo.output.map((item, index) => (
              <span key={item} className="inline-flex min-w-0 items-center justify-center gap-1 truncate rounded-lg border border-violet-200/60 bg-white/65 px-1.5 py-2 text-[8px] font-bold text-violet-700 dark:border-violet-300/10 dark:bg-white/[0.035] dark:text-violet-200">
                {index === 0 ? <WandSparkles className="h-2.5 w-2.5 shrink-0" /> : index === 1 ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> : <Layers3 className="h-2.5 w-2.5 shrink-0" />}
                <span className="truncate">{item}</span>
              </span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="relative mt-4 flex items-center gap-1.5">
        {REGISTER_AI_DEMOS.map((item, index) => (
          <span key={item.prompt} className={cn("h-1 rounded-full transition-all duration-300", index === activeDemo ? "w-7 bg-gradient-to-r from-violet-500 to-cyan-400" : "w-1.5 bg-violet-200 dark:bg-white/10")} />
        ))}
      </div>
    </div>
  );
}

export function AuthThemeControls({ fantasyDesktop = false }: { fantasyDesktop?: boolean }) {
  const { theme } = useTheme();
  const partyMode = theme === "light";

  return (
    <div className={cn(
      "fixed right-3 top-3 z-30 flex items-center gap-2 rounded-2xl border border-pink-200/80 bg-white/75 p-1.5 pl-3 shadow-[0_12px_34px_-22px_rgba(244,114,182,.7)] backdrop-blur-xl dark:border-violet-300/15 dark:bg-[#0D1222]/75 dark:shadow-[0_12px_36px_-22px_rgba(124,92,255,.8)] sm:right-5 sm:top-5",
      fantasyDesktop && "lg:border-amber-300/20 lg:bg-[#171315]/80 lg:shadow-[0_12px_34px_-18px_rgba(0,0,0,.7)] dark:lg:border-amber-300/20 dark:lg:bg-[#171315]/80"
    )}>
      <span className={cn("hidden items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] min-[420px]:inline-flex", partyMode ? "text-pink-600" : "text-violet-300", fantasyDesktop && "lg:hidden")}>
        {partyMode ? <IceCreamCone className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
        {partyMode ? "Party mode" : "Space mode"}
      </span>
      {fantasyDesktop && (
        <span className="hidden items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/80 lg:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5" /> Realm mode
        </span>
      )}
      <ThemeToggle className={cn(partyMode ? "border-pink-200 bg-pink-50" : "border-violet-300/15 bg-white/[0.04]", fantasyDesktop && "lg:border-amber-200/15 lg:bg-black/25")} />
    </div>
  );
}

export function AuthBrandMark({ className }: { className?: string }) {
  const { theme } = useTheme();
  const partyMode = theme === "light";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div className={cn("grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white", partyMode ? "from-pink-400 via-orange-400 to-amber-300 shadow-[0_12px_28px_-14px_rgba(244,114,182,.85)]" : "from-violet-500 via-indigo-500 to-blue-600 shadow-[0_12px_30px_-14px_rgba(124,92,255,.9)]")}>
        {partyMode ? <IceCreamCone className="h-5 w-5" /> : <Rocket className="h-5 w-5" />}
      </div>
      <span className="text-left leading-tight">
        <span className="block text-base font-extrabold tracking-tight text-text-primary">ByteClash</span>
        <span className={cn("mt-0.5 flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.16em]", partyMode ? "text-pink-500" : "text-violet-300/80")}>
          <Sparkles className="h-2.5 w-2.5" /> {partyMode ? "Quiz Party" : "Space Program"}
        </span>
      </span>
    </div>
  );
}

export function AuthBottomStrip({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-20 h-2 bg-[linear-gradient(90deg,#ff66a8_0_12.5%,#ffb82e_12.5%_25%,#37cce8_25%_37.5%,#7c6cff_37.5%_50%,#4dd59b_50%_62.5%,#ff66a8_62.5%_75%,#ffb82e_75%_87.5%,#37cce8_87.5%)] shadow-[0_-8px_28px_rgba(124,108,255,.12)] dark:bg-[linear-gradient(90deg,#7c3aed,#2563eb,#0891b2,#7c3aed)]",
        className
      )}
    />
  );
}

export function AuthShowcasePanel({ mode }: { mode: "login" | "register" }) {
  const { theme } = useTheme();
  const partyMode = theme === "light";

  return (
    <section className={cn(
      "relative hidden min-h-[620px] overflow-hidden rounded-[34px] border p-8 shadow-[0_34px_100px_-54px_rgba(91,69,196,.65)] backdrop-blur-xl dark:shadow-[0_34px_110px_-48px_rgba(49,33,120,.8)] lg:flex lg:flex-col lg:justify-between xl:p-10",
      mode === "login"
        ? "border-white/45 bg-white/28 dark:border-white/[0.11] dark:bg-[#080B16]/42"
        : "border-white/75 bg-white/55 dark:border-white/[0.09] dark:bg-[#0B1020]/70"
    )}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(99,102,241,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.7) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
      </div>

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 shadow-sm dark:border-violet-300/15 dark:bg-violet-500/10 dark:text-violet-200">
          <Sparkles className="h-3.5 w-3.5" /> AI quiz &amp; paper studio
        </span>
        <h2 className="mt-6 max-w-lg text-[40px] font-black leading-[1.02] tracking-[-0.045em] text-[#161B2A] dark:text-white xl:text-[48px]">
          {mode === "register" ? "Learn smarter. Create quizzes people love." : "Welcome back to your intelligent quiz workspace."}
        </h2>
      </div>

      {mode === "register" ? <RegisterAIShowcase /> : (
      <div className="relative my-8 rounded-[26px] border border-white/80 bg-white/70 p-4 shadow-[0_24px_60px_-38px_rgba(79,70,229,.7)] dark:border-white/[0.08] dark:bg-white/[0.045]">
        <div className="flex items-center gap-3">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,.9)]">
            <BrainCircuit className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[#20263A] dark:text-white">ByteClash AI Creation Studio</p>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">Ready</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[#687086] dark:text-[#8F9AAF]">Turn a topic or document into a polished quiz, mock test, or print-ready question paper.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Generate quiz", "Build paper", "Evaluate"].map((item, index) => (
            <span key={item} className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-200/70 bg-violet-50/75 px-2 py-2 text-[9px] font-bold text-violet-700 dark:border-violet-300/10 dark:bg-violet-500/[0.07] dark:text-violet-200">
              {index === 0 ? <WandSparkles className="h-3 w-3" /> : index === 1 ? <FileText className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{item}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.12em] text-violet-500/80 dark:text-violet-300/60">
          <span>Prompt</span><span>→</span><span>AI draft</span><span>→</span><span>Review</span><span>→</span><span>Publish</span>
        </div>
      </div>
      )}

      <div className="relative grid grid-cols-3 gap-3">
        {[
          { icon: WandSparkles, label: "AI quiz maker", detail: "review-ready" },
          { icon: Layers3, label: "Paper builder", detail: "print-ready" },
          { icon: ShieldCheck, label: "Secure exams", detail: "instant results" },
        ].map(({ icon: Icon, label, detail }) => (
          <div key={label} className="rounded-2xl border border-white/75 bg-white/55 p-3 text-center dark:border-white/[0.07] dark:bg-white/[0.035]">
            <Icon className={cn("mx-auto h-4 w-4", partyMode ? "text-pink-500" : "text-violet-300")} />
            <p className="mt-2 text-[10px] font-black text-[#30374B] dark:text-white">{label}</p>
            <p className="mt-0.5 text-[9px] text-[#8991A3] dark:text-[#687386]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
