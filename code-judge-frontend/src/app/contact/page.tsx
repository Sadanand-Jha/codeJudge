import Link from "next/link";
import { BookOpen, ShieldCheck, type LucideIcon } from "lucide-react";
import FeedbackForm from "@/components/marketing/landing/FeedbackForm";
import { LandingPageShell } from "@/components/marketing/landing/LandingPageShell";
import { LandingSiteFooter, LandingSubpageHero } from "@/components/marketing/landing/LandingSubpage";
import LandingReveal from "@/components/marketing/landing/LandingReveal";
import LpHeader from "@/components/marketing/landing/LpHeader";
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

const CONTACT_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy", href: "/privacy" },
];

export default function ContactPage() {
  return (
    <LandingPageShell>
      <LpHeader links={CONTACT_LINKS} />

      <main id="top">
        <LandingSubpageHero
          ariaLabelledBy="contact-title"
          eyebrow="Contact & feedback"
          title={
            <>
              Send feedback to <span className="landing-hero-gradient-word">the team</span>.
            </>
          }
          lead="Found a bug, have an idea, or something in a quiz feels off? Sign in and tell us. Every message is read by the QuizSupport team."
          meta={["Read by the team", "Signed-in only"]}
          panelLabel="Need something else?"
          panelTitle="Quick help, right here."
          panelText="Guides and policies answer most questions before you write in."
          panelItems={CARDS.map((card) => ({ label: card.title, href: card.href, icon: card.icon }))}
        />

        <div className="wrap ct-layout contact-body">
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

      <LandingSiteFooter />
      <LandingReveal />
    </LandingPageShell>
  );
}
