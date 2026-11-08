"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export type LpHeaderLink = { label: string; href: string };

export default function LpHeader({ links = LINKS }: { links?: LpHeaderLink[] }) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  return (
    <header ref={headerRef} className="lpx-header">
      <div className="lpx-wrap lpx-nav">
        <Link href="/" className="lpx-logo" aria-label="QuizSupport home">
          <SecureLogo size={38} variant="full" rounded={false} />
        </Link>
        <nav className="lpx-links landing-nav-pill" aria-label="Primary">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lpx-nav-actions">
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
          {links.map((link) => (
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
