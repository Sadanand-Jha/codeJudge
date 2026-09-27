"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useQuizRegistrationStore } from "@/store/quizRegistrationStore";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

export default function QuizResultsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const code = normalizeQuizCode(quizId.replace(/[^a-zA-Z]/g, ""));
  const registration = useQuizRegistrationStore((state) => state.getRegistration(code));

  useEffect(() => {
    if (isValidQuizCode(code) && registration?.attemptId) {
      router.replace(`/quiz/${code}/results/${registration.attemptId}`);
    }
  }, [code, registration?.attemptId, router]);

  if (isValidQuizCode(code) && registration?.attemptId) {
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
