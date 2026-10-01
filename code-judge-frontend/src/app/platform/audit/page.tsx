"use client";

import { platformApi } from "@/services/platform";
import { SectionCard, SectionSkeleton, EmptyState, ErrorState } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/audit — calls /audit only. */
export default function AuditPage() {
  const auditQ = useAsync(() => platformApi.audit(), "audit");
  return (
    <div className="space-y-4">
      <PageHeader title="Audit log" detail="Owner and privileged actions." />
      <SectionCard title="Audit log" subtitle="Owner and privileged actions.">
        {auditQ.loading ? <SectionSkeleton rows={2} /> : auditQ.error ? <ErrorState message={auditQ.error.message} onRetry={auditQ.retry} /> : (
          <EmptyState message={String((auditQ.data as { reason?: string } | null)?.reason ?? "No audit records")} />
        )}
      </SectionCard>
    </div>
  );
}
