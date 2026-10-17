import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.quizsupport.com/" },
};

const CATEGORY_LINKS = [
  { href: "/quiz", label: "Online Quizzes", desc: "Join live quizzes with a code and get instant results." },
  { href: "/quiz/join", label: "Join a Quiz", desc: "Enter your quiz access code and start your practice test." },
  { href: "/problems", label: "Exam Practice", desc: "JEE, NEET, GATE, SSC, UPSC, Banking and more practice sets." },
  { href: "/problems/jee", label: "JEE Practice", desc: "JEE practice problems, subject-wise and chapter-wise." },
  { href: "/problems/neet", label: "NEET Practice", desc: "NEET practice problems, subject-wise and chapter-wise." },
  { href: "/problems/ssc", label: "SSC Practice", desc: "SSC exam practice problems and drills." },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1>Take Online Quizzes and Practice Tests</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        QuizSupport is an online quiz platform for taking quizzes and practice tests.
        Join a quiz with an access code, answer questions on any device, and get
        instant results with score tracking.
      </p>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Students use QuizSupport to prepare for school tests, college quizzes and
        competitive exams such as JEE, NEET, GATE, SSC, UPSC and Banking — while
        teachers and creators use it to host quizzes and track performance.
      </p>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">
        Every quiz gives you instant feedback on your answers, keeps a history of
        your scores, and works on mobile and desktop without any installation.
      </p>

      <nav aria-label="Quiz categories" className="mt-8">
        <h2 className="text-lg font-semibold">Browse quiz categories</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {CATEGORY_LINKS.map((c) => (
            <li key={c.href} className="rounded-xl border border-border p-4">
              <Link href={c.href} className="font-medium underline-offset-4 hover:underline">
                {c.label}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/quiz"
          className="rounded-lg bg-[#7C3AED] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Start a Quiz
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold"
        >
          Log in
        </Link>
      </div>

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/contact" className="hover:underline">Contact</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/quiz" className="hover:underline">Quizzes</Link>
        </nav>
      </footer>
    </main>
  );
}

