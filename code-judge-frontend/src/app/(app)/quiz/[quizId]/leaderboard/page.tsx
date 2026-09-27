"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Clock3, Search, Trophy } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiError";
import { getQuizByCode, getQuizLeaderboard, type QuizBasic, type QuizLeaderboardEntry } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import StudentQuizShell, { QuizStateScreen } from "@/components/quiz/live/StudentQuizShell";

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

  if (!isValidQuizCode(code)) return <QuizStateScreen text="Invalid quiz code." />;
  if (loading) return <QuizStateScreen loading text="Loading verified leaderboard…" />;
  if (error || !quiz) return <QuizStateScreen text={error || "Leaderboard is unavailable."} />;

  return (
    <StudentQuizShell
      eyebrow="Leaderboard"
      title={quiz.name}
      subtitle="Ranked by marks, then completion time."
      backHref={`/quiz/${code}`}
      backLabel="Back"
      maxWidth="max-w-5xl"
      actions={
        <span className="inline-flex items-center rounded-full border border-[#F79009]/30 bg-[#F79009]/10 px-3 py-1 text-xs font-semibold text-[#B54708] dark:border-[#FFB84D]/25 dark:bg-[#FFB84D]/10 dark:text-[#FFB84D]">
          <Trophy className="mr-1.5 h-3.5 w-3.5" />{entries.length} completed
        </span>
      }
    >
        <section className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white dark:border-[#252D3A] dark:bg-[#151A24]">
          <div className="border-b border-[#E4E7EC] p-3 dark:border-[#252D3A] sm:p-4">
            <label className="flex items-center gap-2 rounded-xl border border-[#E4E7EC] bg-[#F7F8FA] px-3 dark:border-[#252D3A] dark:bg-[#111722]">
              <Search className="h-4 w-4 shrink-0 text-[#98A2B3] dark:text-[#687386]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or college" className="h-11 w-full bg-transparent text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] dark:text-[#F4F6FA] dark:placeholder:text-[#687386]" />
            </label>
          </div>
          {filteredEntries.length === 0 ? <p className="p-8 text-center text-sm text-[#475467] dark:text-[#9AA4B5]">No completed attempts found.</p> : (
            <div className="divide-y divide-[#E4E7EC] dark:divide-[#252D3A]">
              {filteredEntries.map((entry) => (
                <article key={entry.user_id} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 p-4 transition-colors duration-150 hover:bg-[#F2F4F7] dark:hover:bg-[#19202C]/60 sm:grid-cols-[4rem_1fr_8rem_8rem] sm:px-6">
                  <div className="text-center text-sm font-bold text-[#98A2B3] tabular-nums dark:text-[#687386]">#{entry.rank}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#101828] dark:text-[#F4F6FA]">{displayName(entry)}</p>
                    <p className="truncate text-xs text-[#98A2B3] dark:text-[#687386]">{entry.college_name || `@${entry.username}`}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-[#039855] dark:text-[#20D889]">{Number(entry.marks_obtained) || 0}/{Number(entry.total_marks) || 0}</p>
                    <p className="text-[10px] tabular-nums text-[#98A2B3] dark:text-[#687386]">{Number(entry.percentage) || 0}%</p>
                  </div>
                  <div className="hidden items-center justify-end gap-1.5 text-xs tabular-nums text-[#475467] dark:text-[#9AA4B5] sm:flex"><Clock3 className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#687386]" /> {formatDuration(entry.time_taken)}</div>
                </article>
              ))}
            </div>
          )}
        </section>
    </StudentQuizShell>
  );
}
