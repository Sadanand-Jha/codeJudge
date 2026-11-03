"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import { platformApi } from "@/services/platform";
import type { PlatformQuizAttemptSummary } from "@/services/platform";
import {
  EmptyState,
  ErrorState,
  SectionCard,
  SectionSkeleton,
  TableSkeleton,
  fmtInt,
  fmtPct,
  timeAgo,
} from "@/components/platform/ui";
import { SearchableSelect } from "@/components/platform/SearchableSelect";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "@/lib/toast";

export default function ResultAccessPage() {
  const quizzesQ = useAsync(() => platformApi.quizOptions(), "result-access:quiz-options");
  const [quizId, setQuizId] = useState<number | null>(null);

  const quizOptions = useMemo(
    () =>
      (quizzesQ.data?.quizzes ?? []).map((quiz) => ({
        id: quiz.id,
        name: `${quiz.name} · ${quiz.code}`,
        count: quiz.attempts,
      })),
    [quizzesQ.data]
  );
  const selectedQuiz = (quizzesQ.data?.quizzes ?? []).find((quiz) => quiz.id === quizId) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Result access"
        detail="Choose which students can open the detailed, question-by-question result. Marks and percentages stay visible to every student."
      />

      <SectionCard title="1. Choose a quiz" subtitle="Quizzes with the most activity are listed first">
        {quizzesQ.loading ? (
          <SectionSkeleton rows={2} />
        ) : quizzesQ.error ? (
          <ErrorState message={quizzesQ.error.message} onRetry={quizzesQ.retry} />
        ) : !quizOptions.length ? (
          <EmptyState message="No quizzes yet" detail="Create a quiz and collect attempts before controlling result access." />
        ) : (
          <div className="max-w-xl space-y-2">
            <SearchableSelect
              label="Quiz"
              value={quizId}
              options={quizOptions}
              onChange={setQuizId}
              placeholder="Search quizzes by name or code"
              triggerClassName="pf-focus h-10 rounded-[12px] border-2 border-[var(--border)] bg-[var(--platform-input)] px-3 pr-9 text-[12px] font-medium text-[var(--text-primary)]"
            />
            {selectedQuiz && (
              <p className="text-[12px] text-[var(--text-muted)]">
                {fmtInt(selectedQuiz.attempts)} attempt{selectedQuiz.attempts === 1 ? "" : "s"} · last activity{" "}
                {timeAgo(selectedQuiz.lastActivity)}
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {quizId ? (
        <AttemptAccessPanel key={quizId} quizId={quizId} />
      ) : (
        <SectionCard title="2. Student result access" subtitle="Pick a quiz first">
          <EmptyState message="No quiz selected" detail="Choose a quiz above to manage which students can see their detailed result." />
        </SectionCard>
      )}
    </div>
  );
}

function AttemptAccessPanel({ quizId }: { quizId: number }) {
  const attemptsQ = useAsync(() => platformApi.quizAttempts(quizId), `result-access:attempts:${quizId}`);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const rows = useMemo(() => {
    const all = attemptsQ.data?.attempts ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((attempt) => {
      const haystack = [
        attempt.username,
        attempt.email,
        attempt.firstName,
        attempt.lastName,
        String(attempt.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [attemptsQ.data, search]);

  const toggleVisibility = async (attempt: PlatformQuizAttemptSummary) => {
    if (savingId !== null) return;
    const next = !attempt.resultDetailsVisible;
    setSavingId(attempt.id);
    try {
      const result = await platformApi.updateAttemptResultVisibility(quizId, attempt.id, next);
      attemptsQ.setData((current) =>
        current
          ? {
              ...current,
              attempts: current.attempts.map((row) =>
                row.id === attempt.id
                  ? { ...row, resultDetailsVisible: result.resultDetailsVisible }
                  : row
              ),
            }
          : current
      );
      toast.success({
        title: next ? "Detailed result shared" : "Detailed result hidden",
        description: `${studentName(attempt)} · ${next ? "can now open the question-wise review." : "will only see marks."}`,
      });
    } catch (error) {
      toast.error({
        title: "Could not update result access",
        description: getApiErrorMessage(error, "Please try again in a moment."),
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <SectionCard
      title="2. Student result access"
      subtitle={
        attemptsQ.data
          ? `${fmtInt(attemptsQ.data.attempts.length)} attempt${attemptsQ.data.attempts.length === 1 ? "" : "s"} · ${attemptsQ.data.quiz.name}`
          : "Toggle the detailed result for each student attempt"
      }
      right={
        <label className="relative block">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student"
            className="pf-focus h-8 w-40 rounded-[10px] border-2 border-[var(--border)] bg-[var(--platform-input)] pl-7 pr-2 text-[12px] text-[var(--text-primary)] outline-none sm:w-52"
          />
        </label>
      }
    >
      {attemptsQ.loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : attemptsQ.error ? (
        <ErrorState message={attemptsQ.error.message} onRetry={attemptsQ.retry} />
      ) : !rows.length ? (
        <EmptyState
          message={search.trim() ? "No matching attempts" : "No attempts yet"}
          detail={search.trim() ? "Try a different student name, email or attempt id." : "Students will appear here after they attempt this quiz."}
        />
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-[var(--border)]">
          <table className="w-full min-w-[780px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Student</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Attempt</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Marks</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Completed</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Detailed result</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-[var(--text-secondary)]">Access</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((attempt) => {
                const visible = attempt.resultDetailsVisible;
                const saving = savingId === attempt.id;
                return (
                  <tr
                    key={attempt.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)]"
                  >
                    <td className="max-w-[240px] px-3 py-3">
                      <p className="truncate font-medium text-[var(--text-primary)]">{studentName(attempt)}</p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {attempt.email ?? `Student #${attempt.userId}`}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">
                      #{attempt.id} · attempt {attempt.attemptNumber}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">
                      {attempt.percentage == null ? "—" : fmtPct(attempt.percentage)}
                      {attempt.score != null && (
                        <span className="ml-1 text-[11px] text-[var(--text-muted)]">({attempt.score})</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{timeAgo(attempt.completedAt)}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-primary)]">
                        {visible ? <Eye size={13} /> : <EyeOff size={13} />}
                        {visible ? "Shared" : "Marks only"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={visible}
                        aria-label={`Toggle detailed result for ${studentName(attempt)}`}
                        disabled={saving}
                        onClick={() => void toggleVisibility(attempt)}
                        className="b b-switch disabled:cursor-not-allowed disabled:opacity-50"
                        title={visible ? "Hide question-wise result" : "Share question-wise result"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function studentName(student: {
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  userId: number;
}): string {
  const full = [student.firstName, student.lastName].filter(Boolean).join(" ").trim();
  return full || student.username || `Student #${student.userId}`;
}
