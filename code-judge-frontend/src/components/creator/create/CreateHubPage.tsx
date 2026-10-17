"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ListChecks,
  NotebookPen,
  FileText,
  ArrowRight,
  Upload,
  Clock3,
  Settings2,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";

const FEATURE_SPOTLIGHT = [
  {
    icon: Clock3,
    label: "Reusable question bank",
    sub: "Build once, reuse across everything",
    tile: "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]",
    glow: "bg-[var(--qs-brand)]/15",
  },
  {
    icon: Upload,
    label: "Import & AI generation",
    sub: "From files, topics or prompts",
    tile: "bg-[var(--qs-sun)] text-[var(--qs-ink)]",
    glow: "bg-[var(--qs-sun)]/25",
  },
  {
    icon: Settings2,
    label: "Type-aware builder",
    sub: "Right tools appear for the right type",
    tile: "bg-[var(--qs-ok)] text-white",
    glow: "bg-[var(--qs-ok)]/15",
  },
  {
    icon: GraduationCap,
    label: "Sell or assign",
    sub: "Publish, price or share with classes",
    tile: "bg-[var(--qs-brand)] text-[var(--qs-on-brand)]",
    glow: "bg-[var(--qs-brand)]/15",
  },
];

const FEATURE_ROTATE_SECONDS = 10;

function FeatureSpotlight() {
  const [active, setActive] = useState(0);

  // Advance one card every 10s.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % FEATURE_SPOTLIGHT.length);
    }, FEATURE_ROTATE_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const feature = FEATURE_SPOTLIGHT[active];
  const Icon = feature.icon;

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, x: 40, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40, scale: 0.98 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative flex items-start gap-3 overflow-hidden rounded-2xl border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4"
        >
          <div className={cn("pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full blur-3xl", feature.glow)} />
          <div className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", feature.tile)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="relative min-w-0">
            <p className="text-sm font-bold tracking-tight text-[var(--qs-ink)]">{feature.label}</p>
            <p className="mt-0.5 text-xs text-[var(--qs-muted)]">{feature.sub}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CreateBanner({
  href,
  icon: Icon,
  eyebrow,
  title,
  sub,
  cta,
  delay,
}: {
  href: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  sub: string;
  cta: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="h-full"
    >
      <Link
        href={href}
        className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[6px_6px_0_0_var(--qs-sun)] transition-transform duration-200 hover:-translate-y-0.5 sm:p-6"
      >
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--qs-brand)]/[0.08] text-[var(--qs-brand)]">
          <Icon className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full border-2 border-[var(--qs-brand)]/25 bg-[var(--qs-brand)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--qs-brand)]">
            {eyebrow}
          </span>
          <h3 className="qs-display mt-2 text-[26px] text-[var(--qs-ink)]">
            {title}
          </h3>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[var(--qs-muted)]">{sub}</p>
        </div>
        <span className="relative inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--qs-brand)] px-5 text-[13px] font-black text-[var(--qs-on-brand)] transition-all group-hover:brightness-110">
          {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}

export function CreateHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New"
        subtitle="Choose what you want to build — one flow, built around your content type."
      />

      {/* Feature spotlight — one card at a time, rotating every 10s */}
      <FeatureSpotlight />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <CreateBanner
        href="/creator/quizzes"
        icon={ListChecks}
        eyebrow="Your library"
        title="Your Quizzes"
        sub="Everything you've built lives here — open, edit, share and track your quizzes."
        cta="Open quizzes"
        delay={0.05}
      />

      <CreateBanner
        href="/creator/tests/create"
        icon={FileText}
        eyebrow="Complete papers"
        title="Question Papers"
        sub="Generate full question papers with sections, marking scheme and a print-ready layout."
        cta="Generate paper"
        delay={0.1}
      />

      <CreateBanner
        href="/creator/problems/create"
        icon={NotebookPen}
        eyebrow="Practice"
        title="Problems"
        sub="Create standalone coding or MCQ problems — set difficulty levels and reuse them anywhere."
        cta="Create problem"
        delay={0.15}
      />
      </div>
    </div>
  );
}
