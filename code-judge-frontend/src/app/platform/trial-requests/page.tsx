"use client";

import { PageHeader } from "@/components/platform/subpage-blocks";
import { TrialRequestsAdmin } from "@/components/platform/trial-requests/TrialRequestsAdmin";
import { BASIC_TRIAL_CREDITS } from "@/lib/constants";

export default function PlatformTrialRequestsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Review queue"
        title="Trial requests"
        detail={`Review requests for the 7-day Basic trial. Approving starts the trial, enables Basic features and grants ${BASIC_TRIAL_CREDITS} AI credits.`}
      />
      <TrialRequestsAdmin />
    </div>
  );
}
