"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, PenLine } from "lucide-react";
import { createQuiz } from "@/services/quiz";
import { generateQuizCode } from "@/utils/quizCode";

/**
 * Single settings page entry point.
 *
 * Creating a quiz drops you straight into the unified quiz settings
 * workspace (`/quiz/{code}/settings`) — the same page used to edit an
 * existing quiz. There is a single settings page with the sidebar ordered
 * Questions → Quiz Info → Registration → Collaborators → Responses.
 */
export default function CreateQuizPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const createAndEnter = async () => {
      try {
        const quiz = await createQuiz({
          name: "Untitled Quiz",
          code: generateQuizCode(),
        });
        const code = quiz?.code;
        if (cancelled) return;
        if (code) {
          router.replace(`/quiz/${code}/settings/info`);
        } else {
          setError("The quiz was created but no code was returned.");
        }
      } catch (err) {
        console.error("Failed to create quiz:", err);
        if (!cancelled) {
          setError("Could not create the quiz. Please try again.");
        }
      }
    };

    createAndEnter();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm font-semibold text-red-500">Could not create quiz</p>
          <p className="mt-1 text-xs text-text-secondary">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-xs font-bold text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/15 to-violet-600/15 text-pink-500">
        <PenLine className="h-6 w-6" />
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <p className="text-sm text-text-secondary">Creating your quiz...</p>
    </div>
  );
}
