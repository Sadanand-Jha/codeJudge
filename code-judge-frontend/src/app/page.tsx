import type { Metadata } from "next";
import Link from "next/link";
import { SecureLogo } from "@/components/common/SecureLogo";
import LandingHero from "@/components/marketing/landing/LandingHero";
import LandingPricing from "@/components/marketing/landing/LandingPricing";
import LandingProductShowcase from "@/components/marketing/landing/LandingProductShowcase";
import LandingScrollStatement from "@/components/marketing/landing/LandingScrollStatement";
import {
  LandingAudienceSection,
  LandingClosingCta,
  LandingPaperSample,
  LandingRoomsPromo,
  LandingWorkflow,
} from "@/components/marketing/landing/LandingSections";
import LandingReveal from "@/components/marketing/landing/LandingReveal";
import { LandingPageShell } from "@/components/marketing/landing/LandingPageShell";
import LpHeader from "@/components/marketing/landing/LpHeader";
import { getPricingCatalogServer } from "@/services/pricingServer";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "QuizSupport – Create a paper. Share a code. See how your class did.",
  description:
    "Create classroom quizzes by hand or with AI, share one code with students, and review results together.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const catalog = await getPricingCatalogServer();
  const freePlan = catalog.plans.find((plan) => plan.price === 0);
  const trialDays = catalog.plans.find((plan) => plan.trialDays > 0)?.trialDays ?? 0;
  const faqs = [
    {
      q: "Do students need to install anything?",
      a: "No. Students can open a quiz in a browser on a phone or laptop.",
    },
    {
      q: "Can I write a paper myself?",
      a: "Yes. Create questions manually, use the AI generator for a first draft, or combine both.",
    },
    {
      q: "How do students join?",
      a: "Share the quiz code. Students use it to open the quiz in their browser.",
    },
    {
      q: "Can I review results?",
      a: "Yes. Review scores, ranks and question-level performance after students attempt the quiz.",
    },
    {
      q: "What does it cost?",
      a: trialDays > 0
        ? `The available monthly plans include a ${trialDays}-day Basic trial. See pricing for the current plan details.`
        : `${freePlan?.name ?? "Essential"} is free forever. Visit pricing for current plan details and AI credit options.`,
    },
    {
      q: "Can I edit what the AI generates?",
      a: "Yes. Generated questions are a draft that you can review and edit before publishing.",
    },
    {
      q: "What question types are supported?",
      a: "You can mix single choice, multiple select, true/false, fill-in-the-blank and other supported question types in a quiz.",
    },
    {
      q: "How is student data handled?",
      a: (
        <>
          QuizSupport uses quiz activity to provide results to students and creators. See
          our <Link href="/privacy">Privacy Policy</Link> for details about data access,
          use and storage.
        </>
      ),
    },
  ];

  return (
    <LandingPageShell>
      <LpHeader />
      <main>
        <div className="landing-page-wrap">
          <LandingHero trialDays={trialDays} />
          <LandingProductShowcase />
          <LandingRoomsPromo />
          <LandingWorkflow />
          <LandingScrollStatement />
          <LandingPaperSample />
          <LandingAudienceSection />

          <LandingPricing plans={catalog.plans} />

          <section className="landing-section landing-faq" id="faq" data-reveal>
            <div className="landing-faq-intro">
              <div className="landing-section-heading">
                <span className="landing-eyebrow">Good to know</span>
                <h2>Questions, answered.</h2>
              </div>
              <div className="landing-faq-contact">
                <span>Still have questions?</span>
                <Link href="/contact">Contact us</Link>
              </div>
            </div>
            <div className="landing-faq-list">
              {faqs.map((faq) => (
                <details key={faq.q}>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <LandingClosingCta />
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-page-wrap landing-footer-inner">
          <Link href="/" aria-label="QuizSupport home">
            <SecureLogo size={34} variant="full" rounded={false} />
          </Link>
          <nav aria-label="Footer">
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/quiz">Student quizzes</Link>
            <Link href="/rooms">Rooms</Link>
          </nav>
          <span>Thoughtful quizzes for every classroom.</span>
        </div>
      </footer>

      <LandingReveal />
    </LandingPageShell>
  );
}
