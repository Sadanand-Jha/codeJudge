"use client";

import { useEffect } from "react";
import { FileText, Loader2, Star, X } from "lucide-react";
import type { Letterhead } from "@/types/letterhead";

interface ChooseLetterheadDialogProps {
  open: boolean;
  letterheads: Letterhead[];
  submitting?: boolean;
  onSelect: (letterhead: Letterhead | null) => void;
  onClose: () => void;
}

export function ChooseLetterheadDialog({
  open,
  letterheads,
  submitting = false,
  onSelect,
  onClose,
}: ChooseLetterheadDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-letterhead-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--qs-brand)]">
                Before download
              </p>
              <h2
                id="choose-letterhead-title"
                className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--qs-ink)]"
              >
                Which header should this PDF use?
              </h2>
              <p className="mt-1 text-xs font-medium text-[var(--qs-muted)]">
                You have multiple saved headers. Pick one for this download.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="b b-icon sm disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[55dvh] space-y-2 overflow-y-auto px-5 py-4">
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={submitting}
            className="flex w-full items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-left transition-colors hover:border-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border-2 border-[var(--qs-line)] bg-white text-[var(--qs-muted)]">
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-[var(--qs-ink)]">
                Standard paper
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold text-[var(--qs-muted)]">
                No custom letterhead on this PDF.
              </span>
            </span>
          </button>

          {letterheads.map((letterhead) => (
            <button
              key={letterhead.id}
              type="button"
              onClick={() => onSelect(letterhead)}
              disabled={submitting}
              className="flex w-full items-center gap-3 rounded-[14px] border-2 border-[var(--qs-line)] bg-white p-3 text-left transition-colors hover:border-[var(--qs-ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="h-10 w-16 shrink-0 overflow-hidden rounded-[8px] border border-[var(--qs-line)] bg-[var(--qs-bg)]">
                <img
                  src={letterhead.cloudinary.pngUrl}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-extrabold text-[var(--qs-ink)]">
                    {letterhead.name}
                  </span>
                  {letterhead.isDefault && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--qs-line)] bg-[var(--qs-sun)] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.05em] text-[#1a1240]">
                      <Star className="h-2.5 w-2.5" />
                      Default
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold text-[var(--qs-muted)]">
                  {letterhead.headerConfig.repeatOnAllPages
                    ? "Repeats on every page"
                    : "First page only"}
                </span>
              </span>
              {submitting ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--qs-brand)]" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-5 py-4">
          <p className="text-[10px] font-semibold text-[var(--qs-muted)]">
            You will be asked again on your next PDF download.
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="b sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
