"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Crown, Medal, Search, Sparkles, Trophy } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiError";
import { getQuizByCode, getQuizLeaderboard, type QuizBasic, type QuizLeaderboardEntry } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";
import { useQuizSounds } from "@/hooks/useQuizSounds";
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
  const { playQuizSound } = useQuizSounds();
  const fanfarePlayedRef = useRef(false);

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
  const podium = entries.slice(0, 3);

  // Celebrate once when the podium lands.
  useEffect(() => {
    if (!loading && !error && podium.length > 0 && !fanfarePlayedRef.current) {
      fanfarePlayedRef.current = true;
      playQuizSound("success");
    }
  }, [loading, error, podium.length, playQuizSound]);

  if (!isValidQuizCode(code)) return <QuizStateScreen text="Invalid quiz code." />;
  if (loading) return <QuizStateScreen loading text="Loading verified leaderboard…" />;
  if (error || !quiz) return <QuizStateScreen text={error || "Leaderboard is unavailable."} />;

  return (
    <StudentQuizShell
      eyebrow="Hall of fame"
      title={quiz.name}
      subtitle="Celebrate the quickest minds and see where every explorer landed."
      backHref={`/quiz/${code}`}
      backLabel="Back"
      maxWidth="max-w-5xl"
      actions={
        <span className="inline-flex items-center rounded-full border border-[#F79009]/30 bg-[#F79009]/10 px-3 py-1 text-xs font-semibold text-[#B54708] dark:border-[#FFB84D]/25 dark:bg-[#FFB84D]/10 dark:text-[#FFB84D]">
          <Trophy className="mr-1.5 h-3.5 w-3.5" />{entries.length} completed
        </span>
      }
    >
        {podium.length > 0 && (
          <section className="relative overflow-hidden rounded-[28px] border border-pink-200/80 bg-gradient-to-br from-white via-pink-50/80 to-cyan-50/80 p-5 shadow-[0_28px_80px_-50px_rgba(244,114,182,.75)] dark:border-violet-400/20 dark:from-[#151A2A] dark:via-[#111624] dark:to-[#0D1723] sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />
            <div className="relative flex items-center justify-between gap-3">
              <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-pink-500 dark:text-violet-300">Top explorers</p><h2 className="mt-1 text-xl font-bold text-[#101828] dark:text-white">Today&apos;s podium</h2></div>
              <Sparkles className="h-6 w-6 text-amber-400" />
            </div>
            <div className="relative mt-6 grid grid-cols-1 items-end gap-3 min-[520px]:grid-cols-3">
              {podium.map((entry, index) => {
                const rank = Number(entry.rank) || index + 1;
                return (
                  <article key={entry.user_id} className={`rounded-2xl border p-4 text-center ${rank === 1 ? "border-amber-300 bg-amber-50 shadow-[0_16px_35px_-24px_rgba(245,158,11,.8)] dark:border-amber-300/30 dark:bg-amber-300/[0.07] min-[520px]:order-2 min-[520px]:pb-7" : rank === 2 ? "border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.04] min-[520px]:order-1" : "border-orange-200 bg-orange-50/80 dark:border-orange-300/15 dark:bg-orange-300/[0.04] min-[520px]:order-3"}`}>
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold ${rank === 1 ? "bg-gradient-to-br from-amber-300 to-orange-400 text-white" : "bg-gradient-to-br from-violet-400 to-indigo-500 text-white"}`}>{displayName(entry).slice(0, 1).toUpperCase()}</div>
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-[#667085] dark:text-[#9AA4B5]">{rank === 1 ? <Crown className="h-4 w-4 text-amber-500" /> : <Medal className="h-4 w-4 text-violet-500" />} #{rank}</div>
                    <p className="mt-1 truncate text-sm font-bold text-[#101828] dark:text-white">{displayName(entry)}</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-300">{Number(entry.percentage) || 0}%</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[24px] border border-pink-200/80 bg-white/90 shadow-[0_22px_70px_-52px_rgba(244,114,182,.7)] dark:border-violet-400/15 dark:bg-[#111624]/92">
          <div className="flex flex-col gap-3 border-b border-pink-100 p-3 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div><h2 className="text-sm font-bold text-[#101828] dark:text-white">All rankings</h2><p className="mt-0.5 text-xs text-[#98A2B3] dark:text-[#687386]">Marks first, completion time breaks a tie.</p></div>
            <label className="flex items-center gap-2 rounded-xl border border-pink-100 bg-[#FFF9FB] px-3 dark:border-white/[0.08] dark:bg-white/[0.035] sm:w-72">
              <Search className="h-4 w-4 shrink-0 text-[#98A2B3] dark:text-[#687386]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or college" className="h-11 w-full bg-transparent text-sm text-[#101828] outline-none placeholder:text-[#98A2B3] dark:text-[#F4F6FA] dark:placeholder:text-[#687386]" />
            </label>
          </div>
          {filteredEntries.length === 0 ? <p className="p-8 text-center text-sm text-[#475467] dark:text-[#9AA4B5]">No completed attempts found.</p> : (
            <div className="divide-y divide-[#E4E7EC] dark:divide-[#252D3A]">
              {filteredEntries.map((entry) => (
                <article key={entry.user_id} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 p-4 transition-colors duration-150 hover:bg-pink-50/60 dark:hover:bg-violet-400/[0.035] sm:grid-cols-[3rem_1fr_8rem_8rem] sm:px-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-100 to-orange-100 text-xs font-extrabold text-pink-600 dark:from-violet-500/15 dark:to-cyan-500/10 dark:text-violet-300">#{entry.rank}</div>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-xs font-bold text-white sm:flex">{displayName(entry).slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#101828] dark:text-[#F4F6FA]">{displayName(entry)}</p>
                    <p className="truncate text-xs text-[#98A2B3] dark:text-[#687386]">{entry.college_name || `@${entry.username}`}</p>
                    </div>
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
