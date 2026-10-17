import type { Metadata } from "next";
import Link from "next/link";
import QuizCodeForm from "@/components/marketing/QuizCodeForm";
import SampleQuizDemo from "@/components/marketing/SampleQuizDemo";
import { SecureLogo } from "@/components/common/SecureLogo";

export const metadata: Metadata = {
  title: {
    absolute: "QuizSupport – Make a quiz. Share a code. See results instantly.",
  },
  description:
    "Make a quiz in minutes, share it with an access code, and get instant results on any device. Join quizzes, track scores and practice for JEE, NEET, GATE, SSC, UPSC and Banking.",
  alternates: { canonical: "https://www.quizsupport.com/" },
};

const STEPS = [
  {
    title: "Write your questions",
    desc: "Add questions and answer options, mark the right one, and set how long people get.",
  },
  {
    title: "Share the code",
    desc: "Every quiz gets its own access code. Send it on WhatsApp, email, or pin it in a group.",
    code: "VQBA-MIDJ-ETTW-EFRT",
  },
  {
    title: "See who scored what",
    desc: "Players get instant feedback. You see every score and each person\u2019s history in one place.",
  },
];

export default function HomePage() {
  return (
    <div className="qs-ui min-h-screen">
      <div className="qs-wrap">
        <nav className="flex items-center justify-between gap-4 py-[22px]" aria-label="Main">
          <Link href="/" className="inline-flex items-center" aria-label="QuizSupport home">
            <SecureLogo size={34} variant="full" rounded={false} />
          </Link>
          <div className="flex items-center gap-3 sm:gap-[22px]">
            <Link href="/quiz" className="qs-link hidden sm:block">
              Quizzes
            </Link>
            <Link href="/login" className="qs-link hidden sm:block">
              Log in
            </Link>
            <Link href="/creator/quizzes/create" className="qs-btn px-4 py-[11px] text-[15px]">
              Create a quiz
            </Link>
          </div>
        </nav>

        <header className="grid items-center gap-11 pb-16 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:pb-[88px] lg:pt-12">
          <div>
            <h1 className="max-w-[13em] text-[clamp(42px,6vw,76px)] font-extrabold">
              Make a quiz in minutes. Share it with a code.
            </h1>
            <p className="mb-7 mt-5 max-w-[30em] text-[20px] text-[var(--qs-muted)]">
              Write your questions, get an access code, and send it to anyone. They
              answer on any device and see their score right away.
            </p>
            <QuizCodeForm />
            <p className="qs-sub mt-2">
              Want to host your own?{" "}
              <Link href="/creator/quizzes/create">Create a quiz for free</Link>
            </p>
          </div>
          <SampleQuizDemo />
        </header>
      </div>

      <section className="border-t border-[var(--qs-line)] py-16 lg:py-[72px]">
        <div className="qs-wrap">
          <h2 className="max-w-[16em] text-[clamp(32px,4.4vw,48px)] font-extrabold">
            From blank page to live quiz in three steps
          </h2>
          <div className="qs-steps mt-10 grid gap-8 lg:grid-cols-3 lg:gap-0">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className={
                  index === 0
                    ? "qs-step lg:pr-7"
                    : "qs-step lg:border-l lg:border-[var(--qs-line)] lg:px-7"
                }
              >
                <h3 className="text-2xl">{step.title}</h3>
                <p className="mt-2 text-[var(--qs-muted)]">{step.desc}</p>
                {step.code && (
                  <span className="qs-code-chip text-base tracking-[0.12em]">{step.code}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-16 pt-6">
        <div className="qs-wrap">
          <div className="qs-cta">
            <h2 className="max-w-[14em] text-[clamp(30px,4vw,44px)]">
              Your first quiz takes about two minutes.
            </h2>
            <Link href="/creator/quizzes/create" className="qs-btn">
              Create a quiz
            </Link>
          </div>
        </div>
      </section>

      <div className="qs-wrap">
        <footer className="flex flex-wrap justify-between gap-4 border-t border-[var(--qs-line)] pb-10 pt-7 text-[15px] text-[var(--qs-muted)]">
          <span>© QuizSupport</span>
          <nav className="flex flex-wrap gap-x-[22px] gap-y-2" aria-label="Footer">
            <Link href="/about" className="qs-link">
              About
            </Link>
            <Link href="/contact" className="qs-link">
              Contact
            </Link>
            <Link href="/privacy" className="qs-link">
              Privacy Policy
            </Link>
            <Link href="/quiz" className="qs-link">
              Quizzes
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
