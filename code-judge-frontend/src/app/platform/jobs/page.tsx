"use client";

import { platformApi } from "@/services/platform";
import { SectionCard, SectionSkeleton, EmptyState, ErrorState } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/jobs — calls /jobs only. */
export default function JobsPage() {
  const jobsQ = useAsync(() => platformApi.jobs(), "jobs");
  return (
    <div className="space-y-4">
      <PageHeader title="Background jobs" detail="Queues and workers." />
      <SectionCard title="Background jobs" subtitle="Queues and workers">
        {jobsQ.loading ? <SectionSkeleton rows={3} /> : jobsQ.error ? <ErrorState message={jobsQ.error.message} onRetry={jobsQ.retry} /> : (
          <EmptyState message="Queue telemetry is not connected yet" detail={String((jobsQ.data as { reason?: string } | null)?.reason ?? "Worker throughput and failed jobs will appear after BullMQ metrics are wired.")} />
        )}
      </SectionCard>
    </div>
  );
}
