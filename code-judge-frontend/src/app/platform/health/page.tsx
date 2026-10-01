"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { platformApi } from "@/services/platform";
import { SectionCard, HealthSkeleton, ErrorState, StatusDot } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/health — calls /health only. */
export default function HealthPage() {
  const healthQ = useAsync(() => platformApi.health(), "health");
  return (
    <div className="space-y-4">
      <PageHeader title="Platform health" detail="Service status and latency." />
      <SectionCard title="Platform health" subtitle="Service status and latency">
        {healthQ.loading ? <HealthSkeleton /> : healthQ.error ? <ErrorState message={healthQ.error.message} onRetry={healthQ.retry} /> : healthQ.data && (
          <HealthGrid services={healthQ.data.services} />
        )}
      </SectionCard>
    </div>
  );
}

function HealthGrid({ services }: { services: Record<string, { status: string; latencyMs?: number | null; note?: string }> }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {Object.entries(services).map(([name, service]) => {
        const open = expanded === name;
        return (
          <button
            type="button"
            key={name}
            aria-expanded={open}
            onClick={() => setExpanded(open ? null : name)}
            className="pf-focus rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-left transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium capitalize text-[var(--text-primary)]">{name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <span className={service.status === "operational" ? "pf-pulse" : ""}><StatusDot status={service.status} /></span>
                  {service.status === "operational" ? "Operational" : service.status === "unknown" ? "Unknown" : service.status}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] tabular-nums text-[var(--text-muted)]">
                {service.latencyMs != null ? `${service.latencyMs}ms` : "No probe"}
                <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
            {open && <div className="mt-3 border-t border-[var(--border)] pt-2.5 text-[11px] leading-relaxed text-[var(--text-muted)]">{service.note || (service.latencyMs != null ? `Latest health probe completed in ${service.latencyMs}ms.` : "This service does not currently expose a latency probe.")}</div>}
          </button>
        );
      })}
    </div>
  );
}
