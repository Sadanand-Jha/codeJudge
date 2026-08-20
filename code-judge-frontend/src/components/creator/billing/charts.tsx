"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/helpers";
import { formatINR, formatINRCompact } from "./ui";
import type { BreakdownCategory, DailyEarningPoint, BillingMetricKey } from "./types";

export const METRIC_META: Record<
  BillingMetricKey,
  { label: string; stroke: string; fill: string; prev: string }
> = {
  earnings: { label: "Earnings", stroke: "#8B5CF6", fill: "#7C3AED", prev: "#A78BFA" },
  sales: { label: "Sales", stroke: "#38BDF8", fill: "#0EA5E9", prev: "#7DD3FC" },
  refunds: { label: "Refunds", stroke: "#FB7185", fill: "#F43F5E", prev: "#FDA4AF" },
};

interface TooltipRow {
  value?: number | string | null;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

function ChartTooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-xl">
      {children}
    </div>
  );
}

function EarningsTooltip({
  active,
  payload,
  label,
  metric,
  comparePrev,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string;
  metric: BillingMetricKey;
  comparePrev: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DailyEarningPoint | undefined;
  if (!point) return null;
  const meta = METRIC_META[metric];
  const current = point[metric];
  const prev = point.prevEarnings;
  const diff = current - prev;
  const pct = prev !== 0 ? Math.round((diff / prev) * 100) : 0;
  return (
    <ChartTooltipShell>
      <p className="font-semibold text-text-primary">{label}</p>
      <p className="mt-1 text-text-secondary">
        {meta.label}: <span className="font-bold text-text-primary">{formatINR(current)}</span>
      </p>
      {comparePrev && (
        <p className={cn("mt-0.5", diff >= 0 ? "text-emerald-500" : "text-rose-500")}>
          {diff >= 0 ? "+" : "−"}
          {formatINR(Math.abs(diff))} vs prev ({pct > 0 ? "+" : ""}
          {pct}%)
        </p>
      )}
    </ChartTooltipShell>
  );
}

function SalesTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: TooltipRow[];
  label?: string;
  metric: "sales" | "earnings";
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DailyEarningPoint | undefined;
  if (!point) return null;
  return (
    <ChartTooltipShell>
      <p className="font-semibold text-text-primary">{label}</p>
      <p className="mt-1 text-text-secondary">
        {metric === "sales" ? "Sales" : "Earnings"}:{" "}
        <span className="font-bold text-text-primary">
          {metric === "sales" ? point.sales : formatINR(point.earnings)}
        </span>
      </p>
      <p className="mt-0.5 text-text-muted">Refunds: {formatINR(point.refunds)}</p>
    </ChartTooltipShell>
  );
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload?: BreakdownCategory }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
  return (
    <ChartTooltipShell>
      <p className="font-semibold text-text-primary">{item.label}</p>
      <p className="mt-1 text-text-secondary">
        <span className="font-bold text-text-primary">{formatINR(item.amount)}</span> · {pct}%
      </p>
    </ChartTooltipShell>
  );
}

/* ============================================================
   Earnings — Last 10 Days (area chart w/ previous-period compare)
   ============================================================ */
export function EarningsAreaChart({
  data,
  metric = "earnings",
  comparePrev = true,
  height = 260,
}: {
  data: DailyEarningPoint[];
  metric?: BillingMetricKey;
  comparePrev?: boolean;
  height?: number;
}) {
  const meta = METRIC_META[metric];

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`earnGrad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.fill} stopOpacity={0.32} />
              <stop offset="100%" stopColor={meta.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatINRCompact(v)}
            width={52}
          />
          <Tooltip content={<EarningsTooltip metric={metric} comparePrev={comparePrev} />} cursor={{ stroke: "var(--border-hover)" }} />
          {comparePrev && (
            <Area
              type="monotone"
              dataKey="prevEarnings"
              stroke={meta.prev}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="transparent"
              dot={false}
            />
          )}
          <Area
            type="monotone"
            dataKey={metric}
            stroke={meta.stroke}
            strokeWidth={2.5}
            fill={`url(#earnGrad-${metric})`}
            dot={{ r: 3, fill: meta.fill, stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: meta.fill, stroke: "var(--card)", strokeWidth: 2 }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   Sales over time (bar chart)
   ============================================================ */
export function SalesBarChart({
  data,
  metric = "sales",
  height = 240,
}: {
  data: DailyEarningPoint[];
  metric?: "sales" | "earnings";
  height?: number;
}) {
  const meta = METRIC_META[metric];

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            tick={{ fontSize: 10.5, fill: "var(--text-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (metric === "sales" ? String(v) : formatINRCompact(v))}
            width={52}
          />
          <Tooltip content={<SalesTooltip metric={metric} />} cursor={{ fill: "rgba(124,58,237,0.06)" }} />
          <Bar dataKey={metric} fill={meta.fill} radius={[6, 6, 0, 0]} maxBarSize={28} animationDuration={700}>
            {data.map((d, i) => (
              <Cell key={d.date} fill={i === data.length - 1 ? meta.fill : `${meta.fill}88`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   Earnings breakdown — clean donut
   ============================================================ */
const BREAKDOWN_COLORS = ["#8B5CF6", "#EC4899", "#38BDF8", "#F59E0B"];

export function BreakdownDonut({
  data,
  total,
  height = 220,
}: {
  data: BreakdownCategory[];
  total: number;
  height?: number;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<DonutTooltip total={total} />} />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="label"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="transparent"
            cornerRadius={6}
            animationDuration={700}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">Total</p>
        <p className="text-xl font-bold tracking-tight text-text-primary tabular-nums">{formatINR(total)}</p>
      </div>
    </div>
  );
}

/* ============================================================
   Product revenue — horizontal bars (divs, crisp on mobile)
   ============================================================ */
export function ProductRevenueList({
  items,
  total,
}: {
  items: Array<{ name: string; revenue: number }>;
  total: number;
}) {
  return (
    <motion.ul className="space-y-3">
      {items.map((item, i) => {
        const pct = total > 0 ? (item.revenue / total) * 100 : 0;
        return (
          <motion.li
            key={item.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="truncate text-xs font-medium text-text-secondary">{item.name}</span>
              <span className="text-xs font-bold text-text-primary tabular-nums">{formatINR(item.revenue)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] dark:bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
