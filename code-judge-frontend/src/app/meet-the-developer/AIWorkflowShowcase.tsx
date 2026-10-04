"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Binary,
  Boxes,
  BrainCircuit,
  Braces,
  CheckCircle2,
  Code2,
  Database,
  FileSearch,
  FileText,
  GitBranch,
  Gauge,
  Globe2,
  HardDrive,
  Layers3,
  ListChecks,
  MessageSquareText,
  Network,
  Orbit,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AIWorkflowShowcaseProps = {
  animated: boolean;
};

type SignalPathProps = {
  animated: boolean;
  d: string;
  delay?: number;
  duration?: number;
  accent?: string;
  subtle?: boolean;
};

type NodeProps = {
  animated?: boolean;
  icon: LucideIcon;
  label: string;
  meta?: string;
  accent?: string;
  revealDelay?: number;
  x: number;
  y: number;
  width?: number;
  compact?: boolean;
};

const cyan = "#22d3ee";
const violet = "#a78bfa";
const blue = "#60a5fa";
const emerald = "#34d399";
const amber = "#fbbf24";

function SignalPath({
  animated,
  d,
  delay = 0,
  duration = 3.6,
  accent = cyan,
  subtle = false,
}: SignalPathProps) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="var(--dev-border-strong)"
        strokeWidth={subtle ? 1.15 : 1.5}
        vectorEffect="non-scaling-stroke"
      />
      <motion.path
        d={d}
        fill="none"
        stroke={accent}
        strokeLinecap="round"
        strokeWidth={subtle ? 4 : 5.5}
        vectorEffect="non-scaling-stroke"
        initial={false}
        animate={
          animated
            ? { opacity: [0.05, 0.2, 0.05] }
            : { opacity: subtle ? 0.07 : 0.11 }
        }
        transition={
          animated
            ? { delay, duration: duration * 0.8, ease: "easeInOut", repeat: Infinity }
            : { duration: 0 }
        }
      />
      <motion.path
        d={d}
        fill="none"
        stroke={accent}
        strokeDasharray={subtle ? "3 8" : "5 9"}
        strokeLinecap="round"
        strokeWidth={subtle ? 1.8 : 2.35}
        vectorEffect="non-scaling-stroke"
        initial={false}
        animate={
          animated
            ? { strokeDashoffset: [0, -56], opacity: [0.5, 1, 0.5] }
            : { strokeDashoffset: 0, opacity: subtle ? 0.58 : 0.78 }
        }
        transition={
          animated
            ? { delay, duration, ease: "linear", repeat: Infinity }
            : { duration: 0 }
        }
        style={{ filter: `drop-shadow(0 0 5px ${accent})` }}
      />
      {animated ? (
        <circle r={subtle ? 1.15 : 1.45} fill={accent} style={{ filter: `drop-shadow(0 0 5px ${accent})` }}>
          <animateMotion path={d} dur={`${Math.max(1.8, duration * 0.72)}s`} begin={`${delay}s`} repeatCount="indefinite" />
        </circle>
      ) : null}
    </g>
  );
}

function DiagramNode({
  animated = false,
  icon: Icon,
  label,
  meta,
  accent = cyan,
  x,
  y,
  width = 23,
  compact = false,
  revealDelay,
}: NodeProps) {
  const revealsInSequence = typeof revealDelay === "number" && animated;

  return (
    <motion.div
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--dev-border)] bg-[var(--dev-surface-strong)] shadow-[0_15px_34px_-24px_rgba(5,8,20,.85)] backdrop-blur-md ${
        compact ? "min-h-12 px-2.5 py-2.5" : "min-h-14 px-3 py-3 sm:px-3.5 sm:py-3.5"
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        background: `linear-gradient(135deg, ${accent}14, transparent 68%), var(--dev-surface-strong)`,
      }}
      initial={revealsInSequence ? { opacity: 0, filter: "blur(6px)" } : false}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={
        revealsInSequence
          ? { delay: revealDelay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0 }
      }
    >
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <span
          className={`hidden shrink-0 place-items-center rounded-lg border sm:grid ${compact ? "h-6 w-6" : "h-7 w-7 sm:h-8 sm:w-8"}`}
          style={{ color: accent, borderColor: `${accent}2e`, background: `${accent}12` }}
        >
          <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-pretty text-center text-[8px] font-black leading-[1.08] tracking-[-0.01em] text-[var(--dev-text)] sm:text-left sm:text-[10px]">
            {label}
          </p>
          {meta ? (
            <p className="mt-1 whitespace-normal text-center font-mono text-[6px] uppercase leading-[1.1] tracking-[0.06em] text-[var(--dev-subtle)] sm:text-left sm:text-[7px]">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function PulseCore({
  animated,
  x,
  y,
  size,
  accent = violet,
}: {
  animated: boolean;
  x: number;
  y: number;
  size: number;
  accent?: string;
}) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border"
      style={{ left: `${x}%`, top: `${y}%`, width: `${size}%`, aspectRatio: "1", borderColor: `${accent}35` }}
      initial={false}
      animate={animated ? { scale: [0.88, 1.15], opacity: [0.65, 0] } : { scale: 1, opacity: 0.28 }}
      transition={animated ? { duration: 2.7, ease: "easeOut", repeat: Infinity } : { duration: 0 }}
    />
  );
}

function DiagramSurface({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div
      className="relative mt-5 h-[318px] overflow-hidden rounded-[24px] border border-[var(--dev-border)] bg-[var(--dev-surface-dark)] sm:h-[382px] dark:border-violet-300/20 dark:bg-[#080d1c] dark:[filter:saturate(1.3)_contrast(1.04)]"
      role="img"
      aria-label={label}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(var(--dev-grid) 1px, transparent 1px), linear-gradient(90deg, var(--dev-grid) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 84% 82% at 50% 45%, black 18%, transparent 90%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[12%] top-[8%] h-24 rounded-full bg-violet-500/[0.08] blur-3xl"
      />
      {children}
    </div>
  );
}

function WorkflowCard({
  number,
  icon: Icon,
  eyebrow,
  title,
  copy,
  accent,
  animated,
  children,
}: {
  number: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  animated: boolean;
  children: React.ReactNode;
}) {
  return (
    <article
      className="relative overflow-hidden rounded-[28px] border border-[var(--dev-border)] bg-[var(--dev-surface)] p-4 shadow-[var(--dev-shadow)] backdrop-blur-sm sm:p-6 dark:border-violet-300/20 dark:bg-[#0b1020]/95"
      style={{ backgroundImage: `radial-gradient(circle at 100% 0%, ${accent}12, transparent 38%)` }}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
            style={{ color: accent, borderColor: `${accent}30`, background: `${accent}12` }}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.19em]" style={{ color: accent }}>
              {eyebrow}
            </p>
            <h3 className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--dev-text)] sm:text-xl">{title}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--dev-subtle)]">
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 9px ${accent}` }}
            initial={false}
            animate={animated ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.72 }}
            transition={animated ? { duration: 2.2, ease: "easeInOut", repeat: Infinity } : { duration: 0 }}
          />
          {number}
        </div>
      </div>
      <p className="relative mt-3 max-w-[55ch] text-xs leading-5 text-[var(--dev-muted)] sm:text-[13px]">{copy}</p>
      {children}
    </article>
  );
}

function RagPipeline({ animated }: AIWorkflowShowcaseProps) {
  return (
    <DiagramSurface label="RAG pipeline from user query through embeddings, retrieval, context assembly, language model, and final grounded answer">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <SignalPath animated={animated} d="M23.5 27 H25.5" delay={0} accent={cyan} />
        <SignalPath animated={animated} d="M47 27 H53" delay={0.28} accent={cyan} />
        <SignalPath animated={animated} d="M74.5 27 H76.5" delay={0.56} accent={violet} />
        <SignalPath animated={animated} d="M88 39 C95 46 90 61 74 68" delay={0.84} accent={violet} />
        <SignalPath animated={animated} d="M53 70 H47" delay={1.12} accent={violet} />
        <SignalPath animated={animated} d="M25.5 70 H23.5" delay={1.4} accent={emerald} />
      </svg>

      <DiagramNode icon={MessageSquareText} label="Query" meta="intent" accent={cyan} x={12} y={27} />
      <DiagramNode icon={Orbit} label="Embed" meta="vector" accent={cyan} x={37} y={27} />
      <DiagramNode icon={Search} label="Vector search" meta="nearest" accent={violet} x={63} y={27} />
      <DiagramNode icon={FileSearch} label="Retrieve" meta="chunks" accent={violet} x={88} y={27} />
      <DiagramNode icon={Layers3} label="Context" meta="assemble" accent={violet} x={63} y={70} />
      <DiagramNode icon={BrainCircuit} label="LLM" meta="reason" accent={blue} x={37} y={70} />
      <DiagramNode icon={Sparkles} label="Answer" meta="grounded" accent={emerald} x={12} y={70} />

      <div className="absolute bottom-[5%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap font-mono text-[7px] uppercase tracking-[0.15em] text-[var(--dev-subtle)]">
        <span className="h-px w-5 bg-gradient-to-r from-transparent to-cyan-400/60" />
        knowledge before generation
        <span className="h-px w-5 bg-gradient-to-l from-transparent to-violet-400/60" />
      </div>
    </DiagramSurface>
  );
}

const evaluators = [
  { icon: Target, label: "Accuracy", meta: "0.97", accent: cyan, x: 15, y: 19 },
  { icon: Search, label: "Relevance", meta: "0.94", accent: blue, x: 42, y: 13 },
  { icon: ShieldCheck, label: "Safety", meta: "pass", accent: emerald, x: 76, y: 19 },
  { icon: BrainCircuit, label: "Reasoning", meta: "0.91", accent: violet, x: 84, y: 58 },
  { icon: ListChecks, label: "Format", meta: "pass", accent: amber, x: 16, y: 60 },
] as const;

function EvaluationWorkflow({ animated }: AIWorkflowShowcaseProps) {
  const responsePaths = [
    "M45 39 L21 23",
    "M48 34 L43 20",
    "M56 36 L69 23",
    "M61 44 L75 54",
    "M39 47 L25 56",
  ];
  const aggregatePaths = [
    "M17 29 C19 66 33 76 41 80",
    "M43 20 C43 54 46 66 48 73",
    "M75 26 C71 62 65 72 60 78",
    "M78 64 C71 73 65 78 61 81",
    "M25 64 C33 72 38 77 42 80",
  ];

  return (
    <DiagramSurface label="Agentic evaluation workflow where five specialist agents assess an AI response, aggregate a verdict, and return feedback">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {responsePaths.map((path, index) => (
          <SignalPath key={path} animated={animated} d={path} delay={0.45 + index * 0.72} accent={evaluators[index].accent} subtle />
        ))}
        {aggregatePaths.map((path, index) => (
          <SignalPath key={path} animated={animated} d={path} delay={4.45 + index * 0.18} accent={evaluators[index].accent} subtle />
        ))}
        <SignalPath animated={animated} d="M63 86 C91 94 95 43 63 43" delay={6.1} duration={4.8} accent={violet} />
      </svg>

      <PulseCore animated={animated} x={51} y={44} size={29} accent={violet} />
      <DiagramNode icon={MessageSquareText} label="AI response" meta="candidate output" accent={violet} x={51} y={44} width={24} />
      {evaluators.map((evaluator, index) => (
        <DiagramNode
          key={evaluator.label}
          {...evaluator}
          animated={animated}
          revealDelay={0.85 + index * 0.72}
          width={21}
          compact
        />
      ))}

      <motion.div
        className="absolute z-10 flex w-[25%] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border border-emerald-400/25 bg-[var(--dev-surface-strong)] px-2.5 py-2 shadow-[0_12px_30px_-20px_rgba(52,211,153,.8)] backdrop-blur-md"
        style={{ left: "51%", top: "84%" }}
        initial={animated ? { opacity: 0, filter: "blur(6px)" } : false}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={animated ? { delay: 5.35, duration: 0.55, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        <div className="min-w-0">
          <p className="truncate text-[8px] font-black text-[var(--dev-text)] sm:text-[10px]">Aggregate</p>
          <p className="font-mono text-[7px] text-emerald-500">94 · VERIFIED</p>
        </div>
      </motion.div>
      <motion.div
        className="absolute bottom-[2.5%] right-[6%] flex items-center gap-1 font-mono text-[6px] uppercase tracking-[0.12em] text-violet-400"
        initial={animated ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={animated ? { delay: 6.35, duration: 0.5 } : { duration: 0 }}
      >
        feedback loop <ArrowRight className="h-2.5 w-2.5" />
      </motion.div>
    </DiagramSurface>
  );
}

const toolNodes = [
  { icon: Globe2, label: "Web", accent: cyan, x: 67, y: 13 },
  { icon: Database, label: "Database", accent: blue, x: 87, y: 29 },
  { icon: FileText, label: "Docs", accent: violet, x: 87, y: 60 },
  { icon: Code2, label: "Code", accent: emerald, x: 68, y: 83 },
  { icon: Network, label: "API", accent: cyan, x: 43, y: 81 },
  { icon: HardDrive, label: "Memory", accent: amber, x: 43, y: 13 },
] as const;

function ToolNode({
  icon: Icon,
  label,
  accent,
  x,
  y,
  width = 19,
}: {
  icon: LucideIcon;
  label: string;
  accent: string;
  x: number;
  y: number;
  width?: number;
}) {
  return (
    <div
      className="absolute z-10 flex min-h-12 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-xl border border-[var(--dev-border)] bg-[var(--dev-surface-strong)] px-2.5 py-2.5 backdrop-blur-md"
      style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, backgroundImage: `linear-gradient(135deg, ${accent}12, transparent)` }}
    >
      <Icon className="h-3 w-3 shrink-0" style={{ color: accent }} strokeWidth={1.8} />
      <span className="whitespace-normal text-center text-[6px] font-bold leading-[1.05] text-[var(--dev-muted)] sm:text-left sm:text-[8px]">{label}</span>
    </div>
  );
}

function ToolUsingAgent({ animated }: AIWorkflowShowcaseProps) {
  const toolPaths = [
    "M45 38 L61 18",
    "M48 41 L78 30",
    "M49 48 L78 57",
    "M45 53 L63 77",
    "M40 55 L42 73",
    "M39 36 L42 20",
  ];

  return (
    <DiagramSurface label="Autonomous AI agent that plans a task, calls six tools, combines their results, and produces a final answer">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <SignalPath animated={animated} d="M21 26 C29 27 29 38 33 41" delay={0} accent={cyan} />
        {toolPaths.map((path, index) => (
          <SignalPath key={path} animated={animated} d={path} delay={0.45 + index * 0.16} accent={toolNodes[index].accent} subtle />
        ))}
        <SignalPath animated={animated} d="M35 55 C32 65 26 73 21 77" delay={1.75} accent={emerald} />
      </svg>

      <DiagramNode icon={MessageSquareText} label="Task" meta="goal received" accent={cyan} x={12} y={25} width={19} />
      <PulseCore animated={animated} x={40} y={45} size={30} accent={violet} />
      <DiagramNode icon={Workflow} label="AI agent" meta="plan · call · combine" accent={violet} x={40} y={45} width={24} />
      {toolNodes.map((tool) => (
        <ToolNode key={tool.label} {...tool} />
      ))}
      <DiagramNode icon={Sparkles} label="Result" meta="synthesized" accent={emerald} x={13} y={78} width={22} />

      <div className="absolute left-[28%] top-[67%] flex items-center gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((step, index) => (
          <motion.span
            key={step}
            className="grid h-3.5 w-3.5 place-items-center rounded-full border border-violet-400/25 bg-violet-500/10 font-mono text-[6px] text-violet-400"
            initial={false}
            animate={animated ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.72 }}
            transition={animated ? { delay: index * 0.28, duration: 1.8, repeat: Infinity } : { duration: 0 }}
          >
            {step}
          </motion.span>
        ))}
      </div>
    </DiagramSurface>
  );
}

function BackendArchitecture({ animated }: AIWorkflowShowcaseProps) {
  const primary = [
    { icon: MessageSquareText, label: "Request", meta: "IN", accent: cyan, x: 10, y: 24, width: 17 },
    { icon: ShieldCheck, label: "Gateway", meta: "ROUTE", accent: blue, x: 30, y: 24, width: 17 },
    { icon: Boxes, label: "Services", meta: "RUN", accent: violet, x: 50, y: 24, width: 17 },
    { icon: Workflow, label: "Agents", meta: "PLAN", accent: violet, x: 70, y: 24, width: 17 },
    { icon: Sparkles, label: "Response", meta: "OUT", accent: emerald, x: 90, y: 24, width: 17 },
  ] as const;
  const dependencies = [
    { icon: Zap, label: "Cache", accent: amber, x: 25, y: 61, width: 15.5 },
    { icon: Database, label: "Postgres", accent: blue, x: 42, y: 61, width: 15.5 },
    { icon: FileSearch, label: "RAG", accent: cyan, x: 59, y: 61, width: 15.5 },
    { icon: BrainCircuit, label: "Model", accent: violet, x: 76, y: 61, width: 15.5 },
  ] as const;

  return (
    <DiagramSurface label="Production AI backend routing a request through an API gateway, services, cache, database, RAG, model, orchestration, monitoring, and response">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <SignalPath animated={animated} d="M18.5 24 H21.5" delay={0} accent={cyan} />
        <SignalPath animated={animated} d="M38.5 24 H41.5" delay={0.2} accent={blue} />
        <SignalPath animated={animated} d="M58.5 24 H61.5" delay={0.4} accent={violet} />
        <SignalPath animated={animated} d="M78.5 24 H81.5" delay={0.6} accent={emerald} />
        <SignalPath animated={animated} d="M47 34 C43 44 31 49 25 54" delay={0.65} accent={amber} subtle />
        <SignalPath animated={animated} d="M51 34 C49 44 44 49 42 54" delay={0.82} accent={blue} subtle />
        <SignalPath animated={animated} d="M69 34 C66 44 61 49 59 54" delay={1} accent={cyan} subtle />
        <SignalPath animated={animated} d="M75 34 C76 44 76 49 76 54" delay={1.18} accent={violet} subtle />
        <SignalPath animated={animated} d="M25 68 C35 78 56 78 76 68" delay={1.45} duration={4.4} accent={cyan} subtle />
      </svg>

      {primary.map((node) => (
        <DiagramNode key={node.label} {...node} compact />
      ))}
      {dependencies.map((node) => (
        <ToolNode key={node.label} {...node} y={node.y} />
      ))}

      <div className="absolute bottom-[6%] left-1/2 z-10 flex w-[62%] -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--dev-border)] bg-[var(--dev-surface-strong)] px-3 py-2 backdrop-blur-md">
        <Activity className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span className="text-[7px] font-black uppercase tracking-[0.13em] text-[var(--dev-muted)] sm:text-[8px]">Monitoring</span>
        <div className="flex h-4 flex-1 items-end gap-1 overflow-hidden" aria-hidden="true">
          {[42, 68, 48, 82, 58, 74, 52, 88, 64, 72, 54, 79].map((height, index) => (
            <motion.span
              key={`${height}-${index}`}
              className="min-w-0 flex-1 rounded-full bg-gradient-to-t from-violet-500/45 to-cyan-400/80"
              initial={false}
              animate={animated ? { height: [`${height}%`, `${Math.max(30, 100 - height / 2)}%`, `${height}%`] } : { height: `${height}%` }}
              transition={
                animated
                  ? { delay: index * 0.09, duration: 2 + (index % 3) * 0.35, ease: "easeInOut", repeat: Infinity }
                  : { duration: 0 }
              }
            />
          ))}
        </div>
        <span className="font-mono text-[7px] text-emerald-500">99.99%</span>
      </div>
    </DiagramSurface>
  );
}

function AlgorithmReasoning({ animated }: AIWorkflowShowcaseProps) {
  const candidates = [
    { icon: Braces, label: "Brute force", meta: "O(n²) · reject", accent: "#fb7185", x: 20, y: 58, delay: 1.1 },
    { icon: GitBranch, label: "Graph + DSU", meta: "components", accent: cyan, x: 40, y: 58, delay: 1.75 },
    { icon: Boxes, label: "Heap", meta: "priority", accent: blue, x: 60, y: 58, delay: 2.4 },
    { icon: Binary, label: "DP states", meta: "reuse", accent: violet, x: 80, y: 58, delay: 3.05 },
  ] as const;

  return (
    <DiagramSurface label="Algorithmic reasoning flow that decomposes a difficult problem, explores candidate structures, rejects inefficient paths, and converges on an optimized accepted solution">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <SignalPath animated={animated} d="M20 24 H27" delay={0} accent={cyan} />
        <SignalPath animated={animated} d="M47 24 H53" delay={0.35} accent={violet} />
        <SignalPath animated={animated} d="M73 24 H80" delay={0.7} accent={emerald} />
        <SignalPath animated={animated} d="M61 35 C55 42 31 44 20 50" delay={1.05} accent="#fb7185" subtle />
        <SignalPath animated={animated} d="M62 35 C57 43 46 46 40 50" delay={1.7} accent={cyan} subtle />
        <SignalPath animated={animated} d="M64 35 C63 43 61 46 60 50" delay={2.35} accent={blue} subtle />
        <SignalPath animated={animated} d="M67 35 C72 42 78 46 80 50" delay={3} accent={violet} subtle />
        <SignalPath animated={animated} d="M40 66 C43 73 46 76 50 79" delay={3.75} accent={cyan} subtle />
        <SignalPath animated={animated} d="M60 66 C58 72 54 76 50 79" delay={4.05} accent={blue} subtle />
        <SignalPath animated={animated} d="M80 66 C69 74 59 78 50 81" delay={4.35} accent={violet} subtle />
      </svg>

      <DiagramNode icon={MessageSquareText} label="Hard problem" meta="constraints" accent={cyan} x={10} y={24} width={20} />
      <DiagramNode icon={Search} label="Pattern scan" meta="edge cases" accent={violet} x={37} y={24} width={20} />
      <DiagramNode icon={BrainCircuit} label="Explore" meta="parallel paths" accent={violet} x={63} y={24} width={20} />
      <DiagramNode icon={Gauge} label="Optimize" meta="time + space" accent={emerald} x={90} y={24} width={19} />

      {candidates.map((candidate) => (
        <DiagramNode
          key={candidate.label}
          {...candidate}
          animated={animated}
          revealDelay={candidate.delay}
          width={18}
          compact
        />
      ))}

      <motion.div
        className="absolute bottom-[5%] left-1/2 z-10 flex w-[38%] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-[var(--dev-surface-strong)] px-3 py-2.5 backdrop-blur-md"
        initial={animated ? { opacity: 0, filter: "blur(6px)" } : false}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={animated ? { delay: 4.8, duration: 0.55 } : { duration: 0 }}
      >
        <span className="font-mono text-[7px] font-bold text-[var(--dev-subtle)] sm:text-[8px]">O(n²) → O(n log n) → O(n)</span>
        <span className="inline-flex items-center gap-1 font-mono text-[7px] font-black text-emerald-500 sm:text-[8px]"><CheckCircle2 className="h-3 w-3" /> ACCEPTED</span>
      </motion.div>

      <div className="absolute bottom-[6%] left-[4%] font-mono text-[7px] font-black uppercase tracking-[.12em] text-cyan-500">2000+ solved</div>
    </DiagramSurface>
  );
}

function SystemDesignFlow({ animated }: AIWorkflowShowcaseProps) {
  const services = [
    { icon: ShieldCheck, label: "Gateway", accent: blue, x: 20, y: 60, width: 16 },
    { icon: Zap, label: "Cache", accent: amber, x: 40, y: 60, width: 16 },
    { icon: Workflow, label: "Queue", accent: violet, x: 60, y: 60, width: 16 },
    { icon: Database, label: "Data", accent: cyan, x: 80, y: 60, width: 16 },
  ] as const;

  return (
    <DiagramSurface label="System design process that turns requirements and capacity estimates into APIs, boundaries, data choices, resilient services, and explicit tradeoffs">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <SignalPath animated={animated} d="M20 24 H28" delay={0} accent={cyan} />
        <SignalPath animated={animated} d="M46 24 H54" delay={0.3} accent={blue} />
        <SignalPath animated={animated} d="M72 24 H80" delay={0.6} accent={violet} />
        <SignalPath animated={animated} d="M63 34 C55 42 29 45 20 52" delay={0.9} accent={blue} subtle />
        <SignalPath animated={animated} d="M64 34 C57 44 45 47 40 52" delay={1.15} accent={amber} subtle />
        <SignalPath animated={animated} d="M66 34 C66 43 62 47 60 52" delay={1.4} accent={violet} subtle />
        <SignalPath animated={animated} d="M68 34 C75 43 78 47 80 52" delay={1.65} accent={cyan} subtle />
        <SignalPath animated={animated} d="M20 69 C34 80 66 80 80 69" delay={2} accent={emerald} />
      </svg>

      <DiagramNode icon={MessageSquareText} label="Requirements" meta="SLO · use cases" accent={cyan} x={10} y={24} width={20} />
      <DiagramNode icon={Gauge} label="Capacity" meta="traffic · storage" accent={blue} x={37} y={24} width={20} />
      <DiagramNode icon={Network} label="Boundaries" meta="APIs · services" accent={violet} x={63} y={24} width={20} />
      <DiagramNode icon={BrainCircuit} label="Tradeoffs" meta="cost · latency" accent={emerald} x={90} y={24} width={19} />
      {services.map((service) => <ToolNode key={service.label} {...service} />)}

      <div className="absolute bottom-[5%] left-1/2 z-10 flex w-[42%] -translate-x-1/2 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-[var(--dev-surface-strong)] px-3 py-2 font-mono text-[7px] font-black uppercase tracking-[.1em] text-emerald-500 sm:text-[8px]">
        <CheckCircle2 className="h-3 w-3" /> resilient by design
      </div>
    </DiagramSurface>
  );
}

function ProductionScale({ animated }: AIWorkflowShowcaseProps) {
  const scaleNodes = [
    { icon: Activity, label: "Observe", accent: cyan, x: 22, y: 63, width: 17 },
    { icon: Boxes, label: "Autoscale", accent: violet, x: 43, y: 63, width: 17 },
    { icon: Database, label: "Replicate", accent: blue, x: 64, y: 63, width: 17 },
    { icon: ShieldCheck, label: "Fail over", accent: emerald, x: 85, y: 63, width: 17 },
  ] as const;

  return (
    <DiagramSurface label="Production scale workflow that absorbs traffic, balances load, scales compute, protects data, observes health, and fails over safely">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <SignalPath animated={animated} d="M19 25 H27" delay={0} accent={cyan} />
        <SignalPath animated={animated} d="M46 25 H54" delay={0.3} accent={blue} />
        <SignalPath animated={animated} d="M73 25 H81" delay={0.6} accent={emerald} />
        <SignalPath animated={animated} d="M63 35 C55 44 31 48 22 55" delay={0.9} accent={cyan} subtle />
        <SignalPath animated={animated} d="M64 35 C58 45 47 49 43 55" delay={1.15} accent={violet} subtle />
        <SignalPath animated={animated} d="M66 35 C66 45 65 49 64 55" delay={1.4} accent={blue} subtle />
        <SignalPath animated={animated} d="M68 35 C77 44 82 49 85 55" delay={1.65} accent={emerald} subtle />
        <SignalPath animated={animated} d="M22 71 C39 82 68 82 85 71" delay={2} accent={emerald} />
      </svg>

      <DiagramNode icon={Globe2} label="Traffic" meta="bursty demand" accent={cyan} x={10} y={25} width={19} />
      <DiagramNode icon={ShieldCheck} label="Edge" meta="secure route" accent={blue} x={37} y={25} width={20} />
      <DiagramNode icon={Server} label="Compute" meta="stateless fleet" accent={violet} x={63} y={25} width={20} />
      <DiagramNode icon={Sparkles} label="Response" meta="low latency" accent={emerald} x={91} y={25} width={18} />
      {scaleNodes.map((node) => <ToolNode key={node.label} {...node} />)}

      <div className="absolute bottom-[5%] left-1/2 z-10 flex w-[46%] -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--dev-border)] bg-[var(--dev-surface-strong)] px-3 py-2 backdrop-blur-md">
        <Activity className="h-3.5 w-3.5 text-emerald-400" />
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--dev-surface-dark)]"><motion.div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400" initial={false} animate={animated ? { width: ["32%", "94%", "68%"] } : { width: "78%" }} transition={animated ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }} /></div>
        <span className="font-mono text-[7px] font-black text-emerald-500">99.99%</span>
      </div>
    </DiagramSurface>
  );
}

const systemWorkflows: Array<{
  number: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  copy: string;
  accent: string;
  diagram: React.ComponentType<AIWorkflowShowcaseProps>;
}> = [
  {
    number: "SYS 01",
    icon: BrainCircuit,
    eyebrow: "AI systems",
    title: "Intelligence that checks itself",
    copy: "Generation, specialist evaluation, scoring, and feedback operate as one dependable intelligence loop.",
    accent: violet,
    diagram: EvaluationWorkflow,
  },
  {
    number: "SYS 02",
    icon: Orbit,
    eyebrow: "Agentic AI",
    title: "One agent, the right tools",
    copy: "The agent plans, delegates across tools, recalls context, and synthesizes the returned evidence into one result.",
    accent: blue,
    diagram: ToolUsingAgent,
  },
  {
    number: "SYS 03",
    icon: FileSearch,
    eyebrow: "Grounded RAG",
    title: "Retrieval before response",
    copy: "A live RAG path turns intent into semantic search, assembles trusted context, and grounds the model's answer.",
    accent: cyan,
    diagram: RagPipeline,
  },
  {
    number: "SYS 04",
    icon: Server,
    eyebrow: "Production architecture",
    title: "The engine behind the AI",
    copy: "Gateway, services, data, retrieval, inference, orchestration, and telemetry operate as one resilient backend.",
    accent: emerald,
    diagram: BackendArchitecture,
  },
  {
    number: "SYS 05",
    icon: Binary,
    eyebrow: "DSA & algorithms",
    title: "Reason first. Optimize hard.",
    copy: "Constraints, edge cases, candidate structures, and complexity tradeoffs collapse into one clean accepted solution.",
    accent: cyan,
    diagram: AlgorithmReasoning,
  },
  {
    number: "SYS 06",
    icon: Network,
    eyebrow: "System design",
    title: "Every boundary has a reason",
    copy: "Requirements and capacity shape APIs, data, caching, queues, service boundaries, and explicit engineering tradeoffs.",
    accent: violet,
    diagram: SystemDesignFlow,
  },
  {
    number: "SYS 07",
    icon: Activity,
    eyebrow: "Production scale",
    title: "Built to stay fast under pressure",
    copy: "Traffic routing, autoscaling, replication, observability, and failover keep the product responsive and resilient.",
    accent: emerald,
    diagram: ProductionScale,
  },
];

export default function AIWorkflowShowcase({ animated }: AIWorkflowShowcaseProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.12 });
  const [activeIndex, setActiveIndex] = useState(0);
  const motionEnabled = animated && isInView;
  const activeWorkflow = systemWorkflows[activeIndex];
  const ActiveDiagram = activeWorkflow.diagram;

  useEffect(() => {
    if (!isInView) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % systemWorkflows.length);
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [activeIndex, isInView]);

  return (
    <section ref={sectionRef} className="mt-20" aria-labelledby="ai-workflow-showcase-title">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
            <BrainCircuit className="h-3.5 w-3.5" /> Intelligence in motion
          </p>
          <h2 id="ai-workflow-showcase-title" className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.045em] text-[var(--dev-text)] sm:text-5xl">
            Watch the system work.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-[var(--dev-muted)]">
          One connected production workflow at a time. The system changes quietly every 30 seconds.
        </p>
      </div>

      <div className="relative" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeWorkflow.number}
            initial={motionEnabled ? { opacity: 0, x: 28, filter: "blur(6px)" } : false}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={motionEnabled ? { opacity: 0, x: -24, filter: "blur(5px)" } : { opacity: 0 }}
            transition={{ duration: motionEnabled ? 0.45 : 0, ease: [0.22, 1, 0.36, 1] }}
          >
            <WorkflowCard
              number={activeWorkflow.number}
              icon={activeWorkflow.icon}
              eyebrow={activeWorkflow.eyebrow}
              title={activeWorkflow.title}
              copy={activeWorkflow.copy}
              accent={activeWorkflow.accent}
              animated={motionEnabled}
            >
              <ActiveDiagram animated={motionEnabled} />
            </WorkflowCard>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
