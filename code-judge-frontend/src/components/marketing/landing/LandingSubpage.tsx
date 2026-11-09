import Link from "next/link";
import { ArrowRight, Check, Sparkles, type LucideIcon } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import LandingIllustration from "./LandingIllustration";

export interface SubpageHeroItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

/** Landing-style hero (aurora, copy, art panel) for secondary marketing pages. */
export function LandingSubpageHero({
  eyebrow,
  title,
  lead,
  meta,
  panelLabel,
  panelTitle,
  panelText,
  panelItems,
  caption,
  ariaLabelledBy,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
  meta: string[];
  panelLabel: string;
  panelTitle: string;
  panelText: string;
  panelItems: SubpageHeroItem[];
  caption?: string;
  ariaLabelledBy: string;
}) {
  return (
    <section className="landing-hero about-hero" aria-labelledby={ariaLabelledBy} data-reveal>
      <div className="landing-hero-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="landing-hero-copy">
        <span className="landing-eyebrow">
          <Sparkles size={15} aria-hidden />
          {eyebrow}
        </span>
        <h1 id={ariaLabelledBy}>{title}</h1>
        <p>{lead}</p>
        <ul className="pricing-hero-meta landing-pricing-meta" aria-label="Highlights">
          {meta.map((item) => (
            <li key={item}>
              <Check size={14} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="landing-hero-art-wrap">
        <div className="landing-fan-card landing-fan-card-yellow" aria-hidden="true" />
        <div className="landing-fan-card landing-fan-card-rose" aria-hidden="true" />
        <div className="landing-hero-panel">
          <div className="landing-panel-intro">
            <span className="landing-panel-label">
              <Sparkles size={14} aria-hidden />
              {panelLabel}
            </span>
            <h2>{panelTitle}</h2>
            <p>{panelText}</p>
          </div>
          <ul className="pricing-glance-list">
            {panelItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <span>{item.label}</span>
                  {Icon ? <Icon size={16} aria-hidden /> : <ArrowRight size={16} aria-hidden />}
                </>
              );
              return (
                <li key={item.label}>
                  {item.href ? <Link href={item.href}>{content}</Link> : content}
                </li>
              );
            })}
          </ul>
        </div>
        <LandingIllustration variant="hero" />
      </div>
      {caption ? <p className="landing-hero-caption">{caption}</p> : null}
    </section>
  );
}

/** Landing-style footer used on secondary marketing pages. */
export function LandingSiteFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-page-wrap landing-footer-inner">
        <Link href="/" aria-label="QuizSupport home">
          <SecureLogo size={34} variant="full" rounded={false} />
        </Link>
        <nav aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/quiz">Student quizzes</Link>
        </nav>
        <span>Thoughtful quizzes for every classroom.</span>
      </div>
    </footer>
  );
}
