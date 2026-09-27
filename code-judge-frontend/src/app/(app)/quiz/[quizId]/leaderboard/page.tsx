"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, Loader2, Search, Trophy } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiError";
import { getQuizByCode, getQuizLeaderboard, type QuizBasic, type QuizLeaderboardEntry } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

function formatDuration(seconds: number | null | undefined) {
  const value = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(value / 60)}m ${Math.floor(value % 60).toString().padStart(2, "0")}s`;
}

function displayName(entry: QuizLeaderboardEntry) {
  return [entry.first_name, entry.last_name].filter(Boolean).join(" ") || entry.username;
}

export default function QuizLeaderboardPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const [quiz, setQuiz] = useState<QuizBasic | null>(null);
  const [entries, setEntries] = useState<QuizLeaderboardEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidQuizCode(code)) return;
    let cancelled = false;
    const load = async () => {
      try {
        const details = await getQuizByCode(code);
        const leaderboard = await getQuizLeaderboard(String(details.id));
        if (!cancelled) { setQuiz(details); setEntries(leaderboard); }
      } catch (loadError: unknown) {
        if (!cancelled) setError(getApiErrorMessage(loadError, "Leaderboard is unavailable."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [code]);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      `${displayName(entry)} ${entry.username} ${entry.college_name ?? ""}`.toLowerCase().includes(needle)
    );
  }, [entries, query]);

  if (!isValidQuizCode(code)) return <StateMessage text="Invalid quiz code." />;
  if (loading) return <StateMessage loading text="Loading verified leaderboard…" />;
  if (error || !quiz) return <StateMessage text={error || "Leaderboard is unavailable."} />;

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-text-primary sm:px-6">
      <main className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link href={`/quiz/${code}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600">{entries.length} completed</span>
        </div>

        <header className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"><Trophy className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{quiz.name}</h1>
              <p className="mt-1 text-xs text-text-secondary">Leaderboard · ranked by marks, then completion time</p>
            </div>
          </div>
          <label className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search className="h-4 w-4 text-text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or college" className="h-11 w-full bg-transparent text-sm outline-none" />
          </label>
        </header>

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          {filteredEntries.length === 0 ? <p className="p-8 text-center text-sm text-text-secondary">No completed attempts found.</p> : (
            <div className="divide-y divide-border">
              {filteredEntries.map((entry) => (
                <article key={entry.user_id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 p-4 sm:grid-cols-[4rem_1fr_8rem_8rem] sm:px-6">
                  <div className="text-center text-sm font-bold text-text-muted">#{entry.rank}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{displayName(entry)}</p>
                    <p className="truncate text-xs text-text-muted">{entry.college_name || `@${entry.username}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{Number(entry.marks_obtained) || 0}/{Number(entry.total_marks) || 0}</p>
                    <p className="text-[10px] text-text-muted">{Number(entry.percentage) || 0}%</p>
                  </div>
                  <div className="hidden items-center justify-end gap-1.5 text-xs text-text-secondary sm:flex"><Clock3 className="h-3.5 w-3.5" /> {formatDuration(entry.time_taken)}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StateMessage({ text, loading = false }: { text: string; loading?: boolean }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="rounded-2xl border border-border bg-card p-7 text-center">
        {loading && <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-pink-500" />}
        <p className="text-sm text-text-secondary">{text}</p>
        {!loading && <Link href="/quiz" className="mt-4 inline-flex text-xs font-semibold text-pink-600">Back to quizzes</Link>}
      </div>
    </div>
  );
}
