"use client";

import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { recordQuestionUsage } from "@/services/aiGenerate";

/**
 * Teacher approval for a generated bank question.
 *
 * `usage_count` is only incremented by an explicit approval. The hook keeps
 * approvals for the lifetime of the current list so the button cannot be
 * pressed twice for the same bank row.
 */
export function useQuestionApproval() {
  const toast = useToast();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<number>>(() => new Set());

  const approve = useCallback(
    async (bankQuestionId?: number | null) => {
      if (!bankQuestionId || approvedIds.has(bankQuestionId) || pendingId !== null) return;

      setPendingId(bankQuestionId);
      const recorded = await recordQuestionUsage([bankQuestionId]);
      setPendingId(null);

      if (!recorded) {
        toast.error({
          title: "Could not approve question",
          description: "The usage count was not updated. Please try again.",
        });
        return;
      }

      setApprovedIds((previous) => new Set(previous).add(bankQuestionId));
      toast.success({
        title: "Question approved",
        description: "Its usage count has been updated.",
      });
    },
    [approvedIds, pendingId, toast]
  );

  return useMemo(
    () => ({
      approve,
      pendingId,
      approvedIds,
      isApproved: (bankQuestionId?: number | null) =>
        Boolean(bankQuestionId && approvedIds.has(bankQuestionId)),
    }),
    [approve, pendingId, approvedIds]
  );
}
