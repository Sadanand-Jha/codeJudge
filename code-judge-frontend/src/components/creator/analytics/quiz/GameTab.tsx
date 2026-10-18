"use client";

import { useMemo } from "react";
import { EmptyNote, HBars, Panel, VBars } from "./ui";
import type { FiftyRow, GameTypeRow, LivesRow, QuestionStat, TimelineRow } from "./types";
import { prettyEvent, toNumber } from "./utils";

function timelineLabel(hour: string): string {
  const d = new Date(hour);
  if (Number.isNaN(d.getTime())) return hour;
  const day = `${d.getDate()}/${d.getMonth() + 1}`;
  const time = `${String(d.getHours()).padStart(2, "0")}h`;
  return `${day} ${time}`;
}

export function GameTab({
  game,
  fiftyByQuestion,
  timeline,
  livesDistribution,
  questions,
}: {
  game: { total_events: number | string | null | undefined; by_type: GameTypeRow[] };
  fiftyByQuestion: FiftyRow[];
  timeline: TimelineRow[];
  livesDistribution: LivesRow[];
  questions: QuestionStat[];
}) {
  const questionNumbers = useMemo(() => {
    const map = new Map<number, number>();
    questions.forEach((q) => map.set(q.id, q.question_number));
    return map;
  }, [questions]);

  const types = (game.by_type ?? []).map((t) => ({
    label: prettyEvent(t.event_type),
    uses: Math.round(toNumber(t.total_uses)),
    students: Math.round(toNumber(t.unique_users)),
  }));
  const maxUses = Math.max(...types.map((t) => t.uses), 1);

  const lives = [...livesDistribution].sort((a, b) => toNumber(a.lives_remaining) - toNumber(b.lives_remaining));

  const fifty = fiftyByQuestion.map((f) => ({
    label: `Q${questionNumbers.get(toNumber(f.question_id)) ?? toNumber(f.question_id)}`,
    uses: Math.round(toNumber(f.uses)),
  }));
  const maxFifty = Math.max(...fifty.map((f) => f.uses), 1);

  const ticks = timeline.slice(-12).map((t) => ({
    l: timelineLabel(t.hour),
    v: Math.round(toNumber(t.cnt)),
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-[18px] lg:grid-cols-2">
        <Panel title="Power-ups and lifelines" subtitle="Usage across all in-game events.">
          {types.length > 0 ? (
            <>
              <HBars
                items={types.map((t) => ({
                  l: t.label,
                  v: (t.uses / maxUses) * 100,
                  r: String(t.uses),
                }))}
              />
              <p className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">
                Total events: {Math.round(toNumber(game.total_events))} · Bar shows share of the most-used power-up.
              </p>
            </>
          ) : (
            <EmptyNote>No power-ups were used in this quiz.</EmptyNote>
          )}
        </Panel>
        <Panel title="Lives remaining" subtitle="Distribution at the end of the attempt.">
          {lives.length > 0 ? (
            <>
              <VBars
                items={lives.map((l) => ({ l: `${Math.round(toNumber(l.lives_remaining))} ♥`, v: Math.round(toNumber(l.count)) }))}
                peak
              />
              <p className="mt-2 text-xs font-semibold text-[var(--qs-muted)]">Attempts grouped by remaining lives.</p>
            </>
          ) : (
            <EmptyNote>No lives data — game mode may be disabled for this quiz.</EmptyNote>
          )}
        </Panel>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <Panel title="50-50 by question" subtitle="Where students used their fifty-fifty lifeline.">
          {fifty.length > 0 ? (
            <HBars
              items={fifty.map((f) => ({
                l: f.label,
                v: (f.uses / maxFifty) * 100,
                r: String(f.uses),
              }))}
            />
          ) : (
            <EmptyNote>No fifty-fifty usage recorded.</EmptyNote>
          )}
        </Panel>
        <Panel title="Power-up timeline" subtitle="When lifelines were used during the quiz window.">
          {ticks.length > 0 ? (
            <VBars items={ticks} peak />
          ) : (
            <EmptyNote>No timeline data yet.</EmptyNote>
          )}
        </Panel>
      </div>
    </div>
  );
}
