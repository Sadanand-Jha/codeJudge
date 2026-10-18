"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { getAdminQuizById, getQuizAnalytics } from "@/services/quiz";
import { AnalyticsTopBar } from "./quiz/AnalyticsTopBar";
import { AnalyticsHero } from "./quiz/AnalyticsHero";
import { OverviewTab } from "./quiz/OverviewTab";
import { QuestionsTab } from "./quiz/QuestionsTab";
import { StudentsTab } from "./quiz/StudentsTab";
import { GameTab } from "./quiz/GameTab";
import { btnPrimaryClass } from "./quiz/ui";
import type { AnalyticsData, QuizMeta } from "./quiz/types";
import { cleanStatement, prettyType, toNumber } from "./quiz/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "questions", label: "Questions" },
  { id: "students", label: "Students" },
  { id: "game", label: "Game" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function QuizAnalyticsContent({ quizId }: { quizId: string }) {
  const toast = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [meta, setMeta] = useState<QuizMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    let disposed = false;
    Promise.resolve().then(() => {
      if (disposed) return;
      setLoading(true);
      setError(false);
    });
    Promise.all([getAdminQuizById(quizId), getQuizAnalytics(quizId)])
      .then(([metaRes, analyticsRes]) => {
        if (disposed) return;
        setMeta({
          id: metaRes.id,
          name: metaRes.name,
          code: metaRes.code,
          status: metaRes.status,
          difficulty_name: metaRes.difficulty_name ?? null,
          total_marks: metaRes.total_marks ?? null,
        });
        setData(analyticsRes as unknown as AnalyticsData);
      })
      .catch(() => {
        if (!disposed) setError(true);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [quizId, reloadKey]);

  const exportCsv = () => {
    const rows = data?.question_stats ?? [];
    if (rows.length === 0) {
      toast.info({ title: "Nothing to export", description: "Question analytics is empty for this quiz." });
      return;
    }
    const header = ["Question #", "Question", "Type", "Difficulty", "Attempts", "Correct", "Incorrect", "Skipped", "Accuracy %", "Avg time (s)"];
    const lines = rows.map((q) =>
      [
        String(q.question_number),
        `"${cleanStatement(q.problem_statement).replace(/"/g, '""')}"`,
        prettyType(q.problem_type),
        q.difficulty_name ?? "",
        String(Math.round(toNumber(q.total_responses))),
        String(Math.round(toNumber(q.correct_responses))),
        String(Math.round(toNumber(q.incorrect_responses))),
        String(Math.round(toNumber(q.skipped_count))),
        toNumber(q.accuracy).toFixed(1),
        String(Math.round(toNumber(q.avg_time_ms) / 1000)),
      ].join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta?.code || "quiz"}-analytics.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success({ title: "Exported", description: "Question analytics CSV downloaded." });
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-6 pb-24 sm:px-6">
        <div className="app-skeleton mb-6 h-12 w-72 rounded-[14px]" />
        <div className="app-skeleton mb-6 h-72 rounded-[26px]" />
        <div className="mb-4 flex gap-2">
          <div className="app-skeleton h-8 w-24 rounded-full" />
          <div className="app-skeleton h-8 w-24 rounded-full" />
          <div className="app-skeleton h-8 w-24 rounded-full" />
          <div className="app-skeleton h-8 w-24 rounded-full" />
        </div>
        <div className="grid gap-[18px] lg:grid-cols-3">
          <div className="app-skeleton h-64 rounded-[22px]" />
          <div className="app-skeleton h-64 rounded-[22px]" />
          <div className="app-skeleton h-64 rounded-[22px]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-md rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-8 text-center">
          <h2 className="text-xl font-extrabold text-[var(--qs-ink)]">Analytics unavailable</h2>
          <p className="mt-2 text-sm font-medium text-[var(--qs-muted)]">
            We couldn&apos;t load this quiz&apos;s analytics. Check your connection and try again.
          </p>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className={cn("mt-5", btnPrimaryClass)}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const questions = data.question_stats ?? [];
  const totalMarks = toNumber(data.quiz?.total_marks) || toNumber(meta?.total_marks);
  const gameTotalUses = toNumber(data.game?.total_events);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 pb-24 sm:px-6">
      <AnalyticsTopBar
        quizName={meta?.name ?? "Quiz analytics"}
        code={meta?.code ?? ""}
        status={meta?.status ?? null}
        questionCount={questions.length}
        attemptCount={Math.round(toNumber(data.stats.total_attempts))}
        onExport={exportCsv}
      />

      <AnalyticsHero
        stats={data.stats}
        totalMarks={totalMarks}
        gameTotalUses={gameTotalUses}
        difficultyName={meta?.difficulty_name ?? null}
        status={meta?.status ?? null}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border-2 px-4 py-1.5 text-sm font-extrabold transition",
              tab === t.id
                ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-surface)]"
                : "border-[var(--qs-line)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          questions={questions}
          stats={data.stats}
          scatter={data.score_vs_time ?? []}
          funnel={data.funnel ?? []}
          totalMarks={totalMarks}
          gameTotalUses={gameTotalUses}
        />
      )}
      {tab === "questions" && <QuestionsTab questions={questions} />}
      {tab === "students" && (
        <StudentsTab
          students={data.students ?? []}
          totalMarks={totalMarks}
          quizId={meta ? String(meta.id) : ""}
        />
      )}
      {tab === "game" && (
        <GameTab
          game={data.game ?? { total_events: 0, by_type: [] }}
          fiftyByQuestion={data.fifty_fifty_by_question ?? []}
          timeline={data.powerup_timeline ?? []}
          livesDistribution={data.lives_distribution ?? []}
          questions={questions}
        />
      )}
    </div>
  );
}
