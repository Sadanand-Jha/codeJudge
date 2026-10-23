"use client";

import { useRouter } from "next/navigation";
import { SecureLogo, LOADING_LOGO_SIZE } from "@/components/common/SecureLogo";
import { StudioProvider, useStudio } from "./StudioProvider";
import { StudioShell } from "./StudioShell";
import { SetupStep } from "./steps/SetupStep";
import { QuestionsStep } from "./steps/QuestionsStep";
import { AccessStep } from "./steps/AccessStep";
import { SettingsStep } from "./steps/SettingsStep";
import { ReviewPublishStep } from "./steps/ReviewPublishStep";
import { SuccessStep } from "./steps/PublishStep";

export function StudioRouter() {
  const { state, publish } = useStudio();

  switch (state.step) {
    case "details":
      return <SetupStep />;
    case "questions":
      return <QuestionsStep />;
    case "access":
      return <AccessStep />;
    case "rules":
      return <SettingsStep />;
    case "reviewPublish":
      return <ReviewPublishStep onPublish={publish} />;
    default:
      return <SetupStep />;
  }
}

function StudioShellWithRouter({ onDashboard }: { onDashboard: () => void }) {
  const { state, loading, loadError, questionsLoading, editMode } = useStudio();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-[var(--qs-bg)] px-5">
        <div className="w-full max-w-sm rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-7 text-center shadow-[6px_6px_0_var(--qs-sun)]">
          <SecureLogo variant="mark" size={LOADING_LOGO_SIZE} className="mx-auto block animate-pulse motion-reduce:animate-none" />
          <h2 className="mt-5 text-base font-black text-[var(--qs-ink)]">
            {loading ? "Loading quiz" : "Loading quiz questions"}
          </h2>
          {loading && (
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--qs-muted)]">
              Preparing your Creator Studio workspace…
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[calc(100dvh-4rem)] items-center justify-center bg-[var(--qs-bg)]">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-7 py-9 text-center shadow-[6px_6px_0_var(--qs-sun)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-badbg)]">
            <svg className="h-6 w-6 text-[var(--qs-bad)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-base font-black text-[var(--qs-ink)]">Quiz not found</h3>
          <p className="max-w-sm text-sm font-medium text-[var(--qs-muted)]">{loadError}</p>
          <button
            onClick={onDashboard}
            className="mt-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2 text-xs font-extrabold text-[var(--qs-on-brand)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-px active:translate-y-0 active:shadow-none"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (state.published) {
    return <SuccessStep onDashboard={onDashboard} />;
  }
  return (
    <StudioShell>
      <StudioRouter />
    </StudioShell>
  );
}

export function QuizCreator() {
  const router = useRouter();
  return (
    <StudioProvider>
      <StudioShellWithRouter onDashboard={() => router.push("/creator/quizzes")} />
    </StudioProvider>
  );
}

export function QuizEditor({ quizId, initialStep }: { quizId: string; initialStep?: string }) {
  const router = useRouter();
  return (
    <StudioProvider editMode initialQuizId={quizId} initialStep={initialStep}>
      <StudioShellWithRouter onDashboard={() => router.push("/creator/quizzes")} />
    </StudioProvider>
  );
}
