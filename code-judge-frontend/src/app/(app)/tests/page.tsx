"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TestsHome } from "@/components/tests/TestsHome";
import type { ExamId } from "@/components/tests/types";

function TestsHomeWithParams() {
  const params = useSearchParams();
  const exam = params.get("exam") as ExamId | null;
  const hasActivity = params.get("activity") !== "0";

  return <TestsHome initialExam={exam ?? undefined} showContinue={hasActivity} />;
}

export default function TestsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ai-bg" />}>
      <TestsHomeWithParams />
    </Suspense>
  );
}