"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function LpHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);

  return (
    <header className="lpx-header">
      <div className="lpx-wrap lpx-nav">
        <Link href="/" className="lpx-logo" aria-label="QuizSupport home">
          <SecureLogo size={38} variant="full" rounded={false} />
        </Link>
        <nav className="lpx-links landing-nav-pill" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lpx-nav-actions">
          <ThemeToggle variant="icon" />
          <Link href="/login" className="landing-nav-login">
            Log in
          </Link>
          <Link href="/creator/quizzes/create" className="landing-nav-create">
            <span>Create your first paper</span>
            <ArrowRight size={15} aria-hidden />
          </Link>
          <button
            type="button"
            className="lpx-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lpx-mobile" id="landing-mobile-menu">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}
