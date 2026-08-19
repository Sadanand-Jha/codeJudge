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
      className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}
    >
      <div className="flex items-center gap-3.5">
        {Icon && (
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg", iconTone)}>
            <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
          </span>
        )}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-text-secondary">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
