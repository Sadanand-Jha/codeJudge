"use client";

import { useCallback } from "react";
import { useMySubscription } from "@/hooks/useMySubscription";
import { showUpgradeModal } from "@/lib/upgradePrompt";

export const SYLLABUS_IMPORT_UPGRADE = {
  code: "FEATURE_LOCKED",
  tab: "plans" as const,
  eyebrow: "Syllabus import",
  title: "Import is a paid feature",
  titleAccent: "paid",
  description:
    "Upgrade to a monthly plan to turn PDF, DOCX, or TXT documents into a ready-to-edit syllabus with AI.",
  message: "Syllabus import is available on paid plans.",
};

/**
 * Paid-plan gate for AI syllabus imports. Manual syllabus creation stays free;
 * only the AI document import requires a paid monthly plan.
 */
export function useSyllabusImportAccess() {
  const { subscription, isLoading } = useMySubscription();
  const hasPaidPlan = subscription?.isPaid === true;

  const openUpgrade = useCallback(() => {
    showUpgradeModal(SYLLABUS_IMPORT_UPGRADE);
  }, []);

  const requestImport = useCallback(
    (action: () => void) => {
      if (isLoading) return;
      if (!hasPaidPlan) {
        openUpgrade();
        return;
      }
      action();
    },
    [hasPaidPlan, isLoading, openUpgrade]
  );

  return { subscription, isLoading, hasPaidPlan, openUpgrade, requestImport };
}
