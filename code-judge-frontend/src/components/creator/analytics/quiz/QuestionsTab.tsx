"use client";

import { useMemo } from "react";
import { OutlinePill, Panel, HBars, EmptyNote, difficultyTone } from "./ui";
import type { QuestionStat } from "./types";
import { cleanStatement, fmtSec, prettyType, toNumber } from "./utils";

function RankList({
  rows,
  metric,
}: {
  rows: { q: QuestionStat; value: string }[];
  metric: string;
}) {
  if (rows.length === 0) return <EmptyNote>Not enough data yet.</EmptyNote>;
  return (
    <>
      {rows.map(({ q, value }, idx) => (
        <div key={q.id} className="my-2 flex items-center gap-2 sm:my-2.5 sm:gap-2.5">
          <b className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--qs-ink)] text-[10px] font-extrabold text-[var(--qs-surface)] sm:h-6 sm:w-6 sm:text-xs">
            {idx + 1}
          </b>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[11.5px] font-bold text-[var(--qs-ink)] sm:text-sm">
              Q{q.question_number} · {cleanStatement(q.problem_statement)}
            </b>
            <span className="text-[9.5px] font-semibold text-[var(--qs-muted)] sm:text-xs">
              {metric} {value}
            </span>
          </div>
          <b className="text-[11px] font-extrabold text-[var(--qs-ink)] sm:text-sm">{value}</b>
        </div>
      ))}
    </>
  );
}

export function QuestionsTab({ questions }: { questions: QuestionStat[] }) {
  const { hardest, easiest, slowest } = useMemo(() => {
    const withResp = questions.filter((q) => toNumber(q.total_responses) > 0);
    const byAcc = [...withResp].sort((a, b) => toNumber(a.accuracy) - toNumber(b.accuracy));
    const byTime = [...withResp].sort((a, b) => toNumber(b.avg_time_ms) - toNumber(a.avg_time_ms));
    return {
      hardest: byAcc.slice(0, 5).map((q) => ({ q, value: `${toNumber(q.accuracy).toFixed(1)}%` })),
      easiest: [...byAcc].reverse().slice(0, 5).map((q) => ({ q, value: `${toNumber(q.accuracy).toFixed(1)}%` })),
      slowest: byTime.slice(0, 5).map((q) => ({ q, value: fmtSec(toNumber(q.avg_time_ms) / 1000) })),
    };
  }, [questions]);

  if (questions.length === 0) {
    return <EmptyNote>No question analytics available yet.</EmptyNote>;
  }

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="grid gap-2.5 sm:gap-[18px] lg:grid-cols-3">
        <Panel title="Hardest questions" subtitle="Lowest accuracy, top 5.">
          <RankList rows={hardest} metric="Accuracy" />
        </Panel>
        <Panel title="Easiest questions" subtitle="Highest accuracy, top 5.">
          <RankList rows={easiest} metric="Accuracy" />
        </Panel>
        <Panel title="Slowest questions" subtitle="Longest average solve time, top 5.">
          <RankList rows={slowest} metric="Avg time" />
        </Panel>
      </div>

      <Panel title="Question analytics" subtitle="Every question, ranked by behaviour.">
        <div className="md:hidden space-y-2.5">
          {questions.map((q) => {
            const acc = Math.min(100, Math.max(0, toNumber(q.accuracy)));
            return (
              <div key={q.id} className="rounded-[12px] border border-[var(--qs-line)] bg-[var(--qs-surface)] p-2.5 sm:rounded-[16px] sm:border-2 sm:p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-[12px] font-extrabold text-[var(--qs-ink)] sm:text-sm">Q{q.question_number}</b>
                  <OutlinePill tone={difficultyTone(q.difficulty_name)}>{q.difficulty_name ?? "—"}</OutlinePill>
                  <span className="text-[9.5px] font-medium text-[var(--qs-muted)] sm:text-xs">{prettyType(q.problem_type)}</span>
                </div>
                <p className="mt-1.5 text-[11.5px] font-semibold leading-4 text-[var(--qs-ink)] sm:mt-2 sm:text-sm">{cleanStatement(q.problem_statement)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-[var(--qs-muted)] sm:mt-3 sm:gap-x-4 sm:gap-y-1.5 sm:text-xs">
                  <span>
                    Attempts <b className="text-[11px] font-bold text-[var(--qs-ink)] sm:text-sm">{Math.round(toNumber(q.total_responses))}</b>
                  </span>
                  <span>
                    Correct <b className="text-[11px] font-bold text-[var(--qs-ink)] sm:text-sm">{Math.round(toNumber(q.correct_responses))}</b>
                  </span>
                  <span>
                    Incorrect <b className="text-[11px] font-bold text-[var(--qs-ink)] sm:text-sm">{Math.round(toNumber(q.incorrect_responses))}</b>
                  </span>
                  <span>
                    Skipped <b className="text-[11px] font-bold text-[var(--qs-ink)] sm:text-sm">{Math.round(toNumber(q.skipped_count))}</b>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-3 sm:gap-x-4 sm:gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <b className="text-[11px] font-extrabold text-[var(--qs-ink)] sm:text-sm">{acc.toFixed(1)}%</b>
                    <div className="h-2 w-16 overflow-hidden rounded-full border border-[var(--qs-ink)] sm:h-2.5 sm:w-20 sm:border-2">
                      <i className="block h-full bg-[var(--qs-brand)]" style={{ width: `${acc}%` }} />
                    </div>
                  </div>
                  <span className="text-[9.5px] text-[var(--qs-muted)] sm:text-xs">
                    Avg time <b className="text-[11px] font-bold text-[var(--qs-ink)] sm:text-sm">{fmtSec(toNumber(q.avg_time_ms) / 1000)}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--qs-ink)] text-left text-xs font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                <th className="py-3 pr-4">#</th>
                <th className="py-3 pr-4">Question</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Difficulty</th>
                <th className="py-3 pr-4">Attempts</th>
                <th className="py-3 pr-4">Correct</th>
                <th className="py-3 pr-4">Incorrect</th>
                <th className="py-3 pr-4">Skipped</th>
                <th className="py-3 pr-4">Accuracy</th>
                <th className="py-3">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const acc = Math.min(100, Math.max(0, toNumber(q.accuracy)));
                return (
                  <tr key={q.id} className="border-b-2 border-[var(--qs-line)] last:border-0">
                    <td className="py-3.5 pr-4 text-sm font-extrabold text-[var(--qs-ink)]">Q{q.question_number}</td>
                    <td className="max-w-[320px] py-3.5 pr-4 text-sm font-semibold text-[var(--qs-ink)]">
                      {cleanStatement(q.problem_statement)}
                    </td>
                    <td className="py-3.5 pr-4 text-sm font-medium text-[var(--qs-muted)]">{prettyType(q.problem_type)}</td>
                    <td className="py-3.5 pr-4">
                      <OutlinePill tone={difficultyTone(q.difficulty_name)}>{q.difficulty_name ?? "—"}</OutlinePill>
                    </td>
                    <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">{Math.round(toNumber(q.total_responses))}</td>
                    <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">{Math.round(toNumber(q.correct_responses))}</td>
                    <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">{Math.round(toNumber(q.incorrect_responses))}</td>
                    <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">{Math.round(toNumber(q.skipped_count))}</td>
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <b className="min-w-[48px] text-sm font-extrabold text-[var(--qs-ink)]">{acc.toFixed(1)}%</b>
                        <div className="h-2.5 w-24 overflow-hidden rounded-full border-2 border-[var(--qs-ink)]">
                          <i className="block h-full bg-[var(--qs-brand)]" style={{ width: `${acc}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-sm font-bold text-[var(--qs-ink)]">{fmtSec(toNumber(q.avg_time_ms) / 1000)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-2.5 sm:gap-[18px] lg:grid-cols-2">
        <Panel title="Accuracy by question" subtitle="Correct rate for each question.">
          <HBars
            items={questions.map((q) => ({
              l: `Q${q.question_number}`,
              v: Math.min(100, Math.max(0, toNumber(q.accuracy))),
              r: `${toNumber(q.accuracy).toFixed(0)}%`,
            }))}
          />
        </Panel>
        <Panel title="Time spent by question" subtitle="Average seconds per response.">
          <HBars
            items={questions.map((q) => {
              const sec = toNumber(q.avg_time_ms) / 1000;
              return {
                l: `Q${q.question_number}`,
                v: sec,
                r: fmtSec(sec),
                c: "#2457d6",
              };
            })}
          />
        </Panel>
      </div>

      <Panel title="Correct vs incorrect vs skipped" subtitle="Response split for each question.">
        <div className="space-y-3">
          {questions.map((q) => {
            const c = toNumber(q.correct_responses);
            const w = toNumber(q.incorrect_responses);
            const s = toNumber(q.skipped_count);
            const total = Math.max(c + w + s, 1);
            return (
              <div key={q.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-2 sm:grid-cols-[44px_1fr_auto] sm:gap-3">
                <b className="text-[12px] font-extrabold text-[var(--qs-ink)] sm:text-sm">Q{q.question_number}</b>
                <div className="flex h-5 overflow-hidden rounded-full border border-[var(--qs-ink)] bg-[var(--qs-surface)] sm:h-6 sm:border-2">
                  <i className="block h-full bg-[var(--qs-ok)]" style={{ width: `${(c / total) * 100}%` }} />
                  <i className="block h-full bg-[var(--qs-bad)]" style={{ width: `${(w / total) * 100}%` }} />
                  <i className="block h-full bg-[var(--qs-sun)]" style={{ width: `${(s / total) * 100}%` }} />
                </div>
                <span className="text-[9px] font-bold text-[var(--qs-muted)] sm:text-xs">
                  {Math.round(c)} ✓ · {Math.round(w)} ✗ · {Math.round(s)} –
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[9px] font-extrabold uppercase tracking-[0.04em] text-[var(--qs-muted)] sm:mt-4 sm:gap-4 sm:text-xs sm:tracking-[0.05em]">
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-sm border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]" /> Correct
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-sm border-2 border-[var(--qs-ink)] bg-[var(--qs-bad)]" /> Incorrect
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-sm border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)]" /> Skipped
          </span>
        </div>
      </Panel>
    </div>
  );
}
