"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Lock,
  MoreVertical,
  Pencil,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import type { Letterhead } from "@/types/letterhead";

interface LetterheadCardProps {
  letterhead: Letterhead;
  locked: boolean;
  busy?: boolean;
  onSetDefault: () => void;
  onAdjust: () => void;
  onRename: () => void;
  onDelete: () => void;
  onUpgrade: () => void;
}

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function LetterheadCard({
  letterhead,
  locked,
  busy = false,
  onSetDefault,
  onAdjust,
  onRename,
  onDelete,
  onUpgrade,
}: LetterheadCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const run = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <article
      className={`relative flex min-w-0 flex-col rounded-[20px] border-2 bg-[var(--qs-surface)] shadow-[4px_4px_0_var(--qs-sun)] ${
        locked ? "border-[var(--qs-line)]" : "border-[var(--qs-ink)]"
      } ${busy ? "opacity-70" : ""}`}
    >
      <div className="relative h-32 overflow-hidden rounded-t-[18px] border-b-2 border-[var(--qs-line)] bg-white">
        <img
          src={letterhead.cloudinary.pngUrl}
          alt={`${letterhead.name} preview`}
          loading="lazy"
          className="h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.06em] ${
            letterhead.isDefault
              ? "border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]"
              : "border-[var(--qs-line)] bg-white/90 text-[var(--qs-muted)]"
          }`}
        >
          {letterhead.isDefault ? <Star className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {letterhead.isDefault ? "Default" : "Saved"}
        </span>
        {locked && (
          <button
            type="button"
            onClick={onUpgrade}
            className="absolute inset-0 grid place-items-center bg-[var(--qs-ink)]/55 text-white"
            aria-label="Upgrade to use this letterhead"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-white bg-black/35 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em]">
              <Lock className="h-3.5 w-3.5" />
              Pro required
            </span>
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-[var(--qs-ink)]">{letterhead.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-[var(--qs-muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatDate(letterhead.createdAt)}
            </span>
            <span>·</span>
            <span className="uppercase">{letterhead.cloudinary.originalFormat}</span>
            <span>·</span>
            <span>{letterhead.cloudinary.width}px wide</span>
          </p>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => (locked ? onUpgrade() : setMenuOpen((value) => !value))}
            disabled={busy}
            className="b b-icon sm"
            aria-label={`Actions for ${letterhead.name}`}
            aria-expanded={menuOpen}
          >
            {locked ? <Lock className="h-4 w-4" /> : <MoreVertical className="h-4 w-4" />}
          </button>

          {menuOpen && !locked && (
            <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] py-1 shadow-[4px_4px_0_var(--qs-sun)]">
              {!letterhead.isDefault && (
                <button
                  type="button"
                  onClick={() => run(onSetDefault)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-bold text-[var(--qs-ink)] hover:bg-[var(--qs-bg)]"
                >
                  <Star className="h-3.5 w-3.5" />
                  Set as default
                </button>
              )}
              <button
                type="button"
                onClick={() => run(onAdjust)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-bold text-[var(--qs-ink)] hover:bg-[var(--qs-bg)]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Adjust placement
              </button>
              <button
                type="button"
                onClick={() => run(onRename)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-bold text-[var(--qs-ink)] hover:bg-[var(--qs-bg)]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => run(onDelete)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-bold text-[var(--qs-bad)] hover:bg-[var(--qs-bg)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
