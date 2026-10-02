import type { LucideIcon } from "lucide-react";
import { ArrowRight, Sparkles, Construction } from "lucide-react";
import Link from "next/link";
/**
 * Placeholder for creator modules that ship after the billing phase
 * (Tests, Question Bank, Students, Analytics, Coupons, Creator settings...).
 * Renders inside the Creator shell so navigation stays intact.
 */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  features,
  accent,
  action,
  options,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  accent: string;
  action?: { label: string; href: string };
  options?: Array<{ label: string; description: string; href: string; icon: LucideIcon }>;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-[0.15] blur-3xl"
          style={{ background: "radial-gradient(circle, #EC4899, #8B5CF6)" }}
        />
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-pink-500/10 to-violet-600/10" style={{ color: accent }}>
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-text-primary">{title}</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{description}</p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-text-muted">
            <Construction className="h-3.5 w-3.5" />
            Part of the next build phase
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-[13px] text-text-secondary"
            >
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: accent }} />
              {feature}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
          {action ? (
            <>
              <Link
                href={action.href}
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-3 sm:py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:brightness-105"
              >
                {action.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/creator"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 sm:py-2.5 text-[13px] font-semibold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
              >
                Go to Creator Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/creator"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-3 sm:py-2.5 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all hover:brightness-105"
              >
                Go to Creator Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/creator/quizzes"
                className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 sm:py-2.5 text-[13px] font-semibold text-text-primary transition-colors hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent"
              >
                Open Quizzes
              </Link>
            </>
          )}
        </div>

        {options && options.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {options.map((option) => (
              <Link
                key={option.label}
                href={option.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-pink-500/30 hover:shadow-[0_8px_24px_rgba(236,72,153,0.12)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-[0_4px_16px_rgba(236,72,153,0.28)]">
                  <option.icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-text-primary">{option.label}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-text-secondary">{option.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-pink-500" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}