"use client";

import { Award, Clock, ListChecks, Sparkles, BarChart3, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import { getQuestionStatus } from "@/components/quiz/creator/types";

export function LiveRail() {
  const { state, summary } = useStudio();

  const marksByDiff = state.questions.reduce(
    (acc: Record<string, { q: number; m: number }>, q) => {
      const d = q.difficulty;
      acc[d] = acc[d] || { q: 0, m: 0 };
      acc[d].q += 1;
      acc[d].m += q.marks;
      return acc;
    },
    {}
  );

  const incomplete = state.questions.filter(
    (q) => getQuestionStatus(q) !== "complete"
  );

  const totalQs = summary.questionCount || 1;
  const totalMarks = summary.totalMarks;
  const valid = summary.validQuestions;
  const healthContent = Math.max(0, Math.min(100, Math.round((valid / totalQs) * 100)));
  const healthSettings = state.settings.attemptLimit >= 1 ? 90 : 0;
  const healthPublish = Math.round(
    ((state.info.title.trim().length >= 3 ? 1 : 0) +
      (summary.validQuestions > 0 ? 1 : 0) +
      (state.audience.mode !== "public" || state.settings.attemptLimit >= 1 ? 1 : 0)) *
      (100 / 3)
  );

  return (
    <div className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-card/50 p-4 text-xs">
      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
        Live Summary
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <Metric icon={ListChecks} label="Questions" value={String(summary.questionCount)} />
        <Metric icon={Award} label="Marks" value={String(totalMarks)} />
        <Metric icon={Clock} label="Minutes" value={String(summary.totalTime)} />
        <Metric icon={BarChart3} label="Complete" value={`${valid}/${summary.questionCount}`} />
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          Difficulty
        </p>
        {(["Easy", "Medium", "Hard", "Expert"] as const).map((d) => {
          const cell = marksByDiff[d] || { q: 0, m: 0 };
          const pct = (cell.q / totalQs) * 100;
          return (
            <div key={d} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-secondary">{d}</span>
                <span className="text-[10px] font-medium text-text-primary">
                  {cell.q} · {cell.m}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-violet-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
            Needs attention ({incomplete.length})
          </p>
        </div>
        {incomplete.length === 0 ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-600 dark:text-emerald-300">Everything looks good</span>
          </div>
        ) : (
          <ul className="space-y-1">
            {incomplete.slice(0, 5).map((q) => (
              <li
                key={q.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2"
              >
                <p className="font-semibold text-amber-600 dark:text-amber-300">
                  Question {state.questions.findIndex((x) => x.id === q.id) + 1}
                </p>
                <p className="text-[10px] text-text-secondary">
                  {q.title ? "Missing correct answer" : "Question text is empty"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary">
          Quiz Health
        </p>
        <div className="space-y-2">
          <HealthRow label="Content" value={healthContent} color="pink" />
          <HealthRow label="Settings" value={healthSettings} color="amber" />
          <HealthRow label="Ready to publish" value={healthPublish} color="violet" />
        </div>
      </div>

      <div className="mt-auto border-t border-border pt-3 flex items-center gap-2 text-[10px] text-text-secondary">
        <Sparkles className="h-3.5 w-3.5 text-pink-500" />
        <span>AI Credits: 842 / 1000</span>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.02] p-2.5 text-center">
      <Icon className="mx-auto h-3.5 w-3.5 text-text-muted" />
      <p className="mt-0.5 text-lg font-bold text-text-primary">{value}</p>
      <p className="text-[10px] text-text-secondary">{label}</p>
    </div>
  );
}

function HealthRow({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClass = {
    pink: "from-pink-500 to-violet-600",
    amber: "from-amber-500 to-orange-500",
    violet: "from-violet-500 to-pink-500",
  }[color];
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[10px] text-text-secondary">{label}</span>
        <span className="text-[10px] font-medium text-text-primary">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full w-${value}/100 bg-gradient-to-r ${colorClass} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
