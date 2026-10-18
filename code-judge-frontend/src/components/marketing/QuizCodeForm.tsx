"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/helpers";
import { formatQuizCode, isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

interface QuizCodeFormProps {
  className?: string;
  ctaLabel?: string;
}

export default function QuizCodeForm({ className, ctaLabel = "Join quiz" }: QuizCodeFormProps) {
  const router = useRouter();
  const [letters, setLetters] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "muted" | "bad" } | null>(null);

  const handleChange = (value: string) => {
    setLetters(normalizeQuizCode(value.replace(/[^a-zA-Z]/g, "")).slice(0, 16));
    if (message) setMessage(null);
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
    // setMessage({ text: `Looking for quiz ${formatQuizCode(code)}…`, tone: "muted" });
    router.push(`/quiz/join?code=${code}`);
  };

  return (
    <div className={cn("w-full max-w-[440px]", className)}>
      <form className="flex gap-2.5" onSubmit={handleSubmit} autoComplete="off">
        <input
          value={formatQuizCode(letters)}
          onChange={(event) => handleChange(event.target.value)}
          className="qs-input min-w-0 flex-1"
          aria-label="Quiz access code"
          placeholder="Enter quiz code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="qs-btn shrink-0 px-5" type="submit">
          {ctaLabel}
        </button>
      </form>
      <p
        role="status"
        className={cn(
          "mb-0 mt-1.5 min-h-[1.5em] text-sm",
          message?.tone === "bad" ? "text-[var(--qs-bad)]" : "text-[var(--qs-muted)]"
        )}
      >
        {message?.text ?? ""}
      </p>
    </div>
  );
}
