"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, Binary, Boxes, BrainCircuit, Braces, BriefcaseBusiness,
  Code2, Cpu, Database, FileSearch, GitBranch, GraduationCap, Layers3, Mail,
  MapPin, Moon, Network, Server, ShieldCheck, Sparkles, Sun, Terminal, Trophy,
  Workflow, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import AIWorkflowShowcase from "./AIWorkflowShowcase";
import styles from "./DeveloperPortfolio.module.css";

const stack: Array<{ name: string; icon: LucideIcon; color: string }> = [
  { name: "TypeScript", icon: Braces, color: "#60A5FA" },
  { name: "Node.js", icon: Server, color: "#34D399" },
  { name: "Next.js", icon: Layers3, color: "#A78BFA" },
  { name: "PostgreSQL", icon: Database, color: "#38BDF8" },
  { name: "Redis", icon: Zap, color: "#FB7185" },
  { name: "Docker", icon: Boxes, color: "#22D3EE" },
  { name: "BullMQ", icon: Workflow, color: "#FBBF24" },
  { name: "Java", icon: Cpu, color: "#F97316" },
  { name: "Spring Boot", icon: GitBranch, color: "#4ADE80" },
  { name: "Python", icon: Terminal, color: "#FACC15" },
  { name: "FastAPI", icon: Network, color: "#2DD4BF" },
  { name: "C++", icon: Binary, color: "#818CF8" },
  { name: "LangChain", icon: GitBranch, color: "#C084FC" },
  { name: "LangGraph", icon: Network, color: "#F472B6" },
  { name: "RAG Pipelines", icon: FileSearch, color: "#22D3EE" },
];

const disciplines: Array<{ icon: LucideIcon; title: string; copy: string; color: string }> = [
  { icon: BrainCircuit, title: "AI product engineering", copy: "LLM workflows, grounded retrieval, evaluation loops, and AI experiences designed around real users.", color: "#A78BFA" },
  { icon: Server, title: "Backend development", copy: "Reliable APIs, concurrency control, background queues, caching, and production-minded services.", color: "#38BDF8" },
  { icon: Database, title: "Scalable systems", copy: "PostgreSQL data modelling, Redis-backed workflows, observability, and resilient infrastructure.", color: "#2DD4BF" },
  { icon: Trophy, title: "ICPC problem solving", copy: "Contest-tested algorithms, disciplined reasoning, and the habit of finding the cleanest path under pressure.", color: "#F59E0B" },
];

const aiProducts: Array<{ icon: LucideIcon; eyebrow: string; title: string; copy: string; accent: string }> = [
  { icon: Sparkles, eyebrow: "AI PRODUCT", title: "ByteClash AI Studio", copy: "Turns a topic or source document into a structured, editable assessment workflow—without hiding control from the educator.", accent: "#A78BFA" },
  { icon: Network, eyebrow: "INTELLIGENCE LAYER", title: "Grounded RAG systems", copy: "Retrieval, context assembly, and traceable generation pipelines that keep answers connected to the right knowledge.", accent: "#22D3EE" },
  { icon: Workflow, eyebrow: "ORCHESTRATION", title: "Agentic workflows", copy: "Purpose-built graphs for reasoning, tool use, validation, and human review—engineered as product infrastructure.", accent: "#F472B6" },
];

const neuralNodes = [
  { x: 60, y: 120 }, { x: 205, y: 70 }, { x: 350, y: 175 }, { x: 515, y: 95 },
  { x: 690, y: 205 }, { x: 865, y: 85 }, { x: 1030, y: 170 }, { x: 1245, y: 75 },
  { x: 1365, y: 235 }, { x: 150, y: 360 }, { x: 410, y: 410 }, { x: 590, y: 330 },
  { x: 790, y: 450 }, { x: 975, y: 350 }, { x: 1190, y: 445 }, { x: 1380, y: 380 },
  { x: 80, y: 675 }, { x: 275, y: 595 }, { x: 520, y: 705 }, { x: 710, y: 620 },
  { x: 940, y: 690 }, { x: 1130, y: 605 }, { x: 1340, y: 715 },
];

const neuralEdges = [
  [0, 1], [0, 9], [1, 2], [1, 9], [2, 3], [2, 10], [3, 4], [3, 11],
  [4, 5], [4, 11], [4, 12], [5, 6], [5, 13], [6, 7], [6, 13], [7, 8],
  [7, 14], [8, 15], [9, 10], [9, 16], [9, 17], [10, 11], [10, 17], [10, 18],
  [11, 12], [11, 18], [12, 13], [12, 19], [12, 20], [13, 14], [13, 20],
  [14, 15], [14, 21], [15, 22], [16, 17], [17, 18], [18, 19], [19, 20],
  [20, 21], [21, 22], [2, 11], [6, 14], [10, 12], [13, 21],
] as const;

const denseNeuralNodes = [
  { x: 115, y: 235 }, { x: 285, y: 145 }, { x: 455, y: 255 }, { x: 625, y: 155 },
  { x: 795, y: 270 }, { x: 970, y: 145 }, { x: 1135, y: 255 }, { x: 1305, y: 155 },
  { x: 55, y: 500 }, { x: 225, y: 450 }, { x: 390, y: 535 }, { x: 555, y: 465 },
  { x: 720, y: 545 }, { x: 885, y: 470 }, { x: 1050, y: 540 }, { x: 1215, y: 465 },
  { x: 1385, y: 545 }, { x: 145, y: 755 }, { x: 325, y: 655 }, { x: 485, y: 775 },
  { x: 650, y: 675 }, { x: 820, y: 770 }, { x: 990, y: 660 }, { x: 1160, y: 760 },
  { x: 1325, y: 665 },
];

const denseNeuralEdges = [
  [0, 1], [0, 8], [0, 9], [1, 2], [1, 9], [2, 3], [2, 10], [2, 11],
  [3, 4], [3, 11], [4, 5], [4, 12], [4, 13], [5, 6], [5, 13], [6, 7],
  [6, 14], [6, 15], [7, 15], [7, 16], [8, 9], [8, 17], [9, 10], [9, 17],
  [9, 18], [10, 11], [10, 18], [10, 19], [11, 12], [11, 19], [11, 20],
  [12, 13], [12, 20], [12, 21], [13, 14], [13, 21], [13, 22], [14, 15],
  [14, 22], [14, 23], [15, 16], [15, 23], [16, 24], [17, 18], [18, 19],
  [19, 20], [20, 21], [21, 22], [22, 23], [23, 24], [1, 10], [3, 12],
  [5, 14], [9, 19], [11, 21], [13, 23],
] as const;

function GitHubMark({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor"><path d="M12 .7A11.3 11.3 0 0 0 8.43 22.72c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.51-.29-5.15-1.26-5.15-5.59 0-1.24.44-2.25 1.16-3.04-.12-.29-.5-1.44.11-3 0 0 .95-.31 3.11 1.16A10.8 10.8 0 0 1 12 6.14c.96 0 1.91.13 2.81.38 2.16-1.47 3.11-1.16 3.11-1.16.62 1.56.23 2.71.12 3 .72.79 1.16 1.8 1.16 3.04 0 4.34-2.65 5.3-5.17 5.58.41.35.77 1.04.77 2.1v3.1c0 .3.2.65.78.54A11.3 11.3 0 0 0 12 .7Z" /></svg>;
}

function LinkedInMark({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor"><path d="M5.34 3.5A2.34 2.34 0 1 1 .66 3.5a2.34 2.34 0 0 1 4.68 0ZM.9 7.2h4.87V22H.9V7.2Zm7.89 0h4.67v2.02h.07c.65-1.23 2.24-2.53 4.61-2.53 4.93 0 5.84 3.25 5.84 7.47V22h-4.86v-6.95c0-1.66-.03-3.79-2.31-3.79-2.32 0-2.67 1.81-2.67 3.67V22H8.79V7.2Z" /></svg>;
}

function Reveal({ children, className = "", delay = 0, enabled }: { children: React.ReactNode; className?: string; delay?: number; enabled: boolean }) {
  return (
    <motion.div className={className} initial={enabled ? { opacity: 0, y: 28 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function CountUpStat({ target, suffix = "", duration = 1400 }: { target: number; suffix?: string; duration?: number }) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(numberRef, { once: true, amount: 0.8 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let animationFrame = 0;
    const startedAt = performance.now();
    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) animationFrame = window.requestAnimationFrame(update);
    };
    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, isInView, target]);

  return <span ref={numberRef}>{value}K{suffix}</span>;
}

function NeuralNetworkBackground({ animated }: { animated: boolean }) {
  const pulseEdges = [1, 5, 11, 20, 28, 34, 40];
  const densePulseEdges = [2, 7, 12, 17, 23, 29, 34, 39, 43, 47, 51, 55];
  const { scrollYProgress } = useScroll();
  const denseOpacity = useTransform(scrollYProgress, [0, 0.18, 0.52, 1], [0.04, 0.18, 0.48, 0.82]);
  return (
    <div className={`${styles.desktopEffects} ${styles.neuralFade} pointer-events-none fixed inset-0 hidden overflow-hidden lg:block`} aria-hidden="true">
      <svg className="h-full w-full" viewBox="0 0 1440 820" preserveAspectRatio="xMidYMid slice">
        <defs><filter id="developer-neural-glow" x="-200%" y="-200%" width="400%" height="400%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {neuralEdges.map(([from, to], index) => {
          const start = neuralNodes[from]; const end = neuralNodes[to];
          return <motion.line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.networkLine} strokeWidth="1" initial={false} animate={animated ? { opacity: [0.2, 0.76, 0.2] } : { opacity: 0.34 }} transition={animated ? { duration: 4.8 + (index % 5), delay: index * 0.055, repeat: Infinity, ease: "easeInOut" } : undefined} />;
        })}
        {neuralNodes.map((node, index) => (
          <g key={`${node.x}-${node.y}`}>
            <motion.circle cx={node.x} cy={node.y} r={10} className={styles.networkHalo} initial={false} animate={animated ? { r: [8, 15, 8], opacity: [0.18, 0.48, 0.18] } : { opacity: 0.2 }} transition={animated ? { duration: 3.2 + (index % 4), delay: index * 0.11, repeat: Infinity } : undefined} />
            <circle cx={node.x} cy={node.y} r="2.8" className={styles.networkNode} />
          </g>
        ))}
        {pulseEdges.map((edgeIndex, index) => {
          const [from, to] = neuralEdges[edgeIndex]; const start = neuralNodes[from]; const end = neuralNodes[to];
          return <motion.circle key={`pulse-${edgeIndex}`} r="3.2" fill={index % 2 ? "#22D3EE" : "#A78BFA"} filter="url(#developer-neural-glow)" initial={{ cx: start.x, cy: start.y, opacity: 0 }} animate={animated ? { cx: [start.x, end.x], cy: [start.y, end.y], opacity: [0, 0.9, 0] } : { opacity: 0 }} transition={animated ? { duration: 2.8 + index * 0.42, delay: index * 0.7, repeat: Infinity, ease: "linear" } : undefined} />;
        })}
        <motion.g data-neural-density="scroll-progressive" style={{ opacity: denseOpacity }}>
          {denseNeuralEdges.map(([from, to]) => {
            const start = denseNeuralNodes[from]; const end = denseNeuralNodes[to];
            return <line key={`dense-${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={styles.networkLine} strokeWidth="0.8" />;
          })}
          {denseNeuralNodes.map((node, index) => (
            <g key={`dense-node-${node.x}-${node.y}`}>
              <motion.circle cx={node.x} cy={node.y} r="7" className={styles.networkHalo} initial={{ opacity: animated ? 0.1 : 0.18 }} animate={animated ? { opacity: [0.1, 0.34, 0.1] } : { opacity: 0.18 }} transition={animated ? { duration: 3.4 + (index % 5) * 0.45, delay: index * 0.07, repeat: Infinity } : { duration: 0 }} />
              <circle cx={node.x} cy={node.y} r="2" className={styles.networkNode} />
            </g>
          ))}
          {densePulseEdges.map((edgeIndex, index) => {
            const [from, to] = denseNeuralEdges[edgeIndex]; const start = denseNeuralNodes[from]; const end = denseNeuralNodes[to];
            return <motion.circle key={`dense-pulse-${edgeIndex}`} r="2.4" fill={index % 3 === 0 ? "#34D399" : index % 2 ? "#22D3EE" : "#A78BFA"} filter="url(#developer-neural-glow)" initial={{ cx: start.x, cy: start.y, opacity: 0 }} animate={animated ? { cx: [start.x, end.x], cy: [start.y, end.y], opacity: [0, 1, 0] } : { opacity: 0 }} transition={animated ? { duration: 2.1 + (index % 4) * 0.5, delay: index * 0.38, repeat: Infinity, ease: "linear" } : undefined} />;
          })}
        </motion.g>
      </svg>
    </div>
  );
}

export default function DeveloperPortfolio() {
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const reducedMotion = useReducedMotion();
  const { theme, setTheme, toggleTheme } = useTheme();
  const prevThemeRef = useRef<string | null>(null);
  const didForceDarkRef = useRef(false);
  const userToggledRef = useRef(false);
  const setThemeRef = useRef(setTheme);

  useEffect(() => {
    setThemeRef.current = setTheme;
  });

  // This page defaults to dark. Force dark on entry (remembering the previous
  // global theme) and restore it on leave unless the user explicitly toggled.
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") ?? theme;
    if (current !== "dark") {
      prevThemeRef.current = current;
      didForceDarkRef.current = true;
      setThemeRef.current("dark");
    }
    return () => {
      if (didForceDarkRef.current && !userToggledRef.current && prevThemeRef.current === "light") {
        setThemeRef.current("light");
      }
    };
    // Run once on mount — intentional page-level default, not reactive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleTheme = () => {
    userToggledRef.current = true;
    toggleTheme();
  };
  const animated = !isCompact && !reducedMotion;
  const pointerX = useMotionValue(50); const pointerY = useMotionValue(28);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 24 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 24 });
  const glow = theme === "dark" ? "rgba(139,124,255,.14)" : "rgba(112,86,225,.11)";
  const spotlight = useMotionTemplate`radial-gradient(580px circle at ${smoothX}% ${smoothY}%, ${glow}, transparent 68%)`;

  return (
    <div onMouseMove={animated ? (event) => { pointerX.set((event.clientX / window.innerWidth) * 100); pointerY.set((event.clientY / window.innerHeight) * 100); } : undefined} className={`${styles.page} relative min-h-dvh overflow-x-hidden bg-[var(--dev-bg)] text-[var(--dev-text)] selection:bg-violet-500/30`}>
      <div className={`${styles.desktopEffects} pointer-events-none fixed inset-0 hidden lg:block`} aria-hidden="true">
        <motion.div className="absolute inset-0" style={{ background: spotlight }} />
        <div className={`${styles.grid} absolute inset-0`} />
        <div className="absolute left-[12%] top-[8%] h-72 w-72 rounded-full bg-violet-500/[0.055] blur-[90px]" />
        <div className="absolute bottom-[10%] right-[8%] h-80 w-80 rounded-full bg-cyan-400/[0.05] blur-[100px]" />
      </div>
      <NeuralNetworkBackground animated={animated} />

      <header className="sticky top-0 z-30 border-b border-[var(--dev-border)] bg-[var(--dev-header)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Link href="/quiz" className="inline-flex items-center gap-2.5 text-sm font-black tracking-tight text-[var(--dev-text)]">
            <span className={`${styles.forceWhite} grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 shadow-[0_8px_24px_-10px_rgba(124,92,255,.9)]`}><Code2 className="h-4 w-4" /></span>ByteClash
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/about" className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-[var(--dev-muted)] transition-colors hover:text-[var(--dev-text)] sm:inline-flex">About ByteClash</Link>
            <button type="button" onClick={handleToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--dev-border)] bg-[var(--dev-surface)] text-[var(--dev-muted)] transition-colors hover:text-[var(--dev-text)]">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <Link href="/quiz" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--dev-border)] bg-[var(--dev-surface)] px-3 py-2 text-xs font-semibold text-[var(--dev-muted)] transition-colors hover:border-violet-400/40 hover:text-[var(--dev-text)]"><ArrowLeft className="h-3.5 w-3.5" /> Platform</Link>
          </div>
        </div>
      </header>

      <main>

      <section className="relative z-10 mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1240px] items-center gap-12 px-5 py-14 sm:px-8 lg:py-20 min-[1180px]:grid-cols-[1.08fr_.92fr] min-[1180px]:gap-16">
        <div>
          <motion.div initial={animated ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-emerald-600 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.85)]" /> Meet the developer</motion.div>
          <motion.p initial={animated ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.06 }} className="mt-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-violet-600 dark:text-violet-300"><Cpu className="h-3.5 w-3.5" /> AI products · systems · problem solving</motion.p>
          <motion.h1 initial={animated ? { opacity: 0, y: 22 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="mt-4 max-w-3xl text-[42px] font-black leading-[.95] tracking-[-0.055em] text-[var(--dev-text)] sm:text-6xl lg:text-[78px]">Sadanand<span className="block bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">Jha.</span></motion.h1>
          <motion.p initial={animated ? { opacity: 0, y: 20 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.17 }} className="mt-6 max-w-2xl text-base leading-7 text-[var(--dev-muted)] sm:text-lg sm:leading-8">Software developer turning ambitious ideas into intelligent products—combining AI workflows, contest-grade problem solving, and backend systems built to survive the real world.</motion.p>
          <motion.div initial={animated ? { opacity: 0, y: 18 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }} className="mt-7 flex flex-wrap items-center gap-3">
            <a href="mailto:sadanand.jha3340@gmail.com" className={`${styles.forceWhite} inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-bold shadow-[0_16px_36px_-18px_rgba(109,82,235,.85)] transition-transform hover:-translate-y-0.5`}><Mail className="h-4 w-4" /> Let&apos;s connect</a>
            <a href="https://github.com/Sadanand-Jha" target="_blank" rel="noreferrer" aria-label="GitHub" className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--dev-border)] bg-[var(--dev-surface)] text-[var(--dev-muted)] transition-colors hover:border-violet-400/45 hover:text-[var(--dev-text)]"><GitHubMark className="h-[18px] w-[18px]" /></a>
            <a href="https://www.linkedin.com/in/sadanand-jha/" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--dev-border)] bg-[var(--dev-surface)] text-[var(--dev-muted)] transition-colors hover:border-cyan-400/45 hover:text-[var(--dev-text)]"><LinkedInMark className="h-[18px] w-[18px]" /></a>
          </motion.div>
          <motion.div initial={animated ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.34 }} className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[var(--dev-subtle)]"><span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-violet-500" /> Delhi, India</span><span className="inline-flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-500" /> ICPC Regionalist</span><span className="inline-flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5 text-cyan-500" /> Computer Science</span></motion.div>
        </div>

        <motion.div initial={animated ? { opacity: 0, x: 44 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto w-full max-w-[470px] lg:w-[760px] lg:max-w-[calc(100vw-64px)] min-[1180px]:-ml-[4vw] min-[1180px]:w-[48vw] min-[1180px]:max-w-none 2xl:-ml-24 2xl:-mr-20 2xl:w-[760px]">
          <div className={`${styles.desktopEffects} absolute inset-[10%] hidden rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/[0.05] to-cyan-400/15 blur-3xl lg:block`} aria-hidden="true" />
          <div className={`${styles.heroMedia} relative mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-[28px] border p-2 lg:aspect-[1586/992] lg:max-w-none lg:overflow-visible lg:rounded-none lg:border-0 lg:p-0`}>
            <picture className="absolute inset-2 block overflow-hidden rounded-[21px] lg:inset-0 lg:overflow-visible lg:rounded-none">
              <source media="(min-width: 1024px)" type="image/webp" srcSet="/me/developer-ai-hero-v3.webp" />
              <source media="(min-width: 1024px)" srcSet="/me/developer-ai-hero-v3.png" />
              <img src="/me/sadanand-mysuru.jpg" alt="Sadanand Jha, developer of ByteClash" className="h-full w-full object-cover object-[50%_40%] lg:object-contain lg:object-center" />
            </picture>
            <div className="absolute inset-x-2 bottom-2 h-1/3 rounded-b-[21px] bg-gradient-to-t from-[#080B14]/90 to-transparent lg:hidden" />
            <div className="absolute bottom-5 left-5 lg:hidden"><p className={`${styles.forceWhite} text-[9px] font-black uppercase tracking-[.18em] opacity-70`}>Developer of</p><p className={`${styles.forceWhite} mt-1 text-xl font-black`}>ByteClash</p></div>
          </div>
          <div className={`${styles.desktopEffects} ${styles.strongSurface} absolute left-[14%] top-[14%] z-20 hidden rounded-2xl border p-3 backdrop-blur-xl lg:block`}><Terminal className="h-4 w-4 text-violet-500" /><p className="mt-2 font-mono text-[9px] text-[var(--dev-subtle)]">ai / systems / product</p></div>
          <div className={`${styles.desktopEffects} ${styles.strongSurface} absolute bottom-[12%] left-[2%] z-20 hidden rounded-2xl border px-3 py-2.5 backdrop-blur-xl lg:block`}><p className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-500">Neural pipeline</p><p className="mt-1 text-xs font-semibold text-[var(--dev-muted)]">Reason → verify → ship</p></div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1240px] px-5 pb-20 sm:px-8 lg:pb-28">
        <Reveal enabled={animated} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {disciplines.map(({ icon: Icon, title, copy, color }) => <article key={title} className={`${styles.surface} rounded-[24px] border p-5 backdrop-blur-sm sm:p-6`}><div className="grid h-10 w-10 place-items-center rounded-xl" style={{ color, backgroundColor: `${color}14`, border: `1px solid ${color}26` }}><Icon className="h-[18px] w-[18px]" /></div><h2 className="mt-5 text-base font-bold tracking-tight text-[var(--dev-text)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--dev-muted)]">{copy}</p></article>)}
        </Reveal>

        <Reveal enabled={animated} className="mt-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-violet-600 dark:text-violet-300"><Binary className="h-3.5 w-3.5" /> Intelligence, built into the product</p><h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.045em] sm:text-5xl">AI that does useful work.</h2></div><p className="max-w-sm text-sm leading-6 text-[var(--dev-muted)]">Not an AI badge on top—reasoning, retrieval, evaluation, and control designed into the workflow.</p></div>
          <div className="mt-8 grid gap-3 lg:grid-cols-3">{aiProducts.map(({ icon: Icon, eyebrow, title, copy, accent }, index) => <motion.article key={title} whileHover={animated ? { y: -5 } : undefined} transition={{ duration: 0.25 }} className={`${styles.metricGlow} relative overflow-hidden rounded-[26px] border border-[var(--dev-border)] p-5 backdrop-blur-sm sm:p-6`}><div className="absolute right-4 top-4 font-mono text-[10px] font-bold text-[var(--dev-subtle)]">0{index + 1}</div><div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ color: accent, backgroundColor: `${accent}13`, border: `1px solid ${accent}26` }}><Icon className="h-5 w-5" /></div><p className="mt-6 text-[9px] font-black tracking-[.2em]" style={{ color: accent }}>{eyebrow}</p><h3 className="mt-2 text-xl font-black tracking-[-0.025em] text-[var(--dev-text)]">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--dev-muted)]">{copy}</p></motion.article>)}</div>
        </Reveal>

        <div className={styles.desktopWorkflow}>
          <AIWorkflowShowcase animated={animated} />
        </div>

        <Reveal enabled={animated} className={`${styles.strongSurface} mt-20 grid overflow-hidden rounded-[30px] border backdrop-blur-sm lg:grid-cols-[.78fr_1.22fr]`}>
          <div role="img" aria-label="Sadanand Jha at Mysuru railway station" className={`${styles.editorialPhoto} relative min-h-[390px]`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[var(--dev-surface-strong)]" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-600 dark:text-cyan-300">The person behind the systems</p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.04em] sm:text-4xl">Curiosity travels further than code.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--dev-muted)]">Strong products come from looking beyond the obvious answer—observing how people move, learn, and solve problems, then bringing that perspective back into the build.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["Curious by default", "Calm under constraints", "Always learning"].map((value) => <span key={value} className="rounded-full border border-[var(--dev-border)] bg-[var(--dev-surface)] px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-[var(--dev-muted)]">{value}</span>)}
            </div>
          </div>
        </Reveal>

        <div className="mt-20 grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:gap-14">
          <Reveal enabled={animated}><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Experience</p><h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Engineering systems that hold up in the real world.</h2><p className="mt-5 max-w-md text-sm leading-7 text-[var(--dev-muted)]">Correctness, performance, and the unglamorous details that turn an exciting prototype into dependable software.</p><div className="mt-7 grid max-w-md grid-cols-2 gap-3"><div className={`${styles.surface} rounded-2xl border p-4`}><p className="text-2xl font-black tabular-nums text-[var(--dev-text)]"><CountUpStat target={100} suffix="+" /></p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--dev-subtle)]">students served</p></div><div className={`${styles.surface} rounded-2xl border p-4`}><p className="text-2xl font-black tabular-nums text-[var(--dev-text)]"><CountUpStat target={170} /></p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--dev-subtle)]">monthly users</p></div></div></Reveal>
          <Reveal enabled={animated} delay={0.08} className={`${styles.strongSurface} rounded-[28px] border p-5 backdrop-blur-sm sm:p-7`}><div className="flex flex-col gap-4 border-b border-[var(--dev-border)] pb-6 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><BriefcaseBusiness className="h-[18px] w-[18px]" /></span><div><h3 className="font-bold text-[var(--dev-text)]">Software Engineer Intern</h3><p className="mt-1 text-sm text-[var(--dev-muted)]">Delhi Skill and Entrepreneurship University</p></div></div><span className="shrink-0 text-xs font-semibold text-[var(--dev-subtle)]">May 2025 – June 2026</span></div><ul className="mt-6 space-y-4 text-sm leading-6 text-[var(--dev-muted)]"><li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />Built core modules for a centralized university ERP designed for high-concurrency academic workflows.</li><li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />Optimized PostgreSQL queries and Redis caching to sustain responsive evaluation and registration pipelines.</li><li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />Engineered ACID-compliant validations and technical documentation for reliable system operations.</li></ul></Reveal>
        </div>

        <Reveal enabled={animated} className={`${styles.metricGlow} mt-20 overflow-hidden rounded-[30px] border border-[var(--dev-border-strong)] p-5 backdrop-blur-sm sm:p-8 lg:p-10`}><div className="grid gap-9 lg:grid-cols-[1.05fr_.95fr] lg:items-end"><div><span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/[0.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-violet-600 dark:text-violet-300"><Sparkles className="h-3 w-3" /> Flagship AI product</span><h2 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">ByteClash</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[var(--dev-muted)]">An AI-powered assessment platform combining quiz creation, secure attempts, real-time participation, background grading, analytics, and observability in one cohesive product.</p><a href="https://code-judge-seven.vercel.app/" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition-colors hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200">Explore the platform <ArrowUpRight className="h-4 w-4" /></a></div><div className="grid grid-cols-2 gap-2.5">{[{ icon: BrainCircuit, label: "AI-assisted creation" }, { icon: Layers3, label: "Full-stack product" }, { icon: ShieldCheck, label: "Secure assessments" }, { icon: Server, label: "Resilient grading" }].map(({ icon: Icon, label }) => <div key={label} className="rounded-2xl border border-[var(--dev-border)] bg-[var(--dev-surface-dark)] p-4"><Icon className="h-4 w-4 text-cyan-500" /><p className="mt-3 text-xs font-semibold text-[var(--dev-muted)]">{label}</p></div>)}</div></div></Reveal>

        <Reveal enabled={animated} className="mt-20"><div className="flex flex-col gap-5 border-b border-[var(--dev-border)] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-600 dark:text-cyan-300">Engineering toolbox</p><h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Technologies I work with.</h2></div><p className="max-w-sm text-sm leading-6 text-[var(--dev-muted)]">Selected for the problem—not for the trend.</p></div><div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{stack.map(({ name, icon: Icon, color }, index) => <span key={name} className={`inline-flex min-w-0 items-center justify-start gap-2 rounded-xl border border-[var(--dev-border)] bg-[var(--dev-surface)] px-3 py-2 text-xs font-semibold text-[var(--dev-muted)] sm:w-auto sm:px-3.5 ${index === stack.length - 1 ? "col-span-2" : ""}`}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border" style={{ color, borderColor: `${color}28`, background: `${color}10` }}><Icon className="h-3.5 w-3.5" strokeWidth={1.8} /></span><span className="truncate sm:overflow-visible">{name}</span></span>)}</div></Reveal>

        <Reveal enabled={animated} className={`${styles.surface} mt-20 rounded-[30px] border px-5 py-10 text-center backdrop-blur-sm sm:px-8 sm:py-14`}><p className="text-[10px] font-black uppercase tracking-[.2em] text-fuchsia-600 dark:text-fuchsia-300">Build something meaningful</p><h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-[-0.045em] sm:text-5xl">Have an ambitious problem worth solving?</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--dev-muted)]">I&apos;m interested in thoughtful engineering, scalable systems, and AI products with a real reason to exist.</p><div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"><a href="mailto:sadanand.jha3340@gmail.com" className={`${styles.forceWhite} inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-bold shadow-[0_16px_40px_-18px_rgba(124,92,255,.9)] sm:w-auto`}><Mail className="h-4 w-4" /> Send an email</a><a href="https://github.com/Sadanand-Jha" target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--dev-border)] bg-[var(--dev-surface)] px-5 text-sm font-bold text-[var(--dev-muted)] transition-colors hover:text-[var(--dev-text)] sm:w-auto"><GitHubMark className="h-4 w-4" /> View GitHub</a></div></Reveal>
      </section>
      </main>

      <footer className="relative z-10 border-t border-[var(--dev-border)] px-5 py-7 sm:px-8"><div className="mx-auto flex max-w-[1240px] flex-col gap-2 text-xs text-[var(--dev-subtle)] sm:flex-row sm:items-center sm:justify-between"><span>Designed and engineered with intent.</span><span>© {new Date().getFullYear()} Sadanand Jha</span></div></footer>
    </div>
  );
}
