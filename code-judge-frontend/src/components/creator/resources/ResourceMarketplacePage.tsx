"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Check,
  Download,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";

interface MarketplaceQuiz {
  id: number;
  title: string;
  teacher: string;
  subject: string;
  level: string;
  language: string;
  board: string;
  questions: number;
  pulls: number;
  publishedAt: string;
}

const QUIZZES: MarketplaceQuiz[] = [
  { id: 1, title: "Chemical Reactions, Acids & Electricity: Chapter Test", teacher: "Priya Sharma", subject: "Science", level: "Class 10", language: "English", board: "CBSE", questions: 20, pulls: 342, publishedAt: "2026-12-02" },
  { id: 2, title: "Quadratic Equations: Practice Set with Solutions", teacher: "Rahul Verma", subject: "Maths", level: "Class 10", language: "English", board: "CBSE", questions: 25, pulls: 518, publishedAt: "2026-12-01" },
  { id: 3, title: "Reading Comprehension and Grammar Revision", teacher: "Anita Desai", subject: "English", level: "Class 8", language: "English", board: "ICSE", questions: 30, pulls: 207, publishedAt: "2026-11-28" },
  { id: 4, title: "Laws of Motion and Work, Energy: Numericals", teacher: "Mohit Jain", subject: "Physics", level: "Class 12", language: "English", board: "CBSE", questions: 20, pulls: 431, publishedAt: "2026-11-27" },
  { id: 5, title: "Organic Chemistry: Named Reactions Quick Test", teacher: "Sneha Kapoor", subject: "Chemistry", level: "Class 12", language: "English", board: "CBSE", questions: 15, pulls: 289, publishedAt: "2026-11-25" },
  { id: 6, title: "Human Digestive and Respiratory System", teacher: "Priya Sharma", subject: "Biology", level: "Class 10", language: "Hindi", board: "CBSE", questions: 20, pulls: 164, publishedAt: "2026-11-24" },
  { id: 7, title: "Indian Freedom Struggle: 1857 to 1947", teacher: "Arjun Mehta", subject: "History", level: "Class 12", language: "English", board: "CBSE", questions: 30, pulls: 376, publishedAt: "2026-11-22" },
  { id: 8, title: "Python Basics: Loops, Lists and Functions", teacher: "Kavita Rao", subject: "Computer Science", level: "College", language: "English", board: "Univ.", questions: 25, pulls: 612, publishedAt: "2026-11-20" },
  { id: 9, title: "Algebra aur Ganit ke Sutra: Kaksha 8", teacher: "Imran Khan", subject: "Maths", level: "Class 8", language: "Hindi", board: "NCERT", questions: 20, pulls: 143, publishedAt: "2026-11-18" },
  { id: 10, title: "Cell Structure and Genetics: Board Revision", teacher: "Deepa Nair", subject: "Biology", level: "Class 12", language: "English", board: "CBSE", questions: 25, pulls: 255, publishedAt: "2026-11-15" },
  { id: 11, title: "Accounting Basics: Journal, Ledger, Trial Balance", teacher: "Vikas Gupta", subject: "Commerce", level: "Class 12", language: "English", board: "CBSE", questions: 20, pulls: 198, publishedAt: "2026-11-12" },
  { id: 12, title: "Hindi Vyakaran: Sandhi, Samas aur Alankar", teacher: "Pooja Singh", subject: "Hindi", level: "Class 10", language: "Hindi", board: "CBSE", questions: 20, pulls: 121, publishedAt: "2026-11-10" },
];

const SUBJECTS = [...new Set(QUIZZES.map((quiz) => quiz.subject))];
const LEVELS = [...new Set(QUIZZES.map((quiz) => quiz.level))];
const LANGUAGES = [...new Set(QUIZZES.map((quiz) => quiz.language))];

const TOP_TEACHERS = [...new Map(
  QUIZZES.map((quiz) => [quiz.teacher, quiz.teacher])
).keys()]
  .map((name) => {
    const quizzes = QUIZZES.filter((quiz) => quiz.teacher === name);
    return {
      name,
      count: quizzes.length,
      pulls: quizzes.reduce((total, quiz) => total + quiz.pulls, 0),
    };
  })
  .sort((a, b) => b.pulls - a.pulls)
  .slice(0, 8);

const AVATAR_TONES = [
  "bg-[var(--qs-sun)] text-[var(--qs-ink)]",
  "bg-[var(--qs-poly-1)] text-[var(--qs-brand)]",
  "bg-[var(--qs-okbg)] text-[var(--qs-ok)]",
  "bg-[var(--qs-ink)] text-[var(--qs-sun)]",
];

const SELECT =
  "cursor-pointer rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3.5 py-2.5 text-[13.5px] font-extrabold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-ink)] focus-visible:border-[var(--qs-ink)]";

const BUTTON =
  "inline-flex items-center justify-center gap-[7px] rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 py-[11px] text-[14px] font-extrabold text-[var(--qs-ink)] transition-all hover:-translate-y-0.5 hover:shadow-[0_3px_0_var(--qs-ink)] active:translate-y-px active:shadow-none";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarTone(name: string): string {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[var(--qs-ink)] font-extrabold tracking-[-0.02em]",
        avatarTone(name),
        size === "lg"
          ? "h-[72px] w-[72px] text-[26px] shadow-[3px_3px_0_var(--qs-ink)]"
          : "h-[54px] w-[54px] text-[19px]"
      )}
    >
      {initials(name)}
    </span>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--qs-poly-1)] px-2.5 py-1 text-[12px] font-extrabold text-[var(--qs-brand)]">
      {children}
    </span>
  );
}

function OutlinePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-0.5 text-[12px] font-extrabold text-[var(--qs-muted)]">
      {children}
    </span>
  );
}

export function ResourceMarketplacePage() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState("pulls");
  const [teacher, setTeacher] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pulled, setPulled] = useState<Set<number>>(new Set());
  const [preview, setPreview] = useState<MarketplaceQuiz | null>(null);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [preview]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = QUIZZES.filter(
      (quiz) =>
        (!subject || quiz.subject === subject) &&
        (!level || quiz.level === level) &&
        (!language || quiz.language === language) &&
        (!teacher || quiz.teacher === teacher) &&
        (!needle ||
          [quiz.title, quiz.teacher, quiz.subject, quiz.board]
            .join(" ")
            .toLowerCase()
            .includes(needle))
    );

    return [...list].sort((a, b) =>
      sort === "new"
        ? b.publishedAt.localeCompare(a.publishedAt)
        : sort === "qs"
          ? b.questions - a.questions
          : b.pulls - a.pulls
    );
  }, [language, level, query, sort, subject, teacher]);

  const selectedCount = useMemo(
    () => [...selected].filter((id) => !pulled.has(id)).length,
    [pulled, selected]
  );

  const pull = (ids: number[]) => {
    const valid = ids.filter((id) => !pulled.has(id));
    if (valid.length === 0) return;

    setPulled((current) => {
      const next = new Set(current);
      valid.forEach((id) => next.add(id));
      return next;
    });
    setSelected((current) => {
      const next = new Set(current);
      valid.forEach((id) => next.delete(id));
      return next;
    });
    toast.success(
      valid.length > 1
        ? `${valid.length} quizzes added to your library`
        : "Quiz added to your library"
    );
  };

  const toggle = (id: number) => {
    if (pulled.has(id)) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 pb-[120px]">
      <header className="relative overflow-hidden rounded-[28px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] p-[22px] text-[var(--qs-on-brand)] shadow-[8px_8px_0_var(--qs-sun)] sm:p-[34px]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[70px] -top-[90px] h-[290px] w-[290px] rounded-full bg-white/[0.08]"
        />
        <span className="absolute right-[22px] top-[22px] z-10 rotate-2 rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-3 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-ink)] sm:right-[34px] sm:top-[34px]">
          Coming soon
        </span>
        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[var(--qs-ink)] px-3 py-[5px] text-[12px] font-extrabold uppercase tracking-[0.05em] text-[var(--qs-sun)]">
          <Sparkles className="h-3 w-3 fill-current" />
          Community resources
        </span>
        <h1 className="qs-display relative mt-3.5 mb-2 text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[46px]">
          Pull a quiz, <em className="not-italic text-[var(--qs-sun)]">save hours</em>
        </h1>
        <p className="relative max-w-[520px] text-[15.5px] font-medium leading-[1.5] text-white/[0.88]">
          Free quizzes shared by teachers. Pick the ones you like and pull them into your
          account in one tap.
        </p>

        <label className="relative mt-[22px] flex max-w-[640px] items-center gap-2.5 rounded-[16px] border-2 border-[var(--qs-ink)] bg-white px-4 shadow-[4px_4px_0_var(--qs-ink)] transition-shadow focus-within:shadow-[4px_4px_0_var(--qs-sun)]">
          <Search className="h-5 w-5 shrink-0 text-[var(--qs-brand)]" strokeWidth={2.2} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search quizzes, teachers or topics"
            aria-label="Search quizzes"
            className="min-w-0 flex-1 border-0 bg-transparent py-4 text-base font-bold text-[var(--qs-ink)] outline-none placeholder:font-medium placeholder:text-[var(--qs-muted)]"
          />
        </label>
      </header>

      <section aria-label="Top teachers">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--qs-ink)]">
            Top teachers
          </h2>
          <span className="text-[13.5px] font-bold text-[var(--qs-muted)]">
            Tap to see their quizzes
          </span>
        </div>
        <div className="mt-1 flex gap-3.5 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:thin]">
          {TOP_TEACHERS.map((item) => {
            const active = teacher === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setTeacher(active ? "" : item.name)}
                className={cn(
                  "grid w-[150px] shrink-0 justify-items-center gap-1 rounded-[18px] border-2 px-3 py-4 font-[inherit] text-[var(--qs-ink)] transition-all",
                  active
                    ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] shadow-[4px_4px_0_var(--qs-ink)]"
                    : "border-[var(--qs-line)] bg-[var(--qs-surface)] hover:-translate-y-0.5 hover:border-[var(--qs-ink)]"
                )}
              >
                <Avatar name={item.name} size="lg" />
                <b className="text-center text-[14.5px] font-extrabold">{item.name}</b>
                <small
                  className={cn(
                    "text-[12px] font-bold",
                    active ? "text-[#5b4a10]" : "text-[var(--qs-muted)]"
                  )}
                >
                  {item.count} quiz{item.count > 1 ? "zes" : ""} · {item.pulls} pulls
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3.5" aria-label="Filters">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubject("")}
            className={cn(
              "rounded-full border-2 px-4 py-2 text-[13.5px] font-extrabold transition-colors",
              subject === ""
                ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-sun)]"
                : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
            )}
          >
            All
          </button>
          {SUBJECTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSubject(item)}
              className={cn(
                "rounded-full border-2 px-4 py-2 text-[13.5px] font-extrabold transition-colors",
                subject === item
                  ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-sun)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            aria-label="Level"
            className={SELECT}
          >
            <option value="">All levels</option>
            {LEVELS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label="Language"
            className={SELECT}
          >
            <option value="">All languages</option>
            {LANGUAGES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort"
            className={SELECT}
          >
            <option value="pulls">Most pulled</option>
            <option value="new">Newest</option>
            <option value="qs">Most questions</option>
          </select>
          <p className="w-full text-[14px] font-bold text-[var(--qs-muted)] sm:ml-auto sm:w-auto">
            <b className="text-[var(--qs-ink)]">{filtered.length}</b> quizzes
          </p>
        </div>
      </section>

      <section
        className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]"
        aria-live="polite"
      >
        {filtered.length > 0 ? (
          filtered.map((quiz) => {
            const active = selected.has(quiz.id);
            const isPulled = pulled.has(quiz.id);
            return (
              <article
                key={quiz.id}
                role="checkbox"
                aria-checked={active}
                aria-label={quiz.title}
                tabIndex={0}
                onClick={() => toggle(quiz.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle(quiz.id);
                  }
                }}
                className={cn(
                  "relative flex cursor-pointer flex-col rounded-[22px] border-2 bg-[var(--qs-surface)] p-5 outline-none transition-all hover:-translate-y-0.5 hover:border-[var(--qs-ink)] focus-visible:ring-3 focus-visible:ring-[var(--qs-brand)]/40",
                  active
                    ? "border-[var(--qs-ink)] shadow-[6px_6px_0_var(--qs-sun)]"
                    : "border-[var(--qs-line)]"
                )}
              >
                <div className="flex items-center gap-[13px]">
                  <Avatar name={quiz.teacher} />
                  <div className="min-w-0">
                    <b className="block text-[17px] font-extrabold leading-[1.2] tracking-[-0.015em] text-[var(--qs-ink)]">
                      {quiz.teacher}
                    </b>
                    <small className="text-[12.5px] font-semibold text-[var(--qs-muted)]">
                      {quiz.subject} teacher
                    </small>
                  </div>
                  <span
                    className={cn(
                      "ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
                      active
                        ? "border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]"
                        : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-transparent"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>

                <h3 className="mt-4 line-clamp-2 min-h-[2.5em] text-[19px] font-extrabold leading-[1.25] tracking-[-0.02em] text-[var(--qs-ink)]">
                  {quiz.title}
                </h3>

                <div className="mt-3 flex flex-wrap gap-[7px]">
                  <MetaPill>{quiz.subject}</MetaPill>
                  <OutlinePill>{quiz.level}</OutlinePill>
                  <OutlinePill>{quiz.language}</OutlinePill>
                </div>

                <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-[var(--qs-muted)]">
                  <BookOpen className="h-[15px] w-[15px] shrink-0 text-[var(--qs-brand)]" />
                  Syllabus: <b className="font-extrabold text-[var(--qs-ink)]">{quiz.board}</b>
                </p>

                <div className="mt-auto flex items-center gap-3.5 pt-4 text-[13px] font-bold text-[var(--qs-muted)]">
                  <span>{quiz.questions} questions</span>
                  <span>{quiz.pulls} pulls</span>
                  <span className="ml-auto rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[12px] font-extrabold text-[var(--qs-ink)]">
                    Free
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-[1fr_1.3fr] gap-2.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreview(quiz);
                    }}
                    className={BUTTON}
                  >
                    Preview
                  </button>
                  {isPulled ? (
                    <button
                      type="button"
                      disabled
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex cursor-default items-center justify-center gap-[7px] rounded-[12px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-3 py-[11px] text-[14px] font-extrabold text-[var(--qs-ok)]"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      In your library
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        pull([quiz.id]);
                      }}
                      className={cn(
                        BUTTON,
                        "bg-[var(--qs-sun)] shadow-[0_3px_0_var(--qs-ink)] hover:shadow-[0_5px_0_var(--qs-ink)]"
                      )}
                    >
                      <Download className="h-[15px] w-[15px]" strokeWidth={2.2} />
                      Pull quiz
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <div className="col-span-full rounded-[22px] border-2 border-dashed border-[#b9aaf5] px-5 py-12 text-center font-bold text-[var(--qs-muted)]">
            <b className="mb-1 block text-[20px] text-[var(--qs-ink)]">No quizzes found</b>
            Try a different subject or search.
          </div>
        )}
      </section>

      <p className="flex items-start justify-center gap-2 text-center text-[12.5px] font-medium leading-[1.4] text-[var(--qs-muted)]">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
        Only questions, options, answers and the teacher&apos;s name are shared. Student data
        is never shown.
      </p>

      <AnimatePresence>
        {selectedCount > 0 && (
          <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25, ease: [0.2, 0.9, 0.3, 1.15] }}
              className="pointer-events-auto flex w-[min(640px,calc(100vw-28px))] items-center gap-3 rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] px-3.5 py-3 pl-5 text-white shadow-[6px_6px_0_var(--qs-sun)]"
            >
              <b className="text-[17px] font-extrabold text-[var(--qs-sun)]">
                {selectedCount}
              </b>
              <span className="hidden text-[14px] font-semibold sm:inline">selected</span>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="ml-auto text-[13.5px] font-extrabold text-white/80 underline transition-colors hover:text-white"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() =>
                  pull([...selected].filter((id) => !pulled.has(id)))
                }
                className="inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3 text-[14px] font-extrabold text-[var(--qs-ink)] transition-transform hover:-translate-y-0.5 active:translate-y-px"
              >
                <Download className="h-4 w-4" strokeWidth={2.2} />
                {selectedCount > 1 ? `Pull ${selectedCount} quizzes` : "Pull quiz"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[rgba(29,24,64,0.6)] p-5 backdrop-blur-sm"
            onClick={() => setPreview(null)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="resource-preview-title"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
              className="my-auto w-full max-w-[620px] rounded-[24px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-[22px] shadow-[8px_8px_0_var(--qs-sun)]"
            >
              <div className="flex items-start gap-3">
                <Avatar name={preview.teacher} size="lg" />
                <div className="min-w-0 flex-1">
                  <small className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                    Shared by
                  </small>
                  <p className="text-[16px] font-extrabold text-[var(--qs-ink)]">
                    {preview.teacher}
                  </p>
                  <p className="text-[12.5px] font-semibold text-[var(--qs-muted)]">
                    {preview.subject} teacher
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="Close preview"
                  className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-ink)] hover:bg-[var(--qs-bg)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2
                id="resource-preview-title"
                className="mt-4 text-[24px] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--qs-ink)]"
              >
                {preview.title}
              </h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-2.5 py-0.5 text-[12px] font-extrabold text-[var(--qs-ink)]">
                  Free for everyone
                </span>
                <MetaPill>{preview.subject}</MetaPill>
                <OutlinePill>{preview.level}</OutlinePill>
                <OutlinePill>{preview.language}</OutlinePill>
                <OutlinePill>{preview.board}</OutlinePill>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  { label: "Questions", value: preview.questions },
                  { label: "Pulls", value: preview.pulls },
                  { label: "Syllabus", value: preview.board },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5"
                  >
                    <small className="block text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--qs-muted)]">
                      {item.label}
                    </small>
                    <b className="mt-0.5 block text-[18px] font-extrabold text-[var(--qs-ink)]">
                      {item.value}
                    </b>
                  </div>
                ))}
              </div>

              <p className="mt-4 rounded-[14px] border-2 border-dashed border-[var(--qs-line)] bg-[var(--qs-bg)] px-3.5 py-3 text-[12.5px] font-medium leading-relaxed text-[var(--qs-muted)]">
                Pulling copies this quiz into your library. Student responses and personal
                data are never included.
              </p>

              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className={cn(BUTTON, "flex-1")}
                >
                  Close
                </button>
                {pulled.has(preview.id) ? (
                  <button
                    type="button"
                    disabled
                    className="flex flex-1 cursor-default items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ok)] bg-[var(--qs-okbg)] px-4 py-3 text-[14px] font-extrabold text-[var(--qs-ok)]"
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                    In your library
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      pull([preview.id]);
                      setPreview(null);
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3 text-[14px] font-extrabold text-[var(--qs-ink)] shadow-[0_4px_0_var(--qs-ink)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--qs-ink)] active:translate-y-px active:shadow-none"
                  >
                    <Download className="h-4 w-4" strokeWidth={2.2} />
                    Pull this quiz
                  </button>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
