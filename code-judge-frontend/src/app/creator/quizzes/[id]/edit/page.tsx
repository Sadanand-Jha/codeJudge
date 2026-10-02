import { QuizEditor } from "@/components/creator/quiz-studio/StudioRouter";

interface EditQuizRouteProps {
  params: Promise<{ id?: string }>;
  searchParams: Promise<{ step?: string | string[] }>;
}

export default async function EditQuizRoute({ params, searchParams }: EditQuizRouteProps) {
  const { id } = await params;
  const { step } = await searchParams;
  const quizId = id ?? "";
  // ?step= deep link — the create flow hands off with ?step=questions so the
  // creator lands on the Problems step after saving Setup.
  const initialStep = Array.isArray(step) ? step[0] : step;

  if (!quizId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Quiz not found.</p>
      </div>
    );
  }

  return <QuizEditor quizId={quizId} initialStep={initialStep} />;
}
