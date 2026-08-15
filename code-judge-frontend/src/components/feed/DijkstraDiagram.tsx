"use client";

import { motion } from "framer-motion";

interface Node {
  id: string;
  x: number;
  y: number;
  dist: number;
}

interface Edge {
  from: string;
  to: string;
  weight: number;
}

const NODES: Node[] = [
  { id: "A", x: 85, y: 70, dist: 0 },
  { id: "C", x: 315, y: 70, dist: 2 },
  { id: "B", x: 110, y: 180, dist: 3 },
  { id: "D", x: 300, y: 180, dist: 8 },
];

const EDGES: Edge[] = [
  { from: "A", to: "C", weight: 2 },
  { from: "A", to: "B", weight: 4 },
  { from: "C", to: "B", weight: 1 },
  { from: "B", to: "D", weight: 5 },
  { from: "C", to: "D", weight: 8 },
];

const EDGE_ORDER: [string, string, number][] = [
  ["A", "C", 0],
  ["C", "B", 1],
  ["B", "D", 2],
];

const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

const viewport = { once: true, amount: 0.4 } as const;

/**
 * Animated shortest-path walkthrough used inside the "Visual Intuition"
 * section of the Dijkstra article. Highlights edges in the order the
 * algorithm settles them and pulses nodes as they become final.
 */
export default function DijkstraDiagram() {
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-card-hover/60 px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Live walkthrough
        </span>
        <span className="text-[10px] text-text-muted">
          Nodes settle in order of distance
        </span>
      </div>

      <div className="p-4">
        <svg viewBox="0 0 400 250" className="w-full max-w-md mx-auto" role="img" aria-label="Dijkstra step-by-step graph walkthrough">
          {/* Edge bases */}
          {EDGES.map((e) => {
            const f = nodeById(e.from);
            const t = nodeById(e.to);
            const mx = (f.x + t.x) / 2;
            const my = (f.y + t.y) / 2;
            const isActive = EDGE_ORDER.some(
              ([a, b]) => (a === e.from && b === e.to) || (a === e.to && b === e.from)
            );
            const order = EDGE_ORDER.findIndex(
              ([a, b]) => (a === e.from && b === e.to) || (a === e.to && b === e.from)
            );
            return (
              <g key={`${e.from}${e.to}`}>
                <line
                  x1={f.x}
                  y1={f.y}
                  x2={t.x}
                  y2={t.y}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={2}
                />
                <motion.line
                  x1={f.x}
                  y1={f.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={isActive ? "#8B5CF6" : "rgba(139,92,246,0.35)"}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={viewport}
                  transition={{
                    duration: 0.5,
                    delay: isActive ? 0.4 + order * 0.7 : 0.1,
                    ease: "easeOut",
                  }}
                />
                <text
                  x={mx + (e.from === "C" ? 8 : 0)}
                  y={my}
                  textAnchor="middle"
                  className="fill-text-muted"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {e.weight}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((n, i) => (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={viewport}
              transition={{ duration: 0.4, delay: i * 0.15, ease: "easeOut" }}
            >
              {/* settled ring pulse */}
              <motion.circle
                cx={n.x}
                cy={n.y}
                r={20}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: [0, 1, 0], scale: [0.6, 1.6] }}
                viewport={viewport}
                transition={{
                  duration: 1.1,
                  delay: 0.9 + i * 0.55,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: "easeOut",
                }}
              />
              <circle cx={n.x} cy={n.y} r={17} className="fill-[#1A1F2E] stroke-[#8B5CF6]" strokeWidth={2} />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-white"
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {n.id}
              </text>
              <motion.text
                x={n.x}
                y={n.y - 26}
                textAnchor="middle"
                className="fill-[#A78BFA]"
                style={{ fontSize: 11, fontWeight: 600 }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={viewport}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }}
              >
                {n.dist === 0 ? "0 (start)" : n.dist}
              </motion.text>
            </motion.g>
          ))}
        </svg>

        <ol className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] text-text-muted">
          {EDGE_ORDER.map(([a, b], i) => (
            <li key={`${a}${b}`} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
              <span>
                {i + 1}. Settle {a}→{b}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}