import { redirect } from "next/navigation";

export default async function SettingsIndexPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  redirect(`/creator/quizzes/${quizId}/responses`);
}
