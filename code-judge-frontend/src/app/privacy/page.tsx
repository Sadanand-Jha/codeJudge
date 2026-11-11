import Link from "next/link";
import { Check } from "lucide-react";
import { LandingPageShell } from "@/components/marketing/landing/LandingPageShell";
import { LandingSiteFooter, LandingSubpageHero } from "@/components/marketing/landing/LandingSubpage";
import LandingReveal from "@/components/marketing/landing/LandingReveal";
import LpHeader from "@/components/marketing/landing/LpHeader";
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
    body: "You are in control of your data. Send us feedback and we will help.",
    points: [
      "Ask for a copy of the data we hold for you",
      "Ask us to delete your account and the quiz data linked to it",
      "Log out on any device to end your session",
    ],
  },
];

const PRIVACY_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export default function PrivacyPage() {
  return (
    <LandingPageShell>
      <LpHeader links={PRIVACY_LINKS} />

      <main id="top">
        <LandingSubpageHero
          ariaLabelledBy="privacy-title"
          eyebrow="Legal"
          title={
            <>
              Privacy <span className="landing-hero-gradient-word">Policy</span>.
            </>
          }
          lead="How QuizSupport handles account details, quiz attempts and scores, written in plain language."
          meta={["No data selling", "Last updated October 2026"]}
          panelLabel="On this page"
          panelTitle="Read what matters to you."
          panelText="Jump straight to the section you need."
          panelItems={SECTIONS.map((section) => ({ label: section.title, href: `#${section.id}` }))}
        />

        <div className="wrap pp-layout privacy-body">
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
              <Link className="btn sm" href="/contact">
                Send feedback
              </Link>
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
                  Send us a message through the feedback form and we will get
                  back to you.
                </p>
              </div>
              <div className="row">
                <Link className="btn sm pri" href="/contact">
                  Send feedback
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LandingSiteFooter />
      <LandingReveal />
    </LandingPageShell>
  );
}
