"use client";

import { use } from "react";
import { TestAttempt } from "@/components/tests/TestAttempt";

export default function TestAttemptPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = use(params);

  const titles: Record<string, string> = {
    ft_phy_mechanics: "JEE Main Physics — Mechanics",
    ct_mock04: "JEE Main Mock Test 04",
    s_jeemain2027: "JEE Main 2027 Complete Test Series",
  };

  return <TestAttempt testTitle={titles[testId] ?? "JEE Main Mock Test 01"} />;
}