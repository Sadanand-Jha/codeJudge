"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Sparkles } from "lucide-react";
import { cn } from "@/lib/helpers";

interface GraphNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

interface Step {
  title: string;
  detail: string;
  current: string | null;
  settled: string[];
  frontier: string[];
  activeEdges: [string, string][];
  path: [string, string][];
  dists: Record<string, number>;
}

/* 8-node graph with a real shortest path S → E → B → D → T = 9 */
const NODES: GraphNode[] = [
  { id: "S", x: 90, y: 200, label: "S" },
  { id: "A", x: 240, y: 85, label: "A" },
  { id: "B", x: 240, y: 200, label: "B" },
  { id: "E", x: 240, y: 315, label: "E" },
  { id: "C", x: 450, y: 85, label: "C" },
  { id: "D", x: 450, y: 200, label: "D" },
  { id: "F", x: 450, y: 315, label: "F" },
  { id: "T", x: 655, y: 200, label: "T" },
];

const EDGES: GraphEdge[] = [
  { from: "S", to: "A", weight: 2 },
  { from: "S", to: "B", weight: 5 },
  { from: "S", to: "E", weight: 3 },
  { from: "A", to: "B", weight: 3 },
  { from: "A", to: "C", weight: 4 },
  { from: "B", to: "E", weight: 1 },
  { from: "B", to: "D", weight: 2 },
  { from: "C", to: "D", weight: 4 },
  { from: "C", to: "T", weight: 6 },
  { from: "D", to: "T", weight: 3 },
  { from: "E", to: "F", weight: 4 },
  { from: "F", to: "D", weight: 2 },
  { from: "F", to: "T", weight: 5 },
];

const STEPS: Step[] = [
  {
    title: "Initialize",
    detail:
      "Set dist[Start] = 0 and push the source node into the priority queue.",
    current: "S",
    settled: [],
    frontier: ["S"],
    activeEdges: [],
    path: [],
    dists: { S: 0 },
  },
  {
    title: "Select",
    detail:
      "The source is currently the closest node. Pop (0, S) and settle it.",
    current: "S",
    settled: ["S"],
    frontier: ["A", "B", "E"],
    activeEdges: [["S", "A"], ["S", "B"], ["S", "E"]],
    path: [],
    dists: { S: 0, A: 2, B: 5, E: 3 },
  },
  {
    title: "Relax",
    detail:
      "Check each neighboring edge and update distances when a shorter route is found. A (2) is popped next — and B drops from 5 to 4 via E.",
    current: "A",
    settled: ["S", "A"],
    frontier: ["B", "E", "C"],
    activeEdges: [["A", "B"], ["A", "C"]],
    path: [],
    dists: { S: 0, A: 2, B: 4, E: 3, C: 6 },
  },
  {
    title: "Expand",
    detail:
      "Select the next closest node: E (3). Relax its edges toward B and F.",
    current: "E",
    settled: ["S", "A", "E"],
    frontier: ["B", "C", "F"],
    activeEdges: [["E", "B"], ["E", "F"]],
    path: [],
    dists: { S: 0, A: 2, E: 3, B: 4, C: 6, F: 7 },
  },
  {
    title: "Repeat",
    detail:
      "Continue until the destination has the smallest finalized distance. Pop B (4) and relax B → D.",
    current: "B",
    settled: ["S", "A", "E", "B"],
    frontier: ["C", "F", "D"],
    activeEdges: [["B", "D"]],
    path: [],
    dists: { S: 0, A: 2, E: 3, B: 4, C: 6, F: 7, D: 6 },
  },
  {
    title: "Destination",
    detail:
      "Settle C, D and F, then pop the destination T (9). Its shortest distance is now known for certain.",
    current: "T",
    settled: ["S", "A", "E", "B", "C", "D", "F"],
    frontier: ["T"],
    activeEdges: [["D", "T"]],
    path: [],
    dists: { S: 0, A: 2, E: 3, B: 4, C: 6, D: 6, F: 7, T: 9 },
  },
  {
    title: "Result",
    detail:
      "Reconstruct the shortest path by walking the settled parents: S → E → B → D → T = 3 + 1 + 2 + 3 = 9.",
    current: "T",
    settled: ["S", "A", "E", "B", "C", "D", "F", "T"],
    frontier: [],
    activeEdges: [],
    path: [["S", "E"], ["E", "B"], ["B", "D"], ["D", "T"]],
    dists: { S: 0, A: 2, E: 3, B: 4, C: 6, D: 6, F: 7, T: 9 },
  },
];

const nodeById = (id: string) => NODES.find((n) => n.id === id)!;
const TOTAL = STEPS.length;

function edgeKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

export default function StepByStepVisualizer() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const s = STEPS[step];
  const atEnd = step === TOTAL - 1;

  // Stop once the animation reaches the final state (deferred so the interval
  // finishes its current tick).
  useEffect(() => {
    if (!playing || step < TOTAL - 1) return;
    const t = setTimeout(() => setPlaying(false), 0);
    return () => clearTimeout(t);
  }, [playing, step]);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setStep((cur) => Math.min(cur + 1, TOTAL - 1));
    }, 950);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing]);

  const play = () => {
    if (atEnd) setStep(0);
    setPlaying(true);
  };

  const next = () => {
    setPlaying(false);
    setStep((cur) => Math.min(cur + 1, TOTAL - 1));
  };

  const previous = () => {
    setPlaying(false);
    setStep((cur) => Math.max(cur - 1, 0));
  };

  const restart = () => {
    setPlaying(false);
    setStep(0);
  };

  const activeEdgeSet = new Set(s.activeEdges.map(([a, b]) => edgeKey(a, b)));
  const pathEdgeSet = new Set(s.path.map(([a, b]) => edgeKey(a, b)));

  return (
    <section className="my-8 overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-card shadow-[0_20px_60px_-30px_rgba(139,92,246,0.5)]">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card-hover/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#8B5CF6]" />
          <h3 className="text-sm font-bold tracking-tight text-text-primary">
            Dijkstra&apos;s Algorithm
          </h3>
          <span className="rounded-full border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#7C3AED] dark:text-[#A78BFA]">
            Step {step + 1} of {TOTAL}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={previous}
            disabled={step === 0}
            className="flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipBack className="h-3.5 w-3.5" />
            Previous
          </button>
          <button
            type="button"
            onClick={atEnd ? restart : playing ? () => setPlaying(false) : play}
            className={cn(
              "flex h-8 items-center gap-1 rounded-lg px-3 text-[11px] font-bold text-white transition-all",
              atEnd
                ? "bg-[#1A1F2E] border border-[#8B5CF6]/40 text-[#A78BFA] hover:bg-[#242A3D]"
                : "bg-[#7C3AED] hover:bg-[#6D28D9]"
            )}
          >
            {atEnd ? <RotateCcw className="h-3.5 w-3.5" /> : playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {atEnd ? "Replay" : playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={atEnd}
            className="flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ===== Graph ===== */}
      <div className="relative p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.09),transparent_65%)]" />
        <svg
          viewBox="0 0 720 400"
          className="relative mx-auto w-full"
          role="img"
          aria-label={`Dijkstra step ${step + 1} of ${TOTAL}: ${s.title}`}
        >
          {/* Edges */}
          {EDGES.map((e) => {
            const f = nodeById(e.from);
            const t = nodeById(e.to);
            const key = edgeKey(e.from, e.to);
            const onPath = pathEdgeSet.has(key);
            const active = activeEdgeSet.has(key);
            const mx = (f.x + t.x) / 2;
            const my = (f.y + t.y) / 2;

            return (
              <g key={key}>
                {/* base */}
                <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="rgba(139,92,246,0.12)" strokeWidth={2} />

                {/* shortest path */}
                {onPath && (
                  <>
                    <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#8B5CF6" strokeWidth={4} strokeLinecap="round" />
                    <motion.line
                      x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                      stroke="#C4B5FD" strokeWidth={2} strokeLinecap="round"
                      strokeDasharray="8 10"
                      animate={{ opacity: [0.2, 0.9, 0.2] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </>
                )}

                {/* active relaxation */}
                {active && (
                  <>
                    <motion.line
                      x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                      stroke="#A78BFA" strokeWidth={3} strokeLinecap="round"
                      strokeDasharray="9 9"
                      animate={{ strokeDashoffset: [0, -36] }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.circle
                      r={4}
                      fill="#C4B5FD"
                      initial={{ cx: f.x, cy: f.y }}
                      animate={{ cx: t.x, cy: t.y }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  </>
                )}

                {/* weight label */}
                <text
                  x={mx}
                  y={my - (e.from === "A" ? 8 : 6)}
                  textAnchor="middle"
                  className={cn(
                    "transition-colors",
                    active || onPath ? "fill-[#A78BFA]" : "fill-text-muted"
                  )}
                  style={{ fontSize: 12, fontWeight: 700 }}
                >
                  {e.weight}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((n) => {
            const settled = s.settled.includes(n.id);
            const current = s.current === n.id;
            const frontier = s.frontier.includes(n.id);
            const inPath = s.path.some(([a, b]) => a === n.id || b === n.id);
            const dist = s.dists[n.id];
            const isSource = n.id === "S";
            const isTarget = n.id === "T";

            return (
              <g key={n.id}>
                {current && (
                  <motion.circle
                    cx={n.x} cy={n.y} r={27}
                    fill="none" stroke="#8B5CF6" strokeWidth={2}
                    animate={{ scale: [1, 1.4], opacity: [0.85, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
                  />
                )}

                <motion.circle
                  cx={n.x} cy={n.y}
                  initial={false}
                  animate={{
                    scale: current ? 1.18 : 1,
                    opacity: settled || current || inPath ? 1 : frontier ? 0.95 : 0.75,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  r={20}
                  className={cn(
                    "stroke-[#8B5CF6] transition-colors",
                    settled || current || inPath ? "fill-[#7C3AED]" : "fill-[#1A1F2E]",
                    frontier && !current && !settled && !inPath ? "stroke-[#A78BFA]" : ""
                  )}
                  strokeWidth={current ? 3 : 2}
                />

                <text
                  x={n.x} y={n.y + 5} textAnchor="middle" className="fill-white"
                  style={{ fontSize: 13, fontWeight: 800 }}
                >
                  {n.label}
                </text>

                {/* distance label (animates on change) */}
                <AnimatePresence mode="wait">
                  <motion.text
                    key={`${n.id}-${dist ?? "inf"}`}
                    x={n.x}
                    y={n.y - 30}
                    textAnchor="middle"
                    className={cn(
                      "font-semibold",
                      dist !== undefined ? "fill-[#A78BFA]" : "fill-text-muted"
                    )}
                    style={{ fontSize: 12 }}
                    initial={{ opacity: 0, scale: 1.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {dist !== undefined ? (isSource ? "0" : dist) : "∞"}
                  </motion.text>
                </AnimatePresence>

                {(isSource || isTarget) && (
                  <text
                    x={n.x}
                    y={n.y + 40}
                    textAnchor="middle"
                    className="fill-text-muted"
                    style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}
                  >
                    {isSource ? "START" : "TARGET"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* ===== Current operation card ===== */}
        <div className="relative mt-3 rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/[0.06] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7C3AED] dark:text-[#A78BFA]">
              Step {step + 1} · {s.title}
            </p>
            <span className="hidden items-center gap-1 text-[10px] text-text-muted sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" /> settled
              <span className="h-1.5 w-1.5 rounded-full border border-[#A78BFA]" /> frontier
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]/40" /> candidate
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">{s.detail}</p>
        </div>

        {/* ===== Progress ===== */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Progress</span>
            <span className="tabular-nums">
              Step {step + 1} of {TOTAL}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-hover">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6]"
              animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}