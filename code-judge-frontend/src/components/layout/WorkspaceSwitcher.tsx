"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 12,
    width: 280,
  });
  const pathname = usePathname();

  const workspace: Workspace = pathname.startsWith("/creator") || isNestedQuizPath(pathname) ? "studio" : "student";
  const canAccessStudio = IS_DEMO_CREATOR === true;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 24);
      setDropdownPos({
        top: rect.bottom + 6,
        left: Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12),
        width,
      });
    }
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Switch workspace"
        className={cn(
          "b sm gap-1.5 px-2.5",
          open && "border-[var(--qs-brand)] bg-[var(--qs-bg)]"
        )}
      >
        {workspace === "studio" ? (
          <Shapes className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />
        ) : (
          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[var(--qs-muted)]" />
        )}
        <span className="hidden whitespace-nowrap min-[380px]:inline">
          {workspace === "studio" ? "Studio" : "Student"}
        </span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 text-[var(--qs-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <motion.div
                  ref={dropdownRef}
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="fixed z-50 rounded-2xl border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-1.5 shadow-[5px_5px_0_var(--qs-sun)]"
                  style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                >
                  <WorkspaceOption
                    active={workspace === "student"}
                    icon={<GraduationCap className="h-4 w-4 shrink-0" />}
                    label="Student"
                    description="Student Workspace"
                    href="/quiz"
                    onSelect={() => setOpen(false)}
                  />

                  <div className="my-1 h-0.5 rounded-full bg-[var(--qs-line)]" />

                  {canAccessStudio ? (
                    <WorkspaceOption
                      active={workspace === "studio"}
                      icon={<Shapes className="h-4 w-4 shrink-0" />}
                      label="Studio"
                      description="Create and manage quizzes"
                      href="/creator"
                      onSelect={() => setOpen(false)}
                    />
                  ) : (
                    <Link
                      href="/creator/create"
                      onClick={() => setOpen(false)}
                      className="b b-ghost sm w-full justify-start gap-2"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                      Become a Creator
                    </Link>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
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
        "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition-colors",
        active
          ? "border-[var(--qs-ink)] bg-[var(--qs-bg)] text-[var(--qs-brand)]"
          : "border-transparent text-[var(--qs-muted)] hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
      )}
    >
      {icon}
      <div className="min-w-0 flex-1 leading-tight">
        <p className={cn("text-xs font-extrabold", active ? "text-[var(--qs-brand)]" : "text-[var(--qs-ink)]")}>{label}</p>
        <p className="truncate text-[10px] text-[var(--qs-muted)]">{description}</p>
      </div>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--qs-brand)]" />}
    </Link>
  );
}
