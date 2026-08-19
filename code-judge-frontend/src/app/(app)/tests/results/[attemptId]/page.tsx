"use client";

import { use } from "react";
import { TestResult } from "@/components/tests/TestResult";

export default function TestResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  use(params);
  return <TestResult />;
}