"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/helpers";

/**
 * Shared back affordance for internal (nested) pages.
 *
 * Renders nothing on top-level pages and is deliberately hidden across the
 * quiz flows (`/quiz/*`, `/creator/quizzes/*`) — those keep their own
 * dedicated navigation. Uses browser history when it exists and falls back to
 * the parent route so opening a deep link in a fresh tab never dead-ends.
 */

export function isQuizRoute(pathname: string): boolean {
  return pathname.startsWith("/quiz") || pathname.startsWith("/creator/quizzes");
}

export function isInternalRoute(pathname: string): boolean {
  if (isQuizRoute(pathname)) return false;
  return pathname.split("/").filter(Boolean).length >= 2;
}

export default function BackButton({ className, label = "Back" }: { className?: string; label?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  if (!isInternalRoute(pathname)) return null;

  const goBack = () => {
    const segments = pathname.split("/").filter(Boolean);
    const parent = `/${segments.slice(0, -1).join("/")}`;
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(parent || "/");
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      title={label}
      className={cn(
        "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-ai-border bg-ai-bg/40 px-2 text-xs font-medium text-text-secondary transition-colors hover:border-ai-accent/40 hover:text-text-primary",
        className
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}