"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { platformApi } from "@/services/platform";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "@/lib/toast";

/**
 * Owner-only action that re-grades every final attempt for a quiz using the
 * current questions/options. Safe to re-run; the backend forces a fresh pass.
 */
export function RecalculateQuizButton({
  quizId,
  quizName,
  compact = false,
}: {
  quizId: number;
  quizName?: string | null;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const label = quizName?.trim() || `Quiz #${quizId}`;

  const recalculate = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(`Recalculate all results for "${label}"? Every completed attempt will be re-graded.`)) {
      return;
    }

    setBusy(true);
    try {
      const result = await platformApi.recalculateQuizResults(quizId);
      if (result.queued) {
        toast.success({
          title: "Recalculation queued",
          description: `All completed attempts for ${label} will be re-graded.`,
        });
      } else if (result.attempts === 0) {
        toast.info({
          title: "Nothing to recalculate",
          description: `${label} has no completed attempts yet.`,
        });
      } else {
        toast.success({
          title: "Results recalculated",
          description: `${result.attempts} completed attempt${result.attempts === 1 ? "" : "s"} for ${label} re-graded.`,
        });
      }
    } catch (error) {
      toast.error({
        title: "Recalculation failed",
        description: getApiErrorMessage(error, "Unable to recalculate quiz results."),
      });
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={recalculate}
        disabled={busy}
        aria-label={`Recalculate results for ${label}`}
        title="Recalculate results"
        className="b b-icon sm b-ghost"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
      </button>
    );
  }

  return (
    <button type="button" onClick={recalculate} disabled={busy} className="b sm">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
      Recalculate results
    </button>
  );
}
