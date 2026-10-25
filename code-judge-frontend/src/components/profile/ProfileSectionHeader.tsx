"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/helpers";

interface ProfileSectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconTone?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared header used across every profile sub-page so the
 * workspace feels cohesive.
 */
export default function ProfileSectionHeader({
  title,
  description,
  icon: Icon,
  iconTone = "from-[#F59E0B] to-[#F97316]",
  badge,
  actions,
  className,
}: ProfileSectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("mb-5 flex flex-wrap items-start justify-between gap-4 rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)] sm:p-5", className)}
    >
      <div className="flex items-center gap-3.5">
        {Icon && (
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border-2 border-[var(--qs-ink)] bg-gradient-to-br shadow-[2px_2px_0_var(--qs-sun)]", iconTone)}>
            <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
          </span>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold tracking-tight text-[var(--qs-ink)]">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-[var(--qs-muted)]">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
