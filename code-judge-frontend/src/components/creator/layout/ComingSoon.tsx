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
    <div className="mx-auto w-full max-w-3xl">
      <div className="qs-shadow mt-2 mb-6 mr-4">
        <div className="overflow-hidden rounded-[26px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--qs-brand)] px-5 py-4 text-[var(--qs-on-brand)] sm:px-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-[var(--qs-sun)] text-[#1a1240]">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold">{title}</h1>
                <p className="text-[13px] opacity-90">Part of the next build phase</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-[var(--qs-on-brand)]/30 bg-[var(--qs-on-brand)]/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em]">
              <Construction className="h-3.5 w-3.5" />
              Coming soon
            </span>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-sm leading-relaxed text-[var(--qs-muted)]">{description}</p>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2.5 rounded-[16px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-4 py-2.5 text-[13px] font-medium text-[var(--qs-ink)]"
                >
                  <Sparkles className="h-4 w-4 shrink-0" style={{ color: accent }} />
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={action?.href ?? "/creator"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-6 py-3 text-sm font-extrabold text-[var(--qs-on-brand)] shadow-[4px_4px_0_var(--qs-sun)] transition hover:brightness-105 sm:w-auto"
              >
                {action?.label ?? "Go to Creator Dashboard"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={action ? "/creator" : "/creator/quizzes"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-6 py-3 text-sm font-extrabold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)] sm:w-auto"
              >
                {action ? "Go to Creator Dashboard" : "Open Quizzes"}
              </Link>
            </div>

            {options && options.length > 0 && (
              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {options.map((option) => (
                  <Link
                    key={option.label}
                    href={option.href}
                    className="group flex items-center gap-3.5 rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--qs-ink)] hover:shadow-[4px_4px_0_var(--qs-sun)]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] text-[var(--qs-on-brand)]">
                      <option.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-[var(--qs-ink)]">{option.label}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-[var(--qs-muted)]">
                        {option.description}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--qs-brand)]" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
