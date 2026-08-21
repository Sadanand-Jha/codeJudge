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
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {confidence}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-card-hover hover:text-text-primary"
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
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-text-primary">{value}</p>
      )}
    </div>
  );
}
