import Link from "next/link";
import { Check, Mail } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { SecureLogo } from "@/components/common/SecureLogo";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata = buildPublicPageMetadata({
  title: "Privacy Policy",
  description: "Read the QuizSupport privacy policy — how quiz scores and account data are handled.",
  path: "/privacy",
});

interface PrivacySection {
  id: string;
  title: string;
  body?: string;
  points?: string[];
}

const SECTIONS: PrivacySection[] = [
  {
    id: "collect",
    title: "What we collect",
    body: "When you use QuizSupport we store the details you give us, the quizzes you attempt and the scores you earn — so you can track your progress and see instant results on any device.",
    points: [
      "Account details — your name and email address",
      "Quiz activity — attempts, answers, scores and time taken",
      "Your content — quizzes, questions and papers you create",
      "Basic technical data needed to run and secure the service",
    ],
  },
  {
    id: "use",
    title: "How we use it",
    points: [
      "Run quizzes and show instant results to participants",
      "Keep your score history available across devices",
      "Let quiz creators see attempts and scores in their own quizzes",
      "Keep accounts secure, prevent misuse and fix problems",
    ],
  },
  {
    id: "never",
    title: "What we never do",
    points: [
      "We do not sell your personal data",
      "We do not run third-party advertising on your quiz data",
      "We do not share your data beyond the service providers that host and run QuizSupport",
    ],
  },
  {
    id: "visibility",
    title: "Who can see your data",
    body: "You can see your own attempts and results. Quiz creators can see the attempts and scores of participants in their own quizzes. Trusted service providers process data only on our instructions, so the platform keeps running.",
  },
  {
    id: "storage",
    title: "Storage and security",
    body: "Your data is stored on our servers and served over encrypted HTTPS connections. Sessions are protected by access tokens, and logging out clears your local session. Your browser may keep small preferences, like your theme choice or guest-mode state, in local storage.",
  },
  {
    id: "choices",
    title: "Your choices",
    body: "You are in control of your data. Write to us and we will help.",
    points: [
      "Ask for a copy of the data we hold for you",
      "Ask us to delete your account and the quiz data linked to it",
      "Log out on any device to end your session",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="qs-ui qs-lp min-h-screen">
      <nav aria-label="Main">
        <div className="wrap">
          <Link href="/" aria-label="QuizSupport home">
            <SecureLogo size={42} variant="full" rounded={false} className="logo" />
          </Link>
          <div className="nl">
            <Link href="/">Home</Link>
            <ThemeToggle variant="icon" />
            <Link href="/creator/quizzes/create" className="btn sm pri">
              Create a quiz
            </Link>
          </div>
        </div>
      </nav>

      <main id="top">
        <header className="wrap pg-top">
          <p className="eb">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="pg-lead">
            How QuizSupport handles account details, quiz attempts and scores —
            written in plain language.
          </p>
          <div className="pg-meta">
            <span className="pl ok">No data selling</span>
            <span className="pl blue">Delete anytime</span>
            <span className="pl mu">Last updated October 2026</span>
          </div>
        </header>

        <div className="wrap pp-layout">
          <aside className="card pp-toc" aria-label="On this page">
            <b>On this page</b>
            <ol>
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
            <div className="pp-toc-mail">
              <p>Questions about your data?</p>
              <a className="btn sm" href="mailto:support@quizsupport.com">
                Email support
              </a>
            </div>
          </aside>

          <div className="pp-doc">
            {SECTIONS.map((section, index) => (
              <section className="pp-sec" id={section.id} key={section.id}>
                <span className="pp-num">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{section.title}</h2>
                  {section.body ? <p>{section.body}</p> : null}
                  {section.points ? (
                    <ul className="pp-list">
                      {section.points.map((point) => (
                        <li key={point}>
                          <Check size={15} />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}

            <div className="card pp-contact">
              <div>
                <h2>Questions about your data?</h2>
                <p>
                  Email us at{" "}
                  <a href="mailto:support@quizsupport.com">support@quizsupport.com</a> and
                  we will get back to you.
                </p>
              </div>
              <div className="row">
                <a className="btn sm pri" href="mailto:support@quizsupport.com" style={{ gap: 8 }}>
                  <Mail size={16} />
                  Email support
                </a>
                <Link className="btn sm" href="/contact">
                  Contact page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer>
        <div className="wrap">
          <SecureLogo size={34} variant="full" rounded={false} className="logo" />
          <div className="fl">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/quiz">Quizzes</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
