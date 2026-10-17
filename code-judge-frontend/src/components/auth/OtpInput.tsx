"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/helpers";

/**
 * Themed 6-box OTP input — QuizSupport qs-ui style.
 * Chunky 2px ink-bordered boxes that fill brand-purple on entry,
 * matching the login/register/forgot/owner verify steps.
 */
export function OtpInput({
  value,
  onChange,
  error = false,
  autoFocus = true,
  label = "6-digit code",
}: {
  value: string;
  onChange: (next: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  label?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    while (next.length < 6) next.push("");
    if (clean) {
      next[index] = clean;
      onChange(next.join("").slice(0, 6));
      if (index < 5) refs.current[index + 1]?.focus();
    } else {
      next[index] = "";
      onChange(next.join("").slice(0, 6));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      const next = value.split("");
      next[index - 1] = "";
      onChange(next.join("").slice(0, 6));
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="mx-auto flex w-full max-w-[320px] items-center justify-between gap-1.5 sm:max-w-[340px] sm:gap-2.5" role="group" aria-label={label} onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          aria-label={`Digit ${i + 1} of 6`}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-lg border-2 text-center font-mono text-lg font-extrabold outline-none transition-all sm:h-14 sm:rounded-xl sm:text-xl",
            "bg-[var(--qs-surface)] text-[var(--qs-ink)]",
            error
              ? "border-[var(--qs-bad)] bg-[var(--qs-badbg)]"
              : digit
                ? "border-[var(--qs-brand)] bg-[var(--qs-brand)]/10 shadow-[0_3px_0_rgba(26,18,64,0.85)]"
                : "border-[var(--qs-line)] focus:border-[var(--qs-brand)] focus:shadow-[0_3px_0_rgba(26,18,64,0.85)]"
          )}
        />
      ))}
    </div>
  );
}

export default OtpInput;
