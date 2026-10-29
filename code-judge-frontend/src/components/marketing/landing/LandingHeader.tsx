"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, Plus, X } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV_LINKS = [
  { label: "Toolkit", href: "#toolkit" },
  { label: "AI Generator", href: "#studio" },
  { label: "Paper Composer", href: "#paper-builder" },
  { label: "Live Platform", href: "#platform" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingHeader({ trialDays = 0 }: { trialDays?: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(true);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnDesktop = () => {
      if (window.matchMedia("(min-width: 1081px)").matches) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("resize", closeOnDesktop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", closeOnDesktop);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const showPromo = promoOpen && trialDays > 0;

  return (
    <>
      {showPromo && (
        <div className="promo" role="region" aria-label="Creator offer">
          <div className="wrap">
            <div className="promo-copy">
              <span className="promo-badge">
                <i aria-hidden="true" />
                New creator offer
              </span>
              <span>
                <strong>{trialDays}-day Basic trial</strong> · AI credits included · Owner approval
                required · No credit card required.
              </span>
            </div>
            <div className="promo-actions">
              <Link href="/start-free-trial" className="promo-cta">
                Request Basic trial
                <ArrowRight size={14} aria-hidden />
              </Link>
              <button
                type="button"
                className="promo-close"
                aria-label="Dismiss announcement"
                onClick={() => setPromoOpen(false)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="site-head">
        <div className="wrap">
          <Link href="/" aria-label="QuizSupport home" className="logo-link">
            <SecureLogo size={35} variant="full" rounded={false} className="logo" />
          </Link>

          <nav className="nl" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <ThemeToggle variant="icon" />
            <Link href="/login" className="btn sm">
              Log in
            </Link>
            <Link href="/creator/quizzes/create" className="btn sm pri">
              Create a paper
            </Link>
          </nav>

          <div className="ha">
            <ThemeToggle variant="icon" />
            <Link href="/login" className="btn sm login-desktop">
              Log in
            </Link>
            <Link href="/creator/quizzes/create" className="btn sm pri create-desktop">
              <Plus size={14} aria-hidden />
              Create
            </Link>
            <button
              type="button"
              className="nav-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="landing-mobile-nav" className="mobile-menu">
            <nav aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mobile-menu-actions">
              <Link href="/login" className="btn sm" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link
                href="/creator/quizzes/create"
                className="btn sm pri"
                onClick={() => setMenuOpen(false)}
              >
                Create a paper
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
