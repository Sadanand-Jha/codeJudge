"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Layers, BookOpen, ListChecks, Home } from "lucide-react";
import { EXAM_SUBJECTS, SUBJECT_TOPICS, MARKETPLACE_PROBLEMS } from "./marketplace";
import { ProblemBrowser, ExamTile } from "./ProblemBrowser";

const LAYOUT_CLASSES =
  "mx-auto w-full max-w-[1600px] px-5 pb-16 sm:px-8 lg:px-10 xl:px-12 2xl:px-16";

function streamLabel(id: string): string {
  return MARKETPLACE_PROBLEMS.find((p) => p.examId === id)?.examLabel ?? id.toUpperCase();
}

function StreamHeader({ streamId }: { streamId: string }) {
  const problems = MARKETPLACE_PROBLEMS.filter((p) => p.examId === streamId);
  const subjects = EXAM_SUBJECTS[streamId] ?? [];
  const chapterCount = subjects.reduce((s, sub) => s + (SUBJECT_TOPICS[sub]?.length ?? 0), 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link
          href="/problems"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-text-secondary transition-colors hover:border-[#7C3AED]/40 hover:text-[#7C3AED] dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
          aria-label="Back to all streams"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <ExamTile examId={streamId} size="md" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            {streamLabel(streamId)}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {problems.length} questions · {subjects.length} subjects · {chapterCount} chapters
          </p>
        </div>
      </div>
      <Link
        href="/problems"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-[#7C3AED] transition-colors hover:bg-[#7C3AED]/10 dark:text-ai-accent dark:hover:bg-ai-accent/10"
      >
        <Home className="h-3.5 w-3.5" />
        All streams
      </Link>
    </div>
  );
}

export function StreamPractice({ streamId }: { streamId: string }) {
  const [mode, setMode] = useState<"mix" | "subject">("mix");
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  const streamProblems = useMemo(
    () => MARKETPLACE_PROBLEMS.filter((p) => p.examId === streamId),
    [streamId],
  );
  const subjects = useMemo(
    () =>
      (EXAM_SUBJECTS[streamId] ?? [])
        .map((s) => ({
          name: s,
          questions: streamProblems.filter((p) => p.subject === s).length,
          chapters: SUBJECT_TOPICS[s]?.length ?? 0,
        }))
        .sort((a, b) => b.questions - a.questions),
    [streamId, streamProblems],
  );

  const chapters = useMemo(() => {
    if (!subject) return [];
    return (SUBJECT_TOPICS[subject] ?? [])
      .map((t) => ({
        name: t,
        questions: streamProblems.filter((p) => p.subject === subject && p.topic === t).length,
      }))
      .sort((a, b) => b.questions - a.questions);
  }, [subject, streamProblems]);

  const resetDrill = () => {
    setSubject(null);
    setTopic(null);
  };

  const selectedSubjectObj = subjects.find((s) => s.name === subject);
  const selectedTopicObj = chapters.find((c) => c.name === topic);

  return (
    <div className="problems-page-shell problems-ambient relative min-h-screen">
      <div className={LAYOUT_CLASSES}>
        <div className="pt-8" />
        <StreamHeader streamId={streamId} />

        {/* Mode switcher */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="problems-segmented inline-flex items-center gap-0.5 rounded-xl border border-border bg-card p-1">
            {(
              [
                { id: "mix", label: "Mix Problems", icon: ListChecks },
                { id: "subject", label: "Subject wise", icon: BookOpen },
              ] as const
            ).map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMode(m.id);
                    resetDrill();
                  }}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Breadcrumb */}
          {mode === "subject" && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-text-secondary">
              <button
                type="button"
                onClick={() => {
                  setSubject(null);
                  setTopic(null);
                }}
                className="rounded-md px-1.5 py-0.5 transition-colors hover:text-[#7C3AED] dark:hover:text-ai-accent"
              >
                {streamLabel(streamId)}
              </button>
              {subject && (
                <>
                  <span className="text-text-muted">/</span>
                  <button
                    type="button"
                    onClick={() => setTopic(null)}
                    className="rounded-md px-1.5 py-0.5 transition-colors hover:text-[#7C3AED] dark:hover:text-ai-accent"
                  >
                    {subject}
                  </button>
                </>
              )}
              {topic && (
                <>
                  <span className="text-text-muted">/</span>
                  <span className="rounded-md bg-card-hover px-1.5 py-0.5 text-text-primary">{topic}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mix mode — all questions */}
        {mode === "mix" && (
          <div className="mt-8">
            <ProblemBrowser
              problems={streamProblems}
              lockedExam={streamId}
              title={`${streamLabel(streamId)} — All Questions`}
              subtitle="Every question in this stream, filterable by subject, chapter and type."
            />
          </div>
        )}

        {/* Subject-wise drill-down */}
        {mode === "subject" && (
          <div className="mt-8">
            {!subject ? (
              /* Step 1 — pick a subject */
              <>
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/12 to-violet-600/12 text-[#7C3AED] ring-1 ring-inset ring-[#7C3AED]/15 dark:text-ai-accent">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-text-primary">Choose a subject</h2>
                    <p className="text-xs text-text-secondary">Then drill into chapters and questions.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {subjects.map((s, i) => (
                    <motion.button
                      key={s.name}
                      type="button"
                      onClick={() => setSubject(s.name)}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                      className="problems-cat-card group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7C3AED]/40 dark:hover:border-ai-accent/40"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card-hover text-[11px] font-extrabold text-text-secondary ring-1 ring-border group-hover:text-[#7C3AED] dark:group-hover:text-ai-accent">
                        {s.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold text-text-primary">{s.name}</span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                          <span>{s.questions} questions</span>
                          <span>·</span>
                          <span>{s.chapters} chapters</span>
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-[#7C3AED] dark:group-hover:text-ai-accent" />
                    </motion.button>
                  ))}
                </div>
              </>
            ) : !topic ? (
              /* Step 2 — pick a chapter */
              <>
                <div className="mb-5 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/12 to-violet-600/12 text-[#7C3AED] ring-1 ring-inset ring-[#7C3AED]/15 dark:text-ai-accent">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-text-primary">
                      {subject} — Chapters
                    </h2>
                    <p className="text-xs text-text-secondary">
                      Pick a chapter to see its {selectedSubjectObj?.questions ?? 0} questions.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapters.map((c, i) => (
                    <motion.button
                      key={c.name}
                      type="button"
                      onClick={() => setTopic(c.name)}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.25) }}
                      className="problems-cat-chip inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-text-secondary transition-all hover:-translate-y-0.5 hover:border-[#7C3AED]/40 hover:text-[#7C3AED] dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
                    >
                      {c.name}
                      <span className="rounded-md bg-card-hover px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-text-muted">
                        {c.questions}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              /* Step 3 — questions of that chapter */
              <ProblemBrowser
                problems={streamProblems}
                lockedExam={streamId}
                defaultSubject={subject}
                defaultTopic={topic}
                title={`${subject} · ${topic}`}
                subtitle={`${selectedTopicObj?.questions ?? 0} questions in this chapter — ${streamLabel(streamId)}.`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}