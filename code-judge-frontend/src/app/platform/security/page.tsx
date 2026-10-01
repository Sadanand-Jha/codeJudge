"use client";

import { CheckCircle2 } from "lucide-react";
import { platformApi } from "@/services/platform";
import { SectionCard, TableSkeleton, ErrorState, timeAgo } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { SimpleTable, PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/security — calls /security only. */
export default function SecurityPage() {
  const securityQ = useAsync(() => platformApi.security(), "security");
  return (
    <div className="space-y-4">
      <PageHeader title="Security" detail="Session protection and authentication activity." />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"><div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-primary)]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--success)]/10"><CheckCircle2 size={11} className="text-[var(--success)]" /></span> Session protection</div><p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">Owner routes require a valid, non-revoked session and server-side role verification.</p></div>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5"><div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-primary)]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--success)]/10"><CheckCircle2 size={11} className="text-[var(--success)]" /></span> Privacy-aware telemetry</div><p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">Sensitive fields are redacted. IP and user-agent data stay inside this owner-only console.</p></div>
      </div>
      <SectionCard title="Authentication activity" subtitle="Recent successful logins from the user ledger.">
        {securityQ.loading ? <TableSkeleton rows={5} columns={5} /> : securityQ.error ? <ErrorState message={securityQ.error.message} onRetry={securityQ.retry} /> : securityQ.data && (
          <SimpleTable
            head={["User", "Event", "Device", "Time", "Result"]}
            rows={securityQ.data.recentLogins.slice(0, 15).map((l) => [l.username ?? `#${l.id}`, "login", "—", timeAgo(l.at), "success"])}
            empty="No logins recorded"
          />
        )}
      </SectionCard>
    </div>
  );
}
