"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, Star, StarHalf, ArrowRight, Zap } from "lucide-react";
import type { Difficulty } from "./types";
import { cn } from "@/lib/helpers";

/* ============================================
   Section heading with optional "View All" action
   ============================================ */
export function SectionHeading({
  title,
  subtitle,
  href,
  hrefLabel = "View All",
  icon,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  hrefLabel?: string;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className="mb-6 flex items-end justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/12 to-violet-600/12 text-pink-500 ring-1 ring-inset ring-pink-500/15">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-text-primary sm:text-[22px]">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-pink-500 transition-colors hover:bg-pink-500/10 dark:text-ai-accent dark:hover:bg-ai-accent/10"
        >
          {hrefLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </motion.div>
  );
}

/* ============================================
   Exam chip — small colored pill
   ============================================ */
export function ExamChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        className
      )}
    >
      {label}
    </span>
  );
}

/* ============================================
   Difficulty pill
   ============================================ */
const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  hard: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  mixed: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
};

export function DifficultyPill({ level }: { level: Difficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize",
        DIFFICULTY_STYLES[level]
      )}
    >
      {level === "mixed" && <Zap className="h-3 w-3" />}
      {level}
    </span>
  );
}

/* ============================================
   Rating stars
   ============================================ */
export function Stars({ rating, size = 13, className }: { rating: number; size?: number; className?: string }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-400", className)} aria-label={`${rating} out of 5`}>
      {Array.from({ length: full }).map((_, i) => (
        <Star key={i} style={{ width: size, height: size }} className="fill-current" />
      ))}
      {half && <StarHalf style={{ width: size, height: size }} className="fill-current" />}
      {Array.from({ length: 5 - full - (half ? 1 : 0) }).map((_, i) => (
        <Star key={`e${i}`} style={{ width: size, height: size }} className="text-border-hover" />
      ))}
    </span>
  );
}

/* ============================================
   Verified teacher name
   ============================================ */
export function VerifiedName({ name, verified, className }: { name: string; verified?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="truncate font-semibold">{name}</span>
      {verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-500 dark:text-sky-400" />}
    </span>
  );
}

/* ============================================
   Gradient avatar (initials)
   ============================================ */
export function TeacherAvatar({ name, gradient, size = 40, className }: { name: string; gradient: string; size?: number; className?: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-2 ring-white/60 dark:ring-white/10",
        gradient,
        className
      )}
    >
      {initials}
    </span>
  );
}

/* ============================================
   Price hierarchy — ₹499 ₹999 50% OFF
   ============================================ */
export function PriceTag({
  price,
  originalPrice,
  size = "sm",
  className,
}: {
  price: number;
  originalPrice?: number;
  size?: "sm" | "lg";
  className?: string;
}) {
  const discount = originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5", className)}>
      <span className={cn("font-extrabold tabular-nums text-text-primary", size === "lg" ? "text-2xl" : "text-[15px]")}>
        ₹{price.toLocaleString("en-IN")}
      </span>
      {discount > 0 && (
        <>
          <span className={cn("font-medium tabular-nums text-text-muted line-through", size === "lg" ? "text-sm" : "text-[11px]")}>
            ₹{originalPrice!.toLocaleString("en-IN")}
          </span>
          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
            {discount}% OFF
          </span>
        </>
      )}
    </span>
  );
}

/* ============================================
   FREE badge — green accent, not obnoxious
   ============================================ */
export function FreeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-300",
        className
      )}
    >
      Free
    </span>
  );
}

/* ============================================
   Count label with icon — e.g. "12.4K students"
   ============================================ */
export function StatLabel({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-text-secondary", className)}>
      {icon}
      <span className="tabular-nums">{children}</span>
    </span>
  );
}

/* ============================================
   Primary CTA button (pink→violet)
   ============================================ */
export function PrimaryButton({
  children,
  className,
  href,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2.5 text-[13px] font-bold text-white",
    "shadow-[0_4px_16px_rgba(236,72,153,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_26px_rgba(236,72,153,0.4)] active:translate-y-0 active:scale-[0.98]",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0",
    className
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/* ============================================
   Secondary / ghost button
   ============================================ */
export function GhostButton({
  children,
  className,
  href,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] font-semibold text-text-primary",
    "transition-all duration-200 hover:border-pink-500/30 hover:text-pink-500 dark:hover:border-ai-accent/40 dark:hover:text-ai-accent",
    className
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
