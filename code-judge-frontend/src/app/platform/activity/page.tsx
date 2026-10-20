"use client";

import { ActivityFeed } from "@/components/platform/ActivityFeed";
import { PageHeader } from "@/components/platform/subpage-blocks";

/* /platform/activity — calls /activity only. */
export default function ActivityPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Recent activity" detail="Filter platform events by email or username." />
      <ActivityFeed pageSize={20} />
    </div>
  );
}
