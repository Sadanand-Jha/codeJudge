"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Coins, Download, Gauge, HandCoins, Layers, TriangleAlert, Zap } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  ALERTS,
  KPIS,
  OVERVIEW_SERIES,
  PROVIDER_ERRORS,
  RANGE_LABELS,
  SPEND_BY_FEATURE,
  SPEND_BY_MODEL,
  USER_SPEND,
  type DemoRange,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  BarList,
  CHART_COLORS,
  DataTable,
  DonutChart,
  KpiCard,
  LineChart,
  RefreshDemoButton,
  SectionCard,
  SegmentedControl,
  StatusBadge,
  fmtCompact,
  fmtInt,
  fmtMoney,
  fmtPct,
  useDemoRefresh,
  type Column,
} from "@/components/platform/ai-ops/primitives";

const RANGE_OPTIONS = (Object.keys(RANGE_LABELS) as DemoRange[]).map((value) => ({
  value,
  label: RANGE_LABELS[value],
}));

type SpendRow = (typeof USER_SPEND)[number];

const SEVERITY_TONE = { critical: "bad", warning: "warn", info: "info" } as const;

export default function AiOpsOverviewPage() {
  const [range, setRange] = useState<DemoRange>("7d");
  const { refreshing, lastRefreshed, refresh } = useDemoRefresh();

  const series = OVERVIEW_SERIES[range];
  const kpis = KPIS[range];

  const labels = useMemo(() => series.map((point) => point.label), [series]);

  const userColumns: Column<SpendRow>[] = [
    {
      key: "user",
      header: "User",
      render: (row) => <span className="font-bold text-[var(--qs-ink)]">{row.user}</span>,
      sortValue: (row) => row.user,
    },
    {
      key: "plan",
      header: "Plan",
      render: (row) => <StatusBadge tone="neutral">{row.plan}</StatusBadge>,
      sortValue: (row) => row.plan,
    },
    {
      key: "requests",
      header: "Requests",
      align: "right",
      render: (row) => fmtInt(row.requests),
      sortValue: (row) => row.requests,
    },
    {
      key: "costInr",
      header: "Spend",
      align: "right",
      render: (row) => <span className="font-bold">{fmtMoney(row.costInr)}</span>,
      sortValue: (row) => row.costInr,
    },
  ];

  const showExportNote = () =>
    toast.info("Export is not wired yet", {
      description: "Backend integration required — sample CSV export will be enabled once the AI operations API is available.",
    });

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Owner console · AI operations"
        title="AI Operations Overview"
        description="Health of every AI feature at a glance — spend, volume, routing quality and active alerts. All values on this page are sample data for design review."
        actions={
          <>
            <SegmentedControl ariaLabel="Time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
            <RefreshDemoButton refreshing={refreshing} onRefresh={refresh} lastRefreshed={lastRefreshed} />
            <button type="button" className="b sm" onClick={showExportNote}>
              <Download size={13} />
              Export report
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Estimated spend"
          value={fmtMoney(kpis.costInr)}
          delta={`${kpis.costDelta >= 0 ? "+" : ""}${kpis.costDelta.toFixed(1)}% vs previous`}
          deltaTone={kpis.costDelta >= 0 ? "bad" : "ok"}
          hint="based on token usage"
          icon={HandCoins}
        />
        <KpiCard
          label="AI requests"
          value={fmtCompact(kpis.requests)}
          delta={`${kpis.requestsDelta >= 0 ? "+" : ""}${kpis.requestsDelta.toFixed(1)}%`}
          deltaTone="ok"
          hint="across 8 features"
          icon={Zap}
        />
        <KpiCard
          label="Tokens processed"
          value={fmtCompact(kpis.inputTokens + kpis.outputTokens)}
          hint={`in ${fmtCompact(kpis.inputTokens)} · out ${fmtCompact(kpis.outputTokens)}`}
          icon={Layers}
        />
        <KpiCard
          label="Success rate"
          value={fmtPct(kpis.successRate)}
          delta={`fallback ${fmtPct(kpis.fallbackRate)}`}
          deltaTone={kpis.fallbackRate > 5 ? "bad" : "ok"}
          hint={`${kpis.successDelta >= 0 ? "+" : ""}${kpis.successDelta.toFixed(1)} pts`}
          icon={Gauge}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Spend trend"
          subtitle={`Estimated provider cost · last ${RANGE_LABELS[range].toLowerCase()}`}
        >
          <LineChart
            ariaLabel="Estimated AI spend trend over the selected range"
            labels={labels}
            formatValue={(value) => fmtMoney(value)}
            series={[{ name: "Cost (₹)", color: CHART_COLORS.brand, points: series.map((point) => point.cost), area: true }]}
          />
        </SectionCard>
        <SectionCard title="Token volume" subtitle="Input vs output tokens (thousands)">
          <LineChart
            ariaLabel="Input and output token volume over the selected range"
            labels={labels}
            formatValue={(value) => `${fmtInt(Math.round(value))}k`}
            series={[
              { name: "Input tokens", color: CHART_COLORS.blue, points: series.map((point) => point.input), area: true },
              { name: "Output tokens", color: CHART_COLORS.teal, points: series.map((point) => point.output) },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Spend by model" subtitle="Last 30 days · sample costs">
          <BarList
            rows={SPEND_BY_MODEL.map((row) => ({
              label: row.label,
              value: row.cost,
              sublabel: `${row.share.toFixed(1)}%`,
            }))}
            formatValue={(value) => fmtMoney(value)}
          />
        </SectionCard>
        <SectionCard title="Spend by feature" subtitle="Last 30 days · share of total spend">
          <DonutChart
            ariaLabel="Spend share by AI feature"
            slices={SPEND_BY_FEATURE.map((row, index) => ({
              label: row.label,
              value: row.cost,
              color: [CHART_COLORS.brand, CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.lilac, CHART_COLORS.green, CHART_COLORS.red, "#8A8FA3"][index] ?? CHART_COLORS.brand,
            }))}
            centerLabel="30-day total"
            centerValue={fmtMoney(61_240)}
            formatValue={(value) => fmtMoney(value)}
          />
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Top users by AI spend" subtitle="Teachers with the heaviest AI usage this month">
          <DataTable columns={userColumns} rows={USER_SPEND.slice(0, 6)} rowKey={(row) => row.user} pageSize={6} bare />
        </SectionCard>
        <SectionCard
          title="Recent provider errors"
          subtitle="Grouped by provider and error code"
          actions={
            <Link href="/platform/ai-ops/logs" className="b sm b-ghost">
              View logs
              <ArrowUpRight size={13} />
            </Link>
          }
        >
          <ul className="space-y-3">
            {PROVIDER_ERRORS.map((error) => (
              <li
                key={`${error.ts}-${error.code}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-[var(--qs-line)] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-[var(--qs-ink)]">
                    <StatusBadge tone="bad">{error.code}</StatusBadge>
                    {error.provider} · <span className="font-mono text-[12px]">{error.model}</span>
                  </p>
                  <p className="mt-1 text-[12.5px] text-[var(--qs-muted)]">{error.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-extrabold text-[var(--qs-ink)]">{fmtInt(error.occurrences)}×</p>
                  <p className="text-[11.5px] text-[var(--qs-muted)]">{error.ts}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Active alerts"
        subtitle="Open and acknowledged signals across providers, budgets and credits"
        actions={
          <Link href="/platform/ai-ops/health" className="b sm b-ghost">
            Health & alerts
            <ArrowUpRight size={13} />
          </Link>
        }
      >
        <ul className="space-y-3">
          {ALERTS.filter((alert) => alert.status !== "dismissed")
            .slice(0, 4)
            .map((alert) => (
              <li key={alert.id} className="flex flex-wrap items-start gap-3 rounded-[14px] border-2 border-[var(--qs-line)] px-3.5 py-3">
                <TriangleAlert
                  size={16}
                  className={`mt-0.5 shrink-0 ${
                    alert.severity === "critical"
                      ? "text-[var(--qs-bad)]"
                      : alert.severity === "warning"
                        ? "text-[var(--qs-warn)]"
                        : "text-[var(--qs-blue)]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-extrabold text-[var(--qs-ink)]">
                    {alert.title}
                    <StatusBadge tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</StatusBadge>
                    <StatusBadge tone={alert.status === "acknowledged" ? "info" : "neutral"}>{alert.status}</StatusBadge>
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--qs-muted)]">{alert.detail}</p>
                </div>
                <span className="shrink-0 text-[11.5px] font-bold text-[var(--qs-muted)]">{alert.ts}</span>
              </li>
            ))}
        </ul>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--qs-muted)]">
        <Coins size={14} />
        Cost figures are estimates from token counts at sample rates — they are not provider invoices.
      </div>
    </div>
  );
}
