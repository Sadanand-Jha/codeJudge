"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, PenLine, Sparkles, X, type LucideIcon } from "lucide-react";

const CREATE_OPTIONS: Array<{
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge: string;
}> = [
  {
    label: "Create manually",
    description: "Write and configure each problem yourself, with full control over the content.",
    href: "/creator/problems/create/manual",
    icon: PenLine,
    badge: "Full control",
  },
  {
    label: "Generate with AI",
    description: "Create a draft from your syllabus, selected topics or uploaded study material.",
    href: "/creator/problems/create",
    icon: Sparkles,
    badge: "AI assisted",
  },
];

export function AssignmentCreateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assignment-create-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_var(--qs-sun)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
              Assignment Builder
            </p>
            <h2 id="assignment-create-title" className="mt-1 text-xl font-extrabold text-[var(--qs-ink)]">
              How do you want to create this assignment?
            </h2>
            <p className="mt-1 text-sm text-[var(--qs-muted)]">
              Create it yourself, or let AI draft it from your syllabus.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-ink)] hover:text-[var(--qs-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {CREATE_OPTIONS.map(({ label, description, href, icon: Icon, badge }) => (
            <Link
              key={label}
              href={href}
              onClick={onClose}
              className="group flex flex-col rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] p-4 shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--qs-sun)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--qs-brand)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[var(--qs-ink)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-poly-1)] px-2 py-0.5 text-[10px] font-bold text-[var(--qs-brand)]">
                  {badge}
                </span>
              </div>
              <h3 className="mt-4 text-base font-extrabold text-[var(--qs-ink)]">{label}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--qs-muted)]">{description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--qs-brand)]">
                Continue
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
