"use client";

import { PageHeader } from "@/components/platform/subpage-blocks";
import { TrialRequestsAdmin } from "@/components/platform/trial-requests/TrialRequestsAdmin";

export default function PlatformTrialRequestsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Review queue"
        title="Trial requests"
        detail="Review requests for the 7-day Basic trial. Approving starts the trial, enables Basic features and grants 20 AI credits."
      />
      <TrialRequestsAdmin />
    </div>
  );
}
