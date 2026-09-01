"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/helpers";
import { formatINR } from "@/components/creator/billing/ui";
import { StrengthBar } from "./ui";
import type { ReachPoint, SpendPoint } from "./types";

function TooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-xl">
      {children}
    </div>
  );
}

function SpendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: SpendPoint | ReachPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as SpendPoint & ReachPoint | undefined;
  if (!point) return null;
  return (
    <TooltipShell>
      <p className="font-semibold text-text-primary">{point.label}</p>
      {"spend" in point && (
        <p className="mt-1 text-text-secondary">
          Spend: <span className="font-bold text-text-primary">{formatINR((point as SpendPoint).spend)}</span>
        </p>
      )}
      {"reach" in point && (
        <p className="mt-0.5 text-text-secondary">
          Reach: <span className="font-bold text-text-primary">{(point as ReachPoint).reach}</span> students
        </p>
      )}
      {"impressions" in point && (
        <p className="mt-0.5 text-text-secondary">
          Impressions: <span className="font-bold text-text-primary">{(point as SpendPoint).impressions.toLocaleString("en-IN")}</span>
        </p>
      )}
      {"visits" in point && (point as ReachPoint).visits !== undefined && (
        <p className="mt-0.5 text-text-secondary">
          Visits: <span className="font-bold text-text-primary">{(point as ReachPoint).visits}</span>
        </p>
      )}
      {"clicks" in point && (point as SpendPoint).clicks !== undefined && (
        <p className="mt-0.5 text-text-secondary">
          Clicks: <span className="font-bold text-text-primary">{(point as SpendPoint).clicks}</span>
        </p>
      )}
    </TooltipShell>
  );
}

/** Spend + impressions over the campaign window. */
export function SpendAreaChart({
  data,
  height = 240,
}: {
  data: SpendPoint[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={14}
          />
          <YAxis
            tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
            width={52}
          />
          <Tooltip content={<SpendTooltip />} cursor={{ fill: "rgba(124,58,237,0.04)" }} />
          <Area dataKey="spend" type="monotone" fill="rgba(124,58,237,0.18)" stroke="#7C3AED" strokeWidth={2.5} animationDuration={700} dot={false} />
          <Area
            dataKey="impressions"
            type="monotone"
            fill="rgba(59,130,246,0.08)"
            stroke="#3B82F6"
            strokeWidth={2}
            animationDuration={700}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Reach-focused timeline — the primary analytics chart for reach model. */
export function ReachTimelineChart({ data, height = 240 }: { data: ReachPoint[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={14}
          />
          <YAxis tick={{ fontSize: 10.5, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} width={40} />
          <Tooltip content={<SpendTooltip />} cursor={{ fill: "rgba(236,72,153,0.04)" }} />
          <Area dataKey="reach" type="monotone" fill="rgba(236,72,153,0.14)" stroke="#EC4899" strokeWidth={2.5} animationDuration={700} dot={false} />
          <Area dataKey="visits" type="monotone" fill="rgba(99,102,241,0.08)" stroke="#6366F1" strokeWidth={2} animationDuration={700} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Weekly-style impressions vs clicks grouped bars. */
export function ImpressionsClicksBars({ data }: { data: SpendPoint[] }) {
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} width={52} />
          <Tooltip content={<SpendTooltip />} cursor={{ fill: "rgba(124,58,237,0.04)" }} />
          <Bar dataKey="impressions" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={700}>
            {data.map((d) => (
              <Cell key={d.date} fill="#3B82F6" />
            ))}
          </Bar>
          <Bar dataKey="clicks" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={700}>
            {data.map((d) => (
              <Cell key={d.date} fill="#7C3AED" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Simple horizontal funnel built with divs (crisp on any screen). */
export function FunnelList({
  steps,
}: {
  steps: Array<{ label: string; value: string; pct: number }>;
}) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-text-secondary">{step.label}</span>
            <span className="text-xs font-bold text-text-primary tabular-nums">{step.value}</span>
          </div>
          <StrengthBar strength={step.pct / 100} tone="violet" />
        </div>
      ))}
    </div>
  );
}

/** Compact legend chip. */
export function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <span key={item.label} className={cn("inline-flex items-center gap-1.5 text-[11px] text-text-muted")}>
          <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
