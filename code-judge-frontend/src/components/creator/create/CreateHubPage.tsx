"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ListChecks,
  NotebookPen,
  FileText,
  ArrowRight,
  Sparkles,
  Upload,
  Clock3,
  Settings2,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/creator/billing/ui";
import { cn } from "@/lib/helpers";
import { AiStreamText } from "@/components/ui";

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
    >
      <Link
        href={href}
        className={`group relative flex flex-col gap-4 overflow-hidden rounded-[22px] bg-gradient-to-br p-5 text-white transition-transform duration-200 hover:-translate-y-0.5 sm:p-6 ${gradient} ${shadow}`}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
        <div className={`pointer-events-none absolute -bottom-24 right-10 h-48 w-48 rounded-full blur-3xl ${orb}`} />
        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xl ${iconClass}`}>
          <Icon className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="inline-flex items-center rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-sm">
            {eyebrow}
          </span>
          <h3 className="mt-2 text-[26px] font-black leading-none tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
            {title}
          </h3>
          <p className="mt-2 text-[13px] font-medium leading-6 text-white">{sub}</p>
        </div>
        <span className={`relative inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-5 text-[13px] font-black shadow-xl ${ctaClass}`}>
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
        actions={
          <Link
            href="/creator/ai-studio"
            className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-pink-500/30 hover:text-text-primary sm:flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            <AiStreamText text="AI Studio" />
          </Link>
        }
      />

      {/* Feature spotlight — one card at a time, rotating every 10s */}
      <FeatureSpotlight />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <CreateBanner
        href="/creator/quizzes"
        gradient="from-violet-600 via-fuchsia-500 to-pink-500"
        shadow="shadow-[0_20px_50px_-20px_rgba(192,38,211,.55)]"
        orb="bg-cyan-300/30"
        icon={ListChecks}
        iconClass="text-fuchsia-600"
        eyebrow="Your library"
        title="Your Quizzes"
        sub="Everything you've built lives here — open, edit, share and track your quizzes."
        cta="Open quizzes"
        ctaClass="text-fuchsia-600"
        delay={0.05}
      />

      <CreateBanner
        href="/creator/tests/create"
        gradient="from-emerald-500 via-teal-500 to-cyan-600"
        shadow="shadow-[0_20px_50px_-20px_rgba(16,185,129,.55)]"
        orb="bg-amber-300/30"
        icon={FileText}
        iconClass="text-teal-600"
        eyebrow="Complete papers"
        title="Question Papers"
        sub="Generate full question papers with sections, marking scheme and a print-ready layout."
        cta="Generate paper"
        ctaClass="text-teal-600"
        delay={0.1}
      />

      <CreateBanner
        href="/creator/problems/create"
        gradient="from-amber-500 via-orange-500 to-rose-500"
        shadow="shadow-[0_20px_50px_-20px_rgba(249,115,22,.55)]"
        orb="bg-yellow-200/30"
        icon={NotebookPen}
        iconClass="text-orange-600"
        eyebrow="Practice"
        title="Problems"
        sub="Create standalone coding or MCQ problems — set difficulty levels and reuse them anywhere."
        cta="Create problem"
        ctaClass="text-orange-600"
        delay={0.15}
      />
      </div>
    </div>
  );
}
