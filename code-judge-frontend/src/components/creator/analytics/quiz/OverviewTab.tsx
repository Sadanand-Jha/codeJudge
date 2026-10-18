"use client";

import { useMemo } from "react";
import { EmptyNote, HBars, OutlinePill, Panel, VBars, difficultyTone } from "./ui";
import type { AnalyticsStats, FunnelRow, QuestionStat, ScatterPoint } from "./types";
import { cleanStatement, fmtSec, toNumber } from "./utils";

function InsightCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0 rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[3px_3px_0_var(--qs-sun)]">
      <b className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-brand)]">{label}</b>
      <p className="mt-1 text-sm font-semibold leading-snug text-[var(--qs-ink)]">{text}</p>
    </div>
  );
}

function ScoreVsTimeChart({ points }: { points: ScatterPoint[] }) {
  const data = points
    .map((p) => ({ t: toNumber(p.x), s: toNumber(p.y), user: p.username ?? null }))
    .filter((p) => p.t >= 0);
  if (data.length === 0) {
    return <EmptyNote>No timing data yet.</EmptyNote>;
  }
  const maxT = Math.max(...data.map((p) => p.t), 60);
  const mt = Math.max(Math.ceil(maxT / 60) * 60, 60);
  const maxS = Math.max(...data.map((p) => p.s), 1);
  const yMax = Math.max(Math.ceil(maxS / 5) * 5, 5);
  const avgT = data.reduce((a, p) => a + p.t, 0) / data.length;
  const x = (t: number) => 34 + (t / mt) * 236;
  const y = (s: number) => 160 - (s / yMax) * 150;

  return (
    <>
      <svg viewBox="0 0 300 195" className="w-full" role="img" aria-label="Score versus time scatter plot">
        <path d="M34 10 V160 H270" fill="none" stroke="var(--qs-ink)" strokeWidth="2" />
        {[0, yMax / 2, yMax].map((tick) => (
          <g key={tick}>
            <text x="28" y={y(tick) + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="var(--qs-muted)">
              {Math.round(tick)}
            </text>
            <line x1="34" y1={y(tick)} x2="270" y2={y(tick)} stroke="var(--qs-line)" strokeWidth="1" strokeDasharray="3 4" />
          </g>
        ))}
        {[0, mt / 2, mt].map((tick) => (
          <text key={tick} x={x(tick)} y="178" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--qs-muted)">
            {tick <= 0 ? "0s" : fmtSec(tick)}
          </text>
        ))}
        <line
          x1={x(avgT)}
          y1="10"
          x2={x(avgT)}
          y2="160"
          stroke="var(--qs-brand)"
          strokeWidth="2"
          strokeDasharray="5 5"
          opacity="0.7"
        />
        {data.slice(0, 300).map((p, i) => {
          const cy = Math.min(160, Math.max(10, y(p.s) + ((i % 5) - 2) * 2.2));
          return (
            <circle key={i} cx={x(p.t)} cy={cy} r="5.5" fill="var(--qs-brand)" fillOpacity="0.85" stroke="var(--qs-ink)" strokeWidth="1.5">
              <title>{`${p.user ?? "Student"} · score ${p.s} · ${fmtSec(p.t)}`}</title>
            </circle>
          );
        })}
      </svg>
      <p className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">
        Dashed line marks the average completion time ({fmtSec(avgT)}).
      </p>
    </>
  );
}

function DifficultyCards({ questions }: { questions: QuestionStat[] }) {
  const groups = useMemo(() => {
    return ["Easy", "Medium", "Hard"].map((label) => {
      const items = questions.filter((q) =>
        (q.difficulty_name ?? "").toLowerCase().startsWith(label.toLowerCase())
      );
      const responses = items.reduce((a, q) => a + toNumber(q.total_responses), 0);
      const correct = items.reduce((a, q) => a + toNumber(q.correct_responses), 0);
      const times = items.map((q) => toNumber(q.avg_time_ms)).filter((t) => t > 0);
      return {
        label,
        count: items.length,
        accuracy: responses > 0 ? (correct / responses) * 100 : 0,
        avgTime: times.length > 0 ? times.reduce((a, t) => a + t, 0) / times.length / 1000 : 0,
      };
    });
  }, [questions]);

  return (
    <div className="grid gap-3.5 sm:grid-cols-3">
      {groups.map((g) => (
        <div key={g.label} className="rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4">
          <OutlinePill tone={difficultyTone(g.label)}>{g.label}</OutlinePill>
          <b className="my-1.5 block text-[30px] font-extrabold leading-none text-[var(--qs-ink)]">
            {g.accuracy > 0 ? `${g.accuracy.toFixed(0)}%` : "—"}
          </b>
          <div className="my-3 h-3 overflow-hidden rounded-full border-2 border-[var(--qs-ink)]">
            <i className="block h-full bg-[var(--qs-brand)]" style={{ width: `${Math.min(100, g.accuracy)}%` }} />
          </div>
          <small className="text-xs font-bold text-[var(--qs-muted)]">
            {g.count} question{g.count === 1 ? "" : "s"}
            {g.avgTime > 0 ? ` · avg ${fmtSec(g.avgTime)}` : ""}
          </small>
        </div>
      ))}
    </div>
  );
}

export function OverviewTab({
  questions,
  stats,
  scatter,
  funnel,
  totalMarks,
  gameTotalUses,
}: {
  questions: QuestionStat[];
  stats: AnalyticsStats;
  scatter: ScatterPoint[];
  funnel: FunnelRow[];
  totalMarks: number;
  gameTotalUses: number;
}) {
  const insights = useMemo(() => {
    const withResp = questions.filter((q) => toNumber(q.total_responses) > 0);
    if (withResp.length === 0) return [];
    const byAcc = [...withResp].sort((a, b) => toNumber(a.accuracy) - toNumber(b.accuracy));
    const lowest = byAcc[0];
    const highest = byAcc[byAcc.length - 1];
    const slowest = [...withResp].sort((a, b) => toNumber(b.avg_time_ms) - toNumber(a.avg_time_ms))[0];

    const cards: { label: string; text: string }[] = [
      {
        label: "Hardest question",
        text: `Q${lowest.question_number} is at ${toNumber(lowest.accuracy).toFixed(1)}% accuracy — ${cleanStatement(lowest.problem_statement)}`,
      },
      {
        label: "Strongest question",
        text: `Q${highest.question_number} leads at ${toNumber(highest.accuracy).toFixed(1)}% accuracy — ${cleanStatement(highest.problem_statement)}`,
      },
      {
        label: "Slowest question",
        text: `Q${slowest.question_number} takes ${fmtSec(toNumber(slowest.avg_time_ms) / 1000)} on average per response.`,
      },
      {
        label: "Pace",
        text: `Average attempt finishes in ${fmtSec(stats.average_completion_time)}.`,
      },
    ];

    const rows = [...funnel].sort((a, b) => a.question_number - b.question_number);
    let worstIdx = -1;
    let worstDrop = 0;
    for (let i = 1; i < rows.length; i++) {
      const drop = toNumber(rows[i - 1].reached) - toNumber(rows[i].reached);
      if (drop > worstDrop) {
        worstDrop = drop;
        worstIdx = i;
      }
    }
    if (worstIdx > 0 && worstDrop > 0) {
      cards.push({
        label: "Funnel drop-off",
        text: `Largest drop between Q${rows[worstIdx - 1].question_number} and Q${rows[worstIdx].question_number} — ${worstDrop} fewer attempts.`,
      });
    }

    if (gameTotalUses > 0) {
      cards.push({ label: "Power-ups", text: `Students used power-ups ${Math.round(gameTotalUses)} times during this quiz.` });
    }

    return cards;
  }, [questions, funnel, stats.average_completion_time, gameTotalUses]);

  const buckets = useMemo(() => {
    const scores = scatter.map((p) => Math.max(0, toNumber(p.y)));
    const count = 5;
    const size = totalMarks > 0 ? totalMarks / count : Math.max(1, Math.ceil(Math.max(...scores, 1) / count));
    const bins = Array.from({ length: count }, (_, i) => ({
      l: String(Math.round(i * size)),
      v: 0,
    }));
    scores.forEach((s) => {
      const idx = Math.min(count - 1, Math.floor(s / size));
      bins[Math.max(0, idx)].v += 1;
    });
    return bins;
  }, [scatter, totalMarks]);

  const funnelRows = funnel.length > 0 ? [...funnel].sort((a, b) => a.question_number - b.question_number).slice(0, 12) : [];
  const funnelPeak = Math.max(...funnelRows.map((f) => toNumber(f.reached)), 1);

  if (questions.length === 0) {
    return <EmptyNote>No analytics available yet — data appears once students start attempting.</EmptyNote>;
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Automated insights"
        subtitle="Plain-language findings pulled from live response data."
      >
        {insights.length > 0 ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((i) => (
              <InsightCard key={i.label} label={i.label} text={i.text} />
            ))}
          </div>
        ) : (
          <EmptyNote>Insights appear once students start attempting this quiz.</EmptyNote>
        )}
      </Panel>

      <div className="grid gap-[18px] lg:grid-cols-3">
        <Panel title="Score distribution" subtitle="How final marks were spread.">
          <VBars items={buckets} peak />
          <p className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">Marks scored (bucket start)</p>
        </Panel>
        <Panel title="Score vs time" subtitle="Faster finishers vs final marks.">
          <ScoreVsTimeChart points={scatter} />
        </Panel>
        <Panel title="Completion funnel" subtitle="Attempts reaching each question.">
          {funnelRows.length > 0 ? (
            <HBars
              items={funnelRows.map((f) => ({
                l: `Q${f.question_number}`,
                v: (toNumber(f.reached) / funnelPeak) * 100,
                r: String(Math.round(toNumber(f.reached))),
              }))}
            />
          ) : (
            <EmptyNote>No funnel data yet.</EmptyNote>
          )}
          {funnel.length > 12 && (
            <p className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">Showing first 12 of {funnel.length} questions.</p>
          )}
        </Panel>
      </div>

      <Panel title="Performance by difficulty" subtitle="Accuracy across the difficulty mix of this quiz.">
        {questions.length > 0 ? (
          <DifficultyCards questions={questions} />
        ) : (
          <EmptyNote>No difficulty data available.</EmptyNote>
        )}
      </Panel>
    </div>
  );
}
