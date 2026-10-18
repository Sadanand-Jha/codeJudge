"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { getStudentResponseDetail } from "@/services/quiz";
import type { StudentResponseDetail } from "@/services/quiz";
import { EmptyNote, OutlinePill } from "./ui";
import type { StudentRow } from "./types";
import { clampPercent, fmtSec, initialsOf, nameHue, toNumber } from "./utils";

type SortKey = "rank" | "score" | "time";

function rankOf(rows: StudentRow[]): Map<number, number> {
  const sorted = [...rows].sort((a, b) => {
    const d = toNumber(b.score) - toNumber(a.score);
    if (d !== 0) return d;
    return toNumber(a.time_taken) - toNumber(b.time_taken);
  });
  const map = new Map<number, number>();
  sorted.forEach((r, i) => map.set(r.attempt_id, i + 1));
  return map;
}

function ReviewChips({ detail }: { detail: StudentResponseDetail }) {
  const tone = {
    correct: "border-[var(--qs-ok)] text-[var(--qs-ok)]",
    wrong: "border-[var(--qs-bad)] text-[var(--qs-bad)]",
    unanswered: "border-dashed border-[var(--qs-line)] text-[var(--qs-muted)]",
  };
  const glyph = { correct: "✓", wrong: "✗", unanswered: "–" };
  return (
    <div className="flex flex-wrap gap-1.5">
      {detail.review.map((r) => (
        <span
          key={r.problem_id}
          title={r.problem_statement}
          className={cn("inline-flex items-center gap-1 rounded-full border-2 bg-[var(--qs-surface)] px-2 py-0.5 text-xs font-extrabold", tone[r.status])}
        >
          Q{r.question_number} {glyph[r.status]}
        </span>
      ))}
    </div>
  );
}

export function StudentsTab({
  students,
  totalMarks,
  quizId,
}: {
  students: StudentRow[];
  totalMarks: number;
  quizId: string;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("rank");
  const [openId, setOpenId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [cache, setCache] = useState<Record<number, StudentResponseDetail>>({});

  const ranks = useMemo(() => rankOf(students), [students]);

  const rows = useMemo(() => {
    const filtered = students.filter((s) => {
      const name = (s.username ?? `User ${s.user_id}`).toLowerCase();
      return q.trim() === "" || name.includes(q.trim().toLowerCase()) || String(s.user_id).includes(q.trim());
    });
    const sorted = [...filtered];
    if (sort === "rank") {
      sorted.sort((a, b) => (ranks.get(a.attempt_id) ?? 0) - (ranks.get(b.attempt_id) ?? 0));
    } else if (sort === "score") {
      sorted.sort((a, b) => toNumber(b.score) - toNumber(a.score));
    } else {
      sorted.sort((a, b) => toNumber(a.time_taken) - toNumber(b.time_taken));
    }
    return sorted;
  }, [students, q, sort, ranks]);

  useEffect(() => {
    if (openId == null || cache[openId] || !quizId) return;
    const student = students.find((s) => s.attempt_id === openId);
    if (!student) return;
    let disposed = false;
    getStudentResponseDetail(quizId, student.user_id, openId)
      .then((detail) => {
        if (disposed) return;
        setCache((prev) => ({ ...prev, [openId]: detail }));
      })
      .catch(() => {
        if (!disposed) toast.error({ title: "Could not load answers", description: "Please try again in a moment." });
      })
      .finally(() => {
        if (!disposed) setLoadingId((cur) => (cur === openId ? null : cur));
      });
    return () => {
      disposed = true;
    };
  }, [openId, cache, quizId, students, toast]);

  const toggleRow = (s: StudentRow) => {
    if (openId === s.attempt_id) {
      setOpenId(null);
      return;
    }
    if (!cache[s.attempt_id]) setLoadingId(s.attempt_id);
    setOpenId(s.attempt_id);
  };

  const sortChips: { key: SortKey; label: string }[] = [
    { key: "rank", label: "Rank" },
    { key: "score", label: "Score" },
    { key: "time", label: "Time" },
  ];

  if (students.length === 0) {
    return <EmptyNote>No student attempts yet — this table fills as students submit.</EmptyNote>;
  }

  return (
    <div className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 sm:p-[22px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--qs-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or user ID"
            className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] py-2 pl-9 pr-3 text-sm font-semibold text-[var(--qs-ink)] outline-none transition focus:border-[var(--qs-brand)]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {sortChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSort(c.key)}
              className={cn(
                "rounded-full border-2 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.05em] transition",
                sort === c.key
                  ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-surface)]"
                  : "border-[var(--qs-line)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 md:hidden">
        {rows.map((s) => {
          const rank = ranks.get(s.attempt_id) ?? toNumber(s.rank);
          const pct = clampPercent(s.percentage);
          const c = toNumber(s.correct_answers);
          const w = toNumber(s.wrong_answers);
          const sk = toNumber(s.skipped_questions);
          const acc = c + w + sk > 0 ? (c / (c + w + sk)) * 100 : 0;
          const name = s.username ?? `User ${s.user_id}`;
          const hue = nameHue(name);
          const isOpen = openId === s.attempt_id;
          const detail = cache[s.attempt_id];
          return (
            <div
              key={s.attempt_id}
              onClick={() => toggleRow(s)}
              className="cursor-pointer rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3.5 transition-colors active:bg-[var(--qs-bg)]"
            >
              <div className="flex items-center gap-3">
                <b className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] text-xs font-extrabold text-[var(--qs-surface)]">
                  {rank > 0 ? rank : "—"}
                </b>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] text-xs font-extrabold"
                  style={{ background: `hsl(${hue} 75% 88%)`, color: `hsl(${hue} 65% 28%)` }}
                >
                  {initialsOf(name)}
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm font-bold text-[var(--qs-ink)]">{name}</b>
                  <span className="text-xs font-semibold text-[var(--qs-muted)]">#{s.user_id}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRow(s);
                  }}
                  aria-label={isOpen ? "Collapse answers" : "Expand answers"}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-line)] transition hover:border-[var(--qs-brand)]"
                >
                  <ChevronDown className={cn("h-4 w-4 text-[var(--qs-ink)] transition-transform", isOpen && "rotate-180")} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <b className="text-sm font-extrabold text-[var(--qs-ink)]">
                    {toNumber(s.score).toFixed(0)}
                    {totalMarks > 0 ? ` / ${totalMarks}` : ""}
                  </b>
                  <div className="h-2.5 w-14 overflow-hidden rounded-full border-2 border-[var(--qs-ink)]">
                    <i className="block h-full bg-[var(--qs-brand)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs font-semibold text-[var(--qs-muted)]">
                  Accuracy <b className="text-sm font-bold text-[var(--qs-ink)]">{acc.toFixed(1)}%</b>
                </span>
                <span className="text-xs font-semibold text-[var(--qs-muted)]">
                  Correct <b className="text-sm font-bold text-[var(--qs-ink)]">{Math.round(c)}</b>
                </span>
                <span className="text-xs font-semibold text-[var(--qs-muted)]">
                  Time <b className="text-sm font-bold text-[var(--qs-ink)]">{toNumber(s.time_taken) > 0 ? fmtSec(s.time_taken) : "—"}</b>
                </span>
                {s.status === "completed" ? (
                  <OutlinePill tone="ok">Completed</OutlinePill>
                ) : (
                  <OutlinePill tone="warn">In progress</OutlinePill>
                )}
              </div>
              {isOpen && (
                <div className="mt-3 rounded-[16px] border-2 border-dashed border-[var(--qs-line)] p-4">
                  {loadingId === s.attempt_id && !detail ? (
                    <p className="text-sm font-semibold text-[var(--qs-muted)]">Loading answers…</p>
                  ) : detail ? (
                    <ReviewChips detail={detail} />
                  ) : (
                    <p className="text-sm font-semibold text-[var(--qs-muted)]">Answers could not be loaded.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead>
            <tr className="border-b-2 border-[var(--qs-ink)] text-left text-xs font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
              <th className="py-3 pr-4">Rank</th>
              <th className="py-3 pr-4">Student</th>
              <th className="py-3 pr-4">Score</th>
              <th className="py-3 pr-4">Accuracy</th>
              <th className="py-3 pr-4">Correct</th>
              <th className="py-3 pr-4">Skipped</th>
              <th className="py-3 pr-4">Time</th>
              <th className="py-3 pr-4">Status</th>
              <th className="w-10 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const rank = ranks.get(s.attempt_id) ?? toNumber(s.rank);
              const pct = clampPercent(s.percentage);
              const c = toNumber(s.correct_answers);
              const w = toNumber(s.wrong_answers);
              const sk = toNumber(s.skipped_questions);
              const acc = c + w + sk > 0 ? (c / (c + w + sk)) * 100 : 0;
              const name = s.username ?? `User ${s.user_id}`;
              const hue = nameHue(name);
              const isOpen = openId === s.attempt_id;
              const detail = cache[s.attempt_id];
              return (
                <FragmentRow
                  key={s.attempt_id}
                  isOpen={isOpen}
                  onToggle={() => toggleRow(s)}
                  cells={
                    <>
                      <td className="py-3.5 pr-4">
                        <b className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] text-xs font-extrabold text-[var(--qs-surface)]">
                          {rank > 0 ? rank : "—"}
                        </b>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--qs-ink)] text-xs font-extrabold"
                            style={{ background: `hsl(${hue} 75% 88%)`, color: `hsl(${hue} 65% 28%)` }}
                          >
                            {initialsOf(name)}
                          </span>
                          <div className="min-w-0">
                            <b className="block truncate text-sm font-bold text-[var(--qs-ink)]">{name}</b>
                            <span className="text-xs font-semibold text-[var(--qs-muted)]">#{s.user_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-2">
                          <b className="text-sm font-extrabold text-[var(--qs-ink)]">
                            {toNumber(s.score).toFixed(0)}
                            {totalMarks > 0 ? ` / ${totalMarks}` : ""}
                          </b>
                          <div className="h-2.5 w-20 overflow-hidden rounded-full border-2 border-[var(--qs-ink)]">
                            <i className="block h-full bg-[var(--qs-brand)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">{acc.toFixed(1)}%</td>
                      <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">{Math.round(c)}</td>
                      <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">{Math.round(sk)}</td>
                      <td className="py-3.5 pr-4 text-sm font-bold text-[var(--qs-ink)]">
                        {toNumber(s.time_taken) > 0 ? fmtSec(s.time_taken) : "—"}
                      </td>
                      <td className="py-3.5 pr-4">
                        {s.status === "completed" ? (
                          <OutlinePill tone="ok">Completed</OutlinePill>
                        ) : (
                          <OutlinePill tone="warn">In progress</OutlinePill>
                        )}
                      </td>
                      <td className="py-3.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(s);
                          }}
                          aria-label={isOpen ? "Collapse answers" : "Expand answers"}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--qs-line)] transition hover:border-[var(--qs-brand)]"
                        >
                          <ChevronDown className={cn("h-4 w-4 text-[var(--qs-ink)] transition-transform", isOpen && "rotate-180")} />
                        </button>
                      </td>
                    </>
                  }
                  expanded={
                    isOpen && (
                      <div className="rounded-[16px] border-2 border-dashed border-[var(--qs-line)] p-4">
                        {loadingId === s.attempt_id && !detail ? (
                          <p className="text-sm font-semibold text-[var(--qs-muted)]">Loading answers…</p>
                        ) : detail ? (
                          <ReviewChips detail={detail} />
                        ) : (
                          <p className="text-sm font-semibold text-[var(--qs-muted)]">Answers could not be loaded.</p>
                        )}
                      </div>
                    )
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <EmptyNote>No students match your search.</EmptyNote>}
    </div>
  );
}

function FragmentRow({
  cells,
  expanded,
  isOpen,
  onToggle,
}: {
  cells: React.ReactNode;
  expanded: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn("cursor-pointer border-b-2 border-[var(--qs-line)] transition-colors hover:bg-[var(--qs-bg)]", isOpen && "bg-[var(--qs-bg)]")}
      >
        {cells}
      </tr>
      {isOpen && (
        <tr className="border-b-2 border-[var(--qs-line)]">
          <td colSpan={9} className="px-4 pb-4 pt-1">
            {expanded}
          </td>
        </tr>
      )}
    </>
  );
}
