"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, PencilLine, Save, Search, XCircle } from "lucide-react";
import { platformApi } from "@/services/platform";
import type {
  AttemptResponseUpdate,
  PlatformAttemptQuestion,
  PlatformQuizAttemptDetail,
  PlatformQuizAttemptSummary,
} from "@/services/platform";
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

type Draft =
  | { kind: "single"; optionId: number | null }
  | { kind: "multi"; optionIds: number[] }
  | { kind: "text"; text: string };

const EDITABLE_STATUSES = new Set(["completed", "timed_out", "submitted_late"]);

export default function StudentResponsesPage() {
  const quizzesQ = useAsync(() => platformApi.quizOptions(), "quiz-options");
  const [quizId, setQuizId] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);

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
        title="Student responses"
        detail="Choose a quiz and an attempt, correct the saved answers, and re-grade the student's result."
      />

      <SectionCard title="1. Choose a quiz" subtitle="Quizzes with the most activity are listed first">
        {quizzesQ.loading ? (
          <SectionSkeleton rows={2} />
        ) : quizzesQ.error ? (
          <ErrorState message={quizzesQ.error.message} onRetry={quizzesQ.retry} />
        ) : !quizOptions.length ? (
          <EmptyState message="No quizzes yet" detail="Create a quiz and collect attempts before editing responses." />
        ) : (
          <div className="max-w-xl space-y-2">
            <SearchableSelect
              label="Quiz"
              value={quizId}
              options={quizOptions}
              onChange={(value) => {
                setQuizId(value);
                setAttemptId(null);
              }}
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
        <AttemptsPanel
          quizId={quizId}
          selectedAttemptId={attemptId}
          onSelect={setAttemptId}
        />
      ) : (
        <SectionCard title="2. Choose an attempt" subtitle="Pick a quiz first">
          <EmptyState message="No quiz selected" detail="Choose a quiz above to see its student attempts." />
        </SectionCard>
      )}

      {quizId && attemptId ? (
        <AttemptEditor quizId={quizId} attemptId={attemptId} />
      ) : null}
    </div>
  );
}

function AttemptsPanel({
  quizId,
  selectedAttemptId,
  onSelect,
}: {
  quizId: number;
  selectedAttemptId: number | null;
  onSelect: (attemptId: number) => void;
}) {
  const attemptsQ = useAsync(() => platformApi.quizAttempts(quizId), `quiz-attempts:${quizId}`);
  const [search, setSearch] = useState("");

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

  return (
    <SectionCard
      title="2. Choose a student attempt"
      subtitle={
        attemptsQ.data
          ? `${fmtInt(attemptsQ.data.attempts.length)} attempt${attemptsQ.data.attempts.length === 1 ? "" : "s"} · ${attemptsQ.data.quiz.name}`
          : "Select the attempt whose answers need correcting"
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
        <TableSkeleton rows={5} columns={7} />
      ) : attemptsQ.error ? (
        <ErrorState message={attemptsQ.error.message} onRetry={attemptsQ.retry} />
      ) : !rows.length ? (
        <EmptyState
          message={search.trim() ? "No matching attempts" : "No attempts yet"}
          detail={search.trim() ? "Try a different student name, email or attempt id." : "Students will appear here after they attempt this quiz."}
        />
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-[var(--border)]">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Student</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Attempt</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Status</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Score</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Correct / wrong / skipped</th>
                <th className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)]">Completed</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium text-[var(--text-secondary)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((attempt) => {
                const editable = EDITABLE_STATUSES.has(String(attempt.status).toLowerCase());
                return (
                  <tr
                    key={attempt.id}
                    className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--card-hover)] ${
                      selectedAttemptId === attempt.id ? "bg-[var(--platform-soft)]" : ""
                    }`}
                  >
                    <td className="max-w-[220px] px-3 py-3">
                      <p className="truncate font-medium text-[var(--text-primary)]">
                        {studentName(attempt)}
                      </p>
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {attempt.email ?? `Student #${attempt.userId}`}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">
                      #{attempt.id} · attempt {attempt.attemptNumber}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={attempt.status} />
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">
                      {attempt.percentage == null ? "—" : fmtPct(attempt.percentage)}
                      {attempt.score != null && (
                        <span className="ml-1 text-[11px] text-[var(--text-muted)]">({attempt.score})</span>
                      )}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-[var(--text-secondary)]">
                      {fmtInt(attempt.correctAnswers)} / {fmtInt(attempt.wrongAnswers)} / {fmtInt(attempt.skippedQuestions)}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{timeAgo(attempt.completedAt)}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelect(attempt.id)}
                        disabled={!editable}
                        title={editable ? "Edit saved answers" : "Only completed attempts can be edited"}
                        className="b sm"
                      >
                        <PencilLine size={13} />
                        Edit answers
                      </button>
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

function AttemptEditor({ quizId, attemptId }: { quizId: number; attemptId: number }) {
  const detailQ = useAsync(
    () => platformApi.attemptResponses(quizId, attemptId),
    `attempt-responses:${quizId}:${attemptId}`
  );

  return (
    <SectionCard
      title="3. Edit responses"
      subtitle={
        detailQ.data
          ? `${studentName(detailQ.data.attempt)} · ${detailQ.data.attempt.quizName}`
          : "Correct the saved answers and recalculate the result"
      }
    >
      {detailQ.loading ? (
        <SectionSkeleton rows={5} />
      ) : detailQ.error ? (
        <ErrorState message={detailQ.error.message} onRetry={detailQ.retry} />
      ) : detailQ.data ? (
        <ResponseEditor
          key={`${detailQ.data.attempt.id}:${detailQ.data.attempt.updatedAt ?? ""}`}
          detail={detailQ.data}
          onSaved={detailQ.retry}
        />
      ) : null}
    </SectionCard>
  );
}

function ResponseEditor({
  detail,
  onSaved,
}: {
  detail: PlatformQuizAttemptDetail;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(detail.questions.map((question) => [question.id, initialDraft(question)]))
  );
  const [saving, setSaving] = useState(false);
  const editable = EDITABLE_STATUSES.has(String(detail.attempt.status).toLowerCase());

  const updateDraft = (questionId: number, draft: Draft) => {
    setDrafts((current) => ({ ...current, [questionId]: draft }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const responses: AttemptResponseUpdate[] = detail.questions.map((question) => {
        const draft = drafts[question.id];
        if (draft?.kind === "multi") return { problemId: question.id, optionIds: draft.optionIds };
        if (draft?.kind === "single") return { problemId: question.id, optionId: draft.optionId };
        return { problemId: question.id, textAnswer: draft?.kind === "text" ? draft.text : "" };
      });
      const result = await platformApi.updateAttemptResponses(
        detail.attempt.quizId,
        detail.attempt.id,
        responses
      );
      toast.success({
        title: "Responses updated",
        description: `${result.updated} answer${result.updated === 1 ? "" : "s"} saved. The student's result was recalculated.`,
      });
      onSaved();
    } catch (error) {
      toast.error({
        title: "Update failed",
        description: getApiErrorMessage(error, "Unable to update the student responses."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Result" value={fmtPct(detail.attempt.percentage)} />
        <SummaryStat
          label="Correct / wrong / skipped"
          value={`${fmtInt(detail.attempt.correctAnswers)} / ${fmtInt(detail.attempt.wrongAnswers)} / ${fmtInt(detail.attempt.skippedQuestions)}`}
        />
        <SummaryStat label="Marks" value={
          detail.attempt.marksObtained == null
            ? "—"
            : `${detail.attempt.marksObtained}${detail.attempt.totalMarks ? ` / ${detail.attempt.totalMarks}` : ""}`
        } />
        <SummaryStat label="Status" value={statusLabel(detail.attempt.status)} />
      </div>

      {!editable && (
        <p className="rounded-[12px] border-2 border-[var(--qs-warn)] bg-[var(--platform-soft)] px-3 py-2 text-[12px] font-medium text-[var(--text-primary)]">
          This attempt is still in progress. Answers can be edited after the student submits or the quiz ends.
        </p>
      )}

      <div className="space-y-3">
        {detail.questions.map((question) => (
          <QuestionEditor
            key={question.id}
            question={question}
            draft={drafts[question.id] ?? initialDraft(question)}
            disabled={!editable || saving}
            onChange={(draft) => updateDraft(question.id, draft)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <p className="text-[12px] text-[var(--text-muted)]">
          Saving overwrites the stored answers for this attempt and re-grades only this student.
        </p>
        <button
          type="button"
          onClick={save}
          disabled={!editable || saving || !detail.questions.length}
          className="b pri sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save & recalculate
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  draft,
  disabled,
  onChange,
}: {
  question: PlatformAttemptQuestion;
  draft: Draft;
  disabled: boolean;
  onChange: (draft: Draft) => void;
}) {
  const isMulti = question.type === 2;
  const hasOptions = question.options.length > 0;

  return (
    <div className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--text-muted)]">
            Question {question.questionNumber ?? question.id}
            {question.typeName ? ` · ${question.typeName.replace(/_/g, " ")}` : ""}
          </p>
          <div className="mt-1 whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[var(--text-primary)]">
            {question.statement ?? `Question #${question.id}`}
          </div>
          {question.description && (
            <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text-muted)]">
              {question.description}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-muted)]">
          {question.marks == null ? "" : `${question.marks} mark${question.marks === 1 ? "" : "s"}`}
          {question.negativeMarks ? ` · -${Math.abs(question.negativeMarks)}` : ""}
        </span>
      </div>

      {hasOptions ? (
        <div className="space-y-2">
          {question.options.map((option) => {
            const checked = isMulti
              ? draft.kind === "multi" && draft.optionIds.includes(option.id)
              : draft.kind === "single" && draft.optionId === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-2.5 rounded-[12px] border-2 px-3 py-2.5 text-[13px] transition-colors ${
                  checked
                    ? "border-[var(--qs-brand)] bg-[var(--platform-soft)]"
                    : "border-[var(--border)] bg-[var(--platform-input)]"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={`question-${question.id}`}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    if (isMulti) {
                      const current = draft.kind === "multi" ? draft.optionIds : [];
                      const next = current.includes(option.id)
                        ? current.filter((id) => id !== option.id)
                        : [...current, option.id];
                      onChange({ kind: "multi", optionIds: next });
                    } else {
                      onChange({
                        kind: "single",
                        optionId: checked ? null : option.id,
                      });
                    }
                  }}
                  className="mt-0.5 accent-[var(--qs-brand)]"
                />
                <span className="min-w-0 flex-1 text-[var(--text-primary)]">
                  {option.statement ?? `Option #${option.id}`}
                </span>
                {option.isCorrect && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--qs-ink)]">
                    <CheckCircle2 size={10} /> Correct
                  </span>
                )}
              </label>
            );
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              isMulti
                ? onChange({ kind: "multi", optionIds: [] })
                : onChange({ kind: "single", optionId: null })
            }
            className="b b-ghost sm mt-1"
          >
            <XCircle size={12} />
            Clear answer
          </button>
        </div>
      ) : (
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--text-muted)]">
            Student answer
          </span>
          <textarea
            value={draft.kind === "text" ? draft.text : ""}
            onChange={(event) => onChange({ kind: "text", text: event.target.value })}
            disabled={disabled}
            rows={4}
            placeholder="No answer saved"
            className="pf-focus min-h-[96px] w-full resize-y rounded-[12px] border-2 border-[var(--border)] bg-[var(--platform-input)] p-3 font-mono text-[13px] leading-relaxed text-[var(--text-primary)] outline-none disabled:opacity-50"
          />
        </label>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border-2 border-[var(--border)] bg-[var(--platform-input)] px-3 py-2.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-[16px] font-extrabold tabular-nums text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = String(status ?? "").toLowerCase();
  const tone =
    normalized === "completed"
      ? "border-[var(--qs-ok)] bg-[var(--qs-okbg)]"
      : normalized === "in_progress"
        ? "border-[var(--qs-warn)] bg-[var(--platform-soft)]"
        : "border-[var(--border)] bg-[var(--platform-input)]";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-primary)] ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string): string {
  return String(status ?? "unknown").replace(/_/g, " ");
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

function initialDraft(question: PlatformAttemptQuestion): Draft {
  const answer = (question.response?.answer ?? {}) as Record<string, unknown>;
  if (question.type === 2) {
    const optionIds = Array.isArray(answer.selectedOptionIds)
      ? [...new Set(answer.selectedOptionIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
      : [];
    return { kind: "multi", optionIds };
  }
  if (question.options.length > 0) {
    const optionId = Number(answer.selectedOptionId);
    return {
      kind: "single",
      optionId: Number.isInteger(optionId) && optionId > 0 ? optionId : null,
    };
  }
  const text = typeof answer.text === "string" ? answer.text : "";
  return { kind: "text", text };
}
