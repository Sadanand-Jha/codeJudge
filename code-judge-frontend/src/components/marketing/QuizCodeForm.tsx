"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { cn } from "@/lib/helpers";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

interface QuizCodeFormProps {
  className?: string;
  ctaLabel?: string;
  demoCode?: string;
}

export default function QuizCodeForm({
  className,
  ctaLabel = "Join quiz",
  demoCode,
}: QuizCodeFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [letters, setLetters] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "muted" | "bad" } | null>(null);

  const handleChange = (value: string) => {
    setLetters(normalizeQuizCode(value.replace(/[^a-zA-Z]/g, "")).slice(0, 16));
    if (message) setMessage(null);
  };

  const fillDemoCode = () => {
    if (!demoCode) return;
    setLetters(normalizeQuizCode(demoCode).slice(0, 16));
    setMessage(null);
    inputRef.current?.focus();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = normalizeQuizCode(letters);
    if (!code) {
      setMessage({ text: "Enter the access code you were given.", tone: "bad" });
      return;
    }
    if (!isValidQuizCode(code)) {
      setMessage({ text: `Quiz codes are 16 letters — you have ${code.length} so far.`, tone: "bad" });
      return;
    }
    router.push(`/quiz/join?code=${code}`);
  };

  return (
    <div className={cn("join-card", className)}>
      <form className="join-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="join-input-wrap">
          <KeyRound size={18} className="join-key" aria-hidden />
          <input
            ref={inputRef}
            value={formatQuizCode(letters)}
            onChange={(event) => handleChange(event.target.value)}
            className="qs-input min-w-0 flex-1"
            aria-label="Quiz access code"
            placeholder="Enter access code (e.g. VQBA-MIDJ-ETTW-EFRT)"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="qs-btn shrink-0 px-5" type="submit">
          {ctaLabel}
          <ArrowRight size={16} aria-hidden />
        </button>
      </form>
      {message && (
        <p
          role="status"
          className={cn(
            "join-status mb-0 mt-2 text-xs font-semibold",
            message.tone === "bad" ? "text-[var(--qs-bad)]" : "text-[var(--qs-muted)]"
          )}
        >
          {message.text}
        </p>
      )}
      <div className="join-foot">
        {demoCode ? (
          <div className="join-demo">
            <span>Try live demo code:</span>
            <button type="button" onClick={fillDemoCode}>
              {formatQuizCode(normalizeQuizCode(demoCode).slice(0, 16))}
            </button>
          </div>
        ) : (
          <span />
        )}
        <Link href="/creator/quizzes/create">
          Want to host one? <u>Create a quiz for free →</u>
        </Link>
      </div>
    </div>
  );
}
