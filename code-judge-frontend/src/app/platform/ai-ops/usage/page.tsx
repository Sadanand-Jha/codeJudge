"use client";

import { useMemo, useState } from "react";
import { Download, Gauge, HandCoins, Layers, Zap } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  EFFICIENCY,
  KPIS,
  OVERVIEW_SERIES,
  RANGE_LABELS,
  SPEND_BY_FEATURE,
  SPEND_BY_MODEL,
  UNIT_ECONOMICS,
  USAGE_TOTALS,
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
  NoteBanner,
  ProgressBar,
  RefreshDemoButton,
  SectionCard,
  SegmentedControl,
  StatusBadge,
  fmtCompact,
  fmtInt,
  fmtMoney,
  useDemoRefresh,
  type Column,
} from "@/components/platform/ai-ops/primitives";

const RANGE_OPTIONS = (Object.keys(RANGE_LABELS) as DemoRange[]).map((value) => ({
  value,
  label: RANGE_LABELS[value],
}));

type SpendRow = (typeof USER_SPEND)[number];

const fmtCostPerRequest = (value: number) => `₹${value.toFixed(2)}`;

export default function AiOpsUsagePage() {
  const [range, setRange] = useState<DemoRange>("7d");
  const { refreshing, lastRefreshed, refresh } = useDemoRefresh();

  const totals = USAGE_TOTALS[range];
  const series = OVERVIEW_SERIES[range];
  const requests = KPIS[range].requests;
  const costPerRequest = requests > 0 ? totals.estimatedCostInr / requests : 0;
  const labels = useMemo(() => series.map((point) => point.label), [series]);

  const tokenSlices = useMemo(
    () =>
      [
        { label: "Input", value: totals.inputTokens, color: CHART_COLORS.blue },
        { label: "Output", value: totals.outputTokens, color: CHART_COLORS.brand },
        { label: "Reasoning", value: totals.reasoningTokens, color: CHART_COLORS.amber },
        { label: "Cached", value: totals.cachedTokens, color: CHART_COLORS.teal },
      ].filter((slice) => slice.value > 0),
    [totals],
  );

  const tokenTotal = tokenSlices.reduce((sum, slice) => sum + slice.value, 0);

  const userColumns: Column<SpendRow>[] = [
    {
      key: "user",
      header: "User",
      sortValue: (row) => row.user,
      render: (row) => <span className="font-bold text-[var(--qs-ink)]">{row.user}</span>,
    },
    {
      key: "plan",
      header: "Plan",
      sortValue: (row) => row.plan,
      render: (row) => <StatusBadge tone="neutral">{row.plan}</StatusBadge>,
    },
    {
      key: "requests",
      header: "Requests",
      align: "right",
      sortValue: (row) => row.requests,
      render: (row) => fmtInt(row.requests),
    },
    {
      key: "tokens",
      header: "Tokens (in + out)",
      align: "right",
      sortValue: (row) => row.inputTokens + row.outputTokens,
      render: (row) => <span className="whitespace-nowrap">{fmtCompact(row.inputTokens + row.outputTokens)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      sortValue: (row) => row.costInr,
      render: (row) => <span className="font-bold text-[var(--qs-ink)]">{fmtMoney(row.costInr)}</span>,
    },
    {
      key: "budget",
      header: "Budget usage",
      align: "right",
      sortValue: (row) => (row.budgetInr > 0 ? row.costInr / row.budgetInr : 0),
      render: (row) => {
        const ratio = row.budgetInr > 0 ? row.costInr / row.budgetInr : 0;
        const tone = ratio >= 0.9 ? "bad" : ratio >= 0.75 ? "warn" : "ok";
        return (
          <div className="min-w-[150px]">
            <ProgressBar value={row.costInr} max={row.budgetInr} tone={tone} />
            <p className="mt-1 whitespace-nowrap text-[11.5px] text-[var(--qs-muted)]">
              {fmtMoney(row.costInr)} of {fmtMoney(row.budgetInr)}
            </p>
          </div>
        );
      },
    },
  ];

  const showExportNote = () =>
    toast.info("Export is not wired yet", {
      description:
        "Backend integration required — sample export will be enabled once the AI operations API is available.",
    });

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Usage"
        title="Usage & costs"
        description="Token volume, estimated spend and unit economics across every AI feature. Figures are sample estimates derived from token counts — they are not provider invoices."
        actions={
          <>
            <SegmentedControl ariaLabel="Usage time range" value={range} onChange={setRange} options={RANGE_OPTIONS} />
            <RefreshDemoButton refreshing={refreshing} onRefresh={refresh} lastRefreshed={lastRefreshed} />
            <button type="button" className="b sm" onClick={showExportNote}>
              <Download size={13} />
              Export CSV
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Input tokens"
          value={fmtCompact(totals.inputTokens)}
          hint="prompt tokens across all features"
          icon={Layers}
        />
        <KpiCard
          label="Output tokens"
          value={fmtCompact(totals.outputTokens)}
          hint={`${fmtCompact(totals.reasoningTokens)} reasoning · ${fmtCompact(totals.cachedTokens)} cached`}
          icon={Zap}
        />
        <KpiCard
          label="Estimated cost"
          value={fmtMoney(totals.estimatedCostInr)}
          hint={`${fmtInt(requests)} requests in range`}
          icon={HandCoins}
        />
        <KpiCard
          label="Cost per request"
          value={fmtCostPerRequest(costPerRequest)}
          hint="estimated cost ÷ requests"
          icon={Gauge}
        />
      </div>

      {totals.reportedCostInr === null ? (
        <NoteBanner tone="warn">
          Reported provider cost is unavailable for this range — estimated cost only.
        </NoteBanner>
      ) : null}
      {totals.reconciledCostInr === null ? (
        <NoteBanner tone="info">
          Cost reconciliation is pending — provider invoices and payment fees must be wired through the billing API
          before reconciled totals are available.
        </NoteBanner>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Estimated cost trend"
          subtitle={`Sample estimated spend · ${RANGE_LABELS[range].toLowerCase()}`}
        >
          <LineChart
            ariaLabel="Estimated cost trend for the selected range"
            labels={labels}
            formatValue={(value) => fmtMoney(value)}
            series={[
              {
                name: "Estimated cost (₹)",
                color: CHART_COLORS.brand,
                points: series.map((point) => point.cost),
                area: true,
              },
            ]}
          />
        </SectionCard>
        <SectionCard title="Token mix" subtitle="Input, output, reasoning and cached tokens">
          <DonutChart
            ariaLabel="Token mix by category"
            slices={tokenSlices}
            centerLabel="total tokens"
            centerValue={fmtCompact(tokenTotal)}
            formatValue={(value) => fmtCompact(value)}
          />
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Unit economics" subtitle="Sample estimated cost per output unit">
          <ul className="space-y-2.5">
            {UNIT_ECONOMICS.map((row) => (
              <li
                key={row.label}
                className="flex flex-wrap items-start justify-between gap-2 rounded-[12px] border-2 border-[var(--qs-line)] px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[var(--qs-ink)]">{row.label}</p>
                  <p className="mt-0.5 text-[11.5px] text-[var(--qs-muted)]">{row.note}</p>
                </div>
                <span className="shrink-0 text-[14px] font-extrabold text-[var(--qs-ink)]">
                  {row.costInr === null ? "Not available" : fmtMoney(row.costInr)}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard title="Efficiency" subtitle="Cache, fallback and repair overhead">
          <ul className="space-y-2.5">
            {EFFICIENCY.map((row) => (
              <li key={row.label} className="rounded-[12px] border-2 border-[var(--qs-line)] px-3.5 py-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-bold text-[var(--qs-ink)]">{row.label}</p>
                  <span className="text-[14px] font-extrabold text-[var(--qs-ink)]">{row.value}</span>
                </div>
                <p className="mt-0.5 text-[11.5px] text-[var(--qs-muted)]">{row.hint}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Spend by model" subtitle="Last 30 days · sample estimated cost">
          <BarList
            rows={SPEND_BY_MODEL.map((row) => ({
              label: row.label,
              value: row.cost,
              sublabel: `${row.share.toFixed(1)}%`,
            }))}
            formatValue={(value) => fmtMoney(value)}
          />
        </SectionCard>
        <SectionCard title="Spend by feature" subtitle="Last 30 days · sample estimated cost">
          <BarList
            rows={SPEND_BY_FEATURE.map((row) => ({
              label: row.label,
              value: row.cost,
              sublabel: `${row.share.toFixed(1)}%`,
            }))}
            formatValue={(value) => fmtMoney(value)}
            color={CHART_COLORS.blue}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Spend by user"
        subtitle="Monthly estimated spend against each account's AI budget"
      >
        <DataTable
          columns={userColumns}
          rows={USER_SPEND}
          rowKey={(row) => row.user}
          pageSize={8}
          initialSortKey="cost"
          initialSortDir="desc"
          emptyLabel="No user spend rows available."
        />
      </SectionCard>
    </div>
  );
}
