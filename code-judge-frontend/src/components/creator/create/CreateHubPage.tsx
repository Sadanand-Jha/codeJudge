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
    gradient: "from-emerald-400 to-teal-600",
    glow: "bg-emerald-400/25",
    tint: "from-emerald-500/[0.08] to-teal-500/[0.03]",
  },
  {
    icon: Upload,
    label: "Import & AI generation",
    sub: "From files, topics or prompts",
    gradient: "from-pink-500 to-violet-600",
    glow: "bg-pink-500/25",
    tint: "from-pink-500/[0.08] to-violet-500/[0.03]",
  },
  {
    icon: Settings2,
    label: "Type-aware builder",
    sub: "Right tools appear for the right type",
    gradient: "from-amber-400 to-orange-600",
    glow: "bg-amber-400/25",
    tint: "from-amber-500/[0.10] to-orange-500/[0.03]",
  },
  {
    icon: GraduationCap,
    label: "Sell or assign",
    sub: "Publish, price or share with classes",
    gradient: "from-cyan-400 to-blue-600",
    glow: "bg-cyan-400/25",
    tint: "from-cyan-500/[0.08] to-blue-500/[0.03]",
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
          className={cn(
            "relative flex items-start gap-3 overflow-hidden rounded-2xl border border-border bg-card bg-gradient-to-br p-4",
            feature.tint
          )}
        >
          <div className={cn("pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full blur-3xl", feature.glow)} />
          <div className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", feature.gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="relative min-w-0">
            <p className="text-sm font-bold tracking-tight text-text-primary">{feature.label}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{feature.sub}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CreateBanner({
  href,
  gradient,
  shadow,
  orb,
  icon: Icon,
  iconClass,
  eyebrow,
  eyebrowClass,
  title,
  sub,
  cta,
  ctaClass,
  delay,
}: {
  href: string;
  gradient: string;
  shadow: string;
  orb: string;
  icon: LucideIcon;
  iconClass: string;
  eyebrow: string;
  eyebrowClass: string;
  title: string;
  sub: string;
  cta: string;
  ctaClass: string;
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
        className={`group relative flex h-full flex-col gap-4 overflow-hidden rounded-[22px] bg-gradient-to-br p-5 text-slate-900 ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6 dark:text-white dark:ring-white/10 ${gradient} ${shadow}`}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-white/50 blur-3xl dark:bg-white/10" />
        <div className={`pointer-events-none absolute -bottom-24 right-10 h-48 w-48 rounded-full blur-3xl ${orb}`} />
        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-white/95 ${iconClass}`}>
          <Icon className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${eyebrowClass}`}>
            {eyebrow}
          </span>
          <h3 className="mt-2 text-[26px] font-black leading-none tracking-tight text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 text-[13px] font-medium leading-6 text-slate-600 dark:text-slate-300">{sub}</p>
        </div>
        <span className={`relative inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 text-[13px] font-black shadow-lg transition-colors ${ctaClass}`}>
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
        gradient="from-rose-100 via-pink-50 to-white dark:from-[#2A0F18] dark:via-[#1C0B12] dark:to-[#120A0E]"
        shadow="shadow-[0_20px_50px_-24px_rgba(225,29,72,.35)]"
        orb="bg-rose-300/40 dark:bg-rose-500/20"
        icon={ListChecks}
        iconClass="text-rose-600"
        eyebrow="Your library"
        eyebrowClass="bg-rose-600/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300"
        title="Your Quizzes"
        sub="Everything you've built lives here — open, edit, share and track your quizzes."
        cta="Open quizzes"
        ctaClass="bg-rose-600 text-white hover:bg-rose-700"
        delay={0.05}
      />

      <CreateBanner
        href="/creator/tests/create"
        gradient="from-rose-100 via-pink-50 to-white dark:from-[#2A0F18] dark:via-[#1C0B12] dark:to-[#120A0E]"
        shadow="shadow-[0_20px_50px_-24px_rgba(225,29,72,.35)]"
        orb="bg-rose-300/40 dark:bg-rose-500/20"
        icon={FileText}
        iconClass="text-rose-600"
        eyebrow="Complete papers"
        eyebrowClass="bg-rose-600/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300"
        title="Question Papers"
        sub="Generate full question papers with sections, marking scheme and a print-ready layout."
        cta="Generate paper"
        ctaClass="bg-rose-600 text-white hover:bg-rose-700"
        delay={0.1}
      />

      <CreateBanner
        href="/creator/problems/create"
        gradient="from-rose-100 via-pink-50 to-white dark:from-[#2A0F18] dark:via-[#1C0B12] dark:to-[#120A0E]"
        shadow="shadow-[0_20px_50px_-24px_rgba(225,29,72,.35)]"
        orb="bg-rose-300/40 dark:bg-rose-500/20"
        icon={NotebookPen}
        iconClass="text-rose-600"
        eyebrow="Practice"
        eyebrowClass="bg-rose-600/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300"
        title="Problems"
        sub="Create standalone coding or MCQ problems — set difficulty levels and reuse them anywhere."
        cta="Create problem"
        ctaClass="bg-rose-600 text-white hover:bg-rose-700"
        delay={0.15}
      />
      </div>
    </div>
  );
}
