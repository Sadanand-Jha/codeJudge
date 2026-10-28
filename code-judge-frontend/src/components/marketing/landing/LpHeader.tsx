"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SecureLogo } from "@/components/common/SecureLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";

const LINKS = [
  { label: "Tools", href: "#tools" },
  { label: "Features", href: "#features" },
  { label: "Rooms", href: "#rooms" },
  { label: "How it works", href: "#how" },
  { label: "Who it is for", href: "#who" },
  { label: "Pricing", href: "#pricing" },
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
          <SecureLogo size={42} variant="full" rounded={false} />
        </Link>
        <nav className="lpx-links" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="lpx-nav-actions">
          <ThemeToggle variant="icon" />
          <Link href="/login" className="lpx-btn lpx-btn-outline lpx-btn-sm">
            Log in
          </Link>
          <Link href="/creator/quizzes/create" className="lpx-btn lpx-btn-sm">
            Create a paper
          </Link>
          <button
            type="button"
            className="lpx-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lpx-mobile">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link href="/creator/quizzes/create" onClick={() => setOpen(false)}>
            Create a paper
          </Link>
        </div>
      )}
    </header>
  );
}
