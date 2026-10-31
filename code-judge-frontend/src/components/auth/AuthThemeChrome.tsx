"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, CheckCircle2, FileText, KeyRound, Layers3, LoaderCircle, Mail, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
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
      "Hmm… the first draft overemphasizes recall.",
      "Adding one decomposition-based scenario…",
      "Writing believable distractors from common errors…",
      "Wait… two questions assess the same learning objective.",
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
      "Thinking… will this reveal practical understanding?",
      "Turning definitions into application questions…",
      "Balancing speed with conceptual depth…",
      "Wait… one distractor makes the answer too obvious.",
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
      "Hmm… the difficulty progression is too abrupt.",
      "Adding a cleaner warm-up question…",
      "Creating distractors from debugging mistakes…",
      "Wait… one edge case depends on strict-mode semantics.",
      "Rewriting it for consistent browser behavior…",
      "Polishing explanations and final flow…",
    ],
  },
];

type AIShowcaseLine = {
  id: string;
  text: string;
  kind: "build" | "thought";
};

function RegisterAIShowcase() {
  const [activeDemo, setActiveDemo] = useState(0);
  const [phase, setPhase] = useState<"typing" | "thinking" | "building" | "complete">("typing");
  const [typedWords, setTypedWords] = useState(0);
  const [history, setHistory] = useState<AIShowcaseLine[]>([]);
  const [liveLine, setLiveLine] = useState<AIShowcaseLine | null>(null);
  const demo = REGISTER_AI_DEMOS[activeDemo];
  const promptWords = demo.prompt.split(/\s+/);

  useEffect(() => {
    const words = demo.prompt.split(/\s+/);
    let cancelled = false;
    let lineSequence = 0;
    const timers = new Set<number>();
    const createLine = (text: string, kind: AIShowcaseLine["kind"]): AIShowcaseLine => ({
      id: `demo-${activeDemo}-line-${lineSequence++}`,
      text,
      kind,
    });
    const wait = (milliseconds: number) => new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, milliseconds);
      timers.add(timer);
    });

    const typeLine = async (text: string, kind: "build" | "thought") => {
      let cursor = 0;
      const line = createLine("", kind);
      setLiveLine(line);
      while (!cancelled && cursor < text.length) {
        const chunkSize = kind === "thought" ? 2 : 3 + (cursor % 2);
        cursor = Math.min(text.length, cursor + chunkSize);
        setLiveLine({ ...line, text: text.slice(0, cursor) });
        await wait(kind === "thought" ? 38 : 24);
      }
      if (cancelled) return;
      setHistory((current) => [...current, { ...line, text }].slice(-6));
      setLiveLine(null);
    };

    const runDemo = async () => {
      setPhase("typing");
      setTypedWords(0);
      setHistory([]);
      setLiveLine(null);

      await wait(350);
      for (let index = 0; index < words.length && !cancelled; index += 1) {
        setTypedWords(index + 1);
        // 105–189ms per word: a natural-looking 5–10 token/second prompt.
        await wait(105 + ((index * 37 + activeDemo * 19) % 85));
      }
      if (cancelled) return;

      await wait(450);
      setPhase("thinking");
      setHistory([createLine("Hmm… I should map the topic before selecting questions.", "thought")]);
      await wait(1_350);
      const memoryThought = createLine("Wait… this should measure understanding, not simple recall.", "thought");
      setHistory((current) => [...current, memoryThought]);
      await wait(1_450);

      for (const step of demo.steps) {
        if (cancelled) return;
        const isReflection = /^(Hmm|Wait|Thinking)/.test(step);
        if (isReflection) {
          setPhase("thinking");
          // Thinking arrives as a complete reflection, then the output holds
          // still. Only the building phase uses the fast character stream.
          const reflection = createLine(step, "thought");
          setHistory((current) => [...current, reflection].slice(-6));
          await wait(1_700);
        } else {
          setPhase("building");
          await typeLine(step, "build");
          await wait(150);
        }
      }
      if (cancelled) return;

      setPhase("thinking");
      const finalThought = createLine("One final check for accuracy, clarity, and ambiguity.", "thought");
      setHistory((current) => [...current, finalThought].slice(-6));
      await wait(1_500);
      if (cancelled) return;
      setPhase("complete");
      await wait(2_700);
      if (!cancelled) setActiveDemo((index) => (index + 1) % REGISTER_AI_DEMOS.length);
    };

    void runDemo();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeDemo, demo]);

  const typedPrompt = promptWords.slice(0, typedWords).join(" ");
  const visibleRows = [
    ...history.slice(-2).map((line) => ({ ...line, isLive: false })),
    ...(liveLine && !history.some((line) => line.id === liveLine.id) ? [{ ...liveLine, isLive: true }] : []),
  ];
  const completedBuildSteps = history.filter((line) => line.kind === "build").length;
  const phaseLabel = phase === "typing" ? "Writing prompt" : phase === "thinking" ? "Thinking" : phase === "building" ? "Building" : "Quiz ready";

  return (
    <div className="relative my-8 overflow-hidden rounded-[26px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-5">
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            <BrainCircuit className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-ok)]" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-[var(--qs-ink)]">QuizSupport AI Studio</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.13em] text-[var(--qs-brand)]">Prompt → reason → polished quiz</p>
          </div>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em]", phase === "complete" ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]" : "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]")}>
          {phase !== "complete" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
          {phaseLabel}
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
          <div className="flex items-center gap-2 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5">
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
            <p className="min-h-4 truncate font-mono text-[10px] font-bold text-[var(--qs-ink)]">
              {typedPrompt ? `“${typedPrompt}${phase === "typing" ? "" : "”"}` : <span className="font-normal text-[var(--qs-muted)]">Write what you want to teach…</span>}
              {phase === "typing" && <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-[var(--qs-brand)] align-middle" />}
            </p>
          </div>

          <div className="relative mt-3 h-[96px] overflow-hidden rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-2.5 font-mono text-[9px] leading-5">
            <AnimatePresence mode="wait" initial={false}>
              {phase === "complete" ? (
                <motion.div key="complete" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black text-[var(--qs-ok)]">Your quiz has been created</span>
                    <span className="mt-0.5 block truncate text-[9px] text-[var(--qs-muted)]">{demo.result} · ready to review</span>
                  </span>
                </motion.div>
              ) : (
                <motion.div key="stream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col justify-center">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visibleRows.map((row) => (
                      <motion.p
                        layout
                        key={row.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.13 }}
                        className={cn("h-5 truncate whitespace-nowrap", row.kind === "thought" ? "italic text-[var(--qs-brand)]" : "text-[var(--qs-muted)]")}
                      >
                        <span className={cn("mr-1", row.kind === "thought" ? "text-[var(--qs-brand)]" : "text-[var(--qs-ok)]")}>{row.kind === "thought" ? "∿" : "›"}</span>
                        {row.text}
                        {row.isLive && <span className="ml-0.5 inline-block h-2.5 w-[2px] animate-pulse bg-[var(--qs-brand)] align-middle" />}
                      </motion.p>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {demo.output.map((item, index) => (
              <motion.span animate={{ opacity: phase === "complete" || completedBuildSteps > index * 2 ? 1 : 0.45 }} key={item} className={cn("inline-flex min-w-0 items-center justify-center gap-1 truncate rounded-lg border-2 px-1.5 py-2 text-[8px] font-bold transition-colors", phase === "complete" ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)] text-[var(--qs-ok)]" : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)]")}>
                {phase === "complete" ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> : index === 0 ? <WandSparkles className="h-2.5 w-2.5 shrink-0" /> : index === 1 ? <CheckCircle2 className="h-2.5 w-2.5 shrink-0" /> : <Layers3 className="h-2.5 w-2.5 shrink-0" />}
                <span className="truncate">{item}</span>
              </motion.span>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="relative mt-4 flex items-center gap-1.5">
        {REGISTER_AI_DEMOS.map((item, index) => (
          <span key={item.prompt} className={cn("h-1 rounded-full transition-all duration-300", index === activeDemo ? "w-7 bg-[var(--qs-brand)]" : "w-1.5 bg-[var(--qs-line)]")} />
        ))}
      </div>
    </div>
  );
}

export function ResetSecurityShowcase() {
  const steps = [
    { icon: Mail, title: "Email check", detail: "We confirm your account email" },
    { icon: KeyRound, title: "One-time code", detail: "6 digits, valid for 10 minutes" },
    { icon: ShieldCheck, title: "New password", detail: "Set it and sign in instantly" },
  ];

  return (
    <section className="relative hidden min-h-[580px] overflow-hidden rounded-[30px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-7 lg:flex lg:flex-col lg:justify-between xl:p-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(var(--qs-line) 1px, transparent 1px), linear-gradient(90deg, var(--qs-line) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--qs-brand)]">
          <ShieldCheck className="h-3 w-3" /> Secure account recovery
        </span>
        <h2 className="mt-5 max-w-lg text-[34px] font-black leading-[1.03] tracking-[-0.04em] text-[var(--qs-ink)] xl:text-[38px]">
          Back to your workspace, safely.
        </h2>
        <p className="mt-3 max-w-md text-[13px] leading-5 text-[var(--qs-muted)]">
          A one-time code confirms it&apos;s you. Your password never travels by email.
        </p>
      </div>

      <div className="relative my-4 rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            <ShieldCheck className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-ok)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-[var(--qs-ink)]">Account recovery</p>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--qs-muted)]">
              Three quick checks, then you&apos;re back in.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          {steps.map(({ icon: Icon, title, detail }, index) => (
            <div
              key={title}
              className="flex items-center gap-2.5 rounded-lg border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--qs-bg)] text-[var(--qs-brand)]">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9.5px] font-black text-[var(--qs-ink)]">{title}</p>
                <p className="mt-0.5 text-[8.5px] text-[var(--qs-muted)]">{detail}</p>
              </div>
              <span className="shrink-0 text-[7.5px] font-black uppercase tracking-[0.12em] text-[var(--qs-ok)]">
                {index === 0 ? "Verified" : index === 1 ? "Protected" : "Ready"}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-[8.5px] font-semibold text-[var(--qs-muted)]">
          <ShieldCheck className="h-2.5 w-2.5 text-[var(--qs-ok)]" /> Protected by one-time verification
        </p>
      </div>

      <div className="relative grid grid-cols-3 gap-2">
        {[
          { icon: ShieldCheck, label: "OTP protected", detail: "one-time code" },
          { icon: KeyRound, label: "Encrypted", detail: "hashed password" },
          { icon: Mail, label: "No app needed", detail: "email only" },
        ].map(({ icon: Icon, label, detail }) => (
          <div
            key={label}
            className="rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-2 text-center"
          >
            <Icon className="mx-auto h-3.5 w-3.5 text-[var(--qs-brand)]" />
            <p className="mt-1.5 text-[9px] font-black text-[var(--qs-ink)]">{label}</p>
            <p className="mt-0.5 text-[8px] text-[var(--qs-muted)]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AuthThemeControls() {
  return (
    <div className="fixed right-3 top-3 z-30 sm:right-5 sm:top-5">
      <ThemeToggle
        variant="icon"
        className="h-10 w-10 rounded-xl border-2 border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:h-[42px] sm:w-[42px]"
      />
    </div>
  );
}

export function AuthBrandMark({ className }: { className?: string }) {
  const { theme } = useTheme();
  return (
    <div className={cn("inline-flex justify-center", className)}>
      <img
        src={theme === "dark" ? "/logos/dark_name.png" : "/logos/name.png"}
        alt="QuizSupport"
        height={48}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ height: 48, width: "auto" }}
        className="shrink-0 object-contain"
      />
    </div>
  );
}

export function AuthShowcasePanel({ mode }: { mode: "login" | "register" }) {
  return (
    <section className="relative hidden min-h-[620px] overflow-hidden rounded-[34px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-8 lg:flex lg:flex-col lg:justify-between xl:p-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(var(--qs-line) 1px, transparent 1px), linear-gradient(90deg, var(--qs-line) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--qs-brand)]">
          <Sparkles className="h-3.5 w-3.5" /> AI quiz &amp; paper studio
        </span>
        <h2 className="mt-6 max-w-lg text-[40px] font-black leading-[1.02] tracking-[-0.045em] text-[var(--qs-ink)] xl:text-[48px]">
          {mode === "register" ? "Learn smarter. Create quizzes people love." : "Welcome back to your intelligent quiz workspace."}
        </h2>
      </div>

      {mode === "register" ? <RegisterAIShowcase /> : (
      <div className="relative my-8 rounded-[26px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-4">
        <div className="flex items-center gap-3">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
            <BrainCircuit className="h-6 w-6" />
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-[var(--qs-surface)] bg-[var(--qs-ok)]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black text-[var(--qs-ink)]">QuizSupport AI Creation Studio</p>
              <span className="rounded-full border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[var(--qs-ok)]">Ready</span>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-[var(--qs-muted)]">Turn a topic or document into a polished quiz, mock test, or print-ready question paper.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Generate quiz", "Build paper", "Evaluate"].map((item, index) => (
            <span key={item} className="inline-flex items-center justify-center gap-1 rounded-xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 py-2 text-[9px] font-bold text-[var(--qs-ink)]">
              {index === 0 ? <WandSparkles className="h-3 w-3" /> : index === 1 ? <FileText className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{item}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-2 text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
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
          <div key={label} className="rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-center">
            <Icon className="mx-auto h-4 w-4 text-[var(--qs-brand)]" />
            <p className="mt-2 text-[10px] font-black text-[var(--qs-ink)]">{label}</p>
            <p className="mt-0.5 text-[9px] text-[var(--qs-muted)]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
