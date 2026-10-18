"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/helpers";

export function EditableField({
  label,
  value,
  onChange,
  multiline = false,
  confidence,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  confidence?: React.ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onChange(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <label className="shrink-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">{label}</label>
        {confidence && <span className="shrink-0">{confidence}</span>}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-line)]/50 hover:text-[var(--qs-ink)]"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2.5 text-sm text-[var(--qs-ink)] outline-none transition focus:border-[var(--qs-brand)]"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-sm text-[var(--qs-ink)] outline-none transition focus:border-[var(--qs-brand)]"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-1 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] px-2.5 py-1 text-xs font-extrabold text-white transition hover:brightness-110"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-1 rounded-[10px] border-2 border-[var(--qs-line)] px-2.5 py-1 text-xs font-bold text-[var(--qs-ink)] transition hover:border-[var(--qs-brand)]"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium leading-relaxed text-[var(--qs-ink)]">{value}</p>
      )}
    </div>
  );
}
