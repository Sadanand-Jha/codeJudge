"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Gauge, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  ALERTS,
  MODEL_AVAILABILITY,
  PROVIDER_HEALTH,
  modelName,
  type AiAlert,
  type ModelAvailabilityRow,
  type ProviderHealthRow,
  type ProviderStatus,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  DataTable,
  FilterSelect,
  KpiCard,
  NoteBanner,
  RefreshDemoButton,
  SectionCard,
  StatusBadge,
  fmtMs,
  fmtPct,
  useDemoRefresh,
  type Column,
  type StatusTone,
} from "@/components/platform/ai-ops/primitives";

const PROVIDER_TONE: Record<ProviderStatus, StatusTone> = {
  operational: "ok",
  degraded: "warn",
  outage: "bad",
};

const SEVERITY_TONE: Record<AiAlert["severity"], StatusTone> = {
  critical: "bad",
  warning: "warn",
  info: "info",
};

const SEVERITY_ACCENT: Record<AiAlert["severity"], string> = {
  critical: "border-l-[var(--qs-bad)]",
  warning: "border-l-[var(--qs-warn)]",
  info: "border-l-[var(--qs-blue)]",
};

const ALERT_STATUS_TONE: Record<AiAlert["status"], StatusTone> = {
  open: "warn",
  acknowledged: "info",
  dismissed: "neutral",
};

const severityOptions = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const alertStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "dismissed", label: "Dismissed" },
];

const availabilityTone = (availability: string): StatusTone => {
  if (availability === "Available") return "ok";
  if (availability === "Partial") return "warn";
  if (availability === "Deprecating") return "info";
  return "neutral";
};

const providerColumns: Column<ProviderHealthRow>[] = [
  {
    key: "provider",
    header: "Provider",
    render: (row) => <span className="font-bold text-[var(--qs-ink)]">{row.provider}</span>,
    sortValue: (row) => row.provider,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge tone={PROVIDER_TONE[row.status]} dot>
        {row.status}
      </StatusBadge>
    ),
    sortValue: (row) => row.status,
  },
  {
    key: "modelsAvailable",
    header: "Models available",
    align: "center",
    render: (row) => <span className="font-bold text-[var(--qs-ink)]">{row.modelsAvailable}</span>,
  },
  {
    key: "avgLatencyMs",
    header: "Avg latency",
    align: "right",
    render: (row) => (row.avgLatencyMs > 0 ? fmtMs(row.avgLatencyMs) : "—"),
    sortValue: (row) => row.avgLatencyMs,
  },
  {
    key: "errorRate",
    header: "Error rate",
    align: "right",
    render: (row) => fmtPct(row.errorRate),
    sortValue: (row) => row.errorRate,
  },
  {
    key: "lastChecked",
    header: "Last checked",
    render: (row) => <span className="text-[12px] text-[var(--qs-muted)]">{row.lastChecked}</span>,
  },
];

const modelColumns: Column<ModelAvailabilityRow>[] = [
  {
    key: "model",
    header: "Model",
    sortValue: (row) => modelName(row.model),
    render: (row) => (
      <div className="min-w-[170px]">
        <p className="font-bold text-[var(--qs-ink)]">{modelName(row.model)}</p>
        <p className="font-mono text-[11.5px] text-[var(--qs-muted)]">{row.model}</p>
      </div>
    ),
  },
  {
    key: "provider",
    header: "Provider",
    sortValue: (row) => row.provider,
    render: (row) => <StatusBadge tone="neutral">{row.provider}</StatusBadge>,
  },
  {
    key: "availability",
    header: "Availability",
    render: (row) => <StatusBadge tone={availabilityTone(row.availability)}>{row.availability}</StatusBadge>,
    sortValue: (row) => row.availability,
  },
  {
    key: "latencyMs",
    header: "Latency",
    align: "right",
    render: (row) => (row.latencyMs > 0 ? fmtMs(row.latencyMs) : "—"),
    sortValue: (row) => row.latencyMs,
  },
  {
    key: "errorRate",
    header: "Error rate",
    align: "right",
    render: (row) => (row.errorRate > 0 ? fmtPct(row.errorRate) : "—"),
    sortValue: (row) => row.errorRate,
  },
  {
    key: "lastChecked",
    header: "Last checked",
    render: (row) => <span className="text-[12px] text-[var(--qs-muted)]">{row.lastChecked}</span>,
  },
];

export default function AiOpsHealthPage() {
  const { refreshing, lastRefreshed, refresh } = useDemoRefresh();
  const [alerts, setAlerts] = useState<AiAlert[]>(() => ALERTS.map((alert) => ({ ...alert })));
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const operationalCount = PROVIDER_HEALTH.filter((row) => row.status === "operational").length;
  const degradedCount = PROVIDER_HEALTH.filter((row) => row.status === "degraded").length;
  const outageCount = PROVIDER_HEALTH.filter((row) => row.status === "outage").length;
  const latencyValues = PROVIDER_HEALTH.filter((row) => row.avgLatencyMs > 0).map((row) => row.avgLatencyMs);
  const averageLatency =
    latencyValues.length > 0
      ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
      : 0;

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((alert) => {
        if (severityFilter !== "all" && alert.severity !== severityFilter) return false;
        if (statusFilter !== "all" && alert.status !== statusFilter) return false;
        return true;
      }),
    [alerts, severityFilter, statusFilter],
  );

  const updateAlertStatus = (id: string, status: AiAlert["status"]) => {
    setAlerts((previous) =>
      previous.map((alert) => (alert.id === id ? { ...alert, status } : alert)),
    );
    toast.info(status === "acknowledged" ? "Alert acknowledged (demo)" : "Alert dismissed (demo)", {
      description: "Alert state is session-only — backend integration required to update live alerts.",
    });
  };

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Reliability"
        title="Health & alerts"
        description="Provider availability, model reachability and the alert queue for AI operations. All telemetry on this page is sample data."
        actions={<RefreshDemoButton refreshing={refreshing} onRefresh={refresh} lastRefreshed={lastRefreshed} />}
      />

      <NoteBanner tone="info">
        Provider pings are sample data — live status requires the provider health API.
      </NoteBanner>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Operational" value={String(operationalCount)} hint="providers responding" icon={CheckCircle2} />
        <KpiCard label="Degraded" value={String(degradedCount)} hint="elevated latency or errors" icon={TriangleAlert} />
        <KpiCard label="Outage" value={String(outageCount)} hint="providers unavailable" icon={XCircle} />
        <KpiCard label="Average latency" value={averageLatency > 0 ? fmtMs(averageLatency) : "—"} hint="providers reporting" icon={Gauge} />
      </div>

      <SectionCard title="Provider health" subtitle="Latest sampled ping per provider">
        <DataTable
          columns={providerColumns}
          rows={PROVIDER_HEALTH}
          rowKey={(row) => row.provider}
          pageSize={0}
          emptyLabel="No provider health data."
        />
      </SectionCard>

      <SectionCard
        title="Model availability"
        subtitle="Registry models checked against their provider — sortable by model and provider."
      >
        <DataTable
          columns={modelColumns}
          rows={MODEL_AVAILABILITY}
          rowKey={(row) => row.model}
          pageSize={10}
          emptyLabel="No model availability data."
        />
      </SectionCard>

      <SectionCard
        title="Alerts"
        subtitle="Critical, warning and informational signals raised by the sample workspace."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={setSeverityFilter}
              options={severityOptions}
              className="w-[150px]"
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={alertStatusOptions}
              className="w-[160px]"
            />
          </div>
        }
      >
        {filteredAlerts.length === 0 ? (
          <p className="rounded-[14px] border-2 border-dashed border-[var(--qs-line)] px-4 py-8 text-center text-[13px] text-[var(--qs-muted)]">
            No alerts match the current filters.
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredAlerts.map((alert) => (
              <li
                key={alert.id}
                className={`rounded-[14px] border-2 border-[var(--qs-line)] border-l-4 bg-[var(--qs-surface)] px-4 py-3.5 ${
                  SEVERITY_ACCENT[alert.severity]
                } ${alert.status === "dismissed" ? "opacity-60" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-extrabold text-[var(--qs-ink)]">
                      {alert.title}
                      <StatusBadge tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</StatusBadge>
                      <StatusBadge tone={ALERT_STATUS_TONE[alert.status]}>{alert.status}</StatusBadge>
                    </p>
                    <p className="mt-1 text-[11.5px] font-bold text-[var(--qs-muted)]">
                      {alert.source} · {alert.ts}
                    </p>
                  </div>
                  {alert.status === "open" ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button type="button" className="b sm" onClick={() => updateAlertStatus(alert.id, "acknowledged")}>
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        className="b sm b-ghost"
                        onClick={() => updateAlertStatus(alert.id, "dismissed")}
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--qs-ink)]">{alert.detail}</p>
                <p className="mt-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--qs-muted)]">
                  <span className="font-extrabold text-[var(--qs-ink)]">Recommended:</span> {alert.recommendation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
