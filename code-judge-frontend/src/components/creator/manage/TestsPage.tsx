"use client";

import { ClipboardList } from "lucide-react";
import { ComingSoon } from "@/components/creator/layout/ComingSoon";

/**
 * Test management is not connected to production data yet. Keep this route as
 * an honest placeholder instead of exposing the previous sample tests,
 * attempts, scores and revenue figures.
 */
export function TestsPage() {
  return (
    <ComingSoon
      title="Tests — Coming Soon"
      description="Test creation and management are being connected to your real Studio data. No sample tests are shown here."
      icon={ClipboardList}
      accent="#8B5CF6"
      features={[
        "Create and organize tests",
        "Publish tests for students",
        "Track attempts and scores",
        "Manage drafts and schedules",
      ]}
    />
  );
}
