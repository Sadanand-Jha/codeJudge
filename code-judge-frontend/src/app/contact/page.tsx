import Link from "next/link";
import { BookOpen, ShieldCheck, type LucideIcon } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import FeedbackForm from "@/components/marketing/landing/FeedbackForm";
import { SecureLogo } from "@/components/common/SecureLogo";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata = buildPublicPageMetadata({
  title: "Contact",
  description: "Contact QuizSupport — get help with online quizzes and practice tests.",
  path: "/contact",
});

interface ContactCard {
  icon: LucideIcon;
  title: string;
  cta: string;
  href: string;
  body: string;
}

const CARDS: ContactCard[] = [
  {
    icon: BookOpen,
    title: "Help center",
    body: "Guides for creating quizzes, sharing codes and tracking results.",
    cta: "Open docs",
    href: "/docs",
  },
  {
    icon: ShieldCheck,
    title: "Privacy and data",
    body: "What we store, who can see it and how to get it deleted.",
    cta: "Read policy",
    href: "/privacy",
  },
];

export default function ContactPage() {
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
          <p className="eb">Contact &amp; feedback</p>
          <h1>Send feedback to the team</h1>
          <p className="pg-lead">
            Found a bug, have an idea, or something in a quiz feels off? Sign in
            and tell us — every message is read by the QuizSupport team.
          </p>
          <div className="pg-meta">
            <span className="pl ok">Read by the team</span>
            <span className="pl blue">Signed-in only</span>
          </div>
        </header>

        <div className="wrap ct-layout">
          <FeedbackForm />

          <aside className="ct-side">
            {CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div className="card ct-card" key={card.title}>
                  <span className="ct-ico">
                    <Icon size={18} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <Link className="btn sm" href={card.href}>
                    {card.cta}
                  </Link>
                </div>
              );
            })}
          </aside>
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
