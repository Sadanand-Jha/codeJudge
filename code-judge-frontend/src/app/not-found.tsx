"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Trophy, FileText, Lightbulb, MessageSquare, Home } from "lucide-react";

export default function NotFound() {
  const pathname = usePathname() || "";
  const isStudioContext =
    pathname.startsWith("/creator") ||
    pathname.startsWith("/quiz/") ||
    pathname.includes("/quizzes/");
  const homeHref = isStudioContext ? "/creator/quizzes" : "/";
  const homeLabel = isStudioContext ? "Back to Quizzes" : "Back to Home";
  const links = [
    { icon: Code2, label: "Problemset", href: "/problems" },
    { icon: Trophy, label: "Contests", href: "/contests" },
    { icon: FileText, label: "My Submissions", href: "/submissions" },
    { icon: MessageSquare, label: "AI Chat", href: "/ai/chat" },
    { icon: Lightbulb, label: "Hints", href: "/ai/hints" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center">
          <span className="text-2xl font-bold text-white">404</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">Page Not Found</h1>
        <p className="text-sm text-text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group rounded-xl border border-border bg-card p-4 hover:border-accent/30 transition-all"
              >
                <Icon className="w-5 h-5 text-text-secondary group-hover:text-accent transition-colors mx-auto mb-2" />
                <div className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                  {link.label}
                </div>
              </Link>
            );
          })}
        </div>
        <Link
          href={homeHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-accent hover:shadow-[0_0_12px_rgba(37,99,235,0.3)] transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}