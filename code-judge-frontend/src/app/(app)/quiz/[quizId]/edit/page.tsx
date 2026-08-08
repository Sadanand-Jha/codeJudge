"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import QuizSettingsPage from "@/components/quiz/creator/QuizSettingsPage";
import QuestionBuilder from "@/components/quiz/creator/QuestionBuilder";
import { QuizDetails, DEFAULT_QUIZ_DETAILS, CreatorQuestion } from "@/components/quiz/creator/types";
import { getQuizByCode, getQuizCode } from "@/services/quiz";
import { toast } from "@/lib/toast";

export default function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const code = getQuizCode(quizId || "");
  const router = useRouter();

  const [stage, setStage] = useState<"settings" | "builder">("settings");
  const [details, setDetails] = useState<QuizDetails>(() => ({ ...DEFAULT_QUIZ_DETAILS, name: code && code !== "new" ? code : "" }));
  const [questions] = useState<CreatorQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!code || code === "new") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve the "new/empty code" edge case synchronously
      setLoading(false);
      return () => { cancelled = true; };
    }
    getQuizByCode(code)
      .then((quiz) => {
        if (cancelled || !quiz) return;
        setDetails((prev) => ({ ...prev, name: quiz.name || prev.name }));
      })
      .catch(() => { if (!cancelled) setError("We couldn't load this quiz. Please check the code and try again."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [code]);

  const handleContinue = (nextDetails: QuizDetails) => {
    setDetails(nextDetails);
    setStage("builder");
  };

  const handleBack = () => setStage("settings");

  const handlePublish = () => {
    // TODO: persist updated settings + questions back to the backend
    toast.success("Quiz updated successfully!");
    router.push(`/quiz/${code}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-medium">Loading quiz settings…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-text-primary">Quiz not found</h1>
        <p className="mt-2 text-sm text-text-secondary">{error}</p>
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/quiz")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to quizzes
          </button>
        </div>
      </div>
    );
  }

  if (stage === "builder") {
    return (
      <QuestionBuilder
        details={details}
        initialQuestions={questions}
        onBack={handleBack}
        onPublish={handlePublish}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <QuizSettingsPage initialDetails={details} onContinue={handleContinue} />
    </motion.div>
  );
}
