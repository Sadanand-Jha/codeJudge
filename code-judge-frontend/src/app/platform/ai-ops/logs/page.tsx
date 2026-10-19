"use client";

import { useMemo, useState } from "react";
import { Gauge, GitBranch, ScrollText, TriangleAlert } from "lucide-react";
import {
  FEATURES,
  REQUEST_LOGS,
  featureLabel,
  modelName,
  type LogAttempt,
  type LogStatus,
  type RequestLog,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  CopyButton,
  DataTable,
  Drawer,
  FilterSelect,
  KeyValueList,
  KpiCard,
  NoteBanner,
  RefreshDemoButton,
  SearchInput,
  SectionCard,
  StatusBadge,
  fmtCompact,
  fmtInt,
  fmtMoney,
  fmtMs,
  fmtPct,
  useDemoRefresh,
  type Column,
  type SelectOption,
  type StatusTone,
} from "@/components/platform/ai-ops/primitives";

type StatusFilter = "all" | LogStatus;

const STATUS_TONE: Record<LogStatus, StatusTone> = {
  success: "ok",
  fallback: "warn",
  failed: "bad",
  running: "info",
};

const ATTEMPT_TONE: Record<LogAttempt["status"], StatusTone> = {
  ok: "ok",
  timeout: "warn",
  rate_limited: "warn",
  error: "bad",
};

const attemptLabel = (status: LogAttempt["status"]) => status.replace("_", " ");

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "fallback", label: "Fallback" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
];

const LOG_USERS = Array.from(new Set(REQUEST_LOGS.map((row) => row.user))).sort();

const USER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All users" },
  ...LOG_USERS.map((user) => ({ value: user, label: user })),
];

const FEATURE_OPTIONS: SelectOption[] = [
  { value: "all", label: "All features" },
  ...FEATURES.map((feature) => ({ value: feature.id, label: feature.label })),
];

const reportedDiffers = (row: RequestLog) => {
  if (row.reportedCostInr === null) return false;
  return Math.abs(row.reportedCostInr - row.costInr) / (row.costInr || 1) > 0.05;
};

export default function AiOpsLogsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [feature, setFeature] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { refreshing, lastRefreshed, refresh } = useDemoRefresh();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return REQUEST_LOGS.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (feature !== "all" && row.feature !== feature) return false;
      if (userFilter !== "all" && row.user !== userFilter) return false;
      if (!needle) return true;
      const haystack = [
        row.requestId,
        row.user,
        row.feature,
        featureLabel(row.feature),
        row.promptPreview,
        row.primaryModel,
        row.finalModel,
        modelName(row.primaryModel),
        modelName(row.finalModel),
        ...row.attempts.flatMap((attempt) => [attempt.model, modelName(attempt.model)]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, status, feature, userFilter]);

  const selected = selectedId ? REQUEST_LOGS.find((row) => row.requestId === selectedId) ?? null : null;

  const successCount = filtered.filter((row) => row.status === "success").length;
  const fallbackCount = filtered.filter((row) => row.status === "fallback").length;
  const failedCount = filtered.filter((row) => row.status === "failed").length;
  const successRate = filtered.length > 0 ? (successCount / filtered.length) * 100 : 0;

  const columns: Column<RequestLog>[] = [
    {
      key: "time",
      header: "Time",
      sortValue: (row) => row.tsIso,
      render: (row) => <span className="whitespace-nowrap text-[12px] text-[var(--qs-muted)]">{row.ts}</span>,
    },
    {
      key: "requestId",
      header: "Request ID",
      sortValue: (row) => row.requestId,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] text-[var(--qs-ink)]">{row.requestId}</span>
          <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <CopyButton value={row.requestId} />
          </span>
        </div>
      ),
    },
    {
      key: "user",
      header: "User",
      sortValue: (row) => row.user,
      render: (row) => <span className="font-bold text-[var(--qs-ink)]">{row.user}</span>,
    },
    {
      key: "feature",
      header: "Feature",
      sortValue: (row) => featureLabel(row.feature),
      render: (row) => <span className="whitespace-nowrap text-[var(--qs-ink)]">{featureLabel(row.feature)}</span>,
    },
    {
      key: "models",
      header: "Models",
      sortValue: (row) => row.primaryModel,
      render: (row) => (
        <div className="min-w-[150px]">
          <p className="font-bold text-[var(--qs-ink)]">{modelName(row.primaryModel)}</p>
          {row.finalModel !== row.primaryModel ? (
            <p className="text-[11.5px] text-[var(--qs-muted)]">→ {modelName(row.finalModel)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge tone={STATUS_TONE[row.status]} dot>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "tokens",
      header: "Tokens",
      align: "right",
      sortValue: (row) => row.inputTokens + row.outputTokens,
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="font-bold text-[var(--qs-ink)]">in {fmtCompact(row.inputTokens)}</p>
          <p className="text-[11.5px] text-[var(--qs-muted)]">out {fmtCompact(row.outputTokens)}</p>
        </div>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      sortValue: (row) => row.costInr,
      render: (row) => <span className="font-bold text-[var(--qs-ink)]">{fmtMoney(row.costInr)}</span>,
    },
    {
      key: "latency",
      header: "Latency",
      align: "right",
      sortValue: (row) => row.latencyMs,
      render: (row) => (
        <span className="whitespace-nowrap text-[12px] text-[var(--qs-muted)]">{fmtMs(row.latencyMs)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Observability"
        title="Request logs"
        description="A sample batch of AI requests with routing attempts, latency, token usage and sanitized previews. Live tailing is not connected in this demo."
        actions={
          <>
            <span className="text-[12px] font-bold text-[var(--qs-muted)]">
              {fmtInt(filtered.length)} of {fmtInt(REQUEST_LOGS.length)} records
            </span>
            <RefreshDemoButton refreshing={refreshing} onRefresh={refresh} lastRefreshed={lastRefreshed} />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Matching requests"
          value={fmtInt(filtered.length)}
          hint="current filters"
          icon={ScrollText}
        />
        <KpiCard
          label="Success rate"
          value={fmtPct(successRate)}
          hint={`${fmtInt(successCount)} successful`}
          icon={Gauge}
        />
        <KpiCard
          label="Fallbacks"
          value={fmtInt(fallbackCount)}
          hint="served by a fallback model"
          icon={GitBranch}
        />
        <KpiCard
          label="Failed"
          value={fmtInt(failedCount)}
          hint="exhausted every attempt"
          icon={TriangleAlert}
        />
      </div>

      <NoteBanner tone="info">
        Live tail streaming requires the logs API — this table shows the latest sample batch only.
      </NoteBanner>

      <SectionCard
        title="Recent requests"
        subtitle="Newest first · click a row for routing attempts and sanitized previews"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search ID, user, feature, model…"
              className="w-[230px]"
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as StatusFilter)}
              options={STATUS_OPTIONS}
              className="w-[150px]"
            />
            <FilterSelect
              label="Feature"
              value={feature}
              onChange={setFeature}
              options={FEATURE_OPTIONS}
              className="w-[210px]"
            />
            <FilterSelect
              label="User"
              value={userFilter}
              onChange={setUserFilter}
              options={USER_OPTIONS}
              className="w-[170px]"
            />
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.requestId}
          pageSize={12}
          initialSortKey="time"
          initialSortDir="desc"
          onRowClick={(row) => setSelectedId(row.requestId)}
          emptyLabel="No requests match the current filters."
        />
      </SectionCard>

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? selected.requestId : "Request"}
        subtitle={selected ? `${selected.user} · ${featureLabel(selected.feature)}` : undefined}
      >
        {selected ? (
          <div className="space-y-5">
            <KeyValueList
              columns={2}
              items={[
                {
                  label: "Request ID",
                  value: (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px]">{selected.requestId}</span>
                      <CopyButton value={selected.requestId} />
                    </span>
                  ),
                },
                { label: "User", value: selected.user },
                { label: "Feature", value: featureLabel(selected.feature) },
                { label: "Time", value: selected.ts },
                {
                  label: "Status",
                  value: (
                    <StatusBadge tone={STATUS_TONE[selected.status]} dot>
                      {selected.status}
                    </StatusBadge>
                  ),
                },
                { label: "Final model", value: modelName(selected.finalModel) },
                { label: "Latency", value: fmtMs(selected.latencyMs) },
                {
                  label: "Tokens",
                  value: `${fmtCompact(selected.inputTokens)} in · ${fmtCompact(selected.outputTokens)} out`,
                },
                { label: "Estimated cost", value: fmtMoney(selected.costInr) },
                {
                  label: "Reported cost",
                  value:
                    selected.reportedCostInr === null ? (
                      "Not reported"
                    ) : (
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {fmtMoney(selected.reportedCostInr)}
                        {reportedDiffers(selected) ? (
                          <span className="text-[11.5px] font-medium text-[var(--qs-muted)]">
                            differs from estimate
                          </span>
                        ) : null}
                      </span>
                    ),
                },
              ]}
            />

            <div>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                Attempt timeline
              </p>
              <ul className="space-y-2">
                {selected.attempts.map((attempt, index) => (
                  <li
                    key={`${attempt.model}-${index}`}
                    className="rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-[13px] font-extrabold text-[var(--qs-ink)]">
                          {modelName(attempt.model)}
                        </span>
                        <StatusBadge tone={ATTEMPT_TONE[attempt.status]}>{attemptLabel(attempt.status)}</StatusBadge>
                      </div>
                      <span className="text-[11.5px] font-bold text-[var(--qs-muted)]">
                        {fmtMs(attempt.latencyMs)}
                      </span>
                    </div>
                    {attempt.errorCode || attempt.errorMessage ? (
                      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--qs-ink)]">
                        {attempt.errorCode ? <span className="font-mono font-bold">{attempt.errorCode}</span> : null}
                        {attempt.errorCode && attempt.errorMessage ? " · " : null}
                        {attempt.errorMessage}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11.5px] text-[var(--qs-muted)]">
                      {fmtCompact(attempt.inputTokens)} in · {fmtCompact(attempt.outputTokens)} out
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                  Prompt preview (sanitized)
                </p>
                <div className="whitespace-pre-wrap rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 font-mono text-[12px] text-[var(--qs-ink)]">
                  {selected.promptPreview}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                  Response preview (sanitized)
                </p>
                <div className="whitespace-pre-wrap rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 font-mono text-[12px] text-[var(--qs-ink)]">
                  {selected.responsePreview}
                </div>
              </div>
              <p className="text-[12px] leading-relaxed text-[var(--qs-muted)]">
                Previews are truncated and sanitized; raw prompts are never shown in this console.
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
