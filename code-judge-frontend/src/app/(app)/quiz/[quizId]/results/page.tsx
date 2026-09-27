"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useQuizRegistrationStore } from "@/store/quizRegistrationStore";
import { getPreviousQuizzes } from "@/services/quiz";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

export default function QuizResultsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const registration = useQuizRegistrationStore((state) => state.getRegistration(code));
  const [serverMiss, setServerMiss] = useState(false);
  const checkedServerRef = useRef(false);

  // Fast path: attempt remembered on this device (localStorage).
  useEffect(() => {
    if (isValidQuizCode(code) && registration?.attemptId) {
      router.replace(`/quiz/${code}/results/${registration.attemptId}`);
    }
  }, [code, registration?.attemptId, router]);

  // Fallback: the device store is never populated by the attempt flow
  // (startAttempt/submitAttempt are not called anywhere), so resolve the
  // user's latest attempt for this quiz from the backend instead.
  useEffect(() => {
    if (!isValidQuizCode(code) || registration?.attemptId || checkedServerRef.current) return;
    checkedServerRef.current = true;
    let cancelled = false;
    getPreviousQuizzes({ limit: 50 })
      .then(({ quizzes }) => {
        if (cancelled) return;
        const match = (quizzes ?? []).find((quiz) => quiz.code === code);
        if (match) {
          router.replace(`/quiz/${code}/results/${match.attempt_id}`);
        } else {
          setServerMiss(true);
        }
      })
      .catch(() => {
        if (!cancelled) setServerMiss(true);
      });
    return () => {
      cancelled = true;
    };
  }, [code, registration?.attemptId, router]);

  if (!isValidQuizCode(code)) {
    return (
      <ResultState
        icon={<ShieldCheck className="h-8 w-8 text-text-muted" />}
        text="Invalid quiz code."
        action={<Link href="/quiz#activity" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white">View my activity</Link>}
      />
    );
  }

  if (registration?.attemptId || !serverMiss) {
    return <ResultState icon={<Loader2 className="h-7 w-7 animate-spin text-pink-500" />} text="Loading your verified result…" />;
  }

  return (
    <ResultState
      icon={<ShieldCheck className="h-8 w-8 text-text-muted" />}
      text="No verified result was found for this quiz on this device."
      action={<Link href="/quiz#activity" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-pink-600 px-4 text-sm font-semibold text-white">View my activity</Link>}
    />
  );
}

function ResultState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        {icon}
        <p className="mt-3 text-sm leading-6 text-text-secondary">{text}</p>
        {action}
      </div>
    </div>
  );
}
