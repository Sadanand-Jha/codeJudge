"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, GraduationCap, Shapes, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/helpers";
import { IS_DEMO_CREATOR } from "@/components/creator/workspace/mockData";
import { isNestedQuizPath } from "@/lib/quizWorkspace";

type Workspace = "student" | "studio";

/**
 * Compact workspace switcher shown in the top-right header. Lets a user move
 * between the Student workspace and the Creator Studio workspace without
 * mixing the two navigation hierarchies.
 *
 * Studio is only offered when the user has creator capabilities; otherwise a
 * "Become a Creator" action is shown instead.
 */
export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const workspace: Workspace = pathname.startsWith("/creator") || isNestedQuizPath(pathname) ? "studio" : "student";
  const canAccessStudio = IS_DEMO_CREATOR === true;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Switch workspace"
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:bg-white/[0.04]",
          open && "border-border-hover bg-white/[0.04]"
        )}
      >
        {workspace === "studio" ? (
          <Shapes className="h-3.5 w-3.5 shrink-0 text-pink-500 dark:text-ai-accent" />
        ) : (
          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
        )}
        <span className="whitespace-nowrap">{workspace === "studio" ? "Studio" : "Student"}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-text-muted transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-border bg-card p-1.5 shadow-xl"
            >
              <WorkspaceOption
                active={workspace === "student"}
                icon={<GraduationCap className="h-4 w-4 shrink-0 text-text-secondary" />}
                label="Student"
                description="Student Workspace"
                href="/"
                onSelect={() => setOpen(false)}
              />

              <div className="my-1 h-px bg-border" />

              {canAccessStudio ? (
                <WorkspaceOption
                  active={workspace === "studio"}
                  icon={<Shapes className="h-4 w-4 shrink-0 text-pink-500 dark:text-ai-accent" />}
                  label="Studio"
                  description="Create and manage quizzes"
                  href="/creator"
                  onSelect={() => setOpen(false)}
                />
              ) : (
                <Link
                  href="/creator"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-pink-500 dark:text-ai-accent" />
                  Become a Creator
                </Link>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkspaceOption({
  active,
  icon,
  label,
  description,
  href,
  onSelect,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
        active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
      )}
    >
      {icon}
      <div className="min-w-0 flex-1 leading-tight">
        <p className={cn("text-xs font-semibold", active ? "text-text-primary" : "text-text-secondary")}>{label}</p>
        <p className="truncate text-[10px] text-text-muted">{description}</p>
      </div>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
    </Link>
  );
}