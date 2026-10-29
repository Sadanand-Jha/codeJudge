import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SecureQuizUnlock } from "@/components/creator/quiz-studio/SecureQuizUnlock";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface SecureQuizPageProps {
  params: Promise<{ id?: string }>;
}

export default async function SecureQuizPage({ params }: SecureQuizPageProps) {
  const { id } = await params;
  if (!id) notFound();
  return <SecureQuizUnlock key={id} quizId={id} />;
}
