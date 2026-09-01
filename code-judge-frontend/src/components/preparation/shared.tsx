"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";

/**
 * Shared, information-dense UI primitives for the Preparation area.
 * Preparation pages should feel journey-oriented: progress indicators,
 * timelines and completion states — never huge dashboard cards.
 */

/* ─────────────────────────── Page header ─────────────────────────── */

interface PrepPageHeaderProps {
  /** Section label shown in the breadcrumb, e.g. "Interviews" */
  section: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PrepPageHeader({ section, title, subtitle, actions }: PrepPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <Link
          href="/preparation"
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:text-accent transition-colors"
        >
          Preparation
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-secondary">{section}</span>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight mt-1.5">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="hidden sm:flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ─────────────────────────── Progress bar ─────────────────────────── */

export function PrepProgressBar({
  value,
  className,
  barClassName,
  animate = true,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  animate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 rounded-full bg-border overflow-hidden", className)}>
      {animate ? (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]", barClassName)}
        />
      ) : (
        <div
          className={cn("h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6]", barClassName)}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}

/* ──────────────────────── Compact metric row ──────────────────────── */

interface CompactMetricProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  iconClassName?: string;
}

/** Compact, information-dense metric — a row, not a card. */
export function CompactMetric({ label, value, hint, icon: Icon, iconClassName }: CompactMetricProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card min-w-0">
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card-hover", iconClassName)}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
        <span className="block text-sm font-bold text-text-primary">
          {value}
          {hint && <span className="ml-1.5 text-[10px] font-medium text-text-secondary">{hint}</span>}
        </span>
      </span>
    </div>
  );
}

/* ───────────────────────── Section heading ───────────────────────── */

export function PrepSectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-accent shrink-0" />
        <h2 className="text-sm font-semibold text-text-primary truncate">{title}</h2>
      </div>
      {action}
    </div>
  );
}
