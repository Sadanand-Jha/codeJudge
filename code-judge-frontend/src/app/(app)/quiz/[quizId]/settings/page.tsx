import { redirect } from "next/navigation";

export default async function SettingsIndexPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  redirect(`/quiz/${quizId}/settings/info`);
}
