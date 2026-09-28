"use client";

import React, { useMemo, useState } from "react";

/* Dependency-free SVG charts for /platform. Minimal, no decoration. */

const COLORS = ["#EC4899", "#22C55E", "#3B82F6", "#F59E0B"];

export function SeriesChart({ points, keys, height = 180 }: {
  points: { label: string; [k: string]: unknown }[];
  keys: { key: string; label: string }[];
  height?: number;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, PAD_L = 36, PAD_B = 22, PAD_T = 8, PAD_R = 8;

  const { paths, max, xFor, yFor } = useMemo(() => {
    const visible = keys.filter((k) => !hidden.has(k.key));
    const max = Math.max(1, ...points.flatMap((p) => visible.map((k) => Number(p[k.key]) || 0)));
    const iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;
    const xFor = (i: number) => (points.length <= 1 ? PAD_L + iw / 2 : PAD_L + (i / (points.length - 1)) * iw);
    const yFor = (v: number) => PAD_T + ih - (v / max) * ih;
    const paths = visible.map((k, ki) => {
      const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(Number(p[k.key]) || 0).toFixed(1)}`).join(" ");
      const area = `${d} L${xFor(points.length - 1).toFixed(1)},${(PAD_T + ih).toFixed(1)} L${xFor(0).toFixed(1)},${(PAD_T + ih).toFixed(1)} Z`;
      return { key: k.key, label: k.label, d, area, color: COLORS[ki % COLORS.length] };
    });
    return { paths, max, xFor, yFor };
  }, [points, keys, hidden, H]);

  // Rounding small ranges can produce duplicate values (for example,
  // max=1 yields [0, 1, 1]), which creates duplicate React keys and draws
  // the same grid line twice.
  const ticks = Array.from(new Set([0, 0.5, 1].map((f) => Math.round(max * f))));

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {keys.map((k, ki) => {
          const off = hidden.has(k.key);
          return (
            <button
              key={k.key}
              onClick={() => setHidden((s) => { const n = new Set(s); if (n.has(k.key)) n.delete(k.key); else n.add(k.key); return n; })}
              className="flex items-center gap-1.5 rounded border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              style={{ opacity: off ? 0.45 : 1 }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS[ki % COLORS.length] }} />
              {k.label}
            </button>
          );
        })}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Activity chart"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          const iw = W - PAD_L - PAD_R;
          const frac = (x - PAD_L) / iw;
          const idx = Math.round(frac * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, idx)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yFor(t)} y2={yFor(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD_L - 5} y={yFor(t) + 3.5} textAnchor="end" fontSize={9} fill="var(--text-muted)">
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        ))}
        {paths.map((p) => (
          <g key={p.key}>
            <path d={p.area} fill={p.color} opacity={0.08} />
            <path className="pf-chart-path" d={p.d} fill="none" stroke={p.color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}
        {points.map((pt, i) =>
          i % Math.ceil(points.length / 8) === 0 ? (
            <text key={i} x={xFor(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {String(pt.label)}
            </text>
          ) : null
        )}
        {hover !== null && points[hover] && (
          <g className="pointer-events-none">
            <line
              x1={xFor(hover)} x2={xFor(hover)} y1={PAD_T} y2={H - PAD_B}
              stroke="var(--text-muted)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6}
            />
            {paths.map((p) => (
              <circle key={p.key} cx={xFor(hover)} cy={yFor(Number(points[hover][p.key]) || 0)} r={3} fill={p.color} stroke="var(--card)" strokeWidth={1.5} />
            ))}
            <rect x={Math.min(W - 174, Math.max(PAD_L, xFor(hover) + 10))} y={12} width={164} height={18 + paths.length * 17} rx={7} fill="var(--popover)" stroke="var(--border)" />
            <text x={Math.min(W - 164, Math.max(PAD_L + 10, xFor(hover) + 20))} y={29} fontSize={10} fontWeight={600} fill="var(--text-primary)">{String(points[hover].label)}</text>
            {paths.map((p, i) => (
              <text key={`tooltip-${p.key}`} x={Math.min(W - 164, Math.max(PAD_L + 10, xFor(hover) + 20))} y={46 + i * 17} fontSize={9.5} fill="var(--text-secondary)">
                {p.label}: {Number(points[hover][p.key]) || 0}
              </text>
            ))}
          </g>
        )}
      </svg>
      <span className="sr-only" aria-live="polite">{hover !== null && points[hover] ? `${String(points[hover].label)} ${paths.map((p) => `${p.label} ${Number(points[hover][p.key]) || 0}`).join(", ")}` : ""}</span>
    </div>
  );
}

export function HBar({ label, value, max, color = "#EC4899", right }: {
  label: string; value: number; max: number; color?: string; right?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-28 shrink-0 truncate text-[var(--text-secondary)]">{label}</span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--platform-soft-strong)]">
        <div className="h-full rounded-full" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }} />
      </div>
      <span className="w-16 shrink-0 text-right tabular-nums text-[var(--text-primary)]">{right ?? value}</span>
    </div>
  );
}

export function FunnelBars({ stages }: { stages: { label: string; value: number | null }[] }) {
  const first = stages[0]?.value ?? 0;
  return (
    <div className="space-y-2">
      {stages.map((s) => {
        const pct = s.value === null || !first ? null : Math.max(0, Math.min(100, (s.value / first) * 100));
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-center justify-between text-[12px]">
              <span className="text-[var(--text-secondary)]">{s.label}</span>
              <span className="tabular-nums text-[var(--text-primary)]">
                {s.value === null ? "—" : `${s.value}`}
                {pct !== null && <span className="ml-1.5 text-[var(--text-muted)]">{pct.toFixed(0)}%</span>}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--platform-soft-strong)]">
              <div className="h-full rounded-full bg-[#8B7CF6]" style={{ width: `${pct ?? 0}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Funnel({ stages }: { stages: { label: string; value: number | null }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value ?? 0));
  return (
    <div className="space-y-1.5">
      {stages.map((s, i) => {
        const prev = i === 0 ? null : stages[i - 1].value;
        const conv = prev && prev > 0 && s.value !== null ? `${((s.value / prev) * 100).toFixed(1)}%` : null;
        return (
          <div key={s.label}>
            <div className="flex items-center gap-2 text-[12px]">
              <span className="w-24 shrink-0 text-[var(--text-secondary)]">{s.label}</span>
              <div className="h-5 min-w-0 flex-1 overflow-hidden rounded-sm bg-[var(--platform-soft)]">
                <div
                  className="flex h-full items-center justify-end rounded-sm pr-1.5 text-[10px] tabular-nums text-white"
                  style={{ width: `${s.value !== null ? Math.max(4, (s.value / max) * 100) : 2}%`, background: "#EC4899", opacity: 0.9 - i * 0.12 }}
                >
                  {s.value ?? "—"}
                </div>
              </div>
              {conv && <span className="w-12 shrink-0 text-right tabular-nums text-[var(--success)]">{conv}</span>}
            </div>
            {i < stages.length - 1 && <div className="pl-24 text-[10px] leading-none text-[var(--text-muted)]">↓</div>}
          </div>
        );
      })}
    </div>
  );
}
