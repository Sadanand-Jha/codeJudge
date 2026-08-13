"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getQuizCode } from "@/services/quiz";

export default function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const code = getQuizCode(quizId || "");
  const router = useRouter();

  useEffect(() => {
    if (code && code !== "new") {
      router.replace(`/quiz/${code}/settings/info`);
    }
  }, [code, router]);

  if (!code || code === "new") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-sm font-medium text-red-500">No valid quiz code provided.</p>
          <p className="mt-1 text-xs text-text-secondary">Create a quiz from the quiz dashboard instead.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );
}
