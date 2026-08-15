"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  CornerDownRight,
  Database,
  FastForward,
  Flag,
  GitBranch,
  Layers,
  Lightbulb,
  Network,
  Route,
  Sparkles,
  Timer,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/helpers";

/* =========================================================================
 * Shared primitives
 * ====================================================================== */

export function SectionHeading({
  id,
  label,
  className,
}: {
  id?: string;
  label: string;
  className?: string;
}) {
  return (
    <div id={id} className={cn("scroll-mt-28", className)}>
      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B5CF6]">
        <span className="h-px w-5 bg-[#8B5CF6]/50" />
        Section
      </span>
      <h2 className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight text-text-primary sm:text-[26px]">
        {label}
      </h2>
    </div>
  );
}

/* =========================================================================
 * 6. Lavender callout — "The one-line intuition"
 * ====================================================================== */

export function IntuitionCallout() {
  return (
    <div className="relative my-7 overflow-hidden rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#8B5CF6]/[0.12] to-[#3B82F6]/[0.06] p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#8B5CF6]/20 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] shadow-[0_8px_20px_-6px_rgba(124,58,237,0.6)]">
          <Lightbulb className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7C3AED] dark:text-[#A78BFA]">
            The one-line intuition
          </p>
          <p className="mt-1.5 text-[15px] font-medium leading-[1.7] text-text-primary">
            Always expand the currently closest unvisited node, because no future
            route can make its distance smaller when all edge weights are
            non-negative.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 8. The Core Idea — three numbered concept cards
 * ====================================================================== */

const CONCEPTS = [
  {
    n: "01",
    title: "Pick the closest",
    desc: "Always process the node with the smallest known distance.",
    icon: FastForward,
  },
  {
    n: "02",
    title: "Relax the edges",
    desc: "Try to improve the distance of neighboring nodes.",
    icon: CornerDownRight,
  },
  {
    n: "03",
    title: "Lock the answer",
    desc: "Once the closest node is selected, its shortest distance is final.",
    icon: Lock,
  },
];

function Lock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function ConceptCards() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CONCEPTS.map((c, i) => (
        <motion.div
          key={c.n}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
          className="group relative overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-card p-4 transition-colors hover:border-[#8B5CF6]/50"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.1),transparent_60%)]" />
          <div className="relative flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]">
              <c.icon className="h-4.5 w-4.5" />
            </div>
            <span className="text-[11px] font-black tracking-widest text-[#8B5CF6]/40 transition-colors group-hover:text-[#8B5CF6]/70">
              {c.n}
            </span>
          </div>
          <h4 className="relative mt-3 text-[15px] font-bold text-text-primary">{c.title}</h4>
          <p className="relative mt-1 text-[13px] leading-relaxed text-text-secondary">{c.desc}</p>
          {i < 2 && (
            <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 sm:block">
              <ChevronRight className="h-4 w-4 text-[#8B5CF6]/40" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* =========================================================================
 * 9. Mental model — horizontal flow
 * ====================================================================== */

const MENTAL_STEPS = [
  { label: "Source", desc: "dist = 0", icon: Flag },
  { label: "Closest node", desc: "min in PQ", icon: FastForward },
  { label: "Explore neighbors", desc: "relax edges", icon: Network },
  { label: "Update distances", desc: "push better", icon: ArrowDown },
  { label: "Repeat", desc: "until empty", icon: RotateCcwIcon },
];

function RotateCcwIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function MentalModel() {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-card-hover/60 px-4 py-2.5">
        <GitBranch className="h-3.5 w-3.5 text-[#8B5CF6]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          The loop, in five steps
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center">
        {MENTAL_STEPS.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.06] px-3 py-3 text-center">
              <s.icon className="h-4 w-4 text-[#7C3AED] dark:text-[#A78BFA]" />
              <span className="text-[12px] font-bold text-text-primary">{s.label}</span>
              <span className="text-[10px] text-text-muted">{s.desc}</span>
            </div>
            {i < MENTAL_STEPS.length - 1 && (
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-[#8B5CF6]/50 lg:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 * 10. Step-by-step example — graph + step timeline
 * ====================================================================== */

const EX_NODES: Record<string, { x: number; y: number }> = {
  A: { x: 60, y: 150 },
  B: { x: 190, y: 62 },
  C: { x: 190, y: 238 },
  D: { x: 340, y: 150 },
};

const EX_EDGES: { from: string; to: string; weight: number; path?: boolean }[] = [
  { from: "A", to: "C", weight: 2, path: true },
  { from: "A", to: "B", weight: 4 },
  { from: "C", to: "B", weight: 1, path: true },
  { from: "C", to: "D", weight: 8 },
  { from: "B", to: "D", weight: 5, path: true },
];

const EX_DIST: Record<string, number> = { A: 0, C: 2, B: 3, D: 8 };

const EX_STEPS = [
  { n: "STEP 01", title: "Start at node A", desc: "dist[A] = 0, push (0, A)." },
  { n: "STEP 02", title: "Visit the closest node", desc: "Pop (0, A) — relax B and C." },
  { n: "STEP 03", title: "Relax neighboring edges", desc: "A→C gives 2; A→B gives 4." },
  { n: "STEP 04", title: "Select next minimum", desc: "Pop (2, C). C→B improves B to 3." },
  { n: "STEP 05", title: "Reach destination", desc: "B→D = 8. Shortest path is A→C→B→D." },
];

export function StepExample() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Graph */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          Weighted graph
        </p>
        <svg viewBox="0 0 400 300" className="w-full" role="img" aria-label="Example graph A B C D with edge weights">
          {EX_EDGES.map((e) => {
            const f = EX_NODES[e.from];
            const t = EX_NODES[e.to];
            const mx = (f.x + t.x) / 2;
            const my = (f.y + t.y) / 2;
            return (
              <g key={`${e.from}${e.to}`}>
                <line
                  x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                  stroke={e.path ? "#8B5CF6" : "rgba(139,92,246,0.25)"}
                  strokeWidth={e.path ? 3 : 1.5}
                  strokeLinecap="round"
                />
                <text x={mx} y={my} textAnchor="middle" className="fill-[#A78BFA]" style={{ fontSize: 12, fontWeight: 700 }}>
                  {e.weight}
                </text>
              </g>
            );
          })}
          {Object.entries(EX_NODES).map(([id, n]) => (
            <g key={id}>
              <circle cx={n.x} cy={n.y} r={17} className="fill-[#1A1F2E] stroke-[#8B5CF6]" strokeWidth={2} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-white" style={{ fontSize: 12, fontWeight: 800 }}>
                {id}
              </text>
              <text x={n.x} y={n.y - 26} textAnchor="middle" className="fill-[#A78BFA]" style={{ fontSize: 11, fontWeight: 600 }}>
                {EX_DIST[id]}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-2 rounded-xl border border-[#8B5CF6]/20 bg-[#8B5CF6]/[0.06] px-3 py-2 text-[11px] text-text-secondary">
          Final distances: <span className="font-mono font-semibold text-[#7C3AED] dark:text-[#A78BFA]">A=0 · C=2 · B=3 · D=8</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          Execution timeline
        </p>
        <ol className="relative space-y-3">
          {EX_STEPS.map((s, i) => (
            <li key={s.n} className="relative flex gap-3">
              {i < EX_STEPS.length - 1 && (
                <span className="absolute left-[11px] top-7 h-full w-px bg-[#8B5CF6]/25" />
              )}
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black",
                  i === 4
                    ? "border-[#8B5CF6] bg-[#7C3AED] text-white"
                    : "border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]"
                )}
              >
                {i + 1}
              </span>
              <div className={cn("min-w-0 rounded-lg px-3 py-1.5", i === 4 && "bg-[#8B5CF6]/[0.08]")}>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8B5CF6]">
                  {s.n}
                </p>
                <p className="text-[13px] font-semibold text-text-primary">{s.title}</p>
                <p className="text-[11.5px] text-text-secondary">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* =========================================================================
 * 11. Why does `if (d != dist[u]) continue;` matter?
 * ====================================================================== */

export function WhyLineMatters() {
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-card">
      <div className="border-b border-border bg-card-hover/60 px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
          Why does this line matter?
        </span>
      </div>
      <div className="p-4">
        <pre className="overflow-x-auto rounded-lg border border-[#8B5CF6]/20 bg-[#0B0D10] px-4 py-2.5 font-mono text-[12.5px] text-[#E6E6E6]">
          <code>if (d != dist[u]) continue; // stale entry — skip it</code>
        </pre>
        <div className="mt-3 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <FlowChip icon={<Clock className="h-3.5 w-3.5" />} tone="muted" label="Old queue entry" desc="(9, B) pushed earlier" />
          <ArrowRight className="hidden h-4 w-4 text-[#8B5CF6]/50 sm:block" />
          <FlowChip icon={<Database className="h-3.5 w-3.5" />} tone="accent" label="Current best distance" desc="dist[B] = 3" />
          <ArrowRight className="hidden h-4 w-4 text-[#8B5CF6]/50 sm:block" />
          <FlowChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} tone="success" label="Skip stale value" desc="it can't be optimal" />
        </div>
      </div>
    </div>
  );
}

function FlowChip({
  icon,
  label,
  desc,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  tone: "muted" | "accent" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        tone === "muted" && "border-border bg-card-hover",
        tone === "accent" && "border-[#8B5CF6]/30 bg-[#8B5CF6]/[0.08]",
        tone === "success" && "border-[#22C55E]/30 bg-[#22C55E]/[0.08]"
      )}
    >
      <p className={cn("flex items-center gap-1.5 text-[11.5px] font-bold", tone === "accent" ? "text-[#7C3AED] dark:text-[#A78BFA]" : tone === "success" ? "text-[#22C55E]" : "text-text-primary")}>
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-[10.5px] text-text-muted">{desc}</p>
    </div>
  );
}

/* =========================================================================
 * 12. Complexity card — three columns
 * ====================================================================== */

export function ComplexityCard() {
  const cols = [
    { icon: Timer, label: "Time", value: "O((V + E) log V)", sub: "every edge relaxed once" },
    { icon: Database, label: "Space", value: "O(V)", sub: "dist array + heap" },
    { icon: Layers, label: "Data Structure", value: "Priority Queue", sub: "min-heap of (dist, node)" },
  ];
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[#8B5CF6]/25 bg-gradient-to-br from-[#8B5CF6]/[0.08] to-transparent">
      <div className="grid grid-cols-1 divide-y divide-[#8B5CF6]/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {cols.map((c) => (
          <div key={c.label} className="flex flex-col items-center gap-1 px-4 py-5 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]">
              <c.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{c.label}</p>
            <p className="font-mono text-[17px] font-bold tracking-tight text-text-primary">{c.value}</p>
            <p className="text-[11px] text-text-muted">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
 * 13. Visual intuition — before / during / after
 * ====================================================================== */

const VNODES: Record<string, { x: number; y: number }> = {
  A: { x: 60, y: 150 },
  B: { x: 190, y: 70 },
  C: { x: 190, y: 230 },
  D: { x: 340, y: 150 },
};

const VEDGES: { from: string; to: string; on?: boolean }[] = [
  { from: "A", to: "C", on: true },
  { from: "A", to: "B", on: true },
  { from: "C", to: "B", on: true },
  { from: "C", to: "D", on: true },
  { from: "B", to: "D", on: true },
];

function MiniGraph({ mode }: { mode: "before" | "during" | "after" }) {
  return (
    <svg viewBox="0 0 400 300" className="w-full" role="img" aria-label={`${mode} graph`}>
      {VEDGES.map((e) => {
        const f = VNODES[e.from];
        const t = VNODES[e.to];
        const active = mode !== "before" && e.on;
        return (
          <line
            key={`${e.from}${e.to}`}
            x1={f.x} y1={f.y} x2={t.x} y2={t.y}
            stroke={active ? "#8B5CF6" : "rgba(139,92,246,0.2)"}
            strokeWidth={active ? 3 : 1.5}
            strokeLinecap="round"
          />
        );
      })}
      {Object.entries(VNODES).map(([id, n]) => {
        const settled = mode === "after";
        const frontier = mode === "during" && (id === "B" || id === "C");
        return (
          <g key={id}>
            {frontier && (
              <motion.circle
                cx={n.x} cy={n.y} r={20} fill="none" stroke="#8B5CF6" strokeWidth={1.5}
                animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <circle
              cx={n.x} cy={n.y} r={15}
              className={cn("stroke-[#8B5CF6]", settled || frontier ? "fill-[#7C3AED]" : "fill-[#1A1F2E]")}
              strokeWidth={2}
            />
            <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-white" style={{ fontSize: 11, fontWeight: 800 }}>
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function VisualIntuition() {
  const panels = [
    { key: "before" as const, label: "Before", sub: "Unexplored graph", desc: "Every node unknown, every edge candidate." },
    { key: "during" as const, label: "During", sub: "Wavefront expansion", desc: "The settled region grows like a weighted BFS blob." },
    { key: "after" as const, label: "After", sub: "Final shortest path", desc: "Every node settled in increasing distance order." },
  ];
  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {panels.map((p, i) => (
        <motion.div
          key={p.key}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.35, delay: i * 0.08, ease: "easeOut" }}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="flex items-center justify-between border-b border-border bg-card-hover/60 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B5CF6]">{p.label}</span>
            <span className="text-[10px] text-text-muted">{p.sub}</span>
          </div>
          <MiniGraph mode={p.key} />
          <p className="px-3 pb-3 text-[11px] leading-relaxed text-text-muted">{p.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* =========================================================================
 * 14. Common mistakes — grid
 * ====================================================================== */

const MISTAKES = [
  { icon: XCircle, title: "Negative edges", desc: "Dijkstra does not work with negative edge weights — use Bellman–Ford or SPFA." },
  { icon: AlertTriangle, title: "Forgetting stale entries", desc: "Always handle outdated priority queue entries with a stale-entry skip." },
  { icon: Route, title: "Using BFS blindly", desc: "BFS only works for equal or unweighted edge costs." },
  { icon: GitBranch, title: "Wrong relaxation", desc: "Make sure the new distance is actually smaller before updating." },
];

export function MistakeGrid() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {MISTAKES.map((m, i) => (
        <motion.div
          key={m.title}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
          className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-red-500/30"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <m.icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-text-primary">{m.title}</h4>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-secondary">{m.desc}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* =========================================================================
 * 15. Takeaway — strong final section
 * ====================================================================== */

export function Takeaway() {
  return (
    <div className="relative my-8 overflow-hidden rounded-2xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#8B5CF6]/[0.14] via-[#8B5CF6]/[0.06] to-transparent p-6">
      <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
      <Sparkles className="pointer-events-none absolute right-5 top-5 h-5 w-5 text-[#8B5CF6]/40" />

      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C3AED] dark:text-[#A78BFA]">
          Final takeaway
        </p>
        <blockquote className="mt-2 text-[19px] font-bold leading-[1.45] tracking-tight text-text-primary sm:text-[21px]">
          “If you remember only one thing: always expand the node with the
          smallest tentative distance.”
        </blockquote>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SummaryChip label="Shortest path" icon={Route} />
          <span className="text-lg font-bold text-[#8B5CF6]">+</span>
          <SummaryChip label="Non-negative weights" icon={CheckCircle2} />
          <span className="text-lg font-bold text-[#8B5CF6]">=</span>
          <SummaryChip label="Dijkstra" icon={Sparkles} accent />
        </div>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  icon: Icon,
  accent,
}: {
  label: string;
  icon: typeof Route;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13px] font-bold",
        accent
          ? "border-[#7C3AED] bg-[#7C3AED] text-white"
          : "border-[#8B5CF6]/30 bg-[#8B5CF6]/[0.08] text-[#7C3AED] dark:text-[#A78BFA]"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

/* =========================================================================
 * Small informational divider used between sections
 * ====================================================================== */

export function SectionDivider() {
  return (
    <div className="my-8 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
        <Circle className="h-2 w-2 fill-[#8B5CF6] text-[#8B5CF6]" />
        continue
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}