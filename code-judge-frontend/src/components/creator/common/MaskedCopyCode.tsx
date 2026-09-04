"use client";

import { useState, useRef } from "react";
import { Copy, Check, Eye } from "lucide-react";
import { toast } from "@/lib/toast";
import { copyQuizCode } from "@/services/quiz";

interface MaskedCopyCodeProps {
  code: string;
  quizId?: string;
  className?: string;
  label?: string;
}

export function MaskedCopyCode({ code, quizId, className, label = "Quiz Code" }: MaskedCopyCodeProps) {
  const [revealed, setRevealed] = useState(false);
  const [displayCode, setDisplayCode] = useState("");
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const masked = "••••••••";

  const handleReveal = async () => {
    if (revealed) return;

    try {
      let codeToReveal = code;

      if (quizId) {
        codeToReveal = await copyQuizCode(quizId);
      }

      await navigator.clipboard.writeText(codeToReveal);
      setDisplayCode(codeToReveal);
      setRevealed(true);
      setCopied(true);
      toast.success({ title: `${label} copied`, description: "Copied to clipboard" });

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setRevealed(false);
        setCopied(false);
      }, 4000);
    } catch {
      toast.error({ title: "Failed to copy", description: "Could not copy to clipboard" });
    }
  };

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
      onClick={handleReveal}
      className={className}
      aria-label={`Reveal ${label}`}
      title="Click to reveal & copy"
    >
      <span className="font-mono text-sm tracking-[0.3em] text-text-primary">
        {revealed ? displayCode : masked}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
      ) : (
        <Eye className="h-3.5 w-3.5 shrink-0 text-text-muted" />
      )}
    </button>
  );
}
