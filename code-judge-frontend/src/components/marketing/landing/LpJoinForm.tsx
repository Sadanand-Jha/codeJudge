"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

export default function LpJoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeQuizCode(code.replace(/[^a-zA-Z]/g, ""));
    if (!normalized) {
      setError("Enter the quiz code you were given.");
      return;
    }
    if (!isValidQuizCode(normalized)) {
      setError(`Quiz codes are 16 letters — you have ${normalized.length}.`);
      return;
    }
    router.push(`/quiz/join?code=${normalized}`);
  };

  return (
    <form className="lpx-join" onSubmit={handleSubmit} autoComplete="off">
      <input
        value={code}
        onChange={(event) => {
          setCode(event.target.value.toUpperCase());
          setError(null);
        }}
        className="lpx-input"
        aria-label="Quiz code"
        placeholder="Enter quiz code"
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit" className="lpx-btn">
        Join quiz
      </button>
      {error && (
        <p className="lpx-join-error" role="status">
          {error}
        </p>
      )}
    </form>
  );
}
