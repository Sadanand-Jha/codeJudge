"use client";

import { Calendar, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/helpers";

export const settingsInputClass =
  "w-full h-11 rounded-xl border border-input-border bg-input-bg px-4 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all";

export function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-danger">
      <AlertTriangle className="h-3 w-3" /> {message}
    </p>
  );
}

export function DateTimeField({
  label,
  value,
  onChange,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <div className="relative">
        <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            settingsInputClass,
            "pl-10 [color-scheme:light] dark:[color-scheme:dark]",
            error && "!border-danger focus:!border-danger focus:ring-danger/10"
          )}
        />
      </div>
      {error && <FieldError message={error} />}
    </div>
  );
}
