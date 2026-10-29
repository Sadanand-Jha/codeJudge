"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SecureLogo } from "@/components/common/SecureLogo";
import { readDekFromLocationHash } from "@/lib/quizCryptoV2";
import { isValidQuizCode, normalizeQuizCode } from "@/utils/quizCode";

export default function SecureQuizLinkPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = use(params);
  const router = useRouter();

  useEffect(() => {
    const code = normalizeQuizCode(quizId);
    if (!isValidQuizCode(code)) {
      router.replace("/quiz/join");
      return;
    }
    const dek = readDekFromLocationHash();
    router.replace(`/quiz/${code}/attempt${dek ? `#${dek}` : ""}`);
  }, [quizId, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <SecureLogo variant="mark" size={32} />
      <p className="text-sm font-bold text-[var(--qs-muted)]">
        Opening secure quiz…
      </p>
    </div>
  );
}
