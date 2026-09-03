"use client";

import { Copy } from "lucide-react";
import { toast } from "@/lib/toast";

interface MaskedCopyCodeProps {
  code: string;
  className?: string;
  label?: string;
}

export function MaskedCopyCode({ code, className, label = "Quiz Code" }: MaskedCopyCodeProps) {
  const masked = "••••••••";

  if (!code) {
    return (
      <div className={className} aria-label={`${label} unavailable`}>
        <span className="font-mono text-sm tracking-[0.3em] text-text-muted">{masked}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(code);
        toast.success({ title: `${label} copied`, description: "Copied to clipboard" });
      }}
      className={className}
      aria-label={`Copy ${label}`}
      title="Click to copy"
    >
      <span className="font-mono text-sm tracking-[0.3em] text-text-primary">{masked}</span>
      <Copy className="h-3.5 w-3.5 text-text-muted" />
    </button>
  );
}