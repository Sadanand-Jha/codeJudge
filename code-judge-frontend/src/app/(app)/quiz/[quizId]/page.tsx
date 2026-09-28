import { redirect } from "next/navigation";

export default async function LegacyQuizDetailsRedirect({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  redirect(`/quiz/join?code=${encodeURIComponent(quizId)}`);
}
